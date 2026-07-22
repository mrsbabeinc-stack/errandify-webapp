import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/user-data/export - Export all user data (PDPA right)
router.get('/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Get user profile
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get all errands (as asker and doer)
    const errandsResult = await db.query(
      `SELECT e.*, u.display_name as asker_name
       FROM errands e
       JOIN users u ON e.asker_id = u.id
       WHERE e.asker_id = $1 OR e.id IN (
         SELECT errand_id FROM errand_assignments WHERE doer_id = $1
       )
       ORDER BY e.created_at DESC`,
      [userId]
    );

    // Get all bids
    const bidsResult = await db.query(
      'SELECT * FROM bids WHERE doer_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Get all ratings received
    const ratingsResult = await db.query(
      `SELECT r.*, u.display_name as rater_name, e.title as task_title
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       JOIN errands e ON r.task_id = e.id
       WHERE r.rated_user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Get all disputes
    const disputesResult = await db.query(
      `SELECT * FROM disputes
       WHERE filed_by_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get chat messages
    const messagesResult = await db.query(
      `SELECT * FROM chat_messages
       WHERE sender_id = $1 OR recipient_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get notifications
    const notificationsResult = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Get screening declaration
    const screeningResult = await db.query(
      'SELECT * FROM screening_declarations WHERE user_id = $1',
      [userId]
    );

    // Create comprehensive export object
    const exportData = {
      exportDate: new Date().toISOString(),
      userProfile: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        bio: user.bio,
        profileImageUrl: user.profile_image_url,
        kycStatus: user.kyc_status,
        averageRating: user.average_rating,
        totalRatings: user.total_ratings,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
      errands: errandsResult.rows.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        budget: e.budget,
        status: e.status,
        askerRole: e.asker_id === userId ? 'asker' : 'doer',
        createdAt: e.created_at,
        completedAt: e.completed_at,
      })),
      bids: bidsResult.rows.map((b) => ({
        id: b.id,
        errandId: b.errand_id,
        amount: b.amount,
        status: b.status,
        createdAt: b.created_at,
      })),
      ratings: ratingsResult.rows.map((r) => ({
        id: r.id,
        taskTitle: r.task_title,
        rating: r.rating,
        comment: r.comment,
        raterName: r.rater_name,
        createdAt: r.created_at,
      })),
      disputes: disputesResult.rows.map((d) => ({
        id: d.id,
        taskId: d.task_id,
        reason: d.reason,
        status: d.status,
        resolution: d.resolution,
        createdAt: d.created_at,
      })),
      messages: messagesResult.rows.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        recipientId: m.recipient_id,
        message: m.message,
        createdAt: m.created_at,
      })),
      notifications: notificationsResult.rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.created_at,
      })),
      screeningDeclaration: screeningResult.rows.length > 0 ? {
        cypaConviction: screeningResult.rows[0].cypa_conviction,
        womensCharterConviction: screeningResult.rows[0].womens_charter_conviction,
        penalCodeConviction: screeningResult.rows[0].penal_code_conviction,
        elderAbuseConviction: screeningResult.rows[0].elder_abuse_conviction,
        dishonestyConviction: screeningResult.rows[0].dishonesty_conviction,
        declaredAt: screeningResult.rows[0].created_at,
      } : null,
    };

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// POST /api/user-data/delete - Delete account and anonymize data (PDPA right)
router.post('/delete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required for account deletion' });
    }

    // Verify password (implement proper password verification)
    // For now, assume password verification happens in auth middleware
    // In production, verify password before deletion

    // Start transaction for data cleanup
    await db.query('BEGIN');

    try {
      // Anonymize user profile
      await db.query(
        `UPDATE users
         SET display_name = 'Deleted User',
             email = NULL,
             phone = NULL,
             bio = NULL,
             profile_image_url = NULL,
             nric_hash = NULL,
             password_hash = NULL,
             kyc_status = 'deleted'
         WHERE id = $1`,
        [userId]
      );

      // Anonymize chat messages
      await db.query(
        'UPDATE chat_messages SET message = [DELETED] WHERE sender_id = $1',
        [userId]
      );

      // Keep disputes and ratings (for platform records) but anonymize
      await db.query(
        `UPDATE disputes
            SET filed_by_user_id = NULL, raised_by_id = NULL, raised_by_staff_id = NULL
          WHERE filed_by_user_id = $1 OR raised_by_id = $1 OR raised_by_staff_id = $1`,
        [userId]
      );

      // Delete personal notifications
      await db.query(
        'DELETE FROM notifications WHERE user_id = $1',
        [userId]
      );

      // Delete notification preferences
      await db.query(
        'DELETE FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      // Delete push subscriptions
      await db.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1',
        [userId]
      );

      // Delete screening declaration (user's right to be forgotten)
      await db.query(
        'DELETE FROM screening_declarations WHERE user_id = $1',
        [userId]
      );

      // Delete category restrictions
      await db.query(
        'DELETE FROM user_category_restrictions WHERE user_id = $1',
        [userId]
      );

      // Log deletion in audit table
      await db.query(
        `INSERT INTO audit_log (user_id, action, details, timestamp)
         VALUES ($1, 'account_deletion', 'User requested account deletion', NOW())`,
        [userId]
      );

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Account deleted successfully. Your data has been anonymized.',
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
