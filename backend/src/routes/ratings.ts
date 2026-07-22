import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { createNotification } from './notifications.js';
import { awardEp, getRatingBonus } from '../services/gamificationService.js';
import { activityLogService } from '../services/activityLogService.js';
import { sendCriticalEmail } from '../services/emailNotifications.js';
import { ratingReminderService } from '../services/ratingReminderService.js';

const router = Router();

// GET /api/ratings/check - Check if user has already rated an errand (accepts database ID or formatted errand ID)
router.get('/check', async (req, res) => {
  try {
    const { errandId, userId } = req.query;

    if (!errandId || !userId) {
      return res.status(400).json({ error: 'errandId and userId required' });
    }

    // Resolve errand ID (accepts both database ID and formatted errand ID)
    let parsedErrandId: number | null = null;
    const errandIdStr = errandId as string;
    if (/^\d+$/.test(errandIdStr)) {
      // If numeric, use as database ID
      parsedErrandId = parseInt(errandIdStr, 10);
    } else {
      // Otherwise, query by formatted errand ID
      const errandResult = await db.query(
        'SELECT id FROM errands WHERE errand_id = $1',
        [errandIdStr]
      );
      if (errandResult.rows.length > 0) {
        parsedErrandId = errandResult.rows[0].id;
      }
    }

    if (!parsedErrandId) {
      return res.json({
        success: true,
        data: {
          hasRated: false
        }
      });
    }

    const result = await db.query(
      'SELECT id FROM ratings WHERE errand_id = $1 AND rater_id = $2 LIMIT 1',
      [parsedErrandId, parseInt(userId as string)]
    );

    res.json({
      success: true,
      data: {
        hasRated: result.rows.length > 0
      }
    });
  } catch (error) {
    console.error('Check rating error:', error);
    res.status(500).json({ error: 'Failed to check rating status' });
  }
});

