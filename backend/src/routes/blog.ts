import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/blog - Get all published blog posts (paginated)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, slug, title, subtitle, excerpt, featured_image_url, category,
             author, published_at, read_time_minutes, view_count
      FROM blog_posts
      WHERE is_published = true
    `;
    const params: any[] = [];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY published_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM blog_posts WHERE is_published = true';
    if (category) {
      countQuery += ` AND category = $1`;
      const countResult = await db.query(countQuery, [category]);
      const total = parseInt(countResult.rows[0].total);

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    const countResult = await db.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET /api/blog/categories - Get all blog categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT category, COUNT(*) as post_count
      FROM blog_posts
      WHERE is_published = true
      GROUP BY category
      ORDER BY post_count DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/blog/search - Search blog posts
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const result = await db.query(
      `SELECT id, slug, title, subtitle, excerpt, featured_image_url, published_at
       FROM blog_posts
       WHERE is_published = true AND (
         title ILIKE $1 OR subtitle ILIKE $1 OR excerpt ILIKE $1 OR content ILIKE $1
       )
       ORDER BY published_at DESC
       LIMIT 10`,
      [`%${query}%`]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Blog search error:', error);
    res.status(500).json({ error: 'Failed to search blog posts' });
  }
});

// GET /api/blog/sitemap.xml - XML Sitemap for search engines
router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT slug, published_at, updated_at FROM blog_posts
       WHERE is_published = true
       ORDER BY published_at DESC`
    );

    const baseUrl = 'https://errandify.sg';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    result.rows.forEach((post: any) => {
      const lastmod = new Date(post.updated_at || post.published_at).toISOString().split('T')[0];
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.type('application/xml').send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});
const adminOnly: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

/**
 * Blog authoring.
 *
 * blog.ts was read-only, and the admin Blog & Articles screen saved to
 * localStorage, so a post written there existed in one browser and the five
 * posts users actually see could not be edited by anyone.
 *
 * Slugs are the public identity of a post (/blog/:slug) and are generated from
 * the title when not supplied. They are not regenerated on later edits — a
 * slug that shifts when someone fixes a typo breaks every link already shared.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/** GET /api/blog/admin/all — drafts included. */
router.get('/admin/all', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, slug, title, subtitle, content, excerpt, category, author,
              is_published, published_at, view_count, read_time_minutes,
              featured_image_url, seo_keywords, seo_meta_description, created_at
         FROM blog_posts
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT 200`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Blog] Admin list failed:', error);
    res.status(500).json({ error: 'Could not load posts' });
  }
});

/** POST /api/blog — create a post. */
router.post('/', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, subtitle, content, excerpt, category, author,
      featured_image_url, read_time_minutes, is_published, slug,
      seo_keywords, seo_meta_description,
    } = req.body || {};

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const finalSlug = (slug?.trim() || slugify(title)) || `post-${Date.now()}`;
    const dupe = await db.query('SELECT id FROM blog_posts WHERE slug = $1', [finalSlug]);
    if (dupe.rows.length > 0) {
      return res.status(409).json({ error: 'A post with that web address already exists' });
    }

    const result = await db.query(
      `INSERT INTO blog_posts
         (slug, title, subtitle, content, excerpt, category, author,
          featured_image_url, read_time_minutes, is_published, published_at,
          seo_keywords, seo_meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               CASE WHEN $10::boolean THEN NOW() ELSE NULL END, $11, $12)
       RETURNING id, slug, title, is_published`,
      [finalSlug, title.trim(), subtitle || null, content.trim(), excerpt || null,
       category || 'Stories', author || 'Errandify', featured_image_url || null,
       read_time_minutes ?? null, Boolean(is_published),
       seo_keywords || null, seo_meta_description || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Blog] Create failed:', error);
    res.status(500).json({ error: 'Could not create that post' });
  }
});

/** PATCH /api/blog/:id — edit. Publishing stamps published_at once. */
router.patch('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });
    const {
      title, subtitle, content, excerpt, category, author,
      featured_image_url, read_time_minutes, is_published,
      seo_keywords, seo_meta_description,
    } = req.body || {};

    const result = await db.query(
      `UPDATE blog_posts
          SET title = COALESCE($1::varchar, title),
              subtitle = COALESCE($2::varchar, subtitle),
              content = COALESCE($3::text, content),
              excerpt = COALESCE($4::text, excerpt),
              category = COALESCE($5::varchar, category),
              author = COALESCE($6::varchar, author),
              featured_image_url = COALESCE($7::text, featured_image_url),
              read_time_minutes = COALESCE($8::int, read_time_minutes),
              is_published = COALESCE($9::boolean, is_published),
              seo_keywords = COALESCE($11::text, seo_keywords),
              seo_meta_description = COALESCE($12::text, seo_meta_description),
              -- first publish sets the date; re-publishing keeps the original
              published_at = CASE
                WHEN $9::boolean IS TRUE AND published_at IS NULL THEN NOW()
                ELSE published_at
              END,
              updated_at = NOW()
        WHERE id = $10
        RETURNING id, slug, title, is_published, published_at`,
      [title ?? null, subtitle ?? null, content ?? null, excerpt ?? null,
       category ?? null, author ?? null, featured_image_url ?? null,
       read_time_minutes ?? null,
       is_published === undefined ? null : Boolean(is_published), id,
       seo_keywords ?? null, seo_meta_description ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Blog] Update failed:', error);
    res.status(500).json({ error: 'Could not update that post' });
  }
});

/** DELETE /api/blog/:id */
router.delete('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });
    const r = await db.query('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Blog] Delete failed:', error);
    res.status(500).json({ error: 'Could not delete that post' });
  }
});

// Registered last: Express matches in registration order, and '/:slug'
// would otherwise swallow '/search' and '/sitemap.xml' as post slugs.

// GET /api/blog/:slug - Get single blog post by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const result = await db.query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND is_published = true`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const post = result.rows[0];

    // Increment view count
    await db.query(
      `UPDATE blog_posts SET view_count = view_count + 1 WHERE id = $1`,
      [post.id]
    );

    // Get related posts (same category)
    const relatedResult = await db.query(
      `SELECT id, slug, title, subtitle, featured_image_url, published_at, read_time_minutes
       FROM blog_posts
       WHERE category = $1 AND id != $2 AND is_published = true
       ORDER BY published_at DESC
       LIMIT 3`,
      [post.category, post.id]
    );

    res.json({
      success: true,
      data: {
        ...post,
        related_posts: relatedResult.rows,
      },
    });
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});


export default router;
