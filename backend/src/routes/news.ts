import { Router, Request, Response } from 'express';
import axios from 'axios';
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
  try {
    const apiKey = process.env.NEWS_API_KEY || '';
    if (!apiKey || apiKey === '4b8d2c7f9e1a6b3c5d8f2a4e7c9b1d3f') {
      console.warn('NEWS_API_KEY not configured or using placeholder, using mock data');
      return getMockSGNews();
    }

    console.log('[NEWS API] Fetching Singapore news with key:', apiKey.substring(0, 10) + '...');

    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'Singapore policy OR housing OR jobs OR transport OR technology',
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: Math.min(limit, 100),
        page: Math.floor(offset / Math.min(limit, 100)) + 1,
        apiKey: apiKey,
      },
      timeout: 8000,
    });

    if (!response.data.articles || response.data.articles.length === 0) {
      console.log('[NEWS API] No articles returned, using mock data');
      return getMockSGNews();
    }

    console.log(`[NEWS API] Got ${response.data.articles.length} articles from NewsAPI`);

    // Categorize articles based on keywords
    const categorizeArticle = (title: string, content: string): string => {
      const text = (title + ' ' + content).toLowerCase();
      if (text.includes('hdb') || text.includes('housing') || text.includes('flat') || text.includes('bto')) return 'housing';
      if (text.includes('job') || text.includes('employment') || text.includes('career') || text.includes('salary')) return 'jobs';
      if (text.includes('transport') || text.includes('mrt') || text.includes('lrt') || text.includes('ev') || text.includes('charging')) return 'transport';
      if (text.includes('health') || text.includes('medical') || text.includes('healthcare') || text.includes('hospital')) return 'healthcare';
      if (text.includes('education') || text.includes('school') || text.includes('university') || text.includes('student')) return 'education';
      if (text.includes('economy') || text.includes('growth') || text.includes('business') || text.includes('gdp')) return 'policy';
      if (text.includes('green') || text.includes('environment') || text.includes('sustainable') || text.includes('climate')) return 'policy';
      if (text.includes('tech') || text.includes('digital') || text.includes('ai') || text.includes('innovation')) return 'jobs';
      return 'policy';
    };

    return response.data.articles
      .slice(0, limit)
      .map((article: any, index: number) => ({
        id: `sg-api-${index}-${article.url.substring(article.url.length - 20)}`,
        type: 'singapore',
        title: article.title,
        content: article.description || article.content || 'Read the full story for details.',
        category: categorizeArticle(article.title, article.description || ''),
        source: article.source?.name || 'Singapore News',
        image: article.urlToImage,
        url: article.url,
        created_at: new Date(article.publishedAt).toISOString(),
        author: article.author,
      }));
  } catch (error: any) {
    console.error('[NEWS API] Error fetching Singapore news:', error.message);
    if (error.response?.status === 401) {
      console.error('[NEWS API] Invalid API key');
    } else if (error.response?.status === 429) {
      console.error('[NEWS API] Rate limit exceeded');
    }
    return getMockSGNews();
  }
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
      title: 'HDB Launches New Build-to-Order Flats - Apply Now',
      content: 'HDB opens applications for new Build-to-Order flats in multiple locations. Flexible payment schemes available for first-time homebuyers. Visit HDB website for details on latest projects and eligibility requirements.',
      category: 'housing',
      source: 'Housing & Development Board',
      url: 'https://www.hdb.gov.sg/cs/infoweb/residential/buying-a-flat/finding-out-more',
      created_at: new Date(2026, 5, 20, 14, 30, 0).toISOString(),
    },
    {
      id: 'sg-2',
      type: 'singapore',
      title: 'Ministry of Manpower Career Support & Job Matching Services',
      content: 'MOM provides free career guidance and job matching services to help Singaporeans find suitable employment. Contact local Career Centre for personalized assistance and training programs.',
      category: 'jobs',
      source: 'Ministry of Manpower',
      url: 'https://www.mom.gov.sg/main',
      created_at: new Date(2026, 5, 19, 10, 15, 0).toISOString(),
    },
    {
      id: 'sg-3',
      type: 'singapore',
      title: 'Singapore Green Plan 2030 - Sustainability Roadmap',
      content: 'Government launches comprehensive Green Plan 2030 to achieve net-zero emissions by 2050. Key initiatives include expanding green spaces, promoting renewable energy, and sustainable living practices.',
      category: 'policy',
      source: 'Ministry of Sustainability and Environment',
      url: 'https://www.mse.gov.sg/policies/environmental-management/singapore-green-plan-2030',
      created_at: new Date(2026, 5, 18, 9, 45, 0).toISOString(),
    },
    {
      id: 'sg-4',
      type: 'singapore',
      title: 'LTA Public Transport - Plan Your Journey Efficiently',
      content: 'Land Transport Authority maintains Singapore\'s world-class public transport system. Check LTA website for real-time updates, service schedules, and fares for MRT, LRT, and bus services.',
      category: 'transport',
      source: 'Land Transport Authority',
      url: 'https://www.lta.gov.sg/content/ltagov/en/public_transport.html',
      created_at: new Date(2026, 5, 17, 11, 20, 0).toISOString(),
    },
    {
      id: 'sg-5',
      type: 'singapore',
      title: 'MOH Healthcare Services - Integrated Care for All',
      content: 'Ministry of Health provides comprehensive healthcare services including subsidized treatment at polyclinics and hospitals. Eligible citizens enjoy affordable medical care through subsidy schemes.',
      category: 'healthcare',
      source: 'Ministry of Health',
      url: 'https://www.moh.gov.sg/home',
      created_at: new Date(2026, 5, 16, 15, 0, 0).toISOString(),
    },
    {
      id: 'sg-6',
      type: 'singapore',
      title: 'MOE - Excellence in Education for Every Child',
      content: 'Ministry of Education oversees the national education system. Provides quality education from primary through tertiary levels. Visit MOE website for curriculum information, school listings, and educational resources.',
      category: 'education',
      source: 'Ministry of Education',
      url: 'https://www.moe.gov.sg/',
      created_at: new Date(2026, 5, 15, 8, 30, 0).toISOString(),
    },
    {
      id: 'sg-7',
      type: 'singapore',
      title: 'MTI - Singapore Economic Growth & Trade Initiatives',
      content: 'Ministry of Trade and Industry drives Singapore\'s economic growth and trade partnerships. Explore business opportunities, enterprise development programs, and trade cooperation initiatives.',
      category: 'policy',
      source: 'Ministry of Trade and Industry',
      url: 'https://www.mti.gov.sg/Home',
      created_at: new Date(2026, 5, 14, 12, 45, 0).toISOString(),
    },
    {
      id: 'sg-8',
      type: 'singapore',
      title: 'URA Urban Planning & Development - Building Our Future',
      content: 'Urban Redevelopment Authority plans Singapore\'s physical development. View master plans, housing programs, and urban renewal projects shaping Singapore\'s future landscape.',
      category: 'policy',
      source: 'Urban Redevelopment Authority',
      url: 'https://www.ura.gov.sg/uol/en/homepage.html',
      created_at: new Date(2026, 5, 13, 10, 0, 0).toISOString(),
    },
    {
      id: 'sg-9',
      type: 'singapore',
      title: 'Enterprise Singapore - Business Growth & Support',
      content: 'Enterprise Singapore assists enterprises in growth and international expansion. Access grants, training, consultancy services, and market opportunities for business development.',
      category: 'policy',
      source: 'Enterprise Singapore',
      url: 'https://www.enterprisesg.gov.sg/',
      created_at: new Date(2026, 5, 12, 13, 20, 0).toISOString(),
    },
    {
      id: 'sg-10',
      type: 'singapore',
      title: 'EDB - Singapore as Premier Business Hub',
      content: 'Economic Development Board positions Singapore as the premier business and financial hub for Asia. Facilitates investments and partnerships with global companies.',
      category: 'jobs',
      source: 'Economic Development Board',
      url: 'https://www.edb.gov.sg/',
      created_at: new Date(2026, 5, 11, 16, 10, 0).toISOString(),
    },
    {
      id: 'sg-11',
      type: 'singapore',
      title: 'CSA Cybersecurity - Protecting Singapore\'s Digital Future',
      content: 'Cyber Security Agency safeguards Singapore\'s cyberspace and critical information infrastructure. Learn about cybersecurity best practices and reporting mechanisms for threats.',
      category: 'jobs',
      source: 'Cyber Security Agency',
      url: 'https://www.csa.gov.sg/',
      created_at: new Date(2026, 5, 10, 9, 30, 0).toISOString(),
    },
    {
      id: 'sg-12',
      type: 'singapore',
      title: 'PA Singapore - Community Engagement & Development',
      content: 'People\'s Association strengthens community bonds through grassroots programs and community clubs. Explore programs for youth, seniors, and families in your constituency.',
      category: 'policy',
      source: 'People\'s Association',
      url: 'https://www.pa.gov.sg/',
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
