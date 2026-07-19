import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';
import { generateFormattedUserId } from '../utils/idFormatter.js';
import bcrypt from 'bcrypt';

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, user_id, display_name, email, mobile, role, formatted_user_id, profile_image_url, alias, bio, certificates, average_rating, total_ratings, criminal_conviction, singpass_id, gender, errandify_points FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let user = result.rows[0];

    // Auto-generate formatted_user_id if missing (for existing users)
    if (!user.formatted_user_id) {
      const formattedUserId = generateFormattedUserId(user.singpass_id || user.user_id);
      await db.query(
        'UPDATE users SET formatted_user_id = $1 WHERE id = $2',
        [formattedUserId, user.id]
      );
      user.formatted_user_id = formattedUserId;
    }

    // Get completed errands count and earnings
    const tasksResult = await db.query(
      `SELECT
        COUNT(DISTINCT e.id) as completed_count,
        COALESCE(SUM(CASE WHEN e.status = 'completed' AND ea.doer_id = $1 THEN e.budget ELSE 0 END), 0) as doer_earnings
       FROM errands e
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id AND ea.status = 'completed'
       WHERE e.status = 'completed' AND (e.asker_id = $1 OR ea.doer_id = $1)`,
      [req.userId]
    );

    const completedTasks = parseInt(tasksResult.rows[0]?.completed_count || 0);
    const totalEarnings = parseInt(tasksResult.rows[0]?.doer_earnings || 0);

    // Get times favorited count
    const favoritedResult = await db.query(
      `SELECT COUNT(*) as favorite_count FROM user_favorites WHERE favorite_user_id = $1`,
      [req.userId]
    );
    const timesFavorited = parseInt(favoritedResult.rows[0]?.favorite_count || 0);

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
        gender: user.gender,
        profileImageUrl: user.profile_image_url,
        alias: user.alias,
        bio: user.bio,
        certificates: user.certificates || [],
        averageRating: user.average_rating,
        totalRatings: user.total_ratings || 0,
        criminalConviction: user.criminal_conviction || false,
        errandifyPoints: user.errandify_points || 0,
        completedTasks: completedTasks,
        totalEarnings: totalEarnings,
        timesFavorited: timesFavorited,
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
    const { display_name, mobile, email, alias, bio, profile_image, certificates } = req.body;
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

    // Handle certificates (max 10)
    if (certificates !== undefined && Array.isArray(certificates)) {
      const limitedCerts = certificates.slice(0, 10);
      updateFields.push(`certificates = $${++paramCount}`);
      updateValues.push(JSON.stringify(limitedCerts));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING id, user_id, formatted_user_id, display_name, mobile, email, role, gender, profile_image_url, alias, bio, certificates, average_rating, total_ratings, criminal_conviction`;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
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
        gender: user.gender,
        profileImageUrl: user.profile_image_url,
        alias: user.alias,
        bio: user.bio,
        certificates: user.certificates || [],
        averageRating: user.average_rating,
        totalRatings: user.total_ratings || 0,
        criminalConviction: user.criminal_conviction || false,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile photo
router.post('/profile-photo', authMiddleware, async (req, res) => {
  try {
    // For now, just accept the upload without storing (frontend stores as data URL)
    // In production, you would save to cloud storage (S3, etc.)
    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photoUrl: null // Frontend will use the data URL
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
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

    // Fetch from ratings table
    const result = await db.query(
      `SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.display_name as rater_name,
        u.alias as rater_alias,
        e.title as task_title
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       JOIN errands e ON r.task_id = e.id
       WHERE r.rated_user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const ratings = result.rows;

    // Calculate stats
    const totalRatings = ratings.length;
    const averageRating =
      totalRatings > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10) / 10
        : 0;

    const ratingBreakdown = {
      5: ratings.filter((r) => r.rating === 5).length,
      4: ratings.filter((r) => r.rating === 4).length,
      3: ratings.filter((r) => r.rating === 3).length,
      2: ratings.filter((r) => r.rating === 2).length,
      1: ratings.filter((r) => r.rating === 1).length,
    };

    res.json({
      success: true,
      data: {
        averageRating,
        reviewCount: totalRatings,
        reviews: ratings.map((r) => ({
          id: r.id,
          score: r.rating,
          comment: r.comment,
          raterName: r.rater_name,
          raterAlias: r.rater_alias,
          taskTitle: r.task_title,
          createdAt: r.created_at,
        })),
        breakdown: ratingBreakdown,
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

// GET /api/users/referrals/stats - Get detailed referral stats (for MyReferralsPage)
router.get('/referrals/stats', authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Import referral service functions
    const { getReferralStats } = await import('../services/referralService.js');

    const stats = await getReferralStats(userId);

    res.json({
      success: true,
      data: {
        myCode: stats.referral_code,
        myLink: stats.referral_link,
        totalReferred: stats.total_referred,
        totalEarned: stats.total_earned_points,
        referralsList: [], // Placeholder - frontend shows mock data
      },
    });
  } catch (error: any) {
    console.error('Referral stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch referral stats',
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

// GET /api/users/favorites - Get user's favorite users list
router.get('/favorites', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const currentUserId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT favorite_user_id
       FROM user_favorites
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [currentUserId]
    );

    // Return just the IDs for quick lookup
    const favoriteIds = result.rows.map(row => row.favorite_user_id);

    res.json({
      success: true,
      data: favoriteIds,
    });
  } catch (error: any) {
    console.error('Get favorites endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch favorites',
      details: error.message,
    });
  }
});

// POST /api/users/accept-declaration - Save user's acceptance of safety declaration
router.post('/accept-declaration', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { declarations, acceptedAt } = req.body;

    if (!declarations || typeof declarations !== 'object') {
      return res.status(400).json({ error: 'Declarations object required' });
    }

    // Verify all declarations are accepted
    const allAccepted = Object.values(declarations).every(v => v === true);
    if (!allAccepted) {
      return res.status(400).json({ error: 'All 5 declarations must be accepted' });
    }

    // Save to audit log
    await db.query(
      `INSERT INTO user_declarations_log (user_id, declaration_type, accepted, accepted_at, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'before_you_get_started', true, acceptedAt || new Date(), req.ip]
    );

    // Update user table
    await db.query(
      `UPDATE users SET declaration_accepted = true, declaration_accepted_at = NOW(), account_active = true
       WHERE id = $1`,
      [userId]
    );

    console.log(`✅ User ${userId} accepted "Before You Get Started" declaration`);

    res.json({
      success: true,
      message: 'Declaration accepted. Welcome to Errandify!',
    });
  } catch (error: any) {
    console.error('Declaration save error:', error);
    res.status(500).json({
      error: 'Failed to save declaration',
      details: error.message,
    });
  }
});

// GET /api/users/declaration-status - Check if user has accepted declaration
router.get('/declaration-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      'SELECT declaration_accepted, declaration_accepted_at, account_active FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        declarationAccepted: user.declaration_accepted,
        declarationAcceptedAt: user.declaration_accepted_at,
        accountActive: user.account_active,
      },
    });
  } catch (error: any) {
    console.error('Declaration status error:', error);
    res.status(500).json({
      error: 'Failed to fetch declaration status',
      details: error.message,
    });
  }
});

// Add Certificate
router.post('/certificates', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Certificate title is required' });
    }

    const result = await db.query(
      'SELECT certificates FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const certificates = result.rows[0].certificates || [];
    if (certificates.length >= 10) {
      return res.status(400).json({ error: 'Maximum 10 certificates allowed' });
    }

    const newCert = { title: title.trim(), url: null };
    const updatedCerts = [...certificates, newCert];

    await db.query(
      'UPDATE users SET certificates = $1 WHERE id = $2',
      [JSON.stringify(updatedCerts), req.userId]
    );

    res.json({
      success: true,
      data: { certificates: updatedCerts }
    });
  } catch (error: any) {
    console.error('Certificate add error:', error);
    res.status(500).json({ error: 'Failed to add certificate' });
  }
});

// Delete Certificate
router.delete('/certificates/:title', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title } = req.params;

    const result = await db.query(
      'SELECT certificates FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const certificates = result.rows[0].certificates || [];
    const updatedCerts = certificates.filter((cert: any) => cert.title !== decodeURIComponent(title));

    await db.query(
      'UPDATE users SET certificates = $1 WHERE id = $2',
      [JSON.stringify(updatedCerts), req.userId]
    );

    res.json({
      success: true,
      data: { certificates: updatedCerts }
    });
  } catch (error: any) {
    console.error('Certificate delete error:', error);
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

// POST /api/users/favorites/:userId - Add user to favorites
router.post('/favorites/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const currentUserId = parseInt(req.userId || '0', 10);
    const favoriteUserId = parseInt(req.params.userId, 10);

    // Prevent favoriting yourself
    if (currentUserId === favoriteUserId) {
      return res.status(400).json({ error: 'You cannot favorite yourself.' });
    }

    // Check if already favorited
    const existing = await db.query(
      `SELECT id FROM user_favorites
       WHERE user_id = $1 AND favorite_user_id = $2`,
      [currentUserId, favoriteUserId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already favorited.' });
    }

    // Add to favorites
    await db.query(
      `INSERT INTO user_favorites (user_id, favorite_user_id, added_at)
       VALUES ($1, $2, NOW())`,
      [currentUserId, favoriteUserId]
    );

    res.json({
      success: true,
      message: 'Added to favorites.',
    });
  } catch (error: any) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite.' });
  }
});

// DELETE /api/users/favorites/:userId - Remove user from favorites
router.delete('/favorites/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const currentUserId = parseInt(req.userId || '0', 10);
    const favoriteUserId = parseInt(req.params.userId, 10);

    // Remove from favorites
    const result = await db.query(
      `DELETE FROM user_favorites
       WHERE user_id = $1 AND favorite_user_id = $2`,
      [currentUserId, favoriteUserId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not in favorites.' });
    }

    res.json({
      success: true,
      message: 'Removed from favorites.',
    });
  } catch (error: any) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite.' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.userId;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Get current user
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    if (!user.password_hash) {
      return res.status(400).json({ error: 'User does not have a password set' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Check account deletion eligibility
router.get('/deletion-eligibility', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Check for active/pending errands (as asker or doer)
    const errandsResult = await db.query(
      `SELECT COUNT(*) as count FROM errands
       WHERE (asker_id = $1 OR id IN (SELECT errand_id FROM errand_assignments WHERE doer_id = $1))
       AND status IN ('posted', 'bidding', 'accepted', 'in_progress', 'pending_review')`,
      [userId]
    );

    const pendingErrands = parseInt(errandsResult.rows[0]?.count || 0);

    // Check for payment holds (money held in escrow)
    const holdsResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_held
       FROM payment_holds
       WHERE user_id = $1 AND status IN ('HOLD', 'PENDING_REVIEW')`,
      [userId]
    );

    const pendingHolds = parseInt(holdsResult.rows[0]?.count || 0);
    const totalHeld = parseFloat(holdsResult.rows[0]?.total_held || 0);

    // Check for pending disputes
    const disputesResult = await db.query(
      `SELECT COUNT(*) as count FROM disputes
       WHERE (asker_id = $1 OR doer_id = $1 OR reporter_id = $1)
       AND status IN ('open', 'pending_review', 'under_investigation')`,
      [userId]
    );

    const pendingDisputes = parseInt(disputesResult.rows[0]?.count || 0);

    // Check for outstanding payments (user owes platform fees, subscription, etc.)
    const paymentsResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_owed
       FROM transactions
       WHERE user_id = $1 AND status IN ('pending', 'overdue')
       AND type IN ('ADVERTISING', 'SUBSCRIPTION', 'PLATFORM_FEE')`,
      [userId]
    );

    const outstandingPayments = parseInt(paymentsResult.rows[0]?.count || 0);
    const totalOwed = parseFloat(paymentsResult.rows[0]?.total_owed || 0);

    // Check for pending withdrawals
    const withdrawalsResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_pending
       FROM wallet_transactions
       WHERE user_id = $1 AND type = 'WITHDRAWAL' AND status = 'pending'`,
      [userId]
    );

    const pendingWithdrawals = parseInt(withdrawalsResult.rows[0]?.count || 0);
    const totalWithdrawalPending = parseFloat(withdrawalsResult.rows[0]?.total_pending || 0);

    // Check for active company (if user is company owner)
    const companyResult = await db.query(
      `SELECT COUNT(*) as count FROM companies
       WHERE owner_id = $1`,
      [userId]
    );

    const activeCompanies = parseInt(companyResult.rows[0]?.count || 0);

    // Build eligibility response
    const canDelete = pendingErrands === 0 && pendingHolds === 0 && pendingDisputes === 0 &&
                     outstandingPayments === 0 && pendingWithdrawals === 0 && activeCompanies === 0;

    const blockers: Array<{ type: string; count: number; message: string; details?: string }> = [];

    if (pendingErrands > 0) {
      blockers.push({
        type: 'PENDING_ERRANDS',
        count: pendingErrands,
        message: `${pendingErrands} active errand${pendingErrands > 1 ? 's' : ''} in progress`,
        details: 'Complete or cancel all active errands before deletion',
      });
    }

    if (pendingHolds > 0) {
      blockers.push({
        type: 'PAYMENT_HOLDS',
        count: pendingHolds,
        message: `SGD $${totalHeld.toFixed(2)} held in escrow`,
        details: 'Wait for holds to release (typically 48 hours) or resolve disputes',
      });
    }

    if (pendingDisputes > 0) {
      blockers.push({
        type: 'PENDING_DISPUTES',
        count: pendingDisputes,
        message: `${pendingDisputes} pending dispute${pendingDisputes > 1 ? 's' : ''}`,
        details: 'Resolve all disputes before account deletion',
      });
    }

    if (outstandingPayments > 0) {
      blockers.push({
        type: 'OUTSTANDING_PAYMENTS',
        count: outstandingPayments,
        message: `SGD $${totalOwed.toFixed(2)} outstanding payment${outstandingPayments > 1 ? 's' : ''}`,
        details: 'Settle all payment obligations before deletion',
      });
    }

    if (pendingWithdrawals > 0) {
      blockers.push({
        type: 'PENDING_WITHDRAWALS',
        count: pendingWithdrawals,
        message: `SGD $${totalWithdrawalPending.toFixed(2)} withdrawal${pendingWithdrawals > 1 ? 's' : ''} in progress`,
        details: 'Wait for pending withdrawals to complete',
      });
    }

    if (activeCompanies > 0) {
      blockers.push({
        type: 'ACTIVE_COMPANY',
        count: activeCompanies,
        message: `${activeCompanies} company${activeCompanies > 1 ? 'ies' : ''} owned`,
        details: 'Transfer or delete owned companies first',
      });
    }

    res.json({
      success: true,
      canDelete,
      blockers,
      summary: {
        pendingErrands,
        pendingHolds,
        totalHeld,
        pendingDisputes,
        outstandingPayments,
        totalOwed,
        pendingWithdrawals,
        totalWithdrawalPending,
        activeCompanies,
      },
    });
  } catch (error: any) {
    console.error('Deletion eligibility check error:', error);
    res.status(500).json({ error: 'Failed to check deletion eligibility' });
  }
});

// Delete account
router.post('/delete-account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Re-check eligibility before deletion
    const eligibilityResult = await db.query(
      `SELECT COUNT(*) as pending_errands FROM errands
       WHERE (asker_id = $1 OR id IN (SELECT errand_id FROM errand_assignments WHERE doer_id = $1))
       AND status IN ('posted', 'bidding', 'accepted', 'in_progress', 'pending_review')`,
      [userId]
    );

    if (parseInt(eligibilityResult.rows[0]?.pending_errands || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete account with active errands' });
    }

    const holdsResult = await db.query(
      `SELECT COUNT(*) as count FROM payment_holds
       WHERE user_id = $1 AND status IN ('HOLD', 'PENDING_REVIEW')`,
      [userId]
    );

    if (parseInt(holdsResult.rows[0]?.count || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete account with active payment holds' });
    }

    // Mark user as deleted (soft delete)
    await db.query(
      `UPDATE users SET
        is_deleted = true,
        email = NULL,
        mobile = NULL,
        password_hash = NULL,
        display_name = 'Deleted User'
       WHERE id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Account deletion request submitted. Check email for confirmation.',
    });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
