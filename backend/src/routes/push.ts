import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// POST /api/push/subscribe - Save push subscription
router.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Save subscription to database
    await db.query(
      // The columns are auth_key and p256dh_key. Written as auth/p256dh, this
      // threw on every subscribe, so no browser push subscription has ever been
      // stored — which means web push has never delivered anything to anyone.
      `INSERT INTO push_subscriptions (user_id, endpoint, auth_key, p256dh_key, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, endpoint) DO UPDATE SET
       auth_key = $3,
       p256dh_key = $4,
       updated_at = NOW()`,
      [
        userId,
        subscription.endpoint,
        subscription.keys?.auth || null,
        subscription.keys?.p256dh || null,
      ]
    );

    res.json({
      success: true,
      data: { message: 'Push subscription saved' },
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// POST /api/push/unsubscribe - Remove push subscription
router.post('/unsubscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await db.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );

    res.json({
      success: true,
      data: { message: 'Push subscription removed' },
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// GET /api/push/subscriptions - Get user's subscriptions (for testing)
router.get('/subscriptions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      'SELECT id, endpoint, created_at FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      data: {
        subscriptions: result.rows,
      },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

export default router;
