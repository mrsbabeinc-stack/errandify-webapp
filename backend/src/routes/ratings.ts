import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { createNotification } from './notifications.js';

const router = Router();

// POST /api/ratings - Submit a rating/review
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const raterId = parseInt(req.userId || '0', 10);
    const { taskId, ratedUserId, rating, comment } = req.body;

    if (!taskId || !ratedUserId || !rating) {
      return res.status(400).json({ error: 'taskId, ratedUserId, and rating required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (raterId === ratedUserId) {
      return res.status(400).json({ error: 'Cannot rate yourself' });
    }

    // Verify task exists and is completed
    const taskResult = await db.query(
      'SELECT * FROM errands WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Verify task is completed
    if (!task.status.includes('completed')) {
      return res.status(400).json({ error: 'Can only rate completed tasks' });
    }

    // Verify rater is either asker or assigned doer
    const isAsker = task.asker_id === raterId;
    const isDoer = await db.query(
      'SELECT * FROM errand_assignments WHERE errand_id = $1 AND doer_id = $2',
      [taskId, raterId]
    );

    if (!isAsker && isDoer.rows.length === 0) {
      return res.status(403).json({ error: 'Only task participants can rate' });
    }

    // Check if rating already exists
    const existingResult = await db.query(
      'SELECT id FROM ratings WHERE task_id = $1 AND rater_id = $2',
      [taskId, raterId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'You have already rated this task' });
    }

    // Insert rating
    const ratingResult = await db.query(
      `INSERT INTO ratings (task_id, rater_id, rated_user_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, created_at`,
      [taskId, raterId, ratedUserId, rating, comment || null]
    );

    // Get task title for notification
    const ratedUserResult = await db.query(
      'SELECT email FROM users WHERE id = $1',
      [ratedUserId]
    );

    // Notify rated user
    await createNotification(
      ratedUserId,
      'rating_received',
      '⭐ New Rating',
      `You received a ${rating}-star rating for "${task.title}"`,
      null
    ).catch(console.error);

    // Update user's average rating
    await updateUserRating(ratedUserId);

    res.status(201).json({
      success: true,
      data: {
        ratingId: ratingResult.rows[0].id,
        createdAt: ratingResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('Rating submission error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// GET /api/ratings/user/:userId - Get all ratings for a user
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    const result = await db.query(
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
       WHERE rated_user_id = $1`,
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
       WHERE rated_user_id = $1`,
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

export default router;
