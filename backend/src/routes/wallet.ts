import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/wallet - Get user's wallet balance and stats (default endpoint)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Calculate earnings from completed tasks where user is doer
    const earningsResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed')
           THEN e.budget * 0.8 ELSE 0 END), 0) as completed_earnings,
         COALESCE(SUM(CASE WHEN e.status = 'in_progress'
           THEN e.budget * 0.8 ELSE 0 END), 0) as pending_earnings,
         COUNT(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed')
           THEN 1 END) as completed_tasks,
         COUNT(CASE WHEN e.status = 'in_progress'
           THEN 1 END) as in_progress_tasks
       FROM errands e
       JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE ea.doer_id = $1`,
      [userId]
    );

    const earnings = earningsResult.rows[0];

    // Get pending payouts and spent amount (for askers)
    const spentResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN e.status IN ('posted', 'open', 'confirmed', 'in_progress')
           THEN e.budget ELSE 0 END), 0) as pending_spent,
         COALESCE(SUM(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed', 'cancelled')
           THEN e.budget ELSE 0 END), 0) as completed_spent,
         COUNT(CASE WHEN e.status IN ('posted', 'open', 'confirmed', 'in_progress')
           THEN 1 END) as active_postings,
         COUNT(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed')
           THEN 1 END) as completed_postings
       FROM errands e
       WHERE e.asker_id = $1`,
      [userId]
    );

    const spent = spentResult.rows[0];

    res.json({
      success: true,
      data: {
        balance: Math.max(0, (earnings.completed_earnings || 0) - (spent.pending_spent || 0)),
        totalEarned: earnings.completed_earnings || 0,
        totalSpent: spent.completed_spent || 0,
        pendingPayouts: earnings.pending_earnings || 0,
        errandifyPoints: 0,
        transactions: [],
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch wallet',
    });
  }
});

// GET /api/wallet/balance - Get user's wallet balance and stats
router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Calculate earnings from completed tasks where user is doer
    const earningsResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed')
           THEN e.budget * 0.8 ELSE 0 END), 0) as completed_earnings,
         COALESCE(SUM(CASE WHEN e.status = 'in_progress'
           THEN e.budget * 0.8 ELSE 0 END), 0) as pending_earnings,
         COUNT(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed')
           THEN 1 END) as completed_tasks,
         COUNT(CASE WHEN e.status = 'in_progress'
           THEN 1 END) as in_progress_tasks
       FROM errands e
       JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE ea.doer_id = $1`,
      [userId]
    );

    const earnings = earningsResult.rows[0];

    // Get pending payouts and spent amount (for askers)
    const spentResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN e.status IN ('posted', 'open', 'confirmed', 'in_progress')
           THEN e.budget ELSE 0 END), 0) as pending_spent,
         COALESCE(SUM(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed', 'cancelled')
           THEN e.budget ELSE 0 END), 0) as completed_spent,
         COUNT(CASE WHEN e.status IN ('posted', 'open', 'confirmed', 'in_progress')
           THEN 1 END) as active_postings,
         COUNT(CASE WHEN e.status IN ('completed_confirmed', 'completed_unconfirmed')
           THEN 1 END) as completed_postings
       FROM errands e
       WHERE e.asker_id = $1`,
      [userId]
    );

    const spent = spentResult.rows[0];

    res.json({
      success: true,
      data: {
        doer: {
          completedEarnings: parseFloat(earnings.completed_earnings) || 0,
          pendingEarnings: parseFloat(earnings.pending_earnings) || 0,
          totalEarnings: (parseFloat(earnings.completed_earnings) || 0) + (parseFloat(earnings.pending_earnings) || 0),
          completedTasks: parseInt(earnings.completed_tasks, 10),
          inProgressTasks: parseInt(earnings.in_progress_tasks, 10),
        },
        asker: {
          pendingSpent: parseFloat(spent.pending_spent) || 0,
          completedSpent: parseFloat(spent.completed_spent) || 0,
          totalSpent: (parseFloat(spent.pending_spent) || 0) + (parseFloat(spent.completed_spent) || 0),
          activePostings: parseInt(spent.active_postings, 10),
          completedPostings: parseInt(spent.completed_postings, 10),
        },
      },
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ error: 'Failed to get wallet balance' });
  }
});

// GET /api/wallet/transactions - Get transaction history
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { limit = 50, offset = 0, type = 'all' } = req.query;

    // Get doer earnings (received)
    const doerTransactions = await db.query(
      `SELECT
         'earning' as type,
         e.id as task_id,
         e.title,
         e.budget * 0.8 as amount,
         e.status,
         e.completed_at as date,
         u.display_name as other_party
       FROM errands e
       JOIN errand_assignments ea ON e.id = ea.errand_id
       JOIN users u ON e.asker_id = u.id
       WHERE ea.doer_id = $1 AND e.status IN ('completed_confirmed', 'completed_unconfirmed', 'in_progress')
       UNION ALL
       SELECT
         'spent' as type,
         e.id as task_id,
         e.title,
         e.budget as amount,
         e.status,
         e.created_at as date,
         u.display_name as other_party
       FROM errands e
       JOIN users u ON (
         CASE WHEN e.asker_id = $1 THEN e.accepted_bid_id IS NOT NULL ELSE FALSE END
       )
       WHERE e.asker_id = $1 AND e.status IN ('confirmed', 'in_progress', 'completed_confirmed', 'completed_unconfirmed')
       ORDER BY date DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        transactions: doerTransactions.rows.map((t) => ({
          type: t.type,
          taskId: t.task_id,
          taskTitle: t.title,
          amount: parseFloat(t.amount),
          status: t.status,
          date: t.date,
          otherParty: t.other_party,
        })),
        count: doerTransactions.rows.length,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// GET /api/wallet/breakdown - Get earnings breakdown by category/time
router.get('/breakdown', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Get earnings by category
    const categoryResult = await db.query(
      `SELECT
         e.category,
         COUNT(*) as task_count,
         SUM(e.budget * 0.8) as category_earnings,
         AVG(e.budget * 0.8) as avg_earning
       FROM errands e
       JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE ea.doer_id = $1 AND e.status IN ('completed_confirmed', 'completed_unconfirmed')
       GROUP BY e.category
       ORDER BY category_earnings DESC`,
      [userId]
    );

    // Get earnings by month (last 6 months)
    const monthlyResult = await db.query(
      `SELECT
         DATE_TRUNC('month', e.completed_at) as month,
         COUNT(*) as task_count,
         SUM(e.budget * 0.8) as monthly_earnings
       FROM errands e
       JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE ea.doer_id = $1
         AND e.status IN ('completed_confirmed', 'completed_unconfirmed')
         AND e.completed_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', e.completed_at)
       ORDER BY month DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        byCategory: categoryResult.rows.map((r) => ({
          category: r.category,
          taskCount: parseInt(r.task_count, 10),
          totalEarnings: parseFloat(r.category_earnings),
          averageEarning: parseFloat(r.avg_earning),
        })),
        byMonth: monthlyResult.rows.map((r) => ({
          month: r.month,
          taskCount: parseInt(r.task_count, 10),
          monthlyEarnings: parseFloat(r.monthly_earnings),
        })),
      },
    });
  } catch (error) {
    console.error('Get breakdown error:', error);
    res.status(500).json({ error: 'Failed to get breakdown' });
  }
});

export default router;
