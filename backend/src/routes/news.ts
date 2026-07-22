import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import db from '../db.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface NewsItem {
  id?: string;
  type: 'community' | 'singapore' | 'errandify';
  title: string;
  content: string;
  category?: string;
  image?: string;
  source?: string;
  location?: string;
  postal_code?: string;
  author?: string;
  posted_by?: string;
  created_at?: string;
  url?: string;
}

/**
 * GET /api/news
 * Get all news (combined from all 3 sources)
 * Query params: type=community|singapore|errandify, limit=20, offset=0
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type = 'all', limit = 10000, offset = 0, postal_code } = req.query;
    const news: NewsItem[] = [];

    // Get CommunityNews
    if (type === 'all' || type === 'community') {
      const communityNews = await getCommunityNews(parseInt(limit as string), parseInt(offset as string), postal_code as string);
      news.push(...communityNews);
    }

    // Get SGNews
    if (type === 'all' || type === 'singapore') {
      const sgNews = await getSGNews(parseInt(limit as string), parseInt(offset as string));
      news.push(...sgNews);
    }

    // Get ErrandifyNews
    if (type === 'all' || type === 'errandify') {
      const errandifyNews = await getErrandifyNews(parseInt(limit as string), parseInt(offset as string));
      news.push(...errandifyNews);
    }

    // Sort by date (newest first)
    news.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

    res.json({
      success: true,
      data: news,
      total: news.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch news:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch news',
    });
  }
});

/**
 * GET /api/news/community
 * Get community news (hyperlocal neighborhood content)
 */
async function getCommunityNews(limit: number, offset: number, postal_code?: string): Promise<NewsItem[]> {
  try {
    const query = `
      SELECT
        id, 'community' as type, title, content, category,
        image, location, postal_code, posted_by as author,
        created_at
      FROM community_news
      WHERE status = 'published'
      ${postal_code ? `AND postal_code LIKE $1` : ''}
      ORDER BY created_at DESC
      LIMIT $${postal_code ? 2 : 1} OFFSET $${postal_code ? 3 : 2}
    `;

    const params = postal_code ? [postal_code, limit, offset] : [limit, offset];
    const result = await db.query(query, params);

    return result.rows.map((row: any) => ({
      ...row,
      type: 'community',
    }));
  } catch (error) {
    console.error('Error fetching community news:', error);
    return [];
  }
}

/**
 * GET /api/news/singapore
 * Get Singapore-wide news from NewsAPI
 */
async function getSGNews(_limit: number, _offset: number): Promise<NewsItem[]> {
  // Returns nothing until a real news source is wired up.
  //
  // This used to serve ~30 invented articles carrying fabricated statistics
  // attributed to real institutions — Ministry of Health, Ministry of Manpower,
  // Ministry of Education, IRAS, the Institute of Mental Health, EDB and the
  // Department of Statistics. Made-up figures under a ministry's name are not
  // placeholder content; they are misinformation, and they were rendering to
  // users on the MyKampung news tab.
  //
  // An empty Singapore feed is the honest state. Wire NewsAPI or an official
  // RSS feed here when there is a real source to cite.
  return [];
}

/**
 * GET /api/news/errandify
 * Get Errandify platform news and announcements
 */
async function getErrandifyNews(limit: number, offset: number): Promise<NewsItem[]> {
  try {
    const result = await db.query(
      `SELECT
        id, 'errandify' as type, title, content, category,
        image, source, created_at
       FROM errandify_news
       WHERE status = 'published'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map((row: any) => ({
      ...row,
      type: 'errandify',
    }));
  } catch (error) {
    // A database error means we do not know what the news is — say nothing
    // rather than substituting invented articles.
    console.error('Error fetching Errandify news:', error);
    return [];
  }
}

/**
 * POST /api/news/community
 * Create community news post
 */
// authMiddleware was missing here. The handler read `(req as any).user`, which
// is always undefined on this router — nothing populates it — so `user.id`
// threw a TypeError on every call and the endpoint could only ever 500. It was
// also an unauthenticated write that published straight to the feed.
router.post('/community', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { title, content, category, location, postal_code, image } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required',
      });
    }

    const result = await db.query(
      `INSERT INTO community_news
       (title, content, category, location, postal_code, posted_by, image, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [title, content, category, location, postal_code, userId, image, 'published']
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Failed to create community news:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create community news',
    });
  }
});

/**
 * POST /api/news/errandify
 * Create Errandify news (admin only)
 */
// The hand-rolled check below read `(req as any).user`, which nothing on this
// router populates, so `user?.role !== 'admin'` was always true and this
// endpoint returned 403 to everyone including admins. It also would have
// excluded super-admins had it worked. requireAdmin does both correctly.
router.post(
  '/errandify',
  authMiddleware,
  requireAdmin(['admin', 'super-admin']),
  async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, image, source } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required',
      });
    }

    const result = await db.query(
      `INSERT INTO errandify_news
       (title, content, category, image, source, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [title, content, category, image, source || 'Errandify Team', 'published']
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Failed to create Errandify news:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Errandify news',
    });
  }
});

/**
 * Editing and removing news.
 *
 * Both feeds could be written to and read from, but never corrected — a typo
 * in a community notice was permanent and there was no way to take anything
 * down. The table is chosen from the path so the two feeds cannot be mixed up:
 * /community/:id can never touch an Errandify item.
 */
const NEWS_TABLES: Record<string, string> = {
  community: 'community_news',
  errandify: 'errandify_news',
};

router.patch(
  '/:feed(community|errandify)/:id',
  authMiddleware,
  requireAdmin(['admin', 'super-admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const table = NEWS_TABLES[req.params.feed];
      const id = parseInt(req.params.id, 10);
      if (!table || Number.isNaN(id)) return res.status(400).json({ error: 'Invalid request' });

      const { title, content, category, image, status } = req.body || {};
      // Column list differs between the two tables, so only shared columns are
      // updated here; both carry these.
      const result = await db.query(
        `UPDATE ${table}
            SET title = COALESCE($1::varchar, title),
                content = COALESCE($2::text, content),
                category = COALESCE($3::varchar, category),
                image = COALESCE($4::text, image),
                status = COALESCE($5::varchar, status),
                updated_at = NOW()
          WHERE id = $6
          RETURNING id, title, status`,
        [title ?? null, content ?? null, category ?? null, image ?? null, status ?? null, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'That item no longer exists' });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Failed to update news item:', error);
      res.status(500).json({ success: false, error: 'Could not update that item' });
    }
  }
);

router.delete(
  '/:feed(community|errandify)/:id',
  authMiddleware,
  requireAdmin(['admin', 'super-admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const table = NEWS_TABLES[req.params.feed];
      const id = parseInt(req.params.id, 10);
      if (!table || Number.isNaN(id)) return res.status(400).json({ error: 'Invalid request' });

      const r = await db.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'That item no longer exists' });
      res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Failed to delete news item:', error);
      res.status(500).json({ success: false, error: 'Could not delete that item' });
    }
  }
);

// Mock data functions


export default router;
