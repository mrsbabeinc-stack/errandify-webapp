import { Router, Request, Response } from 'express';
import db from '../db.js';

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

export default router;
