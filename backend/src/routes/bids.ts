import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';

const router = Router();

// POST /api/bids - Submit a bid
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { task_id, amount, note } = req.body;
    const doerId = parseInt(req.userId || '0', 10);

    if (!task_id || !amount) {
      return res.status(400).json({ error: 'task_id and amount required' });
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
      'SELECT id FROM bids WHERE errand_id = $1 AND doer_id = $2',
      [task_id, doerId]
    );

    let bid;
    if (existingBidResult.rows.length > 0) {
      // Update existing bid
      const bidId = existingBidResult.rows[0].id;
      await db.query(
        'UPDATE bids SET amount = $1, note = $2, updated_at = NOW() WHERE id = $3',
        [parseFloat(amount), note || null, bidId]
      );
      const updated = await db.query('SELECT * FROM bids WHERE id = $1', [bidId]);
      bid = updated.rows[0];
    } else {
      // Create new bid
      const result = await db.query(
        'INSERT INTO bids (errand_id, doer_id, amount, note, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [task_id, doerId, parseFloat(amount), note || null, 'pending']
      );
      bid = result.rows[0];

      // Send notification to asker about new bid
      try {
        const errandData = await db.query(
          'SELECT title FROM errands WHERE id = $1',
          [task_id]
        );
        const errandTitle = errandData.rows[0]?.title || 'Your task';

        await db.query(
          `INSERT INTO notifications (user_id, type, title, body, action_url, created_at, read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            errand.asker_id,
            'bid_received',
            '💰 New Bid Received',
            `${doerName} bid $${parseFloat(amount)} on "${errandTitle}"`,
            `/errand/${task_id}`,
          ]
        );
      } catch (notifErr) {
        console.warn('[Bids] Failed to send notification:', notifErr);
        // Don't fail the entire request if notification fails
      }
    }

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
    const currentUserId = parseInt(req.userId || '0', 10);

    // Verify user is the asker of this task
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [taskId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (errandResult.rows[0].asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can view bids' });
    }

    // Get bids from database
    const bidsResult = await db.query(
      `SELECT b.id, b.errand_id as taskId, b.doer_id as doerId, u.display_name as doerName,
              b.amount, b.note, b.status, b.created_at as createdAt
       FROM bids b
       JOIN users u ON b.doer_id = u.id
       WHERE b.errand_id = $1
       ORDER BY b.created_at DESC`,
      [taskId]
    );

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

    // Update errand status to 'confirmed' and set 24h confirmation deadline
    await db.query(
      'UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL \'24 hours\' WHERE id = $3',
      ['confirmed', id, bid.errand_id]
    );

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
      await axios.post(
        `http://localhost:3000/api/notifications`,
        {
          recipientId: bid.doer_id,
          type: 'bid_rejected',
          title: 'Bid Rejected',
          message: `Your bid of $${bid.amount} was rejected${reasonText ? `: ${reasonText}` : ''}`,
          taskId: bid.errand_id,
        }
      );
    } catch (notifErr) {
      console.error('Failed to send rejection notification:', notifErr);
    }

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

    // Get user info
    const userResult = await db.query(
      'SELECT id, display_name FROM users WHERE id = $1',
      [userId]
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
      [userId]
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

    const result = await db.query(
      `SELECT b.*,
              e.title, e.budget, e.category,
              u.display_name as asker_name
       FROM bids b
       JOIN errands e ON b.errand_id = e.id
       JOIN users u ON e.asker_id = u.id
       WHERE b.doer_id = $1
       ORDER BY b.created_at DESC`,
      [doerId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        errand_id: row.errand_id,
        doer_id: row.doer_id,
        amount: row.amount,
        note: row.note,
        status: row.status,
        created_at: row.created_at,
        errand: {
          title: row.title,
          budget: row.budget,
          category: row.category,
          asker_name: row.asker_name,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching my bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

export default router;
