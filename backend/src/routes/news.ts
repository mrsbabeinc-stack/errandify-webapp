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
        q: 'Singapore',
        country: 'sg',
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
      title: 'HDB Launches 5,000 New BTO Flats Across Multiple Towns',
      content: 'Housing & Development Board opens applications for 5,000 Build-to-Order units in Jurong West, Tengah, and Ang Mo Kio with flexible payment schemes for first-time homebuyers.',
      category: 'housing',
      source: 'HDB Official',
      url: 'https://www.hdb.gov.sg/',
      created_at: new Date(2026, 5, 20, 14, 30, 0).toISOString(),
    },
    {
      id: 'sg-2',
      type: 'singapore',
      title: 'Singapore Tech Job Market Booms with 15,000 New Positions',
      content: 'Tech companies posting record job openings as Singapore positions itself as a digital hub. Average salaries for software engineers reach $120K+ annually with strong demand for AI and cybersecurity roles.',
      category: 'jobs',
      source: 'Ministry of Manpower',
      url: 'https://www.mom.gov.sg/',
      created_at: new Date(2026, 5, 19, 10, 15, 0).toISOString(),
    },
    {
      id: 'sg-3',
      type: 'singapore',
      title: 'Singapore Green Plan 2030: $100M Investment in Green Spaces',
      content: 'Government commits $100 million to expand parks and gardens across the island, with focus on creating cool and green neighbourhoods by 2030 for sustainable living.',
      category: 'policy',
      source: 'Ministry of Sustainability and Environment',
      url: 'https://www.mse.gov.sg/',
      created_at: new Date(2026, 5, 18, 9, 45, 0).toISOString(),
    },
    {
      id: 'sg-4',
      type: 'singapore',
      title: '2,000 Public EV Charging Points to be Installed by 2028',
      content: 'Land Transport Authority announces accelerated rollout of electric vehicle charging infrastructure. ChargePoint network expanding to cover all residential areas and major commercial zones.',
      category: 'transport',
      source: 'LTA Singapore',
      url: 'https://www.lta.gov.sg/',
      created_at: new Date(2026, 5, 17, 11, 20, 0).toISOString(),
    },
    {
      id: 'sg-5',
      type: 'singapore',
      title: 'MOH Launches New Healthcare Accessibility Program for Elderly',
      content: 'Ministry of Health introduces subsidised home care services and telemedicine platforms for seniors, bringing cost down by 40% to ensure quality care for aging population.',
      category: 'healthcare',
      source: 'Ministry of Health',
      url: 'https://www.moh.gov.sg/',
      created_at: new Date(2026, 5, 16, 15, 0, 0).toISOString(),
    },
    {
      id: 'sg-6',
      type: 'singapore',
      title: 'Education Ministry Rolls Out Digital Learning Platform for All Schools',
      content: 'New unified e-learning platform launched to enhance hybrid learning across 400+ schools. Includes AI-powered personalized learning paths and parental dashboards for progress tracking.',
      category: 'education',
      source: 'Ministry of Education',
      url: 'https://www.moe.gov.sg/',
      created_at: new Date(2026, 5, 15, 8, 30, 0).toISOString(),
    },
    {
      id: 'sg-7',
      type: 'singapore',
      title: 'Singapore Economy Grows 3.2% in Q2, Outpacing Regional Average',
      content: 'Economic growth driven by strong performance in financial services, petrochemicals, and precision engineering sectors. Unemployment rate hits 10-year low at 1.8%.',
      category: 'policy',
      source: 'Ministry of Trade and Industry',
      url: 'https://www.mti.gov.sg/',
      created_at: new Date(2026, 5, 14, 12, 45, 0).toISOString(),
    },
    {
      id: 'sg-8',
      type: 'singapore',
      title: 'New Smart Town Initiative: Tengah Becomes Asia\'s Smart Living Hub',
      content: 'Tengah district launches integrated smart city features including intelligent traffic systems, smart lighting, and IoT-enabled homes. First 2,000 units now accepting residents.',
      category: 'policy',
      source: 'Urban Redevelopment Authority',
      url: 'https://www.ura.gov.sg/',
      created_at: new Date(2026, 5, 13, 10, 0, 0).toISOString(),
    },
    {
      id: 'sg-9',
      type: 'singapore',
      title: 'Singapore Food Security Program Boosts Local Farming Production',
      content: 'Government grants $50M to vertical farming projects and aquaculture ventures to achieve 30% local food production by 2030. 15 new agri-tech startups funded this quarter.',
      category: 'policy',
      source: 'Ministry of Agriculture',
      url: 'https://www.mse.gov.sg/',
      created_at: new Date(2026, 5, 12, 13, 20, 0).toISOString(),
    },
    {
      id: 'sg-10',
      type: 'singapore',
      title: 'Central Business District Welcomes 5 New Tech Giants with $1B Investment',
      content: 'Google, Microsoft, and three other major tech firms announce expansion plans for Singapore offices, bringing 3,000+ high-skilled jobs and strengthening island\'s position as tech capital.',
      category: 'jobs',
      source: 'Economic Development Board',
      url: 'https://www.edb.gov.sg/',
      created_at: new Date(2026, 5, 11, 16, 10, 0).toISOString(),
    },
    {
      id: 'sg-11',
      type: 'singapore',
      title: 'Singapore Launches New Cybersecurity Grant: Up to $500K for Startups',
      content: 'CSA and Enterprise Singapore offering grants up to $500,000 for cybersecurity startups. Focus on emerging threats like AI-powered attacks and blockchain security.',
      category: 'jobs',
      source: 'Cyber Security Agency',
      url: 'https://www.csa.gov.sg/',
      created_at: new Date(2026, 5, 10, 9, 30, 0).toISOString(),
    },
    {
      id: 'sg-12',
      type: 'singapore',
      title: 'MRT Line 7 Opens: New East-West Connectivity for 300,000 Residents',
      content: 'Singapore\'s newest MRT line begins operations with 15 stations covering Changi to Bukit Panjang. Reduces travel time by 35% for commuters and spurs development in 8 new areas.',
      category: 'transport',
      source: 'LTA Singapore',
      url: 'https://www.lta.gov.sg/',
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
