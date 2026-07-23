import { db } from '../db.js';

/**
 * The two bonuses, in one place.
 *
 * 50 was written as a bare literal in four spots — twice here, once inline in
 * the signup route, and once again in the users route's earnings maths — so
 * changing the programme meant finding all four. Only the *referrer* is paid;
 * the person being referred receives nothing for being referred.
 */
export const JOIN_BONUS_EP = 50;
export const FIRST_JOB_BONUS_EP = 50;

/**
 * The one place an invite URL is built.
 *
 * There were four, disagreeing: this file hardcoded errandify.ai/join,
 * routes/users.ts built FRONTEND_URL/signup, and two frontend share buttons
 * each rolled their own. None of the three paths was a routed page, so every
 * invite link led nowhere. /join and /signup both resolve now, and /join is
 * the canonical one.
 *
 * The domain comes from FRONTEND_URL so a staging invite does not send people
 * to production.
 */
export function buildReferralLink(referralCode: string): string {
  const base = (process.env.FRONTEND_URL || 'https://errandify.ai').replace(/\/+$/, '');
  return `${base}/join?ref=${encodeURIComponent(referralCode)}`;
}

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

/*
 * trackReferralJoin and trackReferralFirstJob were removed on 2026-07-23.
 *
 * Joins are recorded by POST /api/auth/signup, inside the transaction that
 * creates the account, so there is no window in which a user exists without
 * their referral. First errands are credited by creditFirstCompletedErrand
 * below, called from the errand-completion routes.
 *
 * trackReferralFirstJob is worth remembering as a cautionary tale: it looked
 * finished and was fully wired to an HTTP route, but its duplicate check asked
 * whether the referrer had ever received *any* first-job bonus rather than one
 * for *this* referred user. A referrer's second successful referral would
 * silently never have paid. Nothing called it, so nobody found out.
 */

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

    const referralLink = buildReferralLink(referralCode);

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
 * Award referral points.
 *
 * Exported because the signup route used to inline its own copy of all three
 * of these writes — a second implementation of one reward, already drifting
 * (it wrote a different ep_transactions reason). One payer, one ledger shape.
 *
 * `detail` is appended to the transaction reason so the join bonus can still
 * say who triggered it, which the inline version did and was worth keeping.
 */
export async function awardReferralPoints(
  client: any,
  referrerId: number,
  points: number,
  rewardType: 'join' | 'first_job' | 'loyalty' | 'multiplier',
  detail?: string
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
     VALUES ($1, $3, LEFT('Referral ' || $2 || ' bonus' || COALESCE($4, ''), 100), NOW())`,
    [referrerId, rewardType, points, detail ? ` — ${detail}` : null]
  );
}

/**
 * Helper: Generate unique referral code
 */
function generateReferralCode(): string {
  return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Pay the referrer when someone they invited finishes their first errand.
 *
 * The half of the reward programme that never ran. `trackReferralFirstJob`
 * below has existed since the referral system was built and has exactly one
 * caller — its own HTTP route — which nothing in the frontend ever hits. So
 * `referral_tracking.status` stayed 'joined' forever, `first_job_completed_at`
 * stayed NULL, and the second 50 EP was never paid to anyone.
 *
 * Two things are different here:
 *
 *  - **Keyed on the doer alone.** The old signature needed `referrerId`, which
 *    meant the *client* told the server who to pay. The referrer is a fact the
 *    database already knows; asking the caller for it is both awkward to wire
 *    and trivially abusable.
 *
 *  - **Idempotency comes from the status transition, not a lookup.** The old
 *    duplicate check asked "has this referrer ever been paid a first_job
 *    bonus?" — not "for this person?" — so a referrer who earned the bonus
 *    from one friend could never earn it from a second. Here the UPDATE
 *    itself carries `status = 'joined'` in its WHERE clause, so exactly one
 *    concurrent caller can win it, per referred user.
 *
 * Safe to call from every completion path, and cheap when there is no referral
 * to credit (one indexed lookup that usually returns nothing).
 */
export async function creditFirstCompletedErrand(
  doerId: number
): Promise<{ credited: boolean; referrerId?: number; points?: number }> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Claim the transition. Returns a row only for the caller that moved it
    // out of 'joined', so a double-submit or two completion paths firing for
    // the same errand cannot pay twice.
    const claimed = await client.query(
      `UPDATE referral_tracking
          SET status = 'first_job_completed',
              first_job_completed_at = NOW(),
              updated_at = NOW()
        WHERE referred_user_id = $1
          AND status = 'joined'
        RETURNING referrer_id`,
      [doerId]
    );

    if (claimed.rows.length === 0) {
      await client.query('COMMIT');
      return { credited: false };
    }

    const referrerId = claimed.rows[0].referrer_id;
    const points = FIRST_JOB_BONUS_EP;
    await awardReferralPoints(client, referrerId, points, 'first_job');

    await client.query('COMMIT');

    // EP that lands with no explanation reads like a glitch. Fire-and-forget:
    // the bonus is already committed and a notification failure must not
    // suggest otherwise.
    try {
      const who = await db.query(
        `SELECT COALESCE(alias, display_name, 'Someone you invited') AS name
           FROM users WHERE id = $1`,
        [doerId]
      );
      const name = who.rows[0]?.name || 'Someone you invited';
      const { sendNotification } = await import('../utils/notificationHelper.js');
      await sendNotification({
        userId: referrerId,
        type: 'referral_bonus',
        title: `+${points} EP — your invite is working`,
        message: `${name} just completed their first errand. That's ${points} Errandify Points for you.`,
      });
    } catch (notifyError) {
      console.error('[Referral] First-errand notification failed:', notifyError);
    }
    console.log(
      `[Referral] ${doerId} completed their first errand — referrer ${referrerId} awarded ${points} EP`
    );
    return { credited: true, referrerId, points };
  } catch (error) {
    await client.query('ROLLBACK');
    // A reward failure must never roll back the errand completion that
    // triggered it — the job is done either way. Callers log and move on.
    console.error('[Referral] First-errand credit failed for doer', doerId, error);
    return { credited: false };
  } finally {
    client.release();
  }
}

/**
 * Same as above, when the caller has an errand rather than a doer.
 *
 * The doer is read from the accepted bid, which is how the rest of this
 * codebase resolves it; errand_assignments is the fallback for rows that
 * predate accepted_bid_id.
 */
export async function creditFirstErrandForErrand(
  errandId: number | string
): Promise<{ credited: boolean; referrerId?: number; points?: number }> {
  try {
    const result = await db.query(
      `SELECT COALESCE(b.doer_id, ea.doer_id) AS doer_id
         FROM errands e
         LEFT JOIN bids b ON b.id = e.accepted_bid_id
         LEFT JOIN errand_assignments ea ON ea.errand_id = e.id AND ea.status = 'completed'
        WHERE e.id = $1
        LIMIT 1`,
      [errandId]
    );
    const doerId = result.rows[0]?.doer_id;
    if (!doerId) return { credited: false };
    return await creditFirstCompletedErrand(Number(doerId));
  } catch (error) {
    console.error('[Referral] Could not resolve doer for errand', errandId, error);
    return { credited: false };
  }
}

export default {
  getUserReferralCode,
  creditFirstCompletedErrand,
  creditFirstErrandForErrand,
  getReferralStats,
  getReferralRewards,
};
