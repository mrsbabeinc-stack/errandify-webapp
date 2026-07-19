import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/wallet - Get user's wallet balance and stats (default endpoint)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    console.log('Wallet API - userId:', userId);

    // Get user's errandify points
    const userResult = await db.query(
      `SELECT errandify_points FROM users WHERE id = $1`,
      [userId]
    );

    const errandifyPoints = userResult.rows[0]?.errandify_points || 0;
    console.log('Wallet API - errandifyPoints:', errandifyPoints, 'from user:', userResult.rows[0]);

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
        errandifyPoints: errandifyPoints,
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

// GET /api/wallet/search-users - Search for users by alias to gift points
router.get('/search-users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { query = '' } = req.query;

    // Search for users by display_name or user_id, exclude current user
    const result = await db.query(
      `SELECT id, display_name, user_id
       FROM users
       WHERE (display_name ILIKE $1 OR user_id ILIKE $1)
       AND id != $2
       LIMIT 10`,
      [`%${query}%`, userId]
    );

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        userId: row.user_id,
      })),
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// POST /api/wallet/gift-points - Send points to single recipient
router.post('/gift-points', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = parseInt(req.userId || '0', 10);
    const { recipientId, points } = req.body;

    // Validate input
    if (!recipientId || !points || points <= 0) {
      return res.status(400).json({ error: 'Invalid recipient or points amount' });
    }

    const pointsAmount = parseInt(points, 10);

    // Get sender's current points
    const senderResult = await db.query(
      `SELECT errandify_points FROM users WHERE id = $1`,
      [senderId]
    );

    if (senderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const senderPoints = senderResult.rows[0].errandify_points || 0;
    if (senderPoints < pointsAmount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Verify recipient exists
    const recipientResult = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [recipientId]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Update sender's points (deduct)
    await db.query(
      `UPDATE users SET errandify_points = errandify_points - $1 WHERE id = $2`,
      [pointsAmount, senderId]
    );

    // Update recipient's points (add)
    await db.query(
      `UPDATE users SET errandify_points = errandify_points + $1 WHERE id = $2`,
      [pointsAmount, recipientId]
    );

    // Log the transaction
    await db.query(
      `INSERT INTO point_transactions (sender_id, recipient_id, points, type, description, created_at)
       VALUES ($1, $2, $3, 'gift', $4, NOW())`,
      [senderId, recipientId, pointsAmount, 'Received gift from sender']
    );

    res.json({
      success: true,
      message: `Successfully sent ${pointsAmount} EP to recipient!`,
      data: {
        senderPoints: senderPoints - pointsAmount,
      },
    });
  } catch (error) {
    console.error('Gift points error:', error);
    res.status(500).json({ error: 'Failed to send points' });
  }
});

// POST /api/wallet/send-gift - Send gift to multiple recipients (supports groups)
router.post('/send-gift', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = parseInt(req.userId || '0', 10);
    const { points, recipientIds, message, giftDate } = req.body;

    // Validate input
    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Invalid points amount' });
    }

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one recipient' });
    }

    const pointsAmount = parseInt(points, 10);
    const totalCost = pointsAmount * recipientIds.length;

    // Get sender's current points
    const senderResult = await db.query(
      `SELECT errandify_points FROM users WHERE id = $1`,
      [senderId]
    );

    if (senderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const senderPoints = senderResult.rows[0].errandify_points || 0;
    if (senderPoints < totalCost) {
      return res.status(400).json({ error: `Insufficient points. You need ${totalCost} EP but have ${senderPoints} EP` });
    }

    // Verify all recipients exist
    const recipientCheckResult = await db.query(
      `SELECT id FROM users WHERE id = ANY($1)`,
      [recipientIds]
    );

    if (recipientCheckResult.rows.length !== recipientIds.length) {
      return res.status(400).json({ error: 'One or more recipients not found' });
    }

    // Deduct points from sender once
    console.log(`Sending gift: Deducting ${totalCost} EP from sender ${senderId}`);
    const updatedSender = await db.query(
      `UPDATE users SET errandify_points = errandify_points - $1 WHERE id = $2 RETURNING errandify_points`,
      [totalCost, senderId]
    );

    // Add points to each recipient and log transaction
    for (const recipientId of recipientIds) {
      // Add points to recipient
      await db.query(
        `UPDATE users SET errandify_points = errandify_points + $1 WHERE id = $2`,
        [pointsAmount, recipientId]
      );

      // Log transaction for each recipient
      await db.query(
        `INSERT INTO point_transactions (sender_id, recipient_id, points, type, description, created_at)
         VALUES ($1, $2, $3, 'gift', $4, NOW())`,
        [senderId, recipientId, pointsAmount, message || 'Received gift']
      );
    }

    res.json({
      success: true,
      message: `✅ Gift sent! ${recipientIds.length} recipient(s) received ${pointsAmount} EP each`,
      data: {
        totalSent: totalCost,
        recipientsCount: recipientIds.length,
        pointsPerRecipient: pointsAmount,
        senderRemainingPoints: updatedSender.rows[0]?.errandify_points || 0,
      },
    });
  } catch (error) {
    console.error('Send gift error:', error);
    res.status(500).json({ error: 'Failed to send gift' });
  }
});

