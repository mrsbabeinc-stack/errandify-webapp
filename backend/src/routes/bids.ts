import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';
import { activityLogService } from '../services/activityLogService.js';
import * as contentMod from '../modules/content-moderation.js';
import { notifyUser } from '../socket.js';

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
  return `OF${year}${categoryCode}-${code}`.toUpperCase();
}

// POST /api/bids - Submit a bid (single errand or multiple sessions for recurring tasks)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { task_id, amount, note, sessions } = req.body;
    const doerId = parseInt(req.userId || '0', 10);

    if (!task_id || !amount) {
      return res.status(400).json({ error: 'Let us know your offer amount so the neighbour knows what to expect.' });
    }

    // sessions is optional array of instance numbers for recurring tasks
    const selectedSessions = Array.isArray(sessions) ? sessions.map(s => parseInt(s, 10)) : [];

    // Validate minimum bid amount
    const bidAmount = parseFloat(amount);
    if (bidAmount < 8) {
      return res.status(400).json({ error: 'Offers start at SGD 8. This helps our community stay healthy.' });
    }

    // Check if errand exists and is open
    const errandResult = await db.query(
      'SELECT id, status, asker_id FROM errands WHERE id = $1',
      [task_id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Looks like this errand got taken care of or the neighbour changed their mind.' });
    }

    const errand = errandResult.rows[0];

    if (errand.status !== 'open' && errand.status !== 'confirmed') {
      return res.status(400).json({ error: 'This errand has moved on. But there are plenty more neighbours who need help!' });
    }

    // Prevent asker from bidding on their own errand
    if (errand.asker_id === doerId) {
      return res.status(403).json({ error: 'You posted this one yourself. Gotta help other neighbours instead!' });
    }

    // Moderate offer note content if provided
    if (note) {
      try {
        const moderationResult = await contentMod.checkContentWithQwen('', '', note);
        if (!moderationResult.is_safe) {
          return res.status(400).json({
            error: 'Please keep your offer note friendly and respectful.',
            message: 'We want to keep Errandify a safe and welcoming community. Let us know why you\'re a good fit for this task instead!',
            details: moderationResult.flags
          });
        }
      } catch (modError) {
        console.error('[Bids] Content moderation error:', modError);
        // Don't block the bid if moderation fails, just log it
      }
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
          error: 'This neighbour picked someone else. No worries, there are more errands to help with!',
          message: 'Your offer was not selected for this errand. You cannot submit another offer for this errand.'
        });
      }

      // Prevent updating a closed bid (another doer confirmed the job)
      if (existingBid.status === 'closed') {
        return res.status(403).json({
          error: 'This errand already started with another neighbour. Good luck next time!',
          message: 'The job has started with another doer. Your offer is closed.'
        });
      }

      // Prevent updating a cancelled bid (job was cancelled)
      if (existingBid.status === 'cancelled') {
        return res.status(403).json({
          error: 'This errand was cancelled. The neighbour no longer needs help.',
          message: 'The job has been cancelled. Your offer is no longer valid.'
        });
      }

      // Prevent updating a confirmed bid (job already confirmed)
      if (existingBid.status === 'confirmed') {
        return res.status(403).json({
          error: 'Great news, your offer was accepted. Head to your tasks to get started!',
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
          error: 'You already offered to help with this one. Wait to see if the neighbour picks you!',
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

    // Log activity: Bid placed - get doer alias for activity log
    let doerAlias = doerName;
    try {
      const doerResult = await db.query(
        'SELECT alias FROM users WHERE id = $1',
        [doerId]
      );
      doerAlias = doerResult.rows[0]?.alias || doerName;
    } catch (err) {
      console.error('[Bids] Failed to get doer alias:', err);
    }

    await activityLogService.logBidPlaced(task_id, doerName, doerId, parseFloat(amount), bid.offer_id, doerAlias);

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
    res.status(500).json({ error: 'Oops, we had a hiccup saving your offer. Give it another go!' });
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
      return res.status(404).json({ error: 'Looks like this errand got taken care of or the neighbour changed their mind.' });
    }

    if (errandResult.rows[0].asker_id !== currentUserId) {
      console.log('[Bids GET] Access denied. Errand asker:', errandResult.rows[0].asker_id, 'Current user:', currentUserId);
      return res.status(403).json({ error: 'Only the neighbour who asked can see the offers.' });
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
    res.status(500).json({ error: 'We are having trouble loading the offers. Just refresh and we will sort it!' });
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
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
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

    // Notify doer in real-time that their bid was confirmed
    try {
      notifyUser(bid.doer_id, 'bid_confirmed', {
        bidId: bid.id,
        errandId: bid.errand_id,
        message: 'Your offer has been confirmed!',
      });
      console.log('[Bids] Notified doer of bid confirmation:', { doerId: bid.doer_id, bidId: bid.id });
    } catch (notifyErr) {
      console.warn('[Bids] Failed to notify doer of confirmation:', notifyErr);
    }

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
    res.status(500).json({ error: 'Oops, we had a hiccup confirming this offer. Give it another shot!' });
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
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
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
    res.status(500).json({ error: 'We had a hiccup declining this offer. Give it another try!' });
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
    res.status(500).json({ error: 'We are having trouble loading the doer info. Just refresh and try again!' });
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
    res.status(500).json({ error: 'We are having trouble loading the offers. Just refresh and we will sort it!' });
  }
});

