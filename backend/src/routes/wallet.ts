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

    // Gifting to yourself is a no-op that only writes confusing ledger entries.
    // EP was conserved either way, but it should not be allowed.
    if (parseInt(String(recipientId), 10) === senderId) {
      return res.status(400).json({ error: "You can't gift points to yourself." });
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
// Server owns the bonus amount. The client used to send `bonus` and it was
// applied verbatim, so a user could self-grant unlimited EP — and farm it by
// replaying the call. The amount is now fixed by `reason`, the user must have
// actually rated the errand to earn it, and it pays at most once per errand.
const EP_BONUS_RULES: Record<string, number> = {
  doer_rating_bonus: 5, // small thank-you for leaving a rating
};

router.post('/award-ep-bonus', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId, userId, reason } = req.body;
    const requestUserId = parseInt(req.userId || '0', 10);
    const errand = parseInt(errandId, 10);

    // A user can only award themselves.
    if (parseInt(userId, 10) !== requestUserId) {
      return res.status(403).json({ error: 'Cannot award EP to another user' });
    }

    // The amount comes from the server, never the request body.
    const amount = EP_BONUS_RULES[reason as string];
    if (!amount) {
      return res.status(400).json({ error: 'Unknown bonus reason' });
    }
    if (!errand) {
      return res.status(400).json({ error: 'errandId required' });
    }

    // The bonus is earned by rating this errand — require the rating to exist.
    const rated = await db.query(
      'SELECT 1 FROM ratings WHERE errand_id = $1 AND rater_id = $2 LIMIT 1',
      [errand, requestUserId]
    );
    if (rated.rows.length === 0) {
      return res.status(400).json({ error: 'This bonus requires a submitted rating for the errand' });
    }

    // Pay at most once per errand per reason — stops the call being replayed to farm EP.
    const already = await db.query(
      'SELECT 1 FROM wallet_transactions WHERE user_id = $1 AND errand_id = $2 AND description = $3 LIMIT 1',
      [requestUserId, errand, `${reason} bonus`]
    );
    if (already.rows.length > 0) {
      return res.json({ success: true, message: 'Bonus already awarded', data: { bonusEP: 0 } });
    }

    await db.query(
      `UPDATE users SET errandify_points = errandify_points + $1, updated_at = NOW() WHERE id = $2`,
      [amount, requestUserId]
    );
    await db.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, description, errand_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [requestUserId, 'ep_earned', amount, `${reason} bonus`, errand]
    );

    res.json({
      success: true,
      message: 'Bonus EP awarded',
      data: { bonusEP: amount },
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

// Calculate Stripe fee (2.9% + $0.30 SGD)
const calculateStripeFee = (amountInCents: number): number => {
  return Math.round(amountInCents * 0.029 + 30); // 2.9% + $0.30
};

// Calculate base price for custom EP amount (SGD $0.01 per EP)
const calculateCustomPrice = (epAmount: number): { basePriceSgd: number, stripeFee: number, totalSgd: number } => {
  if (epAmount < 1000 || epAmount % 1000 !== 0) {
    throw new Error('EP amount must be at least 1,000 and in multiples of 1,000');
  }

  const basePriceSgd = epAmount / 100; // SGD $0.01 per EP
  const baseAmountCents = Math.round(basePriceSgd * 100);
  const stripeFee = calculateStripeFee(baseAmountCents);
  const totalCents = baseAmountCents + stripeFee;
  const totalSgd = totalCents / 100;

  return {
    basePriceSgd: parseFloat(basePriceSgd.toFixed(2)),
    stripeFee: parseFloat((stripeFee / 100).toFixed(2)),
    totalSgd: parseFloat(totalSgd.toFixed(2))
  };
};

// POST /api/wallet/purchase-ep - Initiate EP purchase via Stripe
router.post('/purchase-ep', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { package_id, custom_ep_amount } = req.body;
    const companyId = parseInt(req.companyId || req.userId || '0', 10);
    // Referenced further down but never declared, so this route did not compile.
    const isCustomEPPurchase = !!custom_ep_amount;

    let epAmount: number;
    let basePriceSgd: number;
    let stripeFee: number;
    let totalPriceSgd: number;

    if (custom_ep_amount) {
      // Custom amount
      if (typeof custom_ep_amount !== 'number' || custom_ep_amount < 1000 || custom_ep_amount % 1000 !== 0) {
        return res.status(400).json({ success: false, error: 'EP amount must be at least 1,000 and in multiples of 1,000' });
      }

      try {
        const pricing = calculateCustomPrice(custom_ep_amount);
        epAmount = custom_ep_amount;
        basePriceSgd = pricing.basePriceSgd;
        stripeFee = pricing.stripeFee;
        totalPriceSgd = pricing.totalSgd;
      } catch (error: any) {
        return res.status(400).json({ success: false, error: error.message });
      }
    } else if (package_id) {
      // Pre-configured package
      const packageData = EP_PACKAGES.find(p => p.id === package_id);
      if (!packageData) {
        return res.status(400).json({ success: false, error: 'Invalid package' });
      }

      epAmount = packageData.ep_amount;
      basePriceSgd = packageData.price_sgd;
      const baseAmountCents = Math.round(basePriceSgd * 100);
      stripeFee = calculateStripeFee(baseAmountCents) / 100;
      totalPriceSgd = basePriceSgd + stripeFee;
    } else {
      return res.status(400).json({ success: false, error: 'Either package_id or custom_ep_amount required' });
    }

    // Demo mode - return Stripe-like response with fee breakdown
    // In production, this would create a real Stripe session with the metadata
    const metadata = {
      userId: companyId,
      companyId: isCustomEPPurchase ? null : companyId,
      epAmount: epAmount.toString(),
      basePriceSgd: basePriceSgd.toString(),
      stripeFee: stripeFee.toString(),
    };

    res.json({
      success: true,
      isDemo: true,
      checkout_url: `https://checkout.stripe.com/pay/cs_demo_ep_${Date.now()}`,
      ep_amount: epAmount,
      base_price_sgd: basePriceSgd,
      stripe_fee_sgd: stripeFee,
      total_price_sgd: totalPriceSgd,
      metadata: metadata,
      message: `✨ Ready to purchase ${epAmount.toLocaleString()} EP for SGD $${totalPriceSgd.toFixed(2)} (includes SGD $${stripeFee.toFixed(2)} Stripe fee)!`,
    });
  } catch (error) {
    console.error('Purchase EP error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate purchase' });
  }
});

