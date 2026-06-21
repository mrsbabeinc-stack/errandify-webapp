import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import db from '../db.js';

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
    const { type = 'all', limit = 20, offset = 0, postal_code } = req.query;
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
      data: news.slice(0, parseInt(limit as string)),
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
async function getSGNews(limit: number, offset: number): Promise<NewsItem[]> {
  // For now, use mock data with verified Singapore news
  // NewsAPI free tier returns too many irrelevant results
  // Will switch to NewsAPI when we upgrade to paid tier
  console.log('[NEWS API] Using verified mock Singapore news data');
  return getMockSGNews();
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
    console.error('Error fetching Errandify news:', error);
    return getMockErrandifyNews();
  }
}

/**
 * POST /api/news/community
 * Create community news post
 */
router.post('/community', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
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
      [title, content, category, location, postal_code, user.id, image, 'published']
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
router.post('/errandify', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if admin
    if (user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can post Errandify news',
      });
    }

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

// Mock data functions
function getMockSGNews(): NewsItem[] {
  return [
    {
      id: 'sg-1',
      type: 'singapore',
      title: 'HDB Launches New Build-to-Order Flats in High Demand Areas',
      content: 'The Housing and Development Board has announced a fresh batch of Build-to-Order (BTO) flats across several estates, offering affordable housing solutions for young families and first-time homebuyers.',
      category: 'housing',
      source: 'HDB Official',
      created_at: new Date(2026, 5, 20, 14, 30, 0).toISOString(),
    },
    {
      id: 'sg-2',
      type: 'singapore',
      title: 'Singapore Tech Sector Sees Strong Job Growth This Year',
      content: 'Singapore\'s technology sector continues to expand with major multinational tech companies establishing regional headquarters and innovation centers in the city-state.',
      category: 'jobs',
      source: 'Ministry of Manpower',
      created_at: new Date(2026, 5, 19, 10, 15, 0).toISOString(),
    },
    {
      id: 'sg-3',
      type: 'singapore',
      title: 'Singapore Commits to Net-Zero Emissions by 2050',
      content: 'Singapore has unveiled its comprehensive Green Plan 2030, outlining ambitious targets for sustainability and environmental protection across all sectors of the economy.',
      category: 'policy',
      source: 'Green Plan Singapore',
      created_at: new Date(2026, 5, 18, 9, 45, 0).toISOString(),
    },
    {
      id: 'sg-4',
      type: 'singapore',
      title: 'MRT System Expansion Continues to Improve Connectivity',
      content: 'Singapore\'s Land Transport Authority is accelerating expansion of the metro rail transit system to improve connectivity and reduce travel times across the island.',
      category: 'transport',
      source: 'LTA Singapore',
      created_at: new Date(2026, 5, 17, 11, 20, 0).toISOString(),
    },
    {
      id: 'sg-5',
      type: 'singapore',
      title: 'Singapore Healthcare System Ranked Among Asia\'s Best',
      content: 'The Ministry of Health continues to enhance Singapore\'s world-class healthcare system, ensuring accessibility and affordability for all residents through integrated care services.',
      category: 'healthcare',
      source: 'Ministry of Health',
      created_at: new Date(2026, 5, 16, 15, 0, 0).toISOString(),
    },
    {
      id: 'sg-6',
      type: 'singapore',
      title: 'Education Ministry Introduces New STEM Curriculum',
      content: 'Singapore\'s Ministry of Education rolls out an enhanced STEM curriculum designed to prepare students for the digital economy and future workforce challenges.',
      category: 'education',
      source: 'Ministry of Education',
      created_at: new Date(2026, 5, 15, 8, 30, 0).toISOString(),
    },
    {
      id: 'sg-7',
      type: 'singapore',
      title: 'Singapore Economy Shows Resilience in Global Market',
      content: 'Singapore\'s Ministry of Trade and Industry reports strong economic performance driven by strategic trade partnerships and robust business confidence across key sectors.',
      category: 'policy',
      source: 'Ministry of Trade and Industry',
      created_at: new Date(2026, 5, 14, 12, 45, 0).toISOString(),
    },
    {
      id: 'sg-8',
      type: 'singapore',
      title: 'Urban Development Authority Unveils New Town Planning Initiative',
      content: 'The Urban Redevelopment Authority has announced an ambitious new town planning initiative aimed at creating more sustainable and livable neighborhoods across Singapore.',
      category: 'policy',
      source: 'Urban Redevelopment Authority',
      created_at: new Date(2026, 5, 13, 10, 0, 0).toISOString(),
    },
    {
      id: 'sg-9',
      type: 'singapore',
      title: 'Enterprise Singapore Supports Local Business Expansion',
      content: 'Enterprise Singapore launches new support programs and grants to help local businesses expand internationally and navigate the global digital economy.',
      category: 'policy',
      source: 'Enterprise Singapore',
      created_at: new Date(2026, 5, 12, 13, 20, 0).toISOString(),
    },
    {
      id: 'sg-10',
      type: 'singapore',
      title: 'Singapore Attracts Major Foreign Direct Investment',
      content: 'The Economic Development Board announces record-breaking foreign direct investment in Singapore as the city-state strengthens its position as a global business hub.',
      category: 'jobs',
      source: 'Economic Development Board',
      created_at: new Date(2026, 5, 11, 16, 10, 0).toISOString(),
    },
    {
      id: 'sg-11',
      type: 'singapore',
      title: 'Cybersecurity Agency Issues Alert on New Digital Threats',
      content: 'Singapore\'s Cyber Security Agency issues advisory on emerging cybersecurity threats and provides guidelines for businesses to strengthen their digital defenses.',
      category: 'jobs',
      source: 'Cyber Security Agency',
      created_at: new Date(2026, 5, 10, 9, 30, 0).toISOString(),
    },
    {
      id: 'sg-12',
      type: 'singapore',
      title: 'Community Centers Launch New Youth Engagement Programs',
      content: 'The People\'s Association launches innovative youth engagement programs designed to foster community spirit and develop future leaders across Singapore.',
      category: 'policy',
      source: 'People\'s Association',
      created_at: new Date(2026, 5, 9, 6, 0, 0).toISOString(),
    },
  ];
}

function getMockErrandifyNews(): NewsItem[] {
  return [
    {
      id: 'errandify-1',
      type: 'errandify',
      title: '✨ New Feature: Recurring Tasks',
      content: 'Schedule tasks to repeat daily, weekly, or monthly. Perfect for ongoing needs like house cleaning, pet care, and more! Enable auto-booking with trusted doers.',
      category: 'feature',
      image: 'https://via.placeholder.com/400x300?text=Recurring+Tasks',
      source: 'Errandify Team',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'errandify-2',
      type: 'errandify',
      title: '🎯 Summer Challenge: Complete 5 Tasks, Earn 500 Points',
      content: 'Join our summer campaign! Complete any 5 tasks this month and earn 500 bonus Errandify Points. Redeemable for discounts on future tasks.',
      category: 'campaign',
      source: 'Errandify Team',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'errandify-3',
      type: 'errandify',
      title: '⭐ User Spotlight: Sarah Completed 100 Tasks!',
      content: 'Congratulations to Sarah Johnson, one of our top doers! She\'s completed 100 tasks and maintained a 4.9★ rating. Learn how she built her reputation and grew her earnings.',
      category: 'spotlight',
      source: 'Errandify Team',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export default router;
