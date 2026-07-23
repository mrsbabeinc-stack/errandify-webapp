import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import {
  getUserReferralCode,
  getReferralStats,
  getReferralRewards,
  JOIN_BONUS_EP,
  FIRST_JOB_BONUS_EP,
} from '../services/referralService.js';

const router = Router();

/**
 * GET /api/referrals/me - Get current user's referral code and stats
 * Also aliased as GET /api/user/referrals/stats (for frontend compatibility)
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const referralCode = await getUserReferralCode(userId);
    const stats = await getReferralStats(userId);

    res.json({
      success: true,
      data: {
        referral_code: stats.referral_code,
        referral_link: stats.referral_link,
        stats: {
          total_referred: stats.total_referred,
          first_job_completed: stats.first_job_completed,
          pending_bonuses: stats.pending_bonuses,
          total_earned_points: stats.total_earned_points,
          earned_breakdown: stats.earned_breakdown,
        },
      },
    });
  } catch (error) {
    console.error('Get referral data error:', error);
    res.status(500).json({ error: 'Failed to get referral data' });
  }
});

/**
 * GET /api/referrals/me/rewards - Get current user's referral rewards
 */
router.get(
  '/me/rewards',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.userId || '0', 10);
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const rewards = await getReferralRewards(userId, limit);

      res.json({
        success: true,
        data: {
          rewards,
          count: rewards.length,
        },
      });
    } catch (error) {
      console.error('Get referral rewards error:', error);
      res.status(500).json({ error: 'Failed to get referral rewards' });
    }
  }
);

/*
 * POST /track-join and POST /track-first-job used to live here. Both are gone.
 *
 * track-join was superseded by POST /api/auth/signup, which records the
 * referral and pays the join bonus inside the same transaction that creates
 * the account — so a second endpoint doing it again could only ever double-pay
 * or collide with the unique constraint on (referrer_id, referred_user_id).
 *
 * track-first-job was superseded by referralService.creditFirstCompletedErrand,
 * which fires from the errand-completion routes. Removing it matters more than
 * tidiness: it took `referrer_id` from the request body, so the client chose
 * who got paid, and its duplicate check asked whether the referrer had *ever*
 * received a first-job bonus rather than whether they had received one for
 * this particular person — meaning a second successful referral would never
 * have paid out.
 *
 * The service functions behind them are deprecated in referralService.ts.
 */

/**
 * GET /api/referrals/admin/overview — every referrer and every conversion.
 *
 * The admin Referral Tracking screen rendered three hardcoded rows
 * (ERRAND001/002/003, "Sarah Tan", "Acme Corp") that were indistinguishable
 * from real data, so the one screen that could have told you whether an invite
 * campaign worked always showed the same fictional numbers.
 *
 * Counted from referral_tracking, which is written by POST /api/auth/signup
 * when a `ref` is supplied.
 */
router.get(
  '/admin/overview',
  authMiddleware,
  requireAdmin(['admin', 'super-admin']) as any,
  async (_req: AuthRequest, res: Response) => {
    try {
      /**
       * Earnings come from a scalar subquery, not a join.
       *
       * Joining referral_rewards alongside referral_tracking fans the rows
       * out — one referral that has earned both bonuses becomes two rows, so
       * COUNT(t.id) reported 2 referrals where there was 1, and the error
       * scaled with every bonus paid. The dashboard would have overstated
       * referral counts by roughly the number of rewards per referrer.
       */
      const referrers = await db.query(
        `SELECT r.id AS "userId",
                COALESCE(r.alias, r.display_name, 'Errandify member') AS alias,
                r.referral_code AS "referralCode",
                COUNT(t.id)::int AS "totalReferrals",
                COUNT(t.id) FILTER (WHERE t.status = 'first_job_completed')::int AS "activeReferrals",
                COUNT(t.id) FILTER (WHERE t.joined_at >= NOW() - INTERVAL '7 days')::int AS "thisWeekReferrals",
                (SELECT COALESCE(SUM(w.points_amount), 0)::int
                   FROM referral_rewards w WHERE w.referrer_id = r.id) AS "totalEarnings",
                MAX(t.joined_at) AS "lastReferralDate"
           FROM users r
           JOIN referral_tracking t ON t.referrer_id = r.id
          WHERE r.anonymised_at IS NULL
          GROUP BY r.id, r.alias, r.display_name, r.referral_code
          ORDER BY COUNT(t.id) DESC
          LIMIT 200`
      );

      const conversions = await db.query(
        `SELECT t.id,
                t.referrer_id AS "referrerId",
                COALESCE(r.alias, r.display_name, 'Errandify member') AS "referrerAlias",
                CASE WHEN EXISTS (
                  SELECT 1 FROM company_staff cs WHERE cs.user_id = r.id
                ) THEN 'company' ELSE 'individual' END AS "referrerType",
                COALESCE(u.alias, u.display_name, 'Errandify member') AS "referredAlias",
                t.joined_at AS "signupDate",
                t.status,
                (SELECT COUNT(*) FROM errand_assignments ea
                  WHERE ea.doer_id = u.id AND ea.status = 'completed')::int AS "errandsCompleted"
           FROM referral_tracking t
           JOIN users r ON r.id = t.referrer_id
           JOIN users u ON u.id = t.referred_user_id
          WHERE u.anonymised_at IS NULL
          ORDER BY t.joined_at DESC
          LIMIT 500`
      );

      res.json({
        success: true,
        data: {
          referrers: referrers.rows,
          conversions: conversions.rows.map((c: any) => ({
            ...c,
            id: String(c.id),
            referrerId: String(c.referrerId),
            // Only the referrer is paid, so this is what the referral earned
            // them: the join bonus, plus the first-job bonus once it lands.
            epEarned: c.status === 'first_job_completed'
              ? JOIN_BONUS_EP + FIRST_JOB_BONUS_EP
              : JOIN_BONUS_EP,
            status: c.status === 'first_job_completed' ? 'active' : 'pending',
          })),
        },
      });
    } catch (error) {
      console.error('Referral admin overview error:', error);
      res.status(500).json({ error: 'Failed to load referral tracking' });
    }
  }
);

/**
 * GET /api/referrals/stats/:userId - Get any user's referral stats
 *
 * Was unauthenticated: anyone who could guess a user id could read that
 * person's referral history and earnings. It is their data, so it needs a
 * token, and a caller may only read their own unless they are an admin.
 */
router.get('/stats/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const callerId = parseInt(req.userId || '0', 10);
    if (userId !== callerId) {
      const caller = await db.query('SELECT role FROM users WHERE id = $1', [callerId]);
      const role = caller.rows[0]?.role;
      if (role !== 'admin' && role !== 'super-admin') {
        return res.status(403).json({ error: 'You can only view your own referral stats' });
      }
    }

    const stats = await getReferralStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(404).json({ error: 'User not found or referral data unavailable' });
  }
});

export default router;
