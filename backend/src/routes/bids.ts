import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { notifyBidReceived, notifyBidAccepted, notifyBidRejected } from './notifications.js';

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

    if (errand.status !== 'open') {
      return res.status(400).json({ error: 'Errand is not open for bidding' });
    }

    // Prevent asker from bidding on their own errand
    if (errand.asker_id === doerId) {
      return res.status(403).json({ error: 'You cannot bid on your own errand' });
    }

    // Check if doer is verified and has clean declaration status
    const doerResult = await db.query(
      'SELECT declaration_status FROM users WHERE id = $1',
      [doerId]
    );

    if (doerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doer not found' });
    }

    // For sensitive task categories, require clean declaration status
    const sensitiveCategories = ['eldercare', 'childcare', 'home-help'];
    const categoryResult = await db.query(
      'SELECT category FROM errands WHERE id = $1',
      [task_id]
    );

    if (sensitiveCategories.includes(categoryResult.rows[0]?.category?.toLowerCase())) {
      if (doerResult.rows[0].declaration_status !== 'clean') {
        return res.status(403).json({ error: 'You must have a clean declaration status for this task' });
      }
    }

    // Create bid
    const bidResult = await db.query(
      `INSERT INTO bids (task_id, doer_id, amount, note, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, task_id, doer_id, amount, note, status, created_at`,
      [task_id, doerId, amount, note || null, 'pending']
    );

    const bid = bidResult.rows[0];

    // Get doer name for notification
    const doerNameResult = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [doerId]
    );
    const doerName = doerNameResult.rows[0]?.display_name || 'A user';

    // Send notification to asker
    await notifyBidReceived(errand.asker_id, doerName, amount);

    res.status(201).json({
      success: true,
      data: {
        id: bid.id,
        taskId: bid.task_id,
        doerId: bid.doer_id,
        doerName: doerNameResult.rows[0]?.display_name,
        amount: bid.amount,
        note: bid.note,
        status: bid.status,
        createdAt: bid.created_at,
      },
    });
  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

