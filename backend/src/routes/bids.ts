import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';
import { activityLogService } from '../services/activityLogService.js';

const router = Router();

// Category code mapping for OFFERID
const categoryCodeMap: Record<string, string> = {
  'home-maintenance': 'HM',
  'cleaning-household': 'CL',
  'food-beverage': 'FB',
  'furniture-assembly': 'FA',
  'shopping-errands': 'SH',
  'delivery-moving': 'DE',
  'travel-mobility': 'TR',
  'event-planning': 'EV',
  'childcare-education': 'CH',
  'eldercare-healthcare': 'EH',
  'pet-care': 'PC',
  'personal-care': 'PE',
  'tech-support': 'TE',
  'creative-arts': 'CR',
  'admin-business': 'AB',
};

// Generate unique OFFERID: OF[YY][CATEGORY][4-RANDOM-CHARS]
function generateOfferId(category: string): string {
  const year = new Date().getFullYear().toString().slice(-2); // 26
  const categoryCode = categoryCodeMap[category.toLowerCase()] || 'XX';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OF${year}${categoryCode}-${code}`;
}

// POST /api/bids - Submit a bid (single errand or multiple sessions for recurring tasks)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { task_id, amount, note, sessions } = req.body;
    const doerId = parseInt(req.userId || '0', 10);

    if (!task_id || !amount) {
      return res.status(400).json({ error: 'task_id and amount required' });
    }

    // sessions is optional array of instance numbers for recurring tasks
    const selectedSessions = Array.isArray(sessions) ? sessions.map(s => parseInt(s, 10)) : [];

    // Validate minimum bid amount
    const bidAmount = parseFloat(amount);
    if (bidAmount < 8) {
      return res.status(400).json({ error: 'Offer amount must be at least $8' });
    }

    // Check if errand exists and is open
    const errandResult = await db.query(
      'SELECT id, status, asker_id FROM errands WHERE id = $1',
      [task_id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    if (errand.status !== 'open' && errand.status !== 'confirmed') {
      return res.status(400).json({ error: 'Errand is not open for bidding' });
    }

    // Prevent asker from bidding on their own errand
    if (errand.asker_id === doerId) {
      return res.status(403).json({ error: 'You cannot bid on your own errand' });
    }

    // Get doer info
    const doerResult = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [doerId]
    );
    const doerName = doerResult.rows[0]?.display_name || 'Anonymous';

    // Check if bid already exists (update or insert)
    const existingBidResult = await db.query(
      'SELECT id, status FROM bids WHERE errand_id = $1 AND doer_id = $2',
      [task_id, doerId]
    );

    let bid;
    if (existingBidResult.rows.length > 0) {
      const existingBid = existingBidResult.rows[0];

      // Prevent updating a rejected bid
      if (existingBid.status === 'rejected') {
        return res.status(403).json({
          error: 'Cannot modify rejected offer',
          message: 'Your offer was not selected for this errand. You cannot submit another offer for this errand.'
        });
      }

      // Prevent updating a closed bid (another doer confirmed the job)
      if (existingBid.status === 'closed') {
        return res.status(403).json({
          error: 'Cannot modify closed offer',
          message: 'The job has started with another doer. Your offer is closed.'
        });
      }

      // Prevent updating a cancelled bid (job was cancelled)
      if (existingBid.status === 'cancelled') {
        return res.status(403).json({
          error: 'Cannot modify cancelled offer',
          message: 'The job has been cancelled. Your offer is no longer valid.'
        });
      }

      // Prevent updating a confirmed bid (job already confirmed)
      if (existingBid.status === 'confirmed') {
        return res.status(403).json({
          error: 'Cannot modify confirmed offer',
          message: 'This offer is confirmed and the job has started. You cannot modify it anymore.'
        });
      }

      // Update existing bid (only if still pending or accepted)
      const bidId = existingBid.id;
      await db.query(
        'UPDATE bids SET amount = $1, note = $2, updated_at = NOW() WHERE id = $3',
        [parseFloat(amount), note || null, bidId]
      );
      const updated = await db.query('SELECT * FROM bids WHERE id = $1', [bidId]);
      bid = updated.rows[0];
    } else {
      // Check if doer has a rejected bid for this errand
      const rejectedBidResult = await db.query(
        'SELECT id FROM bids WHERE errand_id = $1 AND doer_id = $2 AND status = $3',
        [task_id, doerId, 'rejected']
      );

      if (rejectedBidResult.rows.length > 0) {
        return res.status(403).json({
          error: 'Cannot submit another offer',
          message: 'Your previous offer was not selected. You cannot submit another offer for this errand.'
        });
      }

      // Get errand category for OFFERID
      const errandCategoryResult = await db.query(
        'SELECT title, errand_id, category FROM errands WHERE id = $1',
        [task_id]
      );
      const errandTitle = errandCategoryResult.rows[0]?.title || 'Your errand';
      const formattedErrandId = errandCategoryResult.rows[0]?.errand_id || `ER26-${task_id}`;
      const errandCategory = errandCategoryResult.rows[0]?.category || 'admin-business';

      // Generate unique OFFERID
      const offerId = generateOfferId(errandCategory);

      // Create new bid with offer_id
      const result = await db.query(
        'INSERT INTO bids (errand_id, doer_id, amount, note, status, offer_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [task_id, doerId, parseFloat(amount), note || null, 'pending', offerId]
      );
      bid = result.rows[0];

      // Send notification to asker about new bid with OFFERID
      try {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            errand.asker_id,
            'bid_placed',
            'New Offer Placed',
            `${formattedErrandId} • ${offerId}: ${doerName} has placed an offer to help with "${errandTitle}" for $${parseFloat(amount)}`,
            task_id,
          ]
        );
      } catch (notifErr) {
        console.warn('[Bids] Failed to send notification:', notifErr);
        // Don't fail the entire request if notification fails
      }
    }

    // If this is a recurring task bid with selected sessions, map bid to sessions
    if (selectedSessions.length > 0) {
      try {
        // Get session IDs for selected instance numbers
        const sessionResult = await db.query(
          `SELECT id, instance_number FROM recurring_sessions
           WHERE parent_errand_id = $1 AND instance_number = ANY($2::int[])`,
          [task_id, selectedSessions]
        );

        // Insert bid-session mappings
        for (const session of sessionResult.rows) {
          await db.query(
            'INSERT INTO bid_sessions (bid_id, session_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [bid.id, session.id]
          );
        }

        console.log(`[Bids] Mapped bid ${bid.id} to ${sessionResult.rows.length} sessions for errand ${task_id}`);
      } catch (sessionErr) {
        console.error('[Bids] Failed to map bid to sessions:', sessionErr);
        // Don't fail the bid creation if session mapping fails
      }
    }

    // Log activity: Bid placed
    await activityLogService.logBidPlaced(task_id, doerName, doerId, parseFloat(amount));

    res.status(201).json({
      success: true,
      data: {
        id: bid.id,
        taskId: task_id,
        doerId: doerId,
        doerName: doerName,
        amount: bid.amount,
        note: bid.note,
        status: bid.status,
        selectedSessions: selectedSessions.length > 0 ? selectedSessions : undefined,
        createdAt: bid.created_at,
      },
    });
  } catch (error) {
    console.error('[Bids] Error creating bid:', error);
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

// GET /api/bids/task/:taskId - Get all bids for a task
router.get('/task/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const parsedTaskId = parseInt(taskId, 10);
    const currentUserId = parseInt(req.userId || '0', 10);

    console.log('[Bids GET] Fetching bids for task:', parsedTaskId, 'User:', currentUserId);

    // Verify user is the asker of this task
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [parsedTaskId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (errandResult.rows[0].asker_id !== currentUserId) {
      console.log('[Bids GET] Access denied. Errand asker:', errandResult.rows[0].asker_id, 'Current user:', currentUserId);
      return res.status(403).json({ error: 'Only the asker can view bids' });
    }

    // Get bids from database
    const bidsResult = await db.query(
      `SELECT b.id, b.errand_id as taskId, b.doer_id as doerId, u.display_name as doerName,
              u.alias as doerAlias, b.amount, b.note, b.status, b.created_at as createdAt,
              b.offer_id as offerId, u.profile_image_url as doerAvatar
       FROM bids b
       JOIN users u ON b.doer_id = u.id
       WHERE b.errand_id = $1
       ORDER BY b.created_at DESC`,
      [parsedTaskId]
    );

    console.log('[Bids GET] Found', bidsResult.rows.length, 'bids');
    res.json({ success: true, data: bidsResult.rows });
  } catch (error) {
    console.error('[Bids] Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// POST /api/bids/:id/accept - Accept a bid
router.post('/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Get bid and verify errand ownership
    const bidResult = await db.query(
      `SELECT b.*, e.asker_id FROM bids b
       JOIN errands e ON b.errand_id = e.id
       WHERE b.id = $1`,
      [id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    if (bid.asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can accept bids' });
    }

    // Update bid status to accepted
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['accepted', id]
    );

    // Reject all other bids for this errand
    await db.query(
      'UPDATE bids SET status = $1 WHERE errand_id = $2 AND id != $3',
      ['rejected', bid.errand_id, id]
    );

    // Notify other bidders that the job is closed
    try {
      const otherBids = await db.query(
        'SELECT DISTINCT doer_id FROM bids WHERE errand_id = $1 AND id != $2',
        [bid.errand_id, id]
      );

      const errandData = await db.query(
        'SELECT title, errand_id FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'A task';
      const formattedErrandId = errandData.rows[0]?.errand_id || `ER26-${bid.errand_id}`;

      for (const otherBid of otherBids.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            otherBid.doer_id,
            'bid_rejected',
            'Offer Not Selected',
            `${formattedErrandId}: Your offer for "${errandTitle}" was not selected. Don't worry, more errands are coming!`,
            bid.errand_id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('[Bids] Failed to notify other bidders:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Update errand status to 'confirmed' and set 24h confirmation deadline
    await db.query(
      'UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL \'24 hours\' WHERE id = $3',
      ['confirmed', id, bid.errand_id]
    );

    // Log activity for confirmation
    try {
      const askerResult = await db.query('SELECT name FROM users WHERE id = $1', [bid.asker_id]);
      const askerName = askerResult.rows[0]?.name || 'Asker';
      await activityLogService.logActivity(
        bid.errand_id,
        'confirmed',
        bid.asker_id,
        askerName,
        'asker'
      );
    } catch (activityErr) {
      console.warn('[Bids] Failed to log confirmation activity:', activityErr);
    }

    // Create errand assignment record for the accepted doer
    try {
      await db.query(
        `INSERT INTO errand_assignments (errand_id, doer_id, status, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (errand_id, doer_id) DO UPDATE
         SET status = $3`,
        [bid.errand_id, bid.doer_id, 'accepted']
      );
      console.log('[Bids] Errand assignment created:', { errandId: bid.errand_id, doerId: bid.doer_id });
    } catch (assignmentErr) {
      console.error('[Bids] Failed to create errand assignment:', assignmentErr);
      // Don't fail the entire request if assignment creation fails
    }

    // Send notification to doer that their bid was accepted
    try {
      const errandData = await db.query(
        'SELECT title, errand_id FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'Your task';
      const formattedErrandId = errandData.rows[0]?.errand_id || `ER26-${bid.errand_id}`;

      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
        [
          bid.doer_id,
          'bid_accepted',
          'Offer Accepted',
          `${formattedErrandId}: Your offer of $${bid.amount} for "${errandTitle}" was accepted! Please confirm you're ready to help.`,
          bid.errand_id,
        ]
      );
    } catch (notifErr) {
      console.warn('[Bids] Failed to send bid accepted notification:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Log activity: Bid accepted
    const askerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [bid.asker_id]);
    const askerName = askerResult.rows[0]?.display_name || 'Unknown User';
    await activityLogService.logBidAccepted(bid.errand_id, askerName, bid.asker_id);

    res.json({
      success: true,
      data: {
        bid,
        stripeIntent: {
          id: `pi_mock_${Date.now()}`,
          amount: Math.round(bid.amount * 100),
          currency: 'sgd',
          status: 'succeeded',
        },
      },
    });
  } catch (error) {
    console.error('[Bids] Error accepting bid:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// POST /api/bids/:id/reject - Reject a bid with optional feedback
router.post('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, custom_reason } = req.body;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Get bid and verify errand ownership
    const bidResult = await db.query(
      `SELECT b.*, e.asker_id FROM bids b
       JOIN errands e ON b.errand_id = e.id
       WHERE b.id = $1`,
      [id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    if (bid.asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can reject bids' });
    }

    // Update bid status with rejection reason
    await db.query(
      'UPDATE bids SET status = $1, rejection_reason = $2, custom_reason = $3, rejected_at = NOW() WHERE id = $4',
      ['rejected', reason, custom_reason || null, id]
    );

    // Get updated bid
    const updated = await db.query('SELECT * FROM bids WHERE id = $1', [id]);
    const updatedBid = updated.rows[0];

    // Send notification to doer with reason
    try {
      const reasonText = reason === 'other' ? custom_reason : reason;
      const errandData = await db.query(
        'SELECT title FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'Your task';

      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
        [
          bid.doer_id,
          'bid_rejected',
          'Offer Not Selected',
          `Your offer for "${errandTitle}" was not selected.${reasonText ? ` Feedback: ${reasonText}` : ''}`,
          bid.errand_id,
        ]
      );
    } catch (notifErr) {
      console.warn('[Bids] Failed to send rejection notification:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Log activity: Bid rejected
    const doerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [bid.doer_id]);
    const doerName = doerResult.rows[0]?.display_name || 'Unknown User';
    await activityLogService.logBidRejected(bid.errand_id, doerName, bid.doer_id);

    res.json({ success: true, data: updatedBid });
  } catch (error) {
    console.error('[Bids] Error rejecting bid:', error);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
});

// GET /api/users/:userId/confidence-score - Get doer confidence signals
router.get('/user/:userId/confidence', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get user info
    const userResult = await db.query(
      'SELECT id, display_name FROM users WHERE id = $1',
      [parsedUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate confidence metrics
    const metricsResult = await db.query(
      `SELECT
        COUNT(DISTINCT e.id) as total_jobs_completed,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as successful_jobs,
        AVG(COALESCE(ur.rating, 0)) as avg_rating,
        COUNT(DISTINCT ur.id) as review_count,
        MAX(e.completed_at) as last_job_date,
        CEIL(COUNT(DISTINCT e.id) * 100.0 / NULLIF(COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN b.id END), 0)) as acceptance_rate
       FROM bids b
       LEFT JOIN errands e ON b.errand_id = e.id AND b.status = 'accepted'
       LEFT JOIN user_reviews ur ON e.doer_id = ur.reviewed_user_id
       WHERE b.doer_id = $1`,
      [parsedUserId]
    );

    const metrics = metricsResult.rows[0];
    const totalJobs = parseInt(metrics.total_jobs_completed) || 0;
    const successfulJobs = parseInt(metrics.successful_jobs) || 0;
    const avgRating = parseFloat(metrics.avg_rating) || 0;
    const reviewCount = parseInt(metrics.review_count) || 0;
    const acceptanceRate = parseInt(metrics.acceptance_rate) || 0;
    const daysSinceLastJob = metrics.last_job_date
      ? Math.floor((Date.now() - new Date(metrics.last_job_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate confidence score (0-100)
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;
    const ratingScore = (avgRating / 5) * 40; // 40 points max
    const jobsScore = Math.min((totalJobs / 20) * 30, 30); // 30 points max
    const acceptanceScore = (acceptanceRate / 100) * 30; // 30 points max
    const confidenceScore = Math.round(ratingScore + jobsScore + acceptanceScore);

    res.json({
      success: true,
      data: {
        total_jobs: totalJobs,
        successful_jobs: successfulJobs,
        success_rate: Math.round(successRate),
        avg_rating: avgRating.toFixed(1),
        review_count: reviewCount,
        acceptance_rate: acceptanceRate,
        days_since_last_job: daysSinceLastJob,
        confidence_score: Math.min(100, confidenceScore),
      },
    });
  } catch (error) {
    console.error('Error calculating confidence:', error);
    res.status(500).json({ error: 'Failed to calculate confidence' });
  }
});

// GET /api/bids/my-bids - Get all bids placed by current doer
router.get('/my-bids', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doerId = parseInt(req.userId || '0', 10);

    // Get all bids for this doer with errand details
    const bidsResult = await db.query(
      `SELECT b.*, e.title, e.budget, e.category, e.status as errand_status, e.location, e.postal_code, e.deadline, e.description, u.display_name as asker_display_name
       FROM bids b
       JOIN errands e ON b.errand_id = e.id
       JOIN users u ON e.asker_id = u.id
       WHERE b.doer_id = $1
       ORDER BY b.created_at DESC`,
      [doerId]
    );

    res.json({
      success: true,
      data: bidsResult.rows.map(bid => ({
        id: bid.id,
        errand_id: bid.errand_id,
        doer_id: bid.doer_id,
        amount: bid.amount,
        note: bid.note,
        status: bid.status,
        created_at: bid.created_at,
        errand: {
          title: bid.title,
          budget: bid.budget,
          category: bid.category,
          status: bid.errand_status,
          asker_display_name: bid.asker_display_name,
          location: bid.location,
          postal_code: bid.postal_code,
          deadline: bid.deadline,
          description: bid.description,
        },
      })),
    });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// GET /api/bids/check/:errandId - Check if current user has a bid on this errand
router.get('/check/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;
    const doerId = parseInt(req.userId || '0', 10);
    const parsedErrandId = parseInt(errandId, 10);

    const result = await db.query(
      `SELECT id, amount, status FROM bids
       WHERE errand_id = $1 AND doer_id = $2
       LIMIT 1`,
      [parsedErrandId, doerId]
    );

    if (result.rows.length > 0) {
      const bid = result.rows[0];
      return res.json({
        success: true,
        hasBid: true,
        bidAmount: bid.amount,
        bidStatus: bid.status,
      });
    }

    res.json({
      success: true,
      hasBid: false,
    });
  } catch (error) {
    console.error('[Bids] Error checking user bid:', error);
    res.status(500).json({ error: 'Failed to check bid' });
  }
});

// PUT /api/bids/:id/confirm - Doer confirms they accept the accepted bid
router.put('/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const doerId = parseInt(req.userId || '0', 10);

    // Get the bid
    const bidResult = await db.query(
      'SELECT id, doer_id, errand_id, status FROM bids WHERE id = $1',
      [bidId]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Verify the bid belongs to the current doer
    if (bid.doer_id !== doerId) {
      return res.status(403).json({ error: 'Not authorized to confirm this bid' });
    }

    // Check if bid is in accepted status
    if (bid.status !== 'accepted') {
      return res.status(400).json({ error: 'Bid must be in accepted status to confirm' });
    }

    // Update bid status to confirmed
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['confirmed', bidId]
    );

    // Close all other bids for this errand (set status to 'closed')
    await db.query(
      'UPDATE bids SET status = $1 WHERE errand_id = $2 AND id != $3',
      ['closed', bid.errand_id, bidId]
    );

    // Update errand status to 'in_progress' (doer confirmed start)
    await db.query(
      'UPDATE errands SET status = $1 WHERE id = $2',
      ['in_progress', bid.errand_id]
    );

    // Notify other bidders that the job has started and their offers are closed
    try {
      const otherBids = await db.query(
        'SELECT DISTINCT doer_id FROM bids WHERE errand_id = $1 AND id != $2 AND status = $3',
        [bid.errand_id, bidId, 'closed']
      );

      const errandData = await db.query(
        'SELECT title FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'A task';

      for (const otherBid of otherBids.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            otherBid.doer_id,
            'bid_closed',
            '❌ Job Started',
            `The job for "${errandTitle}" has started with another doer. Your offer is now closed.`,
            bid.errand_id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('[Bids] Failed to notify other bidders about job start:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Get updated bid
    const updatedBid = await db.query('SELECT * FROM bids WHERE id = $1', [bidId]);

    res.json({
      success: true,
      data: {
        id: updatedBid.rows[0].id,
        status: updatedBid.rows[0].status,
        message: 'Bid confirmed successfully and other offers closed'
      }
    });
  } catch (error) {
    console.error('Bid confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm bid' });
  }
});

// PUT /api/bids/:id/accept-sessions - Asker accepts doer for specific sessions
router.put('/:id/accept-sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const { sessions } = req.body;
    const askerId = parseInt(req.userId || '0', 10);

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: 'At least one session must be selected' });
    }

    const selectedSessions = sessions.map(s => parseInt(s, 10));

    // Get the bid
    const bidResult = await db.query(
      `SELECT b.id, b.errand_id, b.doer_id, e.asker_id
       FROM bids b
       JOIN errands e ON b.errand_id = e.id
       WHERE b.id = $1`,
      [bidId]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Verify asker is accepting their own errand
    if (bid.asker_id !== askerId) {
      return res.status(403).json({ error: 'Only asker can accept bids' });
    }

    // Get all sessions for this recurring errand
    const sessionsResult = await db.query(
      `SELECT id, instance_number, errand_id FROM recurring_sessions
       WHERE parent_errand_id = $1 AND instance_number = ANY($2::int[])`,
      [bid.errand_id, selectedSessions]
    );

    const sessionsToConfirm = sessionsResult.rows;

    // For each selected session, update its status to confirmed
    for (const session of sessionsToConfirm) {
      await db.query(
        'UPDATE errands SET status = $1 WHERE id = $2',
        ['confirmed', session.errand_id]
      );

      // Create bid record for this specific session instance
      // (This links the doer to this specific session)
      const bidForSessionResult = await db.query(
        `SELECT id FROM bids WHERE errand_id = $1 AND doer_id = $2 LIMIT 1`,
        [session.errand_id, bid.doer_id]
      );

      if (bidForSessionResult.rows.length === 0) {
        // Create a new bid for this session if one doesn't exist
        await db.query(
          'INSERT INTO bids (errand_id, doer_id, amount, status) VALUES ($1, $2, $3, $4)',
          [session.errand_id, bid.doer_id, bid.amount, 'confirmed']
        );
      } else {
        // Update existing bid to confirmed
        await db.query(
          'UPDATE bids SET status = $1 WHERE id = $2',
          ['confirmed', bidForSessionResult.rows[0].id]
        );
      }
    }

    // Log which sessions were accepted
    console.log(`[Bids] Asker ${askerId} accepted bid ${bidId} for sessions: ${selectedSessions.join(', ')}`);

    res.json({
      success: true,
      data: {
        bidId,
        doerId: bid.doer_id,
        acceptedSessions: selectedSessions,
        message: `Accepted doer for ${selectedSessions.length} session(s)`
      }
    });
  } catch (error) {
    console.error('Error accepting bid sessions:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// GET /api/bids/recurring/:errandId - Get all bids for a recurring errand grouped by sessions
router.get('/recurring/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const errandId = parseInt(req.params.errandId, 10);
    const currentUserId = parseInt(req.userId || '0', 10);

    // Verify this is a recurring errand and user is the asker
    const errandResult = await db.query(
      'SELECT id, asker_id, is_recurring FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    if (!errand.is_recurring) {
      return res.status(400).json({ error: 'Not a recurring errand' });
    }

    if (errand.asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only asker can view bids' });
    }

    // Get all sessions for this recurring errand
    const sessionsResult = await db.query(
      `SELECT rs.id, rs.instance_number, rs.errand_id, rs.scheduled_date,
              e.title, e.status, e.budget
       FROM recurring_sessions rs
       JOIN errands e ON rs.errand_id = e.id
       WHERE rs.parent_errand_id = $1
       ORDER BY rs.instance_number ASC`,
      [errandId]
    );

    const sessions = sessionsResult.rows;

    // Get all bids for all sessions
    const bidsResult = await db.query(
      `SELECT DISTINCT b.id, b.doer_id, b.amount, b.note, b.status, b.created_at,
              u.display_name, u.average_rating, u.total_ratings
       FROM bids b
       JOIN users u ON b.doer_id = u.id
       WHERE b.errand_id IN (
         SELECT errand_id FROM recurring_sessions WHERE parent_errand_id = $1
       )
       ORDER BY b.created_at DESC`,
      [errandId]
    );

    const bids = bidsResult.rows;

    // Map bids to their sessions
    const bidSessionsResult = await db.query(
      `SELECT bs.bid_id, rs.instance_number
       FROM bid_sessions bs
       JOIN recurring_sessions rs ON bs.session_id = rs.id
       WHERE rs.parent_errand_id = $1`,
      [errandId]
    );

    const bidSessionMap: Record<number, number[]> = {};
    for (const row of bidSessionsResult.rows) {
      if (!bidSessionMap[row.bid_id]) {
        bidSessionMap[row.bid_id] = [];
      }
      bidSessionMap[row.bid_id].push(row.instance_number);
    }

    // Build response with sessions and grouped bids
    res.json({
      success: true,
      data: {
        errandId,
        sessions: sessions.map(s => ({
          instanceNumber: s.instance_number,
          errandId: s.errand_id,
          scheduledDate: s.scheduled_date,
          title: s.title,
          status: s.status,
          budget: s.budget,
        })),
        bids: bids.map(b => ({
          bidId: b.id,
          doerId: b.doer_id,
          doerName: b.display_name,
          doerRating: b.average_rating || 'New',
          doerRatings: b.total_ratings || 0,
          amount: b.amount,
          note: b.note,
          status: b.status,
          selectedSessions: bidSessionMap[b.id] || [],
          createdAt: b.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching recurring bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

export default router;
