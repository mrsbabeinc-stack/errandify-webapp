import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/user-profile/:userId - Get user's public profile
router.get('/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    // Get user basic info
    const userResult = await db.query(
      `SELECT
         id,
         display_name,
         phone,
         role,
         profile_image_url,
         bio,
         created_at,
         average_rating,
         total_ratings,
         kyc_status,
         criminal_conviction
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get rating details
    const ratingResult = await db.query(
      `SELECT
         COUNT(*) as total_ratings,
         ROUND(AVG(rating)::numeric, 1) as average_rating,
         COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
         COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
         COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
         COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
         COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM ratings
       WHERE rated_user_id = $1`,
      [userId]
    );

    const ratingStats = ratingResult.rows[0];

    // Get recent reviews (max 5)
    const reviewsResult = await db.query(
      `SELECT
         r.id,
         r.rating,
         r.comment,
         r.created_at,
         u.display_name as rater_name,
         e.title as task_title
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       JOIN errands e ON r.task_id = e.id
       WHERE r.rated_user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [userId]
    );

    // Get work statistics
    const statsResult = await db.query(
      `SELECT
         COUNT(CASE WHEN ea.doer_id = $1 AND e.status IN ('completed_confirmed', 'completed_unconfirmed') THEN 1 END) as tasks_completed_doer,
         COUNT(CASE WHEN ea.doer_id = $1 AND e.status = 'in_progress' THEN 1 END) as tasks_in_progress,
         COUNT(CASE WHEN e.asker_id = $1 AND e.status IN ('completed_confirmed', 'completed_unconfirmed') THEN 1 END) as tasks_completed_asker,
         ROUND(AVG(CASE WHEN ea.doer_id = $1 AND e.status IN ('completed_confirmed', 'completed_unconfirmed') THEN e.budget * 0.8 END)::numeric, 2) as avg_earning,
         MAX(CASE WHEN e.completed_at IS NOT NULL THEN e.completed_at END) as last_activity
       FROM errands e
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE ea.doer_id = $1 OR e.asker_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0] || {};

    // Get verification badges
    const badges = [];
    if (user.kyc_status === 'verified') {
      badges.push({
        type: 'verified',
        label: 'KYC Verified',
        description: 'Identity verified via SingPass',
        icon: '✅',
      });
    }
    if (parseInt(ratingStats.total_ratings, 10) >= 10) {
      badges.push({
        type: 'trusted',
        label: 'Trusted Worker',
        description: `${ratingStats.total_ratings} verified ratings`,
        icon: '⭐',
      });
    }
    if (ratingStats.average_rating && parseFloat(ratingStats.average_rating) >= 4.5) {
      badges.push({
        type: 'excellent',
        label: 'Excellent Quality',
        description: `${ratingStats.average_rating} average rating`,
        icon: '🏆',
      });
    }
    if (parseInt(stats.tasks_completed_doer || 0, 10) >= 25) {
      badges.push({
        type: 'super_doer',
        label: 'Super Doer',
        description: '25+ tasks completed',
        icon: '🚀',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          displayName: user.display_name,
          profileImage: user.profile_image_url,
          bio: user.bio,
          role: user.role,
          kyc_status: user.kyc_status,
          joinedDate: user.created_at,
          restricted: user.criminal_conviction,
        },
        rating: {
          averageRating: parseFloat(ratingStats.average_rating) || 0,
          totalRatings: parseInt(ratingStats.total_ratings, 10),
          breakdown: {
            5: parseInt(ratingStats.five_star, 10),
            4: parseInt(ratingStats.four_star, 10),
            3: parseInt(ratingStats.three_star, 10),
            2: parseInt(ratingStats.two_star, 10),
            1: parseInt(ratingStats.one_star, 10),
          },
        },
        stats: {
          tasksCompletedAsDoer: parseInt(stats.tasks_completed_doer || 0, 10),
          tasksCompletedAsAsker: parseInt(stats.tasks_completed_asker || 0, 10),
          tasksInProgress: parseInt(stats.tasks_in_progress || 0, 10),
          averageEarning: parseFloat(stats.avg_earning) || 0,
          lastActivity: stats.last_activity,
        },
        recentReviews: reviewsResult.rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          raterName: r.rater_name,
          taskTitle: r.title,
          date: r.created_at,
        })),
        badges,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// GET /api/user-profile/me - Get current user's full profile (with private data)
router.get('/me/full', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const userResult = await db.query(
      `SELECT
         id,
         display_name,
         phone,
         role,
         profile_image_url,
         bio,
         skills,
         created_at,
         average_rating,
         total_ratings,
         kyc_status,
         nric_hash
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        displayName: user.display_name,
        phone: user.phone,
        role: user.role,
        profileImage: user.profile_image_url,
        bio: user.bio,
        skills: user.skills || [],
        createdAt: user.created_at,
        averageRating: user.average_rating,
        totalRatings: user.total_ratings,
        kycStatus: user.kyc_status,
        nricVerified: !!user.nric_hash,
      },
    });
  } catch (error) {
    console.error('Get current user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// PUT /api/user-profile/me - Update user profile
router.put('/me/update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { displayName, bio, skills, profileImageUrl, phone } = req.body;

    const updateResult = await db.query(
      `UPDATE users
       SET
         display_name = COALESCE($1, display_name),
         bio = COALESCE($2, bio),
         skills = COALESCE($3, skills),
         profile_image_url = COALESCE($4, profile_image_url),
         phone = COALESCE($5, phone)
       WHERE id = $6
       RETURNING
         id,
         display_name,
         email,
         phone,
         role,
         profile_image_url,
         bio,
         skills,
         average_rating,
         total_ratings,
         kyc_status`,
      [displayName || null, bio || null, skills ? JSON.stringify(skills) : null, profileImageUrl || null, phone || null, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = updateResult.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        displayName: user.display_name,
        phone: user.phone,
        role: user.role,
        profileImage: user.profile_image_url,
        bio: user.bio,
        skills: user.skills || [],
        averageRating: user.average_rating,
        totalRatings: user.total_ratings,
        kycStatus: user.kyc_status,
      },
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
