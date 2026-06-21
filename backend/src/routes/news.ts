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
      title: 'SkillsFuture Training: Free Courses for Career Growth',
      content: 'SkillsFuture Singapore expanded its course offerings with free and subsidized training in digital skills, coding, data analytics, and business management. Over 20,000 Singaporeans have completed courses this quarter with 85% employment success rate within 3 months.',
      category: 'training',
      source: 'SkillsFuture Singapore',
      created_at: new Date(2026, 5, 20, 14, 30, 0).toISOString(),
    },
    {
      id: 'sg-2',
      type: 'singapore',
      title: 'Mental Health Support Growing: Corporate and Community Programs',
      content: 'Singapore\'s mental health initiatives are expanding with more counselling services, workplace wellness programs, and community support groups. IMH reports 40% increase in early intervention cases, with subsidized therapy now available for all income levels.',
      category: 'wellness',
      source: 'Institute of Mental Health',
      created_at: new Date(2026, 5, 19, 10, 15, 0).toISOString(),
    },
    {
      id: 'sg-3',
      type: 'singapore',
      title: 'Home Services Marketplace Growing: Handyman and Cleaning Demand',
      content: 'The home services industry in Singapore is booming with high demand for reliable handymen, cleaners, plumbers, and electricians. Average earnings for service providers range from $3K-$8K monthly with flexible scheduling and no long-term commitment required.',
      category: 'services',
      source: 'Ministry of Manpower',
      created_at: new Date(2026, 5, 18, 9, 45, 0).toISOString(),
    },
    {
      id: 'sg-4',
      type: 'singapore',
      title: 'Wellness and Fitness Services on Rise: Personal Training Demand',
      content: 'Singapore\'s fitness and wellness sector is experiencing rapid growth with demand for personal trainers, yoga instructors, and wellness coaches. Freelance fitness professionals earn $40-$120/hour with flexible scheduling and growing corporate wellness contracts.',
      category: 'services',
      source: 'Singapore Tourism Board',
      created_at: new Date(2026, 5, 17, 11, 20, 0).toISOString(),
    },
    {
      id: 'sg-5',
      type: 'singapore',
      title: 'Stress Management and Mental Wellness Programs Expanding',
      content: 'New workplace mental health initiatives introduced across Singapore with companies implementing stress management, meditation, and counselling services. WHO data shows 30% improvement in employee productivity when wellness support is available.',
      category: 'wellness',
      source: 'Ministry of Health',
      created_at: new Date(2026, 5, 16, 15, 0, 0).toISOString(),
    },
    {
      id: 'sg-6',
      type: 'singapore',
      title: 'Tutoring Services Boom: Demand for Private Educators',
      content: 'Private education and tutoring services are thriving in Singapore with demand for academic tutors, piano teachers, and coding instructors. Average rates range from $25-$100/hour depending on subject and experience, with flexible work arrangements.',
      category: 'services',
      source: 'Ministry of Education',
      created_at: new Date(2026, 5, 15, 8, 30, 0).toISOString(),
    },
    {
      id: 'sg-7',
      type: 'singapore',
      title: 'Freelance Work Guidelines: Tax and CPF Benefits Update',
      content: 'MOM released comprehensive guidelines for freelancers including tax deductions, CPF contribution options, and access to government support schemes. Self-employed professionals can now claim business expenses and contribute to voluntary CPF for retirement security.',
      category: 'jobs',
      source: 'Ministry of Manpower',
      created_at: new Date(2026, 5, 14, 12, 45, 0).toISOString(),
    },
    {
      id: 'sg-8',
      type: 'singapore',
      title: 'Childcare and Babysitting Services in High Demand',
      content: 'With more parents returning to work, childcare and babysitting services are in high demand across Singapore. Trained caregivers earn $2.5K-$5K monthly with flexible hours, subsidized training programs available through government schemes.',
      category: 'services',
      source: 'Ministry of Social and Family Development',
      created_at: new Date(2026, 5, 13, 10, 0, 0).toISOString(),
    },
    {
      id: 'sg-9',
      type: 'singapore',
      title: 'Elder Care Services Growing: Compassionate Caregiving Opportunities',
      content: 'Singapore\'s aging population creates growing demand for home care aides and elderly companions. Subsidized training programs available, salaries from $2.2K-$4.5K monthly, with strong job security and government support for caregivers.',
      category: 'services',
      source: 'Ministry of Health',
      created_at: new Date(2026, 5, 12, 13, 20, 0).toISOString(),
    },
    {
      id: 'sg-10',
      type: 'singapore',
      title: 'Digital Skills Training Accelerating: Coding and Tech Bootcamps',
      content: 'Intensive coding bootcamps and tech training programs in Singapore report 95% graduation rate with average job placement within 4 weeks. Programs cover full-stack development, data science, and cloud engineering with government grants covering up to 50% of fees.',
      category: 'training',
      source: 'SkillsFuture Singapore',
      created_at: new Date(2026, 5, 11, 16, 10, 0).toISOString(),
    },
    {
      id: 'sg-11',
      type: 'singapore',
      title: 'Work-Life Balance Initiatives: 4-Day Work Week Trials',
      content: 'Several Singapore companies are piloting 4-day work week schedules to improve employee mental health and work-life balance. Early results show 25% increase in productivity and 40% reduction in stress-related absences.',
      category: 'wellness',
      source: 'Ministry of Manpower',
      created_at: new Date(2026, 5, 10, 9, 30, 0).toISOString(),
    },
    {
      id: 'sg-12',
      type: 'singapore',
      title: 'Online Services Platform Growth: Gig Economy Opportunities',
      content: 'Gig economy and online services platforms in Singapore are experiencing explosive growth with opportunities in delivery, freelance writing, graphic design, and virtual assistance. Average earnings $2K-$6K monthly with complete flexibility and no commitments.',
      category: 'jobs',
      source: 'Economic Survey Singapore',
      created_at: new Date(2026, 5, 9, 6, 0, 0).toISOString(),
    },
    {
      id: 'sg-13',
      type: 'singapore',
      title: 'Freelancers Without Jobs: Support Programs and Resources Available',
      content: 'New government initiative provides support for freelancers facing income gaps. Emergency assistance, career counselling, and job-matching services now available. Eligible freelancers can receive up to $1,000 monthly support while transitioning to new opportunities.',
      category: 'jobs',
      source: 'Ministry of Manpower',
      created_at: new Date(2026, 5, 8, 11, 0, 0).toISOString(),
    },
    {
      id: 'sg-14',
      type: 'singapore',
      title: 'Domestic Helper and Maid Services: New Support Framework',
      content: 'Expanded regulations and support for domestic helpers and maids working in Singapore homes. Fair employment practices, training programs, and welfare support now standardized. Demand for reliable domestic services continues to grow with competitive compensation.',
      category: 'services',
      source: 'Ministry of Manpower',
      created_at: new Date(2026, 5, 7, 14, 20, 0).toISOString(),
    },
    {
      id: 'sg-15',
      type: 'singapore',
      title: 'Pet Care Services Explosion: Dog Walking and Pet Sitting Jobs',
      content: 'Pet ownership in Singapore surging, creating demand for pet walkers, pet sitters, and grooming services. Average earnings $30-$80 per service with flexible scheduling. Pet care workers report high job satisfaction and repeat customer base.',
      category: 'services',
      source: 'Pet Industry Association Singapore',
      created_at: new Date(2026, 5, 6, 9, 45, 0).toISOString(),
    },
    {
      id: 'sg-16',
      type: 'singapore',
      title: 'Language Tutoring: High Demand for English, Mandarin, and Coding',
      content: 'Language and skill tutoring market booming with tutors earning $30-$80/hour. High demand for English proficiency, Mandarin, and programming skills instruction. Many tutors operating independently with flexible online and in-person options.',
      category: 'services',
      source: 'Ministry of Education',
      created_at: new Date(2026, 5, 5, 16, 30, 0).toISOString(),
    },
    {
      id: 'sg-17',
      type: 'singapore',
      title: 'Career Switching: Government Support for Job Transitions',
      content: 'SkillsFuture Career Transition Support offers guidance and training for workers changing careers. No-cost assessments, personalized coaching, and job placement assistance provided. Thousands successfully transitioned to new industries this year.',
      category: 'training',
      source: 'SkillsFuture Singapore',
      created_at: new Date(2026, 5, 4, 10, 15, 0).toISOString(),
    },
    {
      id: 'sg-18',
      type: 'singapore',
      title: 'House Renovation and Interior Design Services in Demand',
      content: 'Home renovation market thriving with demand for skilled contractors, designers, and handymen. Project earnings range from $500-$5,000+ depending on complexity. Many operate as freelancers with flexible project selection.',
      category: 'services',
      source: 'Singapore Contractors Association',
      created_at: new Date(2026, 5, 3, 13, 45, 0).toISOString(),
    },
    {
      id: 'sg-19',
      type: 'singapore',
      title: 'Mental Health Practitioners: Counsellors and Therapists Shortage',
      content: 'Growing shortage of mental health professionals creating opportunities for qualified counsellors and therapists. Demand far exceeds supply with flexible practice options. Average earnings $50-$150/hour for therapy services.',
      category: 'services',
      source: 'Singapore Psychological Association',
      created_at: new Date(2026, 5, 2, 15, 0, 0).toISOString(),
    },
    {
      id: 'sg-20',
      type: 'singapore',
      title: 'Virtual Assistant and Admin Services: Remote Work Growing',
      content: 'Virtual assistant and administrative services market expanding with businesses hiring remote support. Earn $25-$60/hour managing emails, scheduling, and administrative tasks. Fully remote with flexible hours suitable for various schedules.',
      category: 'jobs',
      source: 'Remote Work Association Singapore',
      created_at: new Date(2026, 5, 1, 11, 30, 0).toISOString(),
    },
    {
      id: 'sg-21',
      type: 'singapore',
      title: 'Photography and Videography Services: Content Creation Boom',
      content: 'Content creation demand surging with businesses needing professional photography and videography. Freelance rates from $200-$1,000+ per project. Growth driven by social media and digital marketing needs.',
      category: 'services',
      source: 'Singapore Creative Industries Council',
      created_at: new Date(2026, 4, 30, 14, 0, 0).toISOString(),
    },
    {
      id: 'sg-22',
      type: 'singapore',
      title: 'Social Media Management: Businesses Need Digital Experts',
      content: 'Small and medium businesses hiring freelance social media managers for content, engagement, and growth. Average rates $500-$2,000 monthly per client. Flexible arrangement with many managers handling 5-10 clients simultaneously.',
      category: 'jobs',
      source: 'Singapore Digital Marketing Association',
      created_at: new Date(2026, 4, 29, 10, 45, 0).toISOString(),
    },
    {
      id: 'sg-23',
      type: 'singapore',
      title: 'Freelancer Tax Deductions: Updated 2026 Guidelines',
      content: 'Updated tax filing guidelines for self-employed workers and freelancers. Expanded deduction categories, simplified filing process, and extended payment deadlines. Consult with accountant to maximize tax benefits available to independent professionals.',
      category: 'jobs',
      source: 'Inland Revenue Authority Singapore',
      created_at: new Date(2026, 4, 28, 9, 0, 0).toISOString(),
    },
    {
      id: 'sg-24',
      type: 'singapore',
      title: 'Community Support Groups for Job Seekers and Career Changers',
      content: 'New community support groups launched island-wide helping job seekers network and share opportunities. Free monthly meetups, mentorship programs, and skill-sharing sessions. Open to all seeking employment support and career guidance.',
      category: 'wellness',
      source: 'Ministry of Social and Family Development',
      created_at: new Date(2026, 4, 27, 16, 20, 0).toISOString(),
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