/**
 * POST /api/wallet/ep-purchase-webhook — Stripe webhook for EP purchases.
 *
 * This trusted `req.body` outright. Nothing verified that the request came
 * from Stripe, so anyone could POST a forged `payment_intent.succeeded` with
 * their own userId and any ep_amount and mint Errandify Points for free —
 * points that sell for real money (1000 EP = SGD 10). It also wrote a
 * "completed" purchase row, so the fabricated payment looked legitimate
 * afterwards.
 *
 * Now verified against the raw request bytes, the same way
 * routes/webhooks-subscriptions.ts does it. Signature verification only works
 * on the exact bytes Stripe sent, which is why index.ts keeps req.rawBody.
 *
 * Fails closed: no signature, no secret, or a mismatch means no points.
 */
router.post('/ep-purchase-webhook', async (req: any, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[Wallet] STRIPE_WEBHOOK_SECRET is not set — refusing to credit EP');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event: any;
    try {
      const { default: Stripe } = await import('stripe');
      const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-06-20' as any,
      });
      event = stripeClient.webhooks.constructEvent(req.rawBody, signature, secret);
    } catch (err: any) {
      console.error('[Wallet] EP webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const userId = paymentIntent.metadata?.userId;
      const companyId = paymentIntent.metadata?.companyId;
      const epAmount = parseInt(paymentIntent.metadata?.ep_amount || '0', 10);

      if (epAmount > 0) {
        if (userId) {
          // Award EP to individual user
          await db.query(
            `UPDATE users SET errandify_points = errandify_points + $1 WHERE id = $2`,
            [epAmount, userId]
          );
          console.log(`✅ Awarded ${epAmount} EP to user ${userId}`);

          // Log transaction
          await db.query(
            `INSERT INTO ep_purchase_transactions (user_id, ep_amount, sgd_price, stripe_fee, total_paid, status)
             VALUES ($1, $2, $3, $4, $5, 'completed')`,
            [
              userId,
              epAmount,
              paymentIntent.metadata?.basePriceSgd || 0,
              paymentIntent.metadata?.stripeFee || 0,
              paymentIntent.amount_received / 100, // Convert cents to SGD
            ]
          );
        } else if (companyId) {
          // Award EP to company
          await db.query(
            `UPDATE companies SET ep_balance = ep_balance + $1 WHERE id = $2`,
            [epAmount, companyId]
          );
          console.log(`✅ Awarded ${epAmount} EP to company ${companyId}`);

          // Log transaction
          await db.query(
            `INSERT INTO ep_purchase_transactions (company_id, ep_amount, sgd_price, stripe_fee, total_paid, status)
             VALUES ($1, $2, $3, $4, $5, 'completed')`,
            [
              companyId,
              epAmount,
              paymentIntent.metadata?.basePriceSgd || 0,
              paymentIntent.metadata?.stripeFee || 0,
              paymentIntent.amount_received / 100,
            ]
          );
        }
      }
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// POST /api/wallet/ep-purchase-webhook-demo - Demo endpoint to test webhook locally
/**
 * Demo EP crediting. Takes userId and epAmount straight from the body with no
 * payment involved at all, so it is development-only — in production it is a
 * "give me any number of points" endpoint.
 */
router.post('/ep-purchase-webhook-demo', async (req: any, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { userId, companyId, epAmount, basePriceSgd, stripeFee } = req.body;
    const epAmount_to_award = parseInt(epAmount || '0', 10);

    // Ensure transaction table exists
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ep_purchase_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          company_id INTEGER,
          ep_amount INTEGER NOT NULL,
          sgd_price DECIMAL(10, 2),
          stripe_fee DECIMAL(10, 2),
          total_paid DECIMAL(10, 2),
          status VARCHAR(20) DEFAULT 'completed',
          stripe_transaction_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      // Table might already exist
    }

    if (epAmount_to_award > 0) {
      if (userId) {
        // Award EP to individual user
        const userRes = await db.query(
          `UPDATE users SET errandify_points = COALESCE(errandify_points, 0) + $1 WHERE id = $2 RETURNING errandify_points`,
          [epAmount_to_award, userId]
        );
        const newBalance = userRes.rows[0]?.errandify_points || epAmount_to_award;
        console.log(`✅ [DEMO] Awarded ${epAmount_to_award} EP to user ${userId}. New balance: ${newBalance}`);

        // Log transaction
        try {
          await db.query(
            `INSERT INTO ep_purchase_transactions (user_id, ep_amount, sgd_price, stripe_fee, total_paid, status)
             VALUES ($1, $2, $3, $4, $5, 'completed')`,
            [userId, epAmount_to_award, basePriceSgd || 0, stripeFee || 0, (basePriceSgd || 0) + (stripeFee || 0)]
          );
        } catch (logError) {
          console.warn('Could not log transaction:', logError);
        }

        return res.json({
          success: true,
          message: `✅ Awarded ${epAmount_to_award} EP successfully`,
          epAmount: epAmount_to_award,
          awardedTo: `user ${userId}`,
          newBalance: newBalance
        });
      } else if (companyId) {
        // Award EP to company
        const companyRes = await db.query(
          `UPDATE companies SET ep_balance = COALESCE(ep_balance, 0) + $1 WHERE id = $2 RETURNING ep_balance`,
          [epAmount_to_award, companyId]
        );
        const newBalance = companyRes.rows[0]?.ep_balance || epAmount_to_award;
        console.log(`✅ [DEMO] Awarded ${epAmount_to_award} EP to company ${companyId}. New balance: ${newBalance}`);

        // Log transaction
        try {
          await db.query(
            `INSERT INTO ep_purchase_transactions (company_id, ep_amount, sgd_price, stripe_fee, total_paid, status)
             VALUES ($1, $2, $3, $4, $5, 'completed')`,
            [companyId, epAmount_to_award, basePriceSgd || 0, stripeFee || 0, (basePriceSgd || 0) + (stripeFee || 0)]
          );
        } catch (logError) {
          console.warn('Could not log transaction:', logError);
        }

        return res.json({
          success: true,
          message: `✅ Awarded ${epAmount_to_award} EP successfully`,
          epAmount: epAmount_to_award,
          awardedTo: `company ${companyId}`,
          newBalance: newBalance
        });
      }
    }

    res.status(400).json({ success: false, error: 'Invalid EP amount or missing user/company ID' });
  } catch (error) {
    console.error('Demo webhook error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Demo webhook failed' });
  }
});

