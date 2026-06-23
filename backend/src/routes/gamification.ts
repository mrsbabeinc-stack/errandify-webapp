import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getUserGamification, getEpTransactions } from '../services/gamificationService.js';

const router = Router();

// GET /api/gamification/me - Get current user's gamification stats
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const gamification = await getUserGamification(userId);

    res.json({
      success: true,
      data: gamification,
    });
  } catch (error) {
    console.error('Get gamification error:', error);
    res.status(500).json({ error: 'Failed to get gamification stats' });
  }
});

// GET /api/gamification/:userId - Get any user's gamification stats (public)
router.get('/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    const gamification = await getUserGamification(userId);

    res.json({
      success: true,
      data: gamification,
    });
  } catch (error) {
    console.error('Get user gamification error:', error);
    res.status(500).json({ error: 'Failed to get user gamification stats' });
  }
});

// GET /api/gamification/transactions/me - Get current user's EP transaction history
router.get('/transactions/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const transactions = await getEpTransactions(userId, limit);

    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

export default router;