// POST /api/wallet/redeem - Redeem a reward (supports both individual users and companies)
router.post('/redeem', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { points, code, amount, name } = req.body;
    console.log('Redeem API - userId:', userId, 'code:', code, 'points:', points, 'amount:', amount);

    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Invalid points amount' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Missing redemption code' });
    }

    // Get user's current points
    const userResult = await db.query(
      `SELECT errandify_points FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPoints = userResult.rows[0].errandify_points || 0;
    console.log('Redeem API - currentPoints:', currentPoints);

    if (currentPoints < points) {
      return res.status(400).json({ error: `Insufficient points. You need ${points} EP but have ${currentPoints} EP` });
    }

    // Deduct points from user account
    console.log('Redeem API - attempting to deduct', points, 'from user', userId);
    const updateResult = await db.query(
      `UPDATE users SET errandify_points = errandify_points - $1 WHERE id = $2 RETURNING errandify_points`,
      [points, userId]
    );
    console.log('Redeem API - updated points:', updateResult.rows[0]?.errandify_points);

    // Also deduct from company if user is part of a company (optional)
    try {
      const companyResult = await db.query(
        `SELECT company_id FROM users WHERE id = $1`,
        [userId]
      );

      if (companyResult.rows.length > 0 && companyResult.rows[0].company_id) {
        const companyId = companyResult.rows[0].company_id;
        console.log('Redeem API - also deducting from company', companyId);
        try {
          await db.query(
            `UPDATE companies SET ep_balance = ep_balance - $1 WHERE id = $2`,
            [points, companyId]
          );
        } catch (balanceErr) {
          console.log('Redeem API - company ep_balance update skipped (column may not exist)');
        }
      }
    } catch (companyErr) {
      console.log('Redeem API - error querying company:', companyErr);
    }

    // Log redemption transaction with details
    console.log('Redeem API - logging transaction for user', userId);
    await db.query(
      `INSERT INTO point_transactions (user_id, points, type, description, created_at)
       VALUES ($1, $2, 'redemption', $3, NOW())`,
      [userId, -points, `Redeemed: ${name || code} (Code: ${code}, SGD $${amount || 0})`]
    );
    console.log('Redeem API - transaction logged successfully');

    res.json({
      success: true,
      message: `✅ Success! You redeemed ${name || code}`,
      data: {
        remainingPoints: updateResult.rows[0]?.errandify_points || 0,
        code: code,
        amount: amount,
        name: name,
      },
    });
  } catch (error) {
    console.error('Redeem error:', error);
    res.status(500).json({ error: 'Failed to redeem reward. Please try again.' });
  }
});

// GET /api/wallet/point-history - Get user's point transaction history
router.get('/point-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Fetch all point transactions for this user (ordered by most recent first)
    const result = await db.query(
      `SELECT id, sender_id, recipient_id, user_id, points, type, description, created_at
       FROM point_transactions
       WHERE user_id = $1 OR sender_id = $1 OR recipient_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const transactions = result.rows.map((row: any) => ({
      id: row.id,
      points: row.points,
      type: row.type,
      description: row.description,
      created_at: row.created_at,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
    }));

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    console.error('Point history error:', error);
    res.status(500).json({ error: 'Failed to fetch point history' });
  }
});

