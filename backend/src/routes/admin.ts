import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Middleware to check if user is admin (TODO: implement proper admin role)
const adminMiddleware = async (req: AuthRequest, res: Response, next: Function) => {
  // For now, check if user_id is in admin list
  // In production, implement proper admin role in users table
  const adminIds = [1]; // TODO: Replace with actual admin check
  if (!adminIds.includes(parseInt(req.userId || '0', 10))) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/admin/dashboard - Admin dashboard overview
router.get('/dashboard', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Get platform stats
    const statsResult = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM errands) as total_tasks,
        (SELECT COUNT(*) FROM errands WHERE status = 'open') as open_tasks,
        (SELECT COUNT(*) FROM errands WHERE status IN ('completed_confirmed', 'completed_unconfirmed')) as completed_tasks,
        (SELECT COUNT(*) FROM bids) as total_bids,
        (SELECT COUNT(*) FROM disputes WHERE status = 'open') as open_disputes,
        (SELECT SUM(budget) FROM errands WHERE status IN ('completed_confirmed', 'completed_unconfirmed')) as total_value_completed,
        (SELECT COUNT(*) FROM ratings) as total_ratings,
        (SELECT AVG(rating) FROM ratings) as avg_rating
    `);

    const stats = statsResult.rows[0];

    // Get recent activity
    const activityResult = await db.query(`
      SELECT
        'task_created' as event_type,
        e.title as description,
        e.created_at as timestamp
      FROM errands e
      UNION ALL
      SELECT
        'dispute_filed' as event_type,
        CONCAT('Dispute: ', d.reason) as description,
        d.created_at as timestamp
      FROM disputes d
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    // Get criminal screening stats
    const screeningResult = await db.query(`
      SELECT
        COUNT(*) as total_screenings,
        COUNT(CASE WHEN cypa_conviction THEN 1 END) as cypa_convictions,
        COUNT(CASE WHEN womens_charter_conviction THEN 1 END) as womens_charter_convictions,
        COUNT(CASE WHEN penal_code_conviction THEN 1 END) as penal_code_convictions,
        COUNT(CASE WHEN elder_abuse_conviction THEN 1 END) as elder_abuse_convictions,
        COUNT(CASE WHEN dishonesty_conviction THEN 1 END) as dishonesty_convictions
      FROM screening_declarations
    `);

    const screening = screeningResult.rows[0];

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: parseInt(stats.total_users, 10),
          totalTasks: parseInt(stats.total_tasks, 10),
          openTasks: parseInt(stats.open_tasks, 10),
          completedTasks: parseInt(stats.completed_tasks, 10),
          totalBids: parseInt(stats.total_bids, 10),
          openDisputes: parseInt(stats.open_disputes, 10),
          totalValueCompleted: parseFloat(stats.total_value_completed) || 0,
          totalRatings: parseInt(stats.total_ratings, 10),
          averageRating: parseFloat(stats.avg_rating) || 0,
        },
        screening: {
          totalScreenings: parseInt(screening.total_screenings, 10),
          cypaConvictions: parseInt(screening.cypa_convictions, 10),
          womensCharterConvictions: parseInt(screening.womens_charter_convictions, 10),
          penalCodeConvictions: parseInt(screening.penal_code_convictions, 10),
          elderAbuseConvictions: parseInt(screening.elder_abuse_convictions, 10),
          dishonestyConvictions: parseInt(screening.dishonesty_convictions, 10),
        },
        recentActivity: activityResult.rows,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// GET /api/admin/disputes - Get all disputes for review
router.get('/disputes', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'open', limit = 50, offset = 0 } = req.query;

    let whereClause = '';
    if (status !== 'all') {
      whereClause = `WHERE d.status = '${status}'`;
    }

    const result = await db.query(
      `SELECT
         d.id,
         d.task_id,
         d.reason,
         d.filed_by,
         d.status,
         d.created_at,
         e.title as task_title,
         e.budget,
         u.display_name as filer_name
       FROM disputes d
       JOIN errands e ON d.task_id = e.id
       JOIN users u ON d.filed_by = u.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: {
        disputes: result.rows,
      },
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ error: 'Failed to get disputes' });
  }
});

// GET /api/admin/screening - Get criminal screening declarations for review
router.get('/screening', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { hasConviction, limit = 50, offset = 0 } = req.query;

    let whereClause = '';
    if (hasConviction === 'true') {
      whereClause = `WHERE (cypa_conviction OR womens_charter_conviction OR penal_code_conviction OR elder_abuse_conviction OR dishonesty_conviction)`;
    } else if (hasConviction === 'false') {
      whereClause = `WHERE NOT (cypa_conviction OR womens_charter_conviction OR penal_code_conviction OR elder_abuse_conviction OR dishonesty_conviction)`;
    }

    const result = await db.query(
      `SELECT
         s.id,
         s.user_id,
         s.cypa_conviction,
         s.womens_charter_conviction,
         s.penal_code_conviction,
         s.elder_abuse_conviction,
         s.dishonesty_conviction,
         s.created_at,
         u.display_name,
         u.email
       FROM screening_declarations s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: {
        declarations: result.rows,
      },
    });
  } catch (error) {
    console.error('Get screening error:', error);
    res.status(500).json({ error: 'Failed to get screening declarations' });
  }
});

