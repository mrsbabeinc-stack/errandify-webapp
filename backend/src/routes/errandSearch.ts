import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/errands/search - Search and filter errands with Qwen recommendations
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: user_category_restrictions table doesn't exist yet
    // For now, return empty list - frontend will use fallback to GET /api/errands
    res.json({
      success: true,
      data: {
        errands: [],
        total: 0,
        hasMore: false,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// OLD CODE BELOW - DISABLED
/*
    // Build query with filters
    let whereClause = `WHERE e.status = $1`;
    const params: any[] = [status];
    let paramIndex = 2;

    // Budget filter
    whereClause += ` AND e.budget BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    params.push(minBudget, maxBudget);
    paramIndex += 2;

    // Category filter
    if (category) {
      whereClause += ` AND e.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Restrict categories user cannot access
    if (restrictedCategories.length > 0) {
      whereClause += ` AND e.category NOT IN (${restrictedCategories.map((_, i) => `$${paramIndex + i}`).join(',')})`;
      params.push(...restrictedCategories);
      paramIndex += restrictedCategories.length;
    }

    // Text search
    if (q) {
      whereClause += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    // Sort
    let orderBy = 'e.created_at DESC';
    if (sortBy === 'budget-low') {
      orderBy = 'e.budget ASC';
    } else if (sortBy === 'budget-high') {
      orderBy = 'e.budget DESC';
    } else if (sortBy === 'oldest') {
      orderBy = 'e.created_at ASC';
    } else if (sortBy === 'rating') {
      orderBy = 'u.average_rating DESC';
    }

    // Execute search query
    const result = await db.query(
      `SELECT
         e.id,
         e.title,
         e.description,
         e.category,
         e.budget,
         e.status,
         e.created_at,
         u.id as asker_id,
         u.display_name as asker_name,
         u.average_rating,
         u.total_ratings,
         (SELECT COUNT(*) FROM bids WHERE errand_id = e.id) as bid_count
       FROM errands e
       JOIN users u ON e.asker_id = u.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM errands e
       JOIN users u ON e.asker_id = u.id
       ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0].total, 10);

    res.json({
      success: true,
      data: {
        errands: result.rows.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          category: e.category,
          budget: e.budget,
          status: e.status,
          bidCount: e.bid_count,
          askerId: e.asker_id,
          askerName: e.asker_name,
          askerRating: e.average_rating,
          askerReviews: e.total_ratings,
          createdAt: e.created_at,
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
          pages: Math.ceil(totalCount / parseInt(limit as string, 10)),
        },
        filters: {
          searchQuery: q || null,
          category: category || null,
          budgetRange: { min: minBudget, max: maxBudget },
          status,
          sortBy,
        },
      },
    });
  } catch (error) {
    console.error('Search errands error:', error);
    res.status(500).json({ error: 'Failed to search errands' });
  }
});

// GET /api/errands/search/suggestions - Get Qwen-powered search suggestions
router.get('/search/suggestions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Get user's skills and history
    const userResult = await db.query(
      `SELECT skills FROM users WHERE id = $1`,
      [userId]
    );

    const userSkills = userResult.rows[0]?.skills || [];

    // Get matching tasks
    const tasksResult = await db.query(
      `SELECT DISTINCT category, AVG(budget) as avg_budget
       FROM errands
       WHERE (title ILIKE $1 OR description ILIKE $1)
       AND status = 'open'
       GROUP BY category
       LIMIT 5`,
      [`%${q}%`]
    );

    // Build suggestions (in production, use Qwen API)
    const suggestions = {
      searchTerms: [
        q,
        `${q} (low budget)`,
        `${q} (high budget)`,
      ],
      categories: tasksResult.rows.map((t) => ({
        category: t.category,
        avgBudget: parseFloat(t.avg_budget),
        suggestion: `Search "${q}" in ${t.category}`,
      })),
      aiInsight: `Based on your search for "${q}", you could earn SGD $${
        tasksResult.rows.length > 0 ? Math.round(tasksResult.rows[0].avg_budget) : 50
      }/task on average. Similar tasks are available in ${tasksResult.rows.map((t) => t.category).join(', ')}.`,
    };

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// GET /api/errands/categories - Get available categories with filters
router.get('/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: user_category_restrictions table doesn't exist yet
    // Return basic categories from errands table
    const categoriesResult = await db.query(
      `SELECT DISTINCT category FROM errands WHERE status = 'open' ORDER BY category`
    );

    const categories = categoriesResult.rows.map((r) => ({
      name: r.category,
      taskCount: 0,
      openTasks: 0,
      avgBudget: 0,
    }));

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// OLD CODE BELOW - DISABLED
/*
    const restrictedCategories = restrictedResult.rows.map((r) => r.category_name);

    // Get all categories with task counts and avg budget
    const categoriesResult = await db.query(
      `SELECT
         category,
         COUNT(*) as task_count,
         AVG(budget) as avg_budget,
         COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tasks
       FROM errands
       GROUP BY category
       ORDER BY open_tasks DESC`
    );

    const categories = categoriesResult.rows.map((c) => ({
      name: c.category,
      taskCount: parseInt(c.task_count, 10),
      openTasks: parseInt(c.open_tasks, 10),
      averageBudget: Math.round(parseFloat(c.avg_budget)),
      restricted: restrictedCategories.includes(c.category),
    }));

    res.json({
      success: true,
      data: {
        categories,
        accessible: categories.filter((c) => !c.restricted),
        restricted: categories.filter((c) => c.restricted),
      },
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