// GET /api/wallet/my-vouchers - Get user's redeemed vouchers
router.get('/my-vouchers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Fetch redemption transactions (vouchers redeemed by user)
    const result = await db.query(
      `SELECT id, user_id, points, type, description, created_at
       FROM point_transactions
       WHERE user_id = $1 AND type = 'redemption'
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const vouchers = result.rows.map((row: any) => ({
      id: row.id,
      voucherName: row.description,
      points: Math.abs(row.points),
      description: row.description,
      created_at: row.created_at,
    }));

    res.json({
      success: true,
      data: vouchers,
    });
  } catch (error: any) {
    console.error('My vouchers error:', error);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// ==================== REWARD MANAGEMENT ====================

// GET /api/wallet/rewards - Get all active rewards
router.get('/rewards', async (req: any, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, name, description, category, cost_points, icon, status, created_at
       FROM rewards
       WHERE status = 'active'
       ORDER BY cost_points ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// GET /api/wallet/rewards/all - Get all rewards (admin)
router.get('/rewards/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Check if user is admin
    const userResult = await db.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `SELECT id, name, description, category, cost_points, icon, status, created_at
       FROM rewards
       ORDER BY cost_points ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get all rewards error:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// POST /api/wallet/rewards - Create new reward (admin)
router.post('/rewards', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { name, description, category, cost_points, icon } = req.body;

    // Check if user is admin
    const userResult = await db.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!name || !cost_points) {
      return res.status(400).json({ error: 'Name and cost_points are required' });
    }

    const result = await db.query(
      `INSERT INTO rewards (name, description, category, cost_points, icon, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [name, description || null, category || 'other', cost_points, icon || '🎁']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Create reward error:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

// PUT /api/wallet/rewards/:id - Update reward (admin)
router.put('/rewards/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const rewardId = parseInt(req.params.id, 10);
    const { name, description, category, cost_points, icon, status } = req.body;

    // Check if user is admin
    const userResult = await db.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `UPDATE rewards
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           cost_points = COALESCE($4, cost_points),
           icon = COALESCE($5, icon),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, category, cost_points, icon, status, rewardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update reward error:', error);
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

// DELETE /api/wallet/rewards/:id - Delete reward (admin)
router.delete('/rewards/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const rewardId = parseInt(req.params.id, 10);

    // Check if user is admin
    const userResult = await db.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Soft delete - mark as inactive instead of removing
    const result = await db.query(
      `UPDATE rewards SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [rewardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({
      success: true,
      message: 'Reward deleted successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Delete reward error:', error);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

// POST /api/wallet/award-ep - Award EP to both asker and doer on errand completion
router.post('/award-ep', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId, askerId, doerId } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    // Only asker or system can award EP
    if (askerId && askerId !== userId) {
      return res.status(403).json({ error: 'Only asker can award completion EP' });
    }

    const BASE_EP = 15;
    const RATING_BONUS = 10;
    const TOTAL_EP = BASE_EP + RATING_BONUS; // 25 EP per person

    // Award to asker
    if (askerId) {
      await db.query(
        `UPDATE users SET errandify_points = errandify_points + $1, updated_at = NOW() WHERE id = $2`,
        [TOTAL_EP, askerId]
      );

      // Log transaction
      await db.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, description, errand_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [askerId, 'ep_earned', TOTAL_EP, `Errand completion + rating bonus`, errandId]
      );
    }

    // Award to doer
    if (doerId) {
      await db.query(
        `UPDATE users SET errandify_points = errandify_points + $1, updated_at = NOW() WHERE id = $2`,
        [TOTAL_EP, doerId]
      );

      // Log transaction
      await db.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, description, errand_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [doerId, 'ep_earned', TOTAL_EP, `Errand completion + rating bonus`, errandId]
      );
    }

    res.json({
      success: true,
      message: 'EP awarded to both users',
      data: {
        askerEP: TOTAL_EP,
        doerEP: TOTAL_EP,
      },
    });
  } catch (error) {
    console.error('Award EP error:', error);
    res.status(500).json({ error: 'Failed to award EP' });
  }
});

// POST /api/wallet/award-ep-bonus - Award bonus EP to doer for rating back
router.post('/award-ep-bonus', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId, userId, bonus, reason } = req.body;
    const requestUserId = parseInt(req.userId || '0', 10);

    // User can only award themselves
    if (userId !== requestUserId) {
      return res.status(403).json({ error: 'Cannot award EP to another user' });
    }

    // Award bonus EP
    await db.query(
      `UPDATE users SET errandify_points = errandify_points + $1, updated_at = NOW() WHERE id = $2`,
      [bonus, userId]
    );

    // Log transaction
    await db.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, description, errand_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, 'ep_earned', bonus, `${reason} bonus`, errandId]
    );

    res.json({
      success: true,
      message: 'Bonus EP awarded',
      data: { bonusEP: bonus },
    });
  } catch (error) {
    console.error('Award bonus EP error:', error);
    res.status(500).json({ error: 'Failed to award bonus EP' });
  }
});

// ==================== EP PURCHASE SYSTEM ====================

// EP Packages configuration
const EP_PACKAGES = [
  { id: 1, ep_amount: 1000, price_sgd: 10.00, discount_percent: 0, is_popular: false, display_order: 1 },
  { id: 2, ep_amount: 5000, price_sgd: 45.00, discount_percent: 10, is_popular: true, display_order: 2 },
  { id: 3, ep_amount: 10000, price_sgd: 80.00, discount_percent: 20, is_popular: false, display_order: 3 },
  { id: 4, ep_amount: 25000, price_sgd: 180.00, discount_percent: 28, is_popular: false, display_order: 4 },
];

// GET /api/wallet/ep-packages - Get all available EP packages
router.get('/ep-packages', async (req: any, res: Response) => {
  try {
    res.json({
      success: true,
      data: EP_PACKAGES,
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch packages' });
  }
});

// POST /api/wallet/purchase-ep - Initiate EP purchase via Stripe
router.post('/purchase-ep', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { package_id } = req.body;
    const companyId = parseInt(req.companyId || req.userId || '0', 10);

    if (!package_id) {
      return res.status(400).json({ success: false, error: 'package_id required' });
    }

    const packageData = EP_PACKAGES.find(p => p.id === package_id);
    if (!packageData) {
      return res.status(400).json({ success: false, error: 'Invalid package' });
    }

    // Demo mode - return Stripe-like response
    res.json({
      success: true,
      isDemo: true,
      checkout_url: `https://checkout.stripe.com/pay/cs_demo_ep_${Date.now()}`,
      package_id: package_id,
      ep_amount: packageData.ep_amount,
      price_sgd: packageData.price_sgd,
      discount_percent: packageData.discount_percent,
      message: `✨ Ready to purchase ${packageData.ep_amount} EP for SGD $${packageData.price_sgd}${packageData.discount_percent > 0 ? ` (Save ${packageData.discount_percent}%)` : ''}!`,
    });
  } catch (error) {
    console.error('Purchase EP error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate purchase' });
  }
});

// POST /api/wallet/ep-purchase-webhook - Stripe webhook for payment success
router.post('/ep-purchase-webhook', async (req: any, res: Response) => {
  try {
    const event = req.body;

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const companyId = parseInt(paymentIntent.metadata?.companyId || '0', 10);
      const epAmount = parseInt(paymentIntent.metadata?.ep_amount || '0', 10);

      if (companyId && epAmount) {
        // Award EP to company wallet
        await db.query(
          `UPDATE wallet_balance SET ep_balance = ep_balance + ? WHERE company_id = ?`,
          [epAmount, companyId]
        );

        console.log(`✅ Awarded ${epAmount} EP to company ${companyId}`);
      }
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// GET /api/wallet/ep-purchase-history - Get EP purchase transaction history
router.get('/ep-purchase-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Demo data showing sample purchases
    const history = [
      {
        id: 1,
        date: '2026-07-15',
        ep_amount: 5000,
        price_sgd: 45.00,
        status: 'completed',
        package_id: 2,
      },
      {
        id: 2,
        date: '2026-07-08',
        ep_amount: 10000,
        price_sgd: 80.00,
        status: 'completed',
        package_id: 3,
      },
    ];

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

export default router;
