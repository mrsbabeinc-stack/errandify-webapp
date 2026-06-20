import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';

const router = Router();

// POST /api/bids - Submit a bid (returns mock response - bids table not created yet)
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

    // Get doer info
    const doerResult = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [doerId]
    );
    const doerName = doerResult.rows[0]?.display_name || 'Anonymous';

    // Create mock bid and store it
    const bid = {
      id: Math.random().toString(36).substr(2, 9),
      taskId: task_id,
      doerId: doerId,
      doerName: doerName,
      amount: parseFloat(amount),
      note: note || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Store bid in mock storage
    if (!mockBids[task_id]) {
      mockBids[task_id] = [];
    }
    mockBids[task_id].push(bid);

    res.status(201).json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('[Bids] Error creating bid:', error);
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

// Mock storage for bids (in memory - will be lost on server restart)
const mockBids: Record<string, any[]> = {};

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

    // Return mock bids for this task
    const taskBids = mockBids[taskId] || [];
    res.json({ success: true, data: taskBids });
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

    // Find the bid in mock storage
    let bid = null;
    let taskId = null;
    for (const tId in mockBids) {
      const found = mockBids[tId].find(b => b.id === id);
      if (found) {
        bid = found;
        taskId = tId;
        break;
      }
    }

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Verify user is the asker
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [taskId]
    );

    if (errandResult.rows[0].asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can accept bids' });
    }

    // Update bid status
    bid.status = 'accepted';

    // Update errand status to 'confirmed' and set 24h confirmation deadline
    await db.query(
      'UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL \'24 hours\' WHERE id = $3',
      ['confirmed', bid.id, taskId]
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

    // Find the bid in mock storage
    let bid = null;
    let taskId = null;
    for (const tId in mockBids) {
      const found = mockBids[tId].find(b => b.id === id);
      if (found) {
        bid = found;
        taskId = tId;
        break;
      }
    }

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Verify user is the asker
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [taskId]
    );

    if (errandResult.rows[0].asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can reject bids' });
    }

    // Update bid status with rejection reason
    bid.status = 'rejected';
    bid.rejectionReason = reason;
    bid.customReason = custom_reason;
    bid.rejectedAt = new Date().toISOString();

    // Send notification to doer with reason
    try {
      await axios.post(
        `http://localhost:3000/api/notifications`,
        {
          recipientId: bid.doerId,
          type: 'bid_rejected',
          title: 'Bid Rejected',
          message: `Your bid of $${bid.amount} was rejected${reason ? `: ${reason}${custom_reason ? ` - ${custom_reason}` : ''}` : ''}`,
          taskId,
        }
      );
    } catch (notifErr) {
      console.error('Failed to send rejection notification:', notifErr);
    }

    res.json({ success: true, data: bid });
  } catch (error) {
    console.error('[Bids] Error rejecting bid:', error);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
});

export default router;
