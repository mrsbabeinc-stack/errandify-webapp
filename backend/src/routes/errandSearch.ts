import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/errands/search - Disabled, use GET /api/errands instead
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      errands: [],
      total: 0,
      hasMore: false,
    },
  });
});

// GET /api/errands/search/suggestions - Disabled
router.get('/search/suggestions', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      searchTerms: [],
      categories: [],
      aiInsight: '',
    },
  });
});

// GET /api/errands/categories - Disabled
router.get('/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      categories: [
        { name: 'home-maintenance', taskCount: 0, openTasks: 0, avgBudget: 0 },
        { name: 'cleaning-laundry', taskCount: 0, openTasks: 0, avgBudget: 0 },
        { name: 'childcare-tutoring', taskCount: 0, openTasks: 0, avgBudget: 0 },
      ],
    },
  });
});

export default router;