// GET /api/wallet/ep-purchase-history - Get EP purchase transaction history
router.get('/ep-purchase-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Try to fetch from database, fall back to demo data if table doesn't exist
    try {
      const result = await db.query(
        `SELECT
           id,
           user_id,
           company_id,
           ep_amount,
           sgd_price,
           stripe_fee,
           total_paid,
           status,
           created_at
         FROM ep_purchase_transactions
         WHERE user_id = $1 OR company_id = (SELECT company_id FROM users WHERE id = $1)
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      const transactions = result.rows.map((row: any) => ({
        id: row.id,
        date: new Date(row.created_at).toISOString().split('T')[0],
        ep_amount: row.ep_amount,
        price_sgd: row.sgd_price,
        stripe_fee: row.stripe_fee,
        total_paid: row.total_paid,
        status: row.status,
      }));

      return res.json({
        success: true,
        data: transactions,
      });
    } catch (dbError) {
      console.log('Database query failed, returning demo data:', dbError instanceof Error ? dbError.message : dbError);

      // Demo data showing sample purchases
      const history = [
        {
          id: 1,
          date: '2026-07-15',
          ep_amount: 5000,
          price_sgd: 45.00,
          stripe_fee: 1.61,
          total_paid: 46.61,
          status: 'completed',
        },
        {
          id: 2,
          date: '2026-07-08',
          ep_amount: 10000,
          price_sgd: 80.00,
          stripe_fee: 2.62,
          total_paid: 82.62,
          status: 'completed',
        },
      ];

      res.json({
        success: true,
        data: history,
      });
    }
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

export default router;
