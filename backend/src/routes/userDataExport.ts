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
      // The columns are ratee_id and errand_id — rated_user_id and task_id have
      // never existed, so this query threw and took the whole export down with
      // it. GET /api/user-data/export returned 500 for every user, which means
      // the PDPA s21 right of access was as unavailable as s25 deletion was.
      `SELECT r.*, u.display_name as rater_name, e.title as task_title
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       JOIN errands e ON r.errand_id = e.id
       WHERE r.ratee_id = $1
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
      // chat_messages has no recipient_id — messages hang off conversation_id,
      // and the counterparty is whoever else is in that conversation. The old
      // column threw, and this was the last of the errors that made the s21
      // access right return 500 for everybody.
      //
      // Both sides of a conversation are returned, because a chat is the
      // requester's personal data whichever end of it they were on.
      `SELECT m.* FROM chat_messages m
        WHERE m.conversation_id IN (
          SELECT conversation_id FROM chat_messages WHERE sender_id = $1
        )
        ORDER BY m.created_at DESC`,
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

    // Record that the s21 right of access was exercised and met. Written after
    // the export is assembled, so a request that failed is not logged as
    // fulfilled. Failing to log must not fail the export itself — the person is
    // entitled to their data whether or not our bookkeeping works.
    try {
      await db.query(
        `INSERT INTO data_subject_requests (user_id, request_type, status, completed_at, outcome)
         VALUES ($1, 'access', 'completed', NOW(), $2)`,
        [userId, `Data export served (${errandsResult.rows.length} errands, ${bidsResult.rows.length} offers)`]
      );
    } catch (logErr) {
      console.error('[PDPA] Failed to record access request:', logErr);
    }

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

/*
 * POST /api/user-data/delete has been removed.
 *
 * It was a second account-deletion path, and a broken one. Inside its
 * transaction it did `INSERT INTO audit_log` — a table that does not exist in
 * this database — so the insert threw, the transaction rolled back, and the
 * anonymisation it had just performed was undone. Anyone calling it got a 500
 * with their personal data fully intact, having been told they were deleting
 * their account. Nothing in the frontend called it, which is the only reason
 * this was not a live PDPA s25 failure.
 *
 * The real path is POST /api/users/delete-account, which checks deletion
 * blockers first and delegates to services/accountDeletion.anonymiseAccount().
 * That one works, is what the app calls, and now records the request in
 * data_subject_requests. Two deletion paths that anonymise different columns is
 * not a redundancy worth keeping.
 *
 * A 410 rather than a silent removal, so any caller nobody knows about gets
 * told where to go instead of a bare 404.
 */
router.post('/delete', authMiddleware, async (_req: AuthRequest, res: Response) => {
  res.status(410).json({
    error: 'This endpoint has been removed. Use POST /api/users/delete-account.',
    replacement: '/api/users/delete-account',
  });
});

export default router;
