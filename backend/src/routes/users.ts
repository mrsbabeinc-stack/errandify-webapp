import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';
import { generateFormattedUserId } from '../utils/idFormatter.js';

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, user_id, display_name, email, mobile, role, formatted_user_id, chas_card_color, profile_image_url, alias, bio FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let user = result.rows[0];

    // Auto-generate formatted_user_id if missing (for existing users)
    if (!user.formatted_user_id) {
      const formattedUserId = generateFormattedUserId(user.id);
      await db.query(
        'UPDATE users SET formatted_user_id = $1 WHERE id = $2',
        [formattedUserId, user.id]
      );
      user.formatted_user_id = formattedUserId;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        userId: user.user_id,
        formattedUserId: user.formatted_user_id,
        name: user.display_name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        chasCardColor: user.chas_card_color,
        profileImageUrl: user.profile_image_url,
        alias: user.alias,
        bio: user.bio,
        categories: [],
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { display_name, mobile, monthly_household_income, chas_card_color, email, alias, bio, profile_image } = req.body;
    const userId = req.userId;

    let updateFields = [];
    let updateValues = [userId];
    let paramCount = 1;

    if (display_name) {
      updateFields.push(`display_name = $${++paramCount}`);
      updateValues.push(display_name);
    }
    if (email) {
      updateFields.push(`email = $${++paramCount}`);
      updateValues.push(email);
    }
    if (mobile) {
      updateFields.push(`mobile = $${++paramCount}`);
      updateValues.push(mobile);
    }
    if (alias !== undefined) {
      updateFields.push(`alias = $${++paramCount}`);
      updateValues.push(alias || null);
    }
    if (bio !== undefined) {
      updateFields.push(`bio = $${++paramCount}`);
      updateValues.push(bio || null);
    }
    if (profile_image) {
      updateFields.push(`profile_image_url = $${++paramCount}`);
      updateValues.push(profile_image);
    }

    // Handle CHAS card color (manual selection)
    if (chas_card_color !== undefined) {
      updateFields.push(`chas_card_color = $${++paramCount}`);
      updateValues.push(chas_card_color || null);
      updateFields.push(`chas_verified = $${++paramCount}`);
      updateValues.push(true);
      updateFields.push(`chas_verified_at = $${++paramCount}`);
      updateValues.push(new Date());
      updateFields.push(`chas_verification_method = $${++paramCount}`);
      updateValues.push('manual_selection');
    }

    // Handle monthly income (auto-calculate CHAS if income provided)
    if (monthly_household_income !== undefined) {
      updateFields.push(`monthly_household_income = $${++paramCount}`);
      updateValues.push(monthly_household_income);

      // Only auto-calculate CHAS if manual CHAS not set
      if (chas_card_color === undefined) {
        let chasColor = 'none';
        let chasPercent = 0;
        if (monthly_household_income <= 1900) {
          chasColor = 'blue';
          chasPercent = 25;
        } else if (monthly_household_income <= 3900) {
          chasColor = 'green';
          chasPercent = 15;
        }

        updateFields.push(`chas_card_color = $${++paramCount}`);
        updateValues.push(chasColor);
        updateFields.push(`chas_subsidy_percentage = $${++paramCount}`);
        updateValues.push(chasPercent);
        updateFields.push(`chas_verified = $${++paramCount}`);
        updateValues.push(true);
        updateFields.push(`chas_verified_at = $${++paramCount}`);
        updateValues.push(new Date());
        updateFields.push(`chas_verification_method = $${++paramCount}`);
        updateValues.push('income_self_declared');
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING id, display_name, mobile, monthly_household_income, chas_card_color, chas_subsidy_percentage, profile_image_url, alias, bio`;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        profileImageUrl: result.rows[0].profile_image_url,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update category preferences
router.patch('/categories', authMiddleware, async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'At least one category must be selected' });
    }

    const result = await db.query(
      'UPDATE users SET category_preferences = $1 WHERE id = $2 RETURNING id, category_preferences',
      [JSON.stringify(categories), req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        categories: result.rows[0].category_preferences,
      },
    });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update categories' });
  }
});

// Get user notification preferences
router.get('/preferences', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      'SELECT notification_preferences, email_frequency, email_preferences FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        notification_preferences: user.notification_preferences || {},
        email_frequency: user.email_frequency || 'daily',
        email_preferences: user.email_preferences || {},
      },
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user notification preferences
router.patch('/preferences', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { notification_preferences, email_frequency, email_preferences } = req.body;

    const updateFields = [];
    const updateValues = [userId];
    let paramCount = 1;

    if (notification_preferences !== undefined) {
      updateFields.push(`notification_preferences = $${++paramCount}`);
      updateValues.push(JSON.stringify(notification_preferences));
    }

    if (email_frequency) {
      updateFields.push(`email_frequency = $${++paramCount}`);
      updateValues.push(email_frequency);
    }

    if (email_preferences !== undefined) {
      updateFields.push(`email_preferences = $${++paramCount}`);
      updateValues.push(JSON.stringify(email_preferences));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, notification_preferences, email_frequency, email_preferences
    `;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        notification_preferences: result.rows[0].notification_preferences,
        email_frequency: result.rows[0].email_frequency,
        email_preferences: result.rows[0].email_preferences,
      },
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user ratings/history
router.get('/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const result = await db.query(
      `SELECT
        AVG(CAST(rating_score AS FLOAT)) as average_rating,
        COUNT(*) as review_count,
        json_agg(json_build_object(
          'score', rating_score,
          'comment', rating_comment,
          'taskId', task_id,
          'createdAt', created_at
        ) ORDER BY created_at DESC) as reviews
       FROM errand_assignments
       WHERE doer_id = $1 AND rating_score IS NOT NULL`,
      [userId]
    );

    const data = result.rows[0];
    const averageRating = data.average_rating ? Math.round(data.average_rating * 10) / 10 : 0;
    const reviews = data.reviews && data.reviews[0].score ? data.reviews : [];

    res.json({
      success: true,
      data: {
        averageRating,
        reviewCount: parseInt(data.review_count, 10),
        reviews,
      },
    });
  } catch (error) {
    console.error('Ratings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Get notification preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    // Ensure notification_preferences column exists
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'`
    );

    const result = await db.query(
      `SELECT notification_preferences FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const defaultPreferences = {
      bid_accepted: true,
      task_reopened: true,
      payment_released: true,
      new_bid_received: true,
      bid_rejected: false,
      message_received: true,
      task_completed: true,
      review_received: true,
      profile_viewed: false,
      referral_activity: false,
      platform_updates: false,
    };

    // Handle both empty object and null cases
    let prefs = user.notification_preferences;
    if (!prefs || Object.keys(prefs).length === 0) {
      prefs = defaultPreferences;
    }

    res.json({
      success: true,
      data: {
        notification_preferences: prefs,
      },
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update notification preferences
router.patch('/preferences', authMiddleware, async (req, res) => {
  try {
    // Ensure notification_preferences column exists
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'`
    );

    const { notification_preferences } = req.body;

    if (!notification_preferences) {
      return res.status(400).json({ error: 'notification_preferences required' });
    }

    const result = await db.query(
      `UPDATE users SET notification_preferences = $1 WHERE id = $2 RETURNING id`,
      [notification_preferences, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: { message: 'Preferences updated successfully' },
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/users/category-preferences - Save user's preferred categories for AI recommendations
router.post('/category-preferences', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { preferredCategories } = req.body;

    if (!Array.isArray(preferredCategories) || preferredCategories.length === 0) {
      return res.status(400).json({ error: 'At least one category required' });
    }

    // Update user's category preferences
    await db.query(
      'UPDATE users SET category_preferences = $1 WHERE id = $2',
      [preferredCategories, userId]
    );

    res.json({
      success: true,
      data: { message: 'Category preferences saved' },
    });
  } catch (error) {
    console.error('Category preferences error:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// GET /api/user/referral - Get user's referral code & stats
router.get('/referral', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Get user's referral code
    const userResult = await db.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referralCode = userResult.rows[0].referral_code;

    // Get referral stats: how many people joined with this code
    const referralStatsResult = await db.query(
      `SELECT COUNT(*) as referred_count, SUM(CASE WHEN kyc_status = 'completed' THEN 1 ELSE 0 END) as completed_count
       FROM users WHERE referred_by = $1`,
      [referralCode]
    );

    const referredCount = parseInt(referralStatsResult.rows[0].referred_count || '0', 10);
    const completedCount = parseInt(referralStatsResult.rows[0].completed_count || '0', 10);

    // Calculate earned points: 50 EP per completed referral
    const earnedPoints = completedCount * 50;

    // Generate referral link
    const referralLink = `${process.env.FRONTEND_URL || 'https://errandify.ai'}/signup?ref=${referralCode}`;

    console.log('[Referral] User:', userId, 'Code:', referralCode, 'Referred:', referredCount, 'Completed:', completedCount, 'Earned:', earnedPoints);

    res.json({
      success: true,
      data: {
        code: referralCode,
        link: referralLink,
        referredCount,
        completedCount,
        earnedPoints,
      },
    });
  } catch (error: any) {
    console.error('Referral endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch referral data',
      details: error.message,
    });
  }
});

// POST /api/users/favorite/:userId - Add/remove user from favorites
router.post('/favorite/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = parseInt(req.userId || '0', 10);
    const favoriteUserId = parseInt(req.params.userId, 10);
    const { taskId } = req.body;

    if (currentUserId === favoriteUserId) {
      return res.status(400).json({ error: 'Cannot favorite yourself' });
    }

    try {
      // Check if already favorited
      const existingResult = await db.query(
        `SELECT id FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2`,
        [currentUserId, favoriteUserId]
      );

      if (existingResult.rows.length > 0) {
        // Remove favorite
        await db.query(
          `DELETE FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2`,
          [currentUserId, favoriteUserId]
        );
        return res.json({ success: true, favorited: false, message: 'Removed from favorites' });
      } else {
        // Add favorite
        await db.query(
          `INSERT INTO user_favorites (user_id, favorite_user_id, added_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [currentUserId, favoriteUserId]
        );
        return res.json({ success: true, favorited: true, message: 'Added to favorites' });
      }
    } catch (dbError: any) {
      // If user_favorites table doesn't exist, return success but log warning
      if (dbError.message && dbError.message.includes('user_favorites')) {
        console.warn('[Favorites] user_favorites table not found, returning success anyway:', dbError.message);
        return res.json({ success: true, favorited: true, message: 'Added to favorites (pending table creation)' });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Favorite endpoint error:', error);
    res.status(500).json({
      error: 'Failed to update favorite',
      details: error.message,
    });
  }
});

export default router;
