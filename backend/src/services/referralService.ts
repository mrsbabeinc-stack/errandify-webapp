import { db } from '../db.js';

interface ReferralStats {
  referral_code: string;
  referral_link: string;
  total_referred: number;
  first_job_completed: number;
  pending_bonuses: number;
  total_earned_points: number;
  earned_breakdown: {
    join_bonus: number;
    first_job_bonus: number;
    loyalty_bonus: number;
  };
}

interface ReferralReward {
  id: number;
  referrer_id: number;
  reward_type: 'join' | 'first_job' | 'loyalty' | 'multiplier';
  points_amount: number;
  awarded_at: string;
  description: string;
}

/**
 * Get or create referral code for user
 */
export async function getUserReferralCode(userId: number): Promise<string> {
  try {
    // Check if user already has a referral code
    const result = await db.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length > 0 && result.rows[0].referral_code) {
      return result.rows[0].referral_code;
    }

    // Generate new referral code if none exists
    const newCode = generateReferralCode();
    await db.query(
      'UPDATE users SET referral_code = $1 WHERE id = $2',
      [newCode, userId]
    );

    return newCode;
  } catch (error) {
    console.error('Get user referral code error:', error);
    throw error;
  }
}

/**
 * Track when a referred user joins
 */
export async function trackReferralJoin(
  referrerId: number,
  referredUserId: number,
  referralCode: string
): Promise<{ success: boolean; points_awarded: number }> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if already tracked
    const existing = await client.query(
      'SELECT id FROM referral_tracking WHERE referrer_id = $1 AND referred_user_id = $2',
      [referrerId, referredUserId]
    );

    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return { success: false, points_awarded: 0 };
    }

    // Insert referral tracking
    await client.query(
      `INSERT INTO referral_tracking
       (referrer_id, referred_user_id, referral_code, status)
       VALUES ($1, $2, $3, $4)`,
      [referrerId, referredUserId, referralCode, 'joined']
    );

    // Award join bonus (50 points)
    const joinBonus = 50;
    await awardReferralPoints(client, referrerId, joinBonus, 'join');

    await client.query('COMMIT');
    return { success: true, points_awarded: joinBonus };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Track referral join error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Track when a referred user completes their first job
 */