// POST /api/ratings - Submit a rating/review
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const raterId = parseInt(req.userId || '0', 10);
    let { taskId, ratedUserId, rating, comment } = req.body;

    if (!taskId || !rating) {
      return res.status(400).json({ error: 'taskId and rating required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify task exists and is completed
    const taskResult = await db.query(
      'SELECT id, asker_id, status, title FROM errands WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // 'rated' has to count as completed, or mutual rating cannot work at all.
    // Submitting a rating moves the errand from 'completed' to 'rated', and this
    // check then refused the SECOND person — so whoever rated first silently
    // locked the other one out, and no errand could ever carry ratings from both
    // sides. The duplicate guard below is what actually prevents rating twice.
    if (!['completed', 'rated'].includes(task.status)) {
      return res.status(400).json({ error: 'Can only rate completed tasks' });
    }

    // Get the confirmed doer for this task
    const doerResult = await db.query(
      `SELECT b.doer_id FROM bids b
       INNER JOIN errands e ON e.accepted_bid_id = b.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (!doerResult.rows[0]) {
      return res.status(400).json({ error: 'Could not find doer for this task. No bid found for this errand.' });
    }

    const confirmedDoerId = doerResult.rows[0].doer_id;
    const askerId = task.asker_id;

    // Verify rater is either asker or doer
    const isAsker = raterId === askerId;
    const isDoer = raterId === confirmedDoerId;

    if (!isAsker && !isDoer) {
      return res.status(403).json({ error: 'Only task participants can rate' });
    }

    // Determine who is being rated
    // If ratedUserId is provided, use it; otherwise determine based on rater role
    if (!ratedUserId) {
      // If rater is the asker, they rate the doer
      // If rater is the doer, they rate the asker
      ratedUserId = isAsker ? confirmedDoerId : askerId;
    }

    if (raterId === ratedUserId) {
      return res.status(400).json({ error: 'Cannot rate yourself' });
    }

    // Check if rating already exists
    const existingResult = await db.query(
      'SELECT id FROM ratings WHERE errand_id = $1 AND rater_id = $2',
      [taskId, raterId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'You have already rated this task' });
    }

    // Insert rating
    console.log('[Rating] Inserting rating:', { taskId, raterId, ratedUserId, rating });
    const ratingResult = await db.query(
      `INSERT INTO ratings (errand_id, rater_id, ratee_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [taskId, raterId, ratedUserId, rating, comment || null]
    );
    console.log('[Rating] Rating inserted successfully:', ratingResult.rows[0]);

    // Get rater info for notification
    const raterResult = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [raterId]
    );
    const raterName = raterResult.rows[0]?.display_name || 'Community Member';

    // Get rated user info
    const ratedUserResult = await db.query(
      'SELECT email FROM users WHERE id = $1',
      [ratedUserId]
    );

    // Award EP to rated user IMMEDIATELY
    const ratingBonus = getRatingBonus(rating);
    let totalEpAwarded = 15 + ratingBonus; // 15 base + rating bonus

    try {
      const newTotalEp = await awardEp({
        userId: ratedUserId,
        amount: totalEpAwarded,
        reason: `Rating received: ${rating}⭐ from ${raterName}`,
        errandId: taskId,
      });

      // Create celebrating notification with EP earned
      const ratingEmoji = rating >= 4 ? '⭐⭐' : '⭐';
      const epEmoji = rating === 5 ? '🎉' : '✨';

      const notificationTitle = rating >= 4
        ? `${ratingEmoji} New Review from ${raterName}`
        : `${ratingEmoji} New Review from ${raterName}`;

      const formattedErrandId = `ER26-${taskId}`;
      const notificationBody = rating === 5
        ? `${formattedErrandId}: ${raterName} loved your work on "${task.title}"! You earned ${totalEpAwarded} EP\n\nPayment releases in 24-48 hours if no dispute.`
        : `${formattedErrandId}: ${raterName} left you a ${Math.round(rating)}-star rating on "${task.title}". You earned ${totalEpAwarded} EP!`;

      // Notify rated user with EP celebration
      await createNotification(
        ratedUserId,
        'rating_received',
        notificationTitle,
        notificationBody,
        null
      ).catch(console.error);

      // Send email notification to rated user
      sendCriticalEmail(ratedUserId, 'rating_received', {
        raterName: raterName,
        rating: rating,
        taskTitle: task.title || 'Your errand',
        pointsAwarded: totalEpAwarded
      }).catch(err => {
        console.error('[Email] Failed to send rating_received email:', err);
      });

      // If rater is asker, encourage doer to rate back for EP points (positive message)
      if (isAsker) {
        const doerTitle = '⭐ Ready to Rate Back?';
        const doerBody = `${raterName} rated you ${Math.round(rating)}⭐ on "${task.title}"! Share your experience and earn 15+ EP points by rating them back. Every rating counts! 💛`;

        await createNotification(
          ratedUserId,
          'rating_encouragement',
          doerTitle,
          doerBody,
          null
        ).catch(console.error);

        console.log('[Rating] Sent doer encouragement notification for', taskId);
      }
    } catch (epError) {
      console.error('Error awarding EP:', epError);
      // Don't fail the rating submission if EP awarding fails
    }

    // Update user's average rating
    await updateUserRating(ratedUserId);

    // Update errand status to 'rated' once asker rates
    // Once asker submits rating, task is considered complete and closed
    try {
      await db.query(
        'UPDATE errands SET status = $1 WHERE id = $2',
        ['rated', taskId]
      );
      console.log('[Rating] Updated errand status to rated (closed):', taskId);

      // Log rating submission
      const raterUserResult = await db.query('SELECT display_name FROM users WHERE id = $1', [req.userId]);
      const raterName = raterUserResult.rows[0]?.display_name || 'Unknown';
      const raterRole = isAsker ? 'asker' : 'doer';
      await activityLogService.logRatingSubmitted(taskId, raterName, parseInt(req.userId || '0', 10), raterRole, rating).catch(console.error);
    } catch (statusError) {
      console.error('Failed to update errand status:', statusError);
      // Don't fail the rating submission if status update fails
    }

    res.status(201).json({
      success: true,
      data: {
        ratingId: ratingResult.rows[0].id,
        createdAt: ratingResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('Rating submission error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to submit rating', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Column names below were rated_user_id, task_id and comment — none of which
// exist on `ratings` (they are ratee_id, errand_id and review_text). The
// INSERT above always used the right ones, so every rating ever submitted was
// stored correctly and then never readable: profiles showed no reviews and
// both read endpoints returned 500.
// GET /api/ratings/user/:userId - Get all ratings for a user
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    const result = await db.query(
      `SELECT
         r.id,
         r.rating,
         r.review_text AS comment,
         r.created_at,
         u.display_name as rater_name,
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

    // Calculate stats
    const totalRatings = ratings.length;
    const averageRating =
      totalRatings > 0
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
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
        ratings: ratings.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          raterName: r.rater_name,
          taskTitle: r.task_title,
          createdAt: r.created_at,
        })),
        stats: {
          totalRatings,
          averageRating: parseFloat(averageRating as string),
          breakdown: ratingBreakdown,
        },
      },
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// GET /api/ratings/user/:userId/summary - Quick summary for profile
router.get('/user/:userId/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    const result = await db.query(
      `SELECT
         COUNT(*) as total_ratings,
         AVG(rating) as average_rating,
         MAX(rating) as max_rating,
         MIN(rating) as min_rating
       FROM ratings
       WHERE ratee_id = $1`,
      [userId]
    );

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalRatings: parseInt(stats.total_ratings, 10),
        averageRating: stats.average_rating ? parseFloat(stats.average_rating).toFixed(1) : 0,
        maxRating: stats.max_rating ? parseInt(stats.max_rating, 10) : 0,
        minRating: stats.min_rating ? parseInt(stats.min_rating, 10) : 0,
      },
    });
  } catch (error) {
    console.error('Get rating summary error:', error);
    res.status(500).json({ error: 'Failed to get rating summary' });
  }
});

// Helper function to update user's average rating in users table
async function updateUserRating(userId: number) {
  try {
    const result = await db.query(
      `SELECT
         AVG(rating) as avg_rating,
         COUNT(*) as total_ratings
       FROM ratings
       WHERE ratee_id = $1`,
      [userId]
    );

    const { avg_rating, total_ratings } = result.rows[0];

    await db.query(
      `UPDATE users
       SET average_rating = $1, total_ratings = $2
       WHERE id = $3`,
      [avg_rating ? parseFloat(avg_rating).toFixed(2) : null, total_ratings, userId]
    );
  } catch (error) {
    console.error('Update user rating error:', error);
  }
}

// POST /api/ratings/send-reminders - Send rating reminders to users who haven't rated (admin/cron endpoint)
router.post('/send-reminders', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Ratings] Sending rating reminders');

    await ratingReminderService.sendDoerRatingReminders();
    await ratingReminderService.sendAskerRatingReminders();

    res.json({
      success: true,
      message: 'Rating reminders sent successfully'
    });
  } catch (error) {
    console.error('Send rating reminders error:', error);
    res.status(500).json({ error: 'Failed to send rating reminders' });
  }
});

export default router;
