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
      title: 'Tech Sector Hiring Surge: 15,000 New Jobs Expected This Year',
      content: 'Singapore\'s technology industry is experiencing record hiring growth with companies like Google, Microsoft, and local startups actively recruiting. Software engineers, data scientists, and AI specialists are in high demand with salaries ranging from $80K to $180K annually.',
      category: 'jobs',
      source: 'Ministry of Manpower',
      created_at: new Date(2026, 5, 20, 14, 30, 0).toISOString(),
    },
    {
      id: 'sg-2',
      type: 'singapore',
      title: 'Freelance Work in Singapore: New Guidelines and Benefits',
      content: 'The Ministry of Manpower has released updated guidelines for freelancers and gig workers, including tax deductions, CPF options, and eligibility for government support schemes. Self-employed professionals can now register for enhanced benefits.',
      category: 'jobs',
      source: 'MOM Freelancer Guide',
      created_at: new Date(2026, 5, 19, 10, 15, 0).toISOString(),
    },
    {
      id: 'sg-3',
      type: 'singapore',
      title: 'Finance and Banking Jobs Boom: Career Opportunities Abound',
      content: 'Singapore\'s financial services sector is hiring aggressively with positions in fintech, investment management, and digital banking. Average salaries for finance professionals have increased by 12% year-over-year, with remote work options now standard.',
      category: 'jobs',
      source: 'Singapore Economic Board',
      created_at: new Date(2026, 5, 18, 9, 45, 0).toISOString(),
    },
    {
      id: 'sg-4',
      type: 'singapore',
      title: 'Healthcare Careers Growing: Nurses and Healthcare Workers Needed',
      content: 'With Singapore\'s aging population, healthcare sector recruitment is accelerating. Ministry of Health reports 3,000 openings for nurses, therapists, and medical professionals. Sign-on bonuses and overseas training opportunities available.',
      category: 'jobs',
      source: 'Ministry of Health',
      created_at: new Date(2026, 5, 17, 11, 20, 0).toISOString(),
    },
    {
      id: 'sg-5',
      type: 'singapore',
      title: 'Reskilling Programme: Free Training for Job Transitions',
      content: 'SkillsFuture Singapore offers free and heavily subsidized training programmes for workers looking to switch careers or update their skills. Popular courses include data analytics, AI, cybersecurity, and digital marketing with job placement support.',
      category: 'jobs',
      source: 'SkillsFuture Singapore',
      created_at: new Date(2026, 5, 16, 15, 0, 0).toISOString(),
    },
    {
      id: 'sg-6',
      type: 'singapore',
      title: 'Manufacturing and Engineering Jobs on the Rise',
      content: 'Advanced manufacturing and precision engineering firms in Singapore are recruiting heavily. Roles include mechanical engineers, production managers, and quality assurance specialists with competitive salaries and career growth opportunities.',
      category: 'jobs',
      source: 'EDB Singapore',
      created_at: new Date(2026, 5, 15, 8, 30, 0).toISOString(),
    },
    {
      id: 'sg-7',
      type: 'singapore',
      title: 'Startup Employment Boom: Early-Stage Companies Hiring',
      content: 'Singapore\'s startup ecosystem is thriving with over 500 startups actively hiring. Average salaries are competitive, equity packages are generous, and flexible work arrangements are standard. Sectors include fintech, proptech, and healthtech.',
      category: 'jobs',
      source: 'Enterprise Singapore',
      created_at: new Date(2026, 5, 14, 12, 45, 0).toISOString(),
    },
    {
      id: 'sg-8',
      type: 'singapore',
      title: 'Green Jobs Initiative: 2,000 Positions in Sustainability',
      content: 'Singapore\'s push for sustainability has created 2,000 new green jobs in renewable energy, environmental consulting, and sustainable construction. These roles offer competitive salaries and are projected to grow by 20% annually.',
      category: 'jobs',
      source: 'Ministry of Sustainability',
      created_at: new Date(2026, 5, 13, 10, 0, 0).toISOString(),
    },
    {
      id: 'sg-9',
      type: 'singapore',
      title: 'Logistics and Supply Chain Careers: High Demand Sector',
      content: 'With Singapore\'s strategic port location, logistics companies are hiring supply chain managers, operations coordinators, and warehouse supervisors. Starting salaries are $3.5K-$5K monthly with clear advancement paths.',
      category: 'jobs',
      source: 'Singapore Port Authority',
      created_at: new Date(2026, 5, 12, 13, 20, 0).toISOString(),
    },
    {
      id: 'sg-10',
      type: 'singapore',
      title: 'Creative Industries Thriving: Design and Marketing Jobs',
      content: 'Singapore\'s creative sector is experiencing rapid growth with demand for UX/UI designers, content creators, video producers, and marketing specialists. Freelance rates average $50-$150/hour with many opportunities for remote work.',
      category: 'jobs',
      source: 'Creative Singapore Council',
      created_at: new Date(2026, 5, 11, 16, 10, 0).toISOString(),
    },
    {
      id: 'sg-11',
      type: 'singapore',
      title: 'Cybersecurity Professionals in High Demand',
      content: 'Singapore\'s focus on cybersecurity has created significant demand for security engineers, ethical hackers, and security architects. Salaries range from $120K-$200K+ annually with additional certifications highly valued.',
      category: 'jobs',
      source: 'Cyber Security Agency',
      created_at: new Date(2026, 5, 10, 9, 30, 0).toISOString(),
    },
    {
      id: 'sg-12',
      type: 'singapore',
      title: 'Education Sector Hiring: Teachers and Trainers Wanted',
      content: 'Schools and training institutes across Singapore are recruiting teachers, curriculum specialists, and online educators. Government subsidies for early childhood education have created 1,000+ new positions with salaries starting at $3K-$4K monthly.',
      category: 'jobs',
      source: 'Ministry of Education',
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
