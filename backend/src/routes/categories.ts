import { Router, Request, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/categories - the 16 categories (single source of truth for the UI tiles)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT slug AS id, code, name, icon, color, description AS purpose, group_name AS "group"
       FROM category_codes ORDER BY sort_order`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[categories] Failed to load:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

/**
 * GET /api/categories/stats — per-category performance for the admin screen.
 *
 * That screen printed a hardcoded five-row table of GMV, errand counts and
 * ratings that had never come from anywhere. The figures here are computed off
 * the errands themselves, and every one of the 16 categories is returned even
 * when it has no activity, so an empty category reads as a real zero rather
 * than being silently missing.
 *
 * GMV counts completed errands only — budget on an open errand is an intention,
 * not money that moved.
 */
router.get('/stats', authMiddleware, requireAdmin(), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT cc.slug, cc.name, cc.icon, cc.code,
              COUNT(e.id)::int AS total_errands,
              COUNT(e.id) FILTER (WHERE e.status = 'open')::int      AS open_errands,
              COUNT(e.id) FILTER (WHERE e.status = 'completed')::int AS completed_errands,
              COALESCE(SUM(e.budget) FILTER (WHERE e.status = 'completed'), 0)::float AS gmv,
              ROUND(AVG(r.rating) FILTER (WHERE r.rating IS NOT NULL), 2)::float      AS avg_rating,
              COUNT(DISTINCT r.id)::int AS rating_count
         FROM category_codes cc
         LEFT JOIN errands e ON e.category = cc.slug
         LEFT JOIN ratings  r ON r.errand_id = e.id
        GROUP BY cc.slug, cc.name, cc.icon, cc.code, cc.sort_order
        ORDER BY cc.sort_order`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[categories] Failed to load stats:', err);
    res.status(500).json({ success: false, error: 'Failed to load category stats' });
  }
});

export default router;
