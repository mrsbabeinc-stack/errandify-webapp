import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET user's category preferences
router.get('/:userId/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId ? parseInt(req.userId, 10) : null;

    // Users can only view their own preferences
    if (parseInt(userId) !== requestingUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await db.query(
      `SELECT category_can_help, category_need_help FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { canHelp: [], needHelp: [] },
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        canHelp: user.category_can_help || [],
        needHelp: user.category_need_help || [],
      },
    });
  } catch (error) {
    console.error('Get category preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// POST/UPDATE user's category preferences
router.post('/:userId/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { canHelp, needHelp } = req.body;
    const requestingUserId = req.userId ? parseInt(req.userId, 10) : null;

    // Users can only update their own preferences
    if (parseInt(userId) !== requestingUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.query(
      `UPDATE users
       SET category_can_help = $1, category_need_help = $2, updated_at = NOW()
       WHERE id = $3`,
      [canHelp || [], needHelp || [], userId]
    );

    res.json({
      success: true,
      message: 'Preferences saved successfully',
      data: { canHelp, needHelp },
    });
  } catch (error) {
    console.error('Update category preferences error:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// AI: Suggest categories based on user's job history
router.post('/:userId/suggest-categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId ? parseInt(req.userId, 10) : null;

    if (parseInt(userId) !== requestingUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Analyze user's errand history
    const doerResult = await db.query(
      `SELECT category, COUNT(*) as count
       FROM errands e
       INNER JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE ea.doer_id = $1 AND ea.status IN ('completed', 'in_progress')
       GROUP BY category
       ORDER BY count DESC
       LIMIT 3`,
      [userId]
    );

    const askerResult = await db.query(
      `SELECT category, COUNT(*) as count
       FROM errands
       WHERE asker_id = $1 AND status IN ('open', 'confirmed')
       GROUP BY category
       ORDER BY count DESC
       LIMIT 3`,
      [userId]
    );

    const doerCategories = doerResult.rows.map(row => row.category);
    const askerCategories = askerResult.rows.map(row => row.category);

    // Calculate relevance scores
    const scores: Record<string, number> = {};
    doerResult.rows.forEach((row, idx) => {
      scores[row.category] = 100 - idx * 20; // 100, 80, 60
    });
    askerResult.rows.forEach((row, idx) => {
      scores[row.category] = Math.max(scores[row.category] || 0, 100 - idx * 20);
    });

    // Generate AI insight message
    let insight = '';
    if (doerCategories.length > 0) {
      const topCategory = doerCategories[0];
      insight = `📊 Based on your ${doerResult.rows.length} completed tasks, you're great at ${topCategory}! We've marked this as a specialization. You can adjust below.`;
    } else if (askerCategories.length > 0) {
      const topCategory = askerCategories[0];
      insight = `📊 We noticed you often need help with ${topCategory}. We've marked this below so we can recommend great doers!`;
    } else {
      insight = '🎯 Start completing tasks to get personalized category suggestions!';
    }

    res.json({
      success: true,
      data: {
        doerCategories,
        askerCategories,
        insight,
        scores,
      },
    });
  } catch (error) {
    console.error('Suggest categories error:', error);
    res.status(500).json({ error: 'Failed to suggest categories' });
  }
});

export default router;
