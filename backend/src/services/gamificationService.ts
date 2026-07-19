import db from '../db.js';

export interface EPAwardRequest {
  userId: number;
  amount: number;
  reason: string;
  errandId?: number;
  multiplier?: number; // Subscription tier multiplier (2x, 3x, 5x)
}

export interface UserGamification {
  totalEp: number;
  currentMonthEp: number;
  tier: string;
  loginStreak: number;
  nextTierEp: number;
  nextTier: string;
}

// EP tier thresholds
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 100,
  gold: 250,
  platinum: 500,
};

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

// Rating bonus EP amounts
export const RATING_BONUSES = {
  1: 2,    // 1⭐ = +2 bonus
  2: 2,    // 2⭐ = +2 bonus
  3: 5,    // 3⭐ = +5 bonus
  4: 10,   // 4⭐ = +10 bonus
  5: 25,   // 5⭐ = +25 bonus (celebration!)
};

/**
 * Award EP to a user
 * - Awards immediately upon task/rating completion
 * - Applies subscription tier multiplier (2x, 3x, 5x) if provided
 * - Logs transaction for audit trail
 * - Updates tier if threshold crossed
 * - Resets monthly counter on month change
 */
export async function awardEp(request: EPAwardRequest): Promise<number> {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Apply multiplier if subscription is active
    const multiplier = request.multiplier || 1;
    const awardAmount = request.amount * multiplier;

    // Ensure gamification record exists
    await client.query(
      `INSERT INTO user_gamification (user_id, total_ep, current_month_ep, tier)
       VALUES ($1, 0, 0, 'bronze')
       ON CONFLICT (user_id) DO NOTHING`,
      [request.userId]
    );

    // Reset monthly EP if we've crossed into a new month
    const userResult = await client.query(
      `SELECT current_month_ep, created_at FROM user_gamification WHERE user_id = $1`,
      [request.userId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const createdDate = new Date(user.created_at);
      const currentDate = new Date();

      // If different month, reset current_month_ep
      if (createdDate.getMonth() !== currentDate.getMonth() ||
          createdDate.getFullYear() !== currentDate.getFullYear()) {
        await client.query(
          `UPDATE user_gamification SET current_month_ep = 0 WHERE user_id = $1`,
          [request.userId]
        );
      }
    }

    // Log the transaction with multiplier
    await client.query(
      `INSERT INTO ep_transactions (user_id, amount, reason, related_errand_id, multiplier, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [request.userId, awardAmount, request.reason, request.errandId || null, multiplier]
    );

    // Update gamification stats
    const updateResult = await client.query(
      `UPDATE user_gamification
       SET total_ep = total_ep + $1,
           current_month_ep = current_month_ep + $1
       WHERE user_id = $2
       RETURNING total_ep, current_month_ep`,
      [awardAmount, request.userId]
    );

    const updated = updateResult.rows[0];

    // Update tier based on total_ep
    const newTier = calculateTier(updated.total_ep);
    await client.query(
      `UPDATE user_gamification SET tier = $1 WHERE user_id = $2`,
      [newTier, request.userId]
    );

    await client.query('COMMIT');
    return updated.total_ep;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error awarding EP:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get user's gamification stats
 */
export async function getUserGamification(userId: number): Promise<UserGamification> {
  const result = await db.query(
    `SELECT total_ep, current_month_ep, tier, login_streak
     FROM user_gamification
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Create if doesn't exist
    await db.query(
      `INSERT INTO user_gamification (user_id, total_ep, current_month_ep, tier)
       VALUES ($1, 0, 0, 'bronze')`,
      [userId]
    );
    return {
      totalEp: 0,
      currentMonthEp: 0,
      tier: 'bronze',
      loginStreak: 0,
      nextTierEp: 100,
      nextTier: 'silver',
    };
  }

  const user = result.rows[0];
  const { nextTier, nextTierEp } = getNextTier(user.tier, user.total_ep);

  return {
    totalEp: user.total_ep,
    currentMonthEp: user.current_month_ep,
    tier: user.tier,
    loginStreak: user.login_streak || 0,
    nextTierEp,
    nextTier,
  };
}

/**
 * Get EP transaction history
 */
export async function getEpTransactions(userId: number, limit: number = 50) {
  const result = await db.query(
    `SELECT id, amount, reason, related_errand_id, created_at
     FROM ep_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Calculate tier based on total EP
 */
function calculateTier(totalEp: number): string {
  if (totalEp >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (totalEp >= TIER_THRESHOLDS.gold) return 'gold';
  if (totalEp >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

/**
 * Get next tier and EP needed
 */
function getNextTier(currentTier: string, totalEp: number): { nextTier: string; nextTierEp: number } {
  const currentIndex = TIER_ORDER.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex === TIER_ORDER.length - 1) {
    return { nextTier: 'platinum', nextTierEp: 0 };
  }

  const nextTierName = TIER_ORDER[currentIndex + 1];
  const nextTierThreshold = TIER_THRESHOLDS[nextTierName as keyof typeof TIER_THRESHOLDS];
  const epNeeded = Math.max(0, nextTierThreshold - totalEp);

  return { nextTier: nextTierName, nextTierEp: epNeeded };
}

/**
 * Get rating bonus EP
 */
export function getRatingBonus(rating: number): number {
  return RATING_BONUSES[rating as keyof typeof RATING_BONUSES] || 0;
}
