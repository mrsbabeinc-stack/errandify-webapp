import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import {
  getUserReferralCode,
  trackReferralJoin,
  trackReferralFirstJob,
  getReferralStats,
  getReferralRewards,
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

/**
 * POST /api/referrals/track-join - Track when a referred user joins
 * Body: { referrer_id, referral_code }
 */
router.post('/track-join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const referredUserId = parseInt(req.userId || '0', 10);
    const { referrer_id, referral_code } = req.body;

    if (!referrer_id || !referral_code) {
      return res.status(400).json({
        error: 'Missing required fields: referrer_id, referral_code',
      });
    }

    const result = await trackReferralJoin(referrer_id, referredUserId, referral_code);

    res.json({
      success: result.success,
      data: {
        points_awarded: result.points_awarded,
        message: result.success
          ? `${result.points_awarded} points awarded to referrer`
          : 'Referral already tracked or invalid',
      },
    });
  } catch (error) {
    console.error('Track referral join error:', error);
    res.status(500).json({ error: 'Failed to track referral join' });
  }
});

/**
 * POST /api/referrals/track-first-job - Track when a referred user completes first job
 * Body: { referrer_id }
 */
router.post(
  '/track-first-job',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const referredUserId = parseInt(req.userId || '0', 10);
      const { referrer_id } = req.body;

      if (!referrer_id) {
        return res.status(400).json({
          error: 'Missing required field: referrer_id',
        });
      }

      const result = await trackReferralFirstJob(referrer_id, referredUserId);

      res.json({
        success: result.success,
        data: {
          points_awarded: result.points_awarded,
          message: result.success
            ? `${result.points_awarded} points awarded to referrer for first job completion`
            : 'First job bonus already awarded or referral not found',
        },
      });
    } catch (error) {
      console.error('Track referral first job error:', error);
      res.status(500).json({ error: 'Failed to track first job completion' });
    }
  }
);

/**
 * GET /api/referrals/stats/:userId - Get any user's referral stats (public)
 */
router.get('/stats/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
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