// GET /api/bids/check/:errandId - Check if current user has a bid on this errand (accepts database ID or formatted errand ID)
router.get('/check/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;
    const doerId = parseInt(req.userId || '0', 10);

    // Resolve errand ID (accepts both database ID and formatted errand ID)
    let parsedErrandId: number | null = null;
    if (/^\d+$/.test(errandId)) {
      // If numeric, use as database ID
      parsedErrandId = parseInt(errandId, 10);
    } else {
      // Otherwise, query by formatted errand ID
      const errandResult = await db.query(
        'SELECT id FROM errands WHERE errand_id = $1',
        [errandId]
      );
      if (errandResult.rows.length > 0) {
        parsedErrandId = errandResult.rows[0].id;
      }
    }

    if (!parsedErrandId) {
      return res.json({
        success: true,
        hasBid: false,
      });
    }

    const result = await db.query(
      `SELECT id, amount, status, note FROM bids
       WHERE errand_id = $1 AND doer_id = $2
       LIMIT 1`,
      [parsedErrandId, doerId]
    );

    if (result.rows.length > 0) {
      const bid = result.rows[0];
      return res.json({
        success: true,
        hasBid: true,
        bidId: bid.id,
        bidAmount: bid.amount,
        bidStatus: bid.status,
        bidNote: bid.note,
      });
    }

    res.json({
      success: true,
      hasBid: false,
    });
  } catch (error) {
    console.error('[Bids] Error checking user bid:', error);
    res.status(500).json({ error: 'We are having trouble checking your offer. Just refresh and we will sort it!' });
  }
});

// PUT /api/bids/:id/confirm - Doer confirms they accept the accepted bid
router.put('/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const doerId = parseInt(req.userId || '0', 10);
    console.log('[Bids] PUT /api/bids/:id/confirm START:', { bidId, doerId });

    // Get the bid
    const bidResult = await db.query(
      'SELECT id, doer_id, errand_id, status FROM bids WHERE id = $1',
      [bidId]
    );
    console.log('[Bids] Bid found:', bidResult.rows.length > 0 ? bidResult.rows[0] : 'NOT FOUND');

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
    }

    const bid = bidResult.rows[0];

    // Verify the bid belongs to the current doer
    if (bid.doer_id !== doerId) {
      console.log('[Bids] Auth check failed:', { bidDoerId: bid.doer_id, currentDoerId: doerId });
      return res.status(403).json({ error: 'Not authorized to confirm this bid' });
    }

    // Check if bid is in accepted status
    if (bid.status !== 'accepted') {
      console.log('[Bids] Status check failed. Expected accepted, got:', bid.status);
      return res.status(400).json({ error: 'Bid must be in accepted status to confirm' });
    }

    console.log('[Bids] Updating bid to confirmed:', { bidId });
    // Update bid status to confirmed
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['confirmed', bidId]
    );
    console.log('[Bids] Bid updated to confirmed');

    // Close all other bids for this errand (set status to 'closed')
    await db.query(
      'UPDATE bids SET status = $1 WHERE errand_id = $2 AND id != $3',
      ['closed', bid.errand_id, bidId]
    );

    // Update errand status to 'confirmed' (awaiting doer to start)
    await db.query(
      'UPDATE errands SET status = $1 WHERE id = $2',
      ['confirmed', bid.errand_id]
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
    res.status(500).json({ error: 'Oops, we had a hiccup confirming your offer. Give it another go!' });
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
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
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
    res.status(500).json({ error: 'Oops, we had a hiccup confirming this offer. Give it another shot!' });
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
      return res.status(404).json({ error: 'Looks like this errand got taken care of or the neighbour changed their mind.' });
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
    res.status(500).json({ error: 'We are having trouble loading the offers. Just refresh and we will sort it!' });
  }
});

export default router;
