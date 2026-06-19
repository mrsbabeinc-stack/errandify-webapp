import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { notifyBidReceived, notifyBidAccepted, notifyBidRejected, notifyTaskReopenedAfterCancellation, createNotification } from './notifications.js';

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

// POST /api/bids/:id/cancel - Doer cancels accepted bid and reopens task
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const doerId = parseInt(req.userId || '0', 10);
    const { reason } = req.body;

    // Get bid details
    const bidResult = await db.query(
      'SELECT * FROM bids WHERE id = $1',
      [id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Verify doer owns the bid
    if (bid.doer_id !== doerId) {
      return res.status(403).json({ error: 'Only the doer can cancel this bid' });
    }

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, title, status FROM errands WHERE id = $1',
      [bid.task_id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Can only cancel if not yet started (confirmed or pending payment)
    if (errand.status !== 'confirmed' && errand.status !== 'in_progress') {
      return res.status(400).json({ error: 'Cannot cancel bid at this stage' });
    }

    // Update bid status to cancelled_by_doer
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['cancelled_by_doer', id]
    );

    // Revert errand to open
    await db.query(
      'UPDATE errands SET status = $1, accepted_bid_id = NULL WHERE id = $2',
      ['open', bid.task_id]
    );

    // Get all other rejected bids on this task (previous bidders)
    const rejectedBidsResult = await db.query(
      `SELECT DISTINCT b.id, b.doer_id, b.amount
       FROM bids b
       WHERE b.task_id = $1 AND b.status = $2 AND b.doer_id != $3`,
      [bid.task_id, 'rejected', doerId]
    );

    // Notify previous bidders that task is available again
    for (const rejectedBid of rejectedBidsResult.rows) {
      await notifyTaskReopenedAfterCancellation(
        rejectedBid.doer_id,
        errand.title,
        rejectedBid.amount,
        errand.id
      );
    }

    // Notify asker
    const askerResult = await db.query(
      'SELECT id FROM users WHERE id = (SELECT asker_id FROM errands WHERE id = $1)',
      [bid.task_id]
    );

    if (askerResult.rows.length > 0) {
      await createNotification(
        askerResult.rows[0].id,
        'task_doer_cancelled',
        '⚠️ Doer Cancelled',
        `The doer cancelled "${errand.title}". Previous bidders have been notified.`,
        null
      );
    }

    res.json({
      success: true,
      data: {
        bidId: id,
        status: 'cancelled_by_doer',
        notifiedCount: rejectedBidsResult.rows.length,
      },
    });
  } catch (error) {
    console.error('Cancel bid error:', error);
    res.status(500).json({ error: 'Failed to cancel bid' });
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

// POST /api/bids/recurring-sessions - Accept specific sessions of recurring errand
router.post('/recurring-sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doerId = parseInt(req.userId || '0', 10);
    const { errandId, selectedSessionIds } = req.body;

    if (!errandId || !Array.isArray(selectedSessionIds) || selectedSessionIds.length === 0) {
      return res.status(400).json({ error: 'errandId and selectedSessionIds required' });
    }

    // Check if errand exists and is recurring
    const errandResult = await db.query(
      'SELECT id, is_recurring, asker_id FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    if (!errand.is_recurring) {
      return res.status(400).json({ error: 'This is not a recurring errand' });
    }

    // Get all sessions for this errand
    const sessionsResult = await db.query(
      'SELECT id, session_number, start_date FROM errand_sessions WHERE errand_id = $1 ORDER BY session_number',
      [errandId]
    );

    const allSessions = sessionsResult.rows;

    // Validate selected session IDs exist for this errand
    const validSessionIds = new Set(allSessions.map((s) => s.id));
    for (const sessionId of selectedSessionIds) {
      if (!validSessionIds.has(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID for this errand' });
      }
    }

    // Create assignments for selected sessions
    const assignments = [];
    for (const sessionId of selectedSessionIds) {
      const assignmentResult = await db.query(
        `INSERT INTO errand_assignments (errand_id, doer_id, session_id, status, is_partial_recurring, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, session_id, status`,
        [errandId, doerId, sessionId, 'accepted', true]
      );
      assignments.push(assignmentResult.rows[0]);
    }

    // Get session details for response
    const sessionDetails = allSessions.filter((s) => selectedSessionIds.includes(s.id));

    res.status(201).json({
      success: true,
      data: {
        errandId,
        doerId,
        totalSessions: allSessions.length,
        acceptedSessions: selectedSessionIds.length,
        assignments: assignments,
        sessionDetails: sessionDetails.map((s) => ({
          id: s.id,
          sessionNumber: s.session_number,
          startDate: s.start_date,
        })),
        message: `Accepted ${selectedSessionIds.length} of ${allSessions.length} sessions`,
      },
    });
  } catch (error) {
    console.error('Recurring sessions bid error:', error);
    res.status(500).json({ error: 'Failed to accept recurring errand sessions' });
  }
});

// GET /api/bids/recurring/:errandId - Get recurring errand sessions for selection
router.get('/recurring/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;

    // Check if errand exists and is recurring
    const errandResult = await db.query(
      'SELECT id, title, is_recurring, budget, category FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    if (!errand.is_recurring) {
      return res.status(400).json({ error: 'This is not a recurring errand' });
    }

    // Get all sessions
    const sessionsResult = await db.query(
      'SELECT id, session_number, start_date, deadline, status FROM errand_sessions WHERE errand_id = $1 ORDER BY session_number',
      [errandId]
    );

    const sessions = sessionsResult.rows;

    res.json({
      success: true,
      data: {
        errand: {
          id: errand.id,
          title: errand.title,
          category: errand.category,
          budget: errand.budget,
          totalSessions: sessions.length,
        },
        sessions: sessions.map((s) => ({
          id: s.id,
          sessionNumber: s.session_number,
          startDate: s.start_date,
          deadline: s.deadline,
          status: s.status,
        })),
      },
    });
  } catch (error) {
    console.error('Get recurring errand error:', error);
    res.status(500).json({ error: 'Failed to get recurring errand details' });
  }
});

export default router;
