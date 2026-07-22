import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';
import { getDeletionBlockers, anonymiseAccount } from '../services/accountDeletion.js';
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
// Public profile — safe, minimal fields only (used by Trusted Users / favorites).
// Auth required so profiles can't be scraped anonymously; never exposes contact
// details, NRIC, email, address or payment info.
router.get('/:id/public-profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const result = await db.query(
      `SELECT id, display_name, alias, profile_image_url, formatted_user_id
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.rows[0];
    res.json({
      success: true,
      data: {
        id: u.id,
        displayName: u.display_name,
        display_name: u.display_name,
        alias: u.alias,
        profileImage: u.profile_image_url,
        profile_image_url: u.profile_image_url,
        formattedUserId: u.formatted_user_id,
      },
    });
  } catch (error) {
    console.error('Public profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch public profile' });
  }
});

router.get('/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    // Fetch from ratings table
    const result = await db.query(
      `SELECT
        r.id,
        r.rating,
        r.review_text as comment,
        r.created_at,
        u.display_name as rater_name,
        u.alias as rater_alias,
        e.title as task_title
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       JOIN errands e ON r.errand_id = e.id
       WHERE r.ratee_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const ratings = result.rows;

    // Calculate stats.
    //
    // ratings.rating is NUMERIC, which pg hands back as a string ("4.0"), so
    // `sum + r.rating` concatenated instead of adding: "0" + "4.0" + "4.0"...
    // then dividing that by the count produced NaN, which serialises to null.
    // A user with four 4-star reviews was reported as having no average at all,
    // and MyAccountPage called .toFixed(1) on it and took the page down.
    //
    // The breakdown had the same root cause: `r.rating === 5` compares a string
    // to a number and is never true, so every bucket read zero.
    const scores = ratings.map((r) => Number(r.rating)).filter((n) => !Number.isNaN(n));
    const totalRatings = ratings.length;
    const averageRating =
      scores.length > 0
        ? Math.round((scores.reduce((sum, n) => sum + n, 0) / scores.length) * 10) / 10
        : 0;

    const ratingBreakdown = {
      5: scores.filter((n) => Math.round(n) === 5).length,
      4: scores.filter((n) => Math.round(n) === 4).length,
      3: scores.filter((n) => Math.round(n) === 3).length,
      2: scores.filter((n) => Math.round(n) === 2).length,
      1: scores.filter((n) => Math.round(n) === 1).length,
    };

    res.json({
      success: true,
      data: {
        averageRating,
        reviewCount: totalRatings,
        reviews: ratings.map((r) => ({
          id: r.id,
          score: Number(r.rating),
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
    const userId = parseInt(req.userId || '0', 10);
    const blockers = await getDeletionBlockers(userId);

    res.json({
      success: true,
      canDelete: blockers.length === 0,
      blockers,
      // What deletion actually does, said before they press it. PDPA's
      // Notification Obligation (s20) means the purpose of retention has to be
      // made known — and someone deciding whether to leave deserves to know
      // what survives regardless.
      retention: {
        removed: [
          'Your name, alias, photo and bio',
          'Email, phone number and address',
          'NRIC and Singpass identifiers',
          'Bank and payout details',
          'Any criminal declaration you made',
        ],
        kept: [
          'Errand and offer history, with your name removed',
          'Payment and payout records, kept for tax and accounting',
          'Resolved dispute outcomes, which the other party also relies on',
        ],
        why: 'Singapore law requires business and accounting records to be kept for a period after the transaction. Those records are stripped of anything that identifies you, and deleted entirely once that period ends.',
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
    const userId = parseInt(req.userId || '0', 10);

    // Re-checked here rather than trusted from the screen. These two used to
    // disagree — eligibility weighed errands, disputes and company ownership
    // while this route looked only at errands, so anyone with an open dispute
    // could delete by calling the API directly.
    const blockers = await getDeletionBlockers(userId);
    if (blockers.length > 0) {
      return res.status(400).json({
        error: 'There are a few things to settle before your account can close.',
        blockers,
      });
    }

    const result = await anonymiseAccount(userId, 'user_request');
    console.log(`[Deletion] user ${userId} anonymised — ${result.anonymisedFields} fields cleared`);

    res.json({
      success: true,
      message: 'Your account is closed and your personal details have been removed.',
      retained: result.retained,
    });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * Blocked and trusted users — the two lists behind /block-list and
 * /trusted-users. Neither had a backend; both pages silently rendered
 * hardcoded people when the call failed.
 *
 * Trusted reads user_favorites, which POST /users/favorite/:userId already
 * maintains, rather than starting a second list that could disagree with it.
 * Blocked reads blocked_users (migration 028).
 *
 * Field names are camelCase here because that is what both pages already
 * destructure; renaming them would mean touching the components for no gain.
 */

/**
 * POST /api/users/consents — record the signup agreements.
 *
 * Replaces a POST to /api/screenings that never existed, so no user's
 * acceptance of the terms has ever been stored. Deliberately does not touch
 * criminal declarations: those go to /api/screening/declare, which is what
 * applies category restrictions.
 */
router.post('/consents', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const b = req.body || {};

    // The three that make the account usable at all. Without them there is
    // nothing to record, so this is refused rather than stored half-agreed.
    if (!b.agreed_terms || !b.agreed_privacy || !b.responsible_use) {
      return res.status(400).json({
        error: 'The terms, privacy policy and responsible use declarations must all be accepted',
      });
    }

    const result = await db.query(
      `INSERT INTO user_consents (
         user_id, agreed_terms, agreed_privacy, responsible_use,
         authorized_to_work, accurate_information, agreed_background_verification,
         no_disputes, no_cancelled_accounts, ip_address, consented_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         agreed_terms = $2, agreed_privacy = $3, responsible_use = $4,
         authorized_to_work = $5, accurate_information = $6,
         agreed_background_verification = $7, no_disputes = $8,
         no_cancelled_accounts = $9, ip_address = $10,
         consented_at = NOW(), updated_at = NOW()
       RETURNING id, consented_at`,
      [
        userId,
        Boolean(b.agreed_terms), Boolean(b.agreed_privacy), Boolean(b.responsible_use),
        Boolean(b.authorized_to_work), Boolean(b.accurate_information),
        Boolean(b.agreed_background_verification), Boolean(b.no_disputes),
        Boolean(b.no_cancelled_accounts), req.ip || null,
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Consent recording error:', error);
    res.status(500).json({ error: 'Failed to record your agreement' });
  }
});

// GET /api/users/blocked-users
router.get('/blocked-users', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const result = await db.query(
      `SELECT u.id,
              COALESCE(u.alias, u.display_name) AS "displayName",
              u.profile_image_url AS "profileImage",
              u.role,
              b.created_at AS "blockedAt"
         FROM blocked_users b
         JOIN users u ON u.id = b.blocked_user_id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Blocked users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// POST /api/users/blocked-users/:userId — block someone
router.post('/blocked-users/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const target = parseInt(req.params.userId, 10);
    if (Number.isNaN(target)) return res.status(400).json({ error: 'Invalid user' });
    if (target === userId) return res.status(400).json({ error: 'You cannot block yourself' });

    const exists = await db.query('SELECT id FROM users WHERE id = $1', [target]);
    if (exists.rows.length === 0) return res.status(404).json({ error: 'That person is no longer here' });

    await db.query(
      `INSERT INTO blocked_users (user_id, blocked_user_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, blocked_user_id) DO NOTHING`,
      [userId, target, req.body?.reason || null]
    );
    res.json({ success: true, data: { blocked: true } });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/users/blocked-users/:userId — unblock
router.delete('/blocked-users/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const target = parseInt(req.params.userId, 10);
    if (Number.isNaN(target)) return res.status(400).json({ error: 'Invalid user' });

    await db.query(
      'DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
      [userId, target]
    );
    res.json({ success: true, data: { blocked: false } });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// GET /api/users/trusted-users
router.get('/trusted-users', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const result = await db.query(
      `SELECT u.id,
              COALESCE(u.alias, u.display_name) AS "displayName",
              u.profile_image_url AS "profileImage",
              COALESCE(u.average_rating, 0) AS rating,
              u.role,
              f.added_at AS "addedAt"
         FROM user_favorites f
         JOIN users u ON u.id = f.favorite_user_id
        WHERE f.user_id = $1
        ORDER BY f.added_at DESC`,
      [userId]
    );
    // average_rating arrives from pg as a string; the page renders it as a number
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({ ...r, rating: Number(r.rating) || 0 })),
    });
  } catch (error) {
    console.error('Trusted users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch trusted users' });
  }
});

// DELETE /api/users/trusted-users/:userId — remove from trusted
router.delete('/trusted-users/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const target = parseInt(req.params.userId, 10);
    if (Number.isNaN(target)) return res.status(400).json({ error: 'Invalid user' });

    await db.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2',
      [userId, target]
    );
    res.json({ success: true, data: { trusted: false } });
  } catch (error) {
    console.error('Remove trusted user error:', error);
    res.status(500).json({ error: 'Failed to remove trusted user' });
  }
});

export default router;