// GET /api/admin/users - Get all users with filter
router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (display_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    const result = await db.query(
      `SELECT
         id,
         display_name,
         email,
         role,
         average_rating,
         total_ratings,
         kyc_status,
         criminal_conviction,
         created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        users: result.rows,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// POST /api/admin/disputes/:id/resolve - Admin resolves dispute
router.post(
  '/disputes/:id/resolve',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id, 10);
      const { resolution, adminNotes, refundAmount } = req.body;

      if (!resolution) {
        return res.status(400).json({ error: 'Resolution required' });
      }

      await db.query(
        `UPDATE disputes
         SET status = $1, resolution = $2, admin_notes = $3, updated_at = NOW()
         WHERE id = $4`,
        ['resolved', resolution, adminNotes, disputeId]
      );

      res.json({
        success: true,
        message: 'Dispute resolved',
      });
    } catch (error) {
      console.error('Resolve dispute error:', error);
      res.status(500).json({ error: 'Failed to resolve dispute' });
    }
  }
);

// POST /api/admin/users/:id/restrict - Restrict user from categories
router.post(
  '/users/:id/restrict',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { categories, reason } = req.body;

      if (!categories || !Array.isArray(categories)) {
        return res.status(400).json({ error: 'Categories array required' });
      }

      // Add restrictions
      for (const category of categories) {
        const catResult = await db.query(
          'SELECT id FROM restricted_categories WHERE category_name = $1',
          [category]
        );

        if (catResult.rows.length > 0) {
          await db.query(
            `INSERT INTO user_category_restrictions (user_id, restricted_category_id, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [userId, catResult.rows[0].id, reason || 'Admin restriction']
          );
        }
      }

      res.json({
        success: true,
        message: `User restricted from ${categories.length} categories`,
      });
    } catch (error) {
      console.error('Restrict user error:', error);
      res.status(500).json({ error: 'Failed to restrict user' });
    }
  }
);

// GET /api/admin/moderation - Get all moderation notifications
router.get('/moderation', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;

    let query = `
      SELECT an.id, an.type, an.severity, an.user_id, an.message, an.details, an.created_at, an.resolved,
             u.display_name, u.email
      FROM admin_notifications an
      JOIN users u ON an.user_id = u.id
      WHERE an.created_at > NOW() - INTERVAL '30 days'
    `;
    const params: any[] = [];

    if (type === 'flagged_message') {
      query += ` AND an.type = 'flagged_message'`;
    } else if (type === 'user_suspended') {
      query += ` AND an.type = 'user_suspended'`;
    }

    query += ` ORDER BY an.created_at DESC LIMIT 100`;

    const result = await db.query(query, params);

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      userId: row.user_id,
      userName: row.display_name,
      userEmail: row.email,
      message: row.message,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      createdAt: row.created_at,
      resolved: row.resolved,
    }));

    // Get stats
    const statsResult = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM admin_notifications WHERE type = 'flagged_message' AND created_at > NOW() - INTERVAL '30 days') as total_flagged,
        (SELECT COUNT(*) FROM admin_notifications WHERE type = 'user_suspended' AND created_at > NOW() - INTERVAL '30 days') as total_suspended,
        (SELECT COUNT(*) FROM admin_notifications WHERE resolved = false AND created_at > NOW() - INTERVAL '30 days') as active_notifications
    `);

    const stats = {
      totalFlagged: parseInt(statsResult.rows[0].total_flagged),
      totalSuspended: parseInt(statsResult.rows[0].total_suspended),
      activeNotifications: parseInt(statsResult.rows[0].active_notifications),
    };

    res.json({
      success: true,
      data: {
        notifications,
        stats,
      },
    });
  } catch (error) {
    console.error('Moderation fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation data' });
  }
});

// PUT /api/admin/moderation/:notificationId/resolve - Mark notification as resolved
router.put('/moderation/:notificationId/resolve', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const adminId = parseInt(req.userId || '0', 10);

    await db.query(
      `UPDATE admin_notifications SET resolved = true, resolved_by = $1, resolved_at = NOW() WHERE id = $2`,
      [adminId, notificationId]
    );

    res.json({ success: true, message: 'Notification marked as resolved' });
  } catch (error) {
    console.error('Resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve' });
  }
});

// POST /api/admin/users/:userId/suspend - Manually suspend user
router.post('/users/:userId/suspend', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = 1 } = req.body;
    const adminId = parseInt(req.userId || '0', 10);

    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + days);

    await db.query(
      `UPDATE users SET suspended_until = $1 WHERE id = $2`,
      [suspendUntil, userId]
    );

    // Create admin notification
    const userResult = await db.query(
      `SELECT display_name, email FROM users WHERE id = $1`,
      [userId]
    );

    const user = userResult.rows[0];

    await db.query(
      `INSERT INTO admin_notifications (type, severity, user_id, message, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        'user_suspended',
        'high',
        userId,
        `User ${user.display_name} manually suspended for ${days} day(s) by admin`,
        JSON.stringify({
          userId,
          userName: user.display_name,
          userEmail: user.email,
          reason: `Manually suspended by admin for ${days} day(s)`,
          suspendedUntil: suspendUntil.toISOString(),
          adminId,
        }),
      ]
    );

    res.json({ success: true, message: `User suspended for ${days} day(s)` });
  } catch (error) {
    console.error('Suspension error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

export default router;