// GET /api/tasks/:id/bids - Get all bids for a task
router.get('/task/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Check if user is the asker of this task
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

    // Get all bids with doer info
    const bidsResult = await db.query(
      `SELECT b.*, u.display_name, u.avatar_url
       FROM bids b
       JOIN users u ON b.doer_id = u.id
       WHERE b.task_id = $1
       ORDER BY b.created_at DESC`,
      [taskId]
    );

    res.json({
      success: true,
      data: bidsResult.rows.map(bid => ({
        id: bid.id,
        taskId: bid.task_id,
        doerId: bid.doer_id,
        doerName: bid.display_name,
        doerAvatar: bid.avatar_url,
        amount: bid.amount,
        note: bid.note,
        status: bid.status,
        createdAt: bid.created_at,
      })),
    });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// POST /api/bids/:id/accept - Accept a bid
router.post('/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Get bid details
    const bidResult = await db.query(
      'SELECT * FROM bids WHERE id = $1',
      [id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Check if current user is the asker
    const errandResult = await db.query(
      'SELECT asker_id, status FROM errands WHERE id = $1',
      [bid.task_id]
    );

    if (errandResult.rows[0].asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can accept bids' });
    }

    if (errandResult.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Errand is no longer open' });
    }

    // Create dummy Stripe PaymentIntent
    const dummyStripeIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.round(bid.amount * 100), // Convert to cents
      currency: 'sgd',
      status: 'requires_payment_method',
      client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
      capture_method: 'manual',
    };

    // Update bid status to accepted
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['accepted', id]
    );

    // Update errand status to confirmed and store accepted_bid_id + stripe payment intent id
    await db.query(
      'UPDATE errands SET status = $1, accepted_bid_id = $2, stripe_payment_intent_id = $3 WHERE id = $4',
      ['confirmed', bid.id, dummyStripeIntent.id, bid.task_id]
    );

    // Reject all other bids for this task
    await db.query(
      'UPDATE bids SET status = $1 WHERE task_id = $2 AND id != $3',
      ['rejected', bid.task_id, id]
    );

    // Get errand title for notification
    const errandTitleResult = await db.query(
      'SELECT title FROM errands WHERE id = $1',
      [bid.task_id]
    );
    const errandTitle = errandTitleResult.rows[0]?.title || 'a task';

    // Notify accepted doer
    await notifyBidAccepted(bid.doer_id, errandTitle, bid.amount);

    res.json({
      success: true,
      data: {
        bidId: bid.id,
        taskId: bid.task_id,
        stripeIntent: dummyStripeIntent,
      },
    });
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// POST /api/bids/:id/reject - Reject a bid
router.post('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Get bid details
    const bidResult = await db.query(
      'SELECT * FROM bids WHERE id = $1',
      [id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Check if current user is the asker
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [bid.task_id]
    );

    if (errandResult.rows[0].asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can reject bids' });
    }

    // Update bid status to rejected
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['rejected', id]
    );

    // Get errand title for notification
    const errandTitleResult = await db.query(
      'SELECT title FROM errands WHERE id = $1',
      [bid.task_id]
    );
    const errandTitle = errandTitleResult.rows[0]?.title || 'a task';

    // Notify rejected doer
    await notifyBidRejected(bid.doer_id, errandTitle);

    res.json({
      success: true,
      data: { bidId: id, status: 'rejected' },
    });
  } catch (error) {
    console.error('Reject bid error:', error);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
});

// POST /api/tasks/:id/cancel - Cancel a task and handle refunds
router.post('/task/:taskId/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Get task details
    const errandResult = await db.query(
      'SELECT asker_id, status, accepted_bid_id, budget FROM errands WHERE id = $1',
      [taskId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Only asker can cancel
    if (errand.asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can cancel this errand' });
    }

    // If errand is not confirmed, just mark as cancelled
    if (errand.status !== 'confirmed' || !errand.accepted_bid_id) {
      await db.query(
        'UPDATE errands SET status = $1 WHERE id = $2',
        ['cancelled', taskId]
      );

      return res.json({
        success: true,
        data: { taskId, status: 'cancelled' },
      });
    }

    // Calculate penalty
    const budget = parseFloat(errand.budget) || 0;
    const penalty = Math.max(budget * 0.05, 5); // 5% or $5, whichever is higher
    const refundAmount = budget - penalty;

    // Get doer info from accepted bid
    const bidResult = await db.query(
      'SELECT doer_id FROM bids WHERE id = $1',
      [errand.accepted_bid_id]
    );

    const doerId = bidResult.rows[0].doer_id;

    // TODO: Stripe refund logic (currently dummy)
    // - Refund asker: refundAmount
    // - Transfer penalty to doer's Stripe Connect account

    // Update errand status
    await db.query(
      'UPDATE errands SET status = $1 WHERE id = $2',
      ['cancelled_by_asker', taskId]
    );

    res.json({
      success: true,
      data: {
        taskId,
        status: 'cancelled_by_asker',
        penalty,
        refundAmount,
      },
    });
  } catch (error) {
    console.error('Cancel task error:', error);
    res.status(500).json({ error: 'Failed to cancel task' });
  }
});

// GET /api/bids/my-bids - Get all bids placed by current doer
router.get('/my-bids', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doerId = parseInt(req.userId || '0', 10);

    // Get all bids for this doer with errand details
    const bidsResult = await db.query(
      `SELECT b.*, e.title, e.budget, e.category, u.display_name as asker_display_name, u.name as asker_name
       FROM bids b
       JOIN errands e ON b.task_id = e.id
       JOIN users u ON e.asker_id = u.id
       WHERE b.doer_id = $1
       ORDER BY b.created_at DESC`,
      [doerId]
    );

    res.json({
      success: true,
      data: bidsResult.rows.map(bid => ({
        id: bid.id,
        errand_id: bid.task_id,
        doer_id: bid.doer_id,
        amount: bid.amount,
        note: bid.note,
        status: bid.status,
        created_at: bid.created_at,
        errand: {
          title: bid.title,
          budget: bid.budget,
          category: bid.category,
          asker_name: bid.asker_name,
          asker_display_name: bid.asker_display_name,
        },
      })),
    });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

export default router;
