import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

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

    // Return mock bid (bids table not yet created)
    res.status(201).json({
      success: true,
      data: {
        id: Math.random().toString(36).substr(2, 9),
        task_id,
        doer_id: doerId,
        amount,
        note: note || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Bids] Error creating bid:', error);
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

// GET /api/bids/task/:taskId - Get all bids for a task (disabled)
router.get('/task/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});

// POST /api/bids/:id/accept - Accept a bid (disabled)
router.post('/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Bid acceptance not yet implemented' });
});

// POST /api/bids/:id/reject - Reject a bid (disabled)
router.post('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Bid rejection not yet implemented' });
});

export default router;