export async function trackReferralFirstJob(
  referrerId: number,
  referredUserId: number
): Promise<{ success: boolean; points_awarded: number }> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if tracking exists
    const tracking = await client.query(
      `SELECT id FROM referral_tracking
       WHERE referrer_id = $1 AND referred_user_id = $2`,
      [referrerId, referredUserId]
    );

    if (tracking.rows.length === 0) {
      await client.query('COMMIT');
      return { success: false, points_awarded: 0 };
    }

    // Check if first job bonus already awarded
    const bonus = await client.query(
      `SELECT id FROM referral_rewards
       WHERE referrer_id = $1 AND reward_type = 'first_job'
       AND referrer_id IN (
         SELECT referrer_id FROM referral_tracking
         WHERE referred_user_id = $2
       )`,
      [referrerId, referredUserId]
    );

    if (bonus.rows.length > 0) {
      await client.query('COMMIT');
      return { success: false, points_awarded: 0 };
    }

    // Update tracking status
    await client.query(
      `UPDATE referral_tracking
       SET status = 'first_job_completed', first_job_completed_at = NOW()
       WHERE referrer_id = $1 AND referred_user_id = $2`,
      [referrerId, referredUserId]
    );

    // Award first job bonus (50 points)
    const firstJobBonus = 50;
    await awardReferralPoints(client, referrerId, firstJobBonus, 'first_job');

    await client.query('COMMIT');
    return { success: true, points_awarded: firstJobBonus };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Track referral first job error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: number): Promise<ReferralStats> {
  try {
    // Get referral code
    const userResult = await db.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const referralCode = userResult.rows[0].referral_code || '';

    // Get referral statistics
    const statsResult = await db.query(
      `SELECT
        COUNT(DISTINCT referred_user_id) as total_referred,
        COUNT(DISTINCT CASE WHEN status = 'first_job_completed' THEN referred_user_id END) as first_job_completed,
        COUNT(DISTINCT CASE WHEN status = 'joined' THEN referred_user_id END) as pending_bonuses
      FROM referral_tracking
      WHERE referrer_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0] || {
      total_referred: 0,
      first_job_completed: 0,
      pending_bonuses: 0,
    };

    // Get earned points breakdown
    const pointsResult = await db.query(
      `SELECT
        reward_type,
        SUM(points_amount) as total_points
      FROM referral_rewards
      WHERE referrer_id = $1
      GROUP BY reward_type`,
      [userId]
    );

    const earnedBreakdown = {
      join_bonus: 0,
      first_job_bonus: 0,
      loyalty_bonus: 0,
    };

    // pg returns SUM()/COUNT() as strings, so `total += row.total_points`
    // concatenates instead of adding: 0 + "50" + "50" === "05050".
    // Coerce every aggregate before it is used as a number.
    let totalEarnedPoints = 0;
    for (const row of pointsResult.rows) {
      const key = `${row.reward_type}_bonus` as keyof typeof earnedBreakdown;
      const points = Number(row.total_points) || 0;
      earnedBreakdown[key] = points;
      totalEarnedPoints += points;
    }

    const referralLink = `https://errandify.ai/join?ref=${referralCode}`;

    return {
      referral_code: referralCode,
      referral_link: referralLink,
      total_referred: Number(stats.total_referred) || 0,
      first_job_completed: Number(stats.first_job_completed) || 0,
      pending_bonuses: Number(stats.pending_bonuses) || 0,
      total_earned_points: totalEarnedPoints,
      earned_breakdown: earnedBreakdown,
    };
  } catch (error) {
    console.error('Get referral stats error:', error);
    throw error;
  }
}

/**
 * Get referral rewards for a user
 */
export async function getReferralRewards(
  userId: number,
  limit = 50
): Promise<ReferralReward[]> {
  try {
    const result = await db.query(
      `SELECT id, referrer_id, reward_type, points_amount, awarded_at,
        CASE
          WHEN reward_type = 'join' THEN 'New user joined via your link'
          WHEN reward_type = 'first_job' THEN 'Referred user completed first job'
          WHEN reward_type = 'loyalty' THEN 'Loyalty bonus'
          ELSE 'Referral reward'
        END as description
      FROM referral_rewards
      WHERE referrer_id = $1
      ORDER BY awarded_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Get referral rewards error:', error);
    throw error;
  }
}

/**
 * Helper: Award referral points
 */
async function awardReferralPoints(
  client: any,
  referrerId: number,
  points: number,
  rewardType: 'join' | 'first_job' | 'loyalty' | 'multiplier'
): Promise<void> {
  // Insert referral reward
  await client.query(
    `INSERT INTO referral_rewards (referrer_id, reward_type, points_amount)
     VALUES ($1, $2, $3)`,
    [referrerId, rewardType, points]
  );

  // Update user's errandify_points
  await client.query(
    `UPDATE users
     SET errandify_points = errandify_points + $1,
         updated_at = NOW()
     WHERE id = $2`,
    [points, referrerId]
  );

  // Log transaction. Columns are (user_id, amount, reason) — the previous
  // transaction_type/points_change/previous_balance/new_balance names do not
  // exist on this table, so this insert threw every time and no referral EP
  // was ever recorded. The table does not carry running balances; the balance
  // lives on users.errandify_points, updated just above.
  await client.query(
    `INSERT INTO ep_transactions (user_id, amount, reason, created_at)
     VALUES ($1, $3, LEFT('Referral ' || $2 || ' bonus', 100), NOW())`,
    [referrerId, rewardType, points]
  );
}

/**
 * Helper: Generate unique referral code
 */
function generateReferralCode(): string {
  return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default {
  getUserReferralCode,
  trackReferralJoin,
  trackReferralFirstJob,
  getReferralStats,
  getReferralRewards,
};
