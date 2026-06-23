import { Router, Request, Response } from 'express';
import db from '../db.js';

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

export default router;
