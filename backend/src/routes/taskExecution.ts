import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { createNotification } from './notifications.js';

const router = Router();

// POST /api/tasks/:id/start - Doer marks task as in_progress
router.post('/:id/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const doerId = parseInt(req.userId || '0', 10);

    // Get task details
    const errandResult = await db.query(
      `SELECT e.*, ea.doer_id, ea.status as assignment_status
       FROM errands e
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id AND ea.doer_id = $1
       WHERE e.id = $2`,
      [doerId, taskId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const errand = errandResult.rows[0];

    // Verify doer is assigned
    if (errand.doer_id !== doerId) {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    // Verify task is in correct state (confirmed, not yet started)
    if (!['confirmed', 'completed_unconfirmed'].includes(errand.status)) {
      return res.status(400).json({
        error: `Cannot start task in status "${errand.status}"`
      });
    }

    // Update assignment status
    await db.query(
      'UPDATE errand_assignments SET status = $1 WHERE errand_id = $2 AND doer_id = $3',
      ['in_progress', taskId, doerId]
    );

    // Update errand status if needed
    if (errand.status === 'confirmed') {
      await db.query(
        'UPDATE errands SET status = $1 WHERE id = $2',
        ['in_progress', taskId]
      );
    }

    // Notify asker
    await createNotification(
      errand.asker_id,
      'task_started',
      'Errand Started',
      `${errand.errand_id}: Started`,
      null
    ).catch(console.error);

    res.json({
      success: true,
      data: {
        taskId,
        status: 'in_progress',
        message: 'Work started. Upload photos when done!',
      },
    });
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
});

// POST /api/tasks/:id/upload-photo - Doer uploads proof of work
router.post('/:id/upload-photo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const doerId = parseInt(req.userId || '0', 10);
    const { photoUrl, caption } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'Photo URL required' });
    }

    // Verify doer is assigned
    const assignmentResult = await db.query(
      'SELECT * FROM errand_assignments WHERE errand_id = $1 AND doer_id = $2',
      [taskId, doerId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    // Save photo
    const photoResult = await db.query(
      `INSERT INTO task_photos (task_id, uploaded_by, photo_url, caption, uploaded_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, uploaded_at`,
      [taskId, doerId, photoUrl, caption || null]
    );

    // Get task for notification
    const errandResult = await db.query(
      'SELECT asker_id, title FROM errands WHERE id = $1',
      [taskId]
    );

    const errand = errandResult.rows[0];

    // Notify asker
    await createNotification(
      errand.asker_id,
      'task_photo_received',
      '📸 Photo Received',
      `Doer uploaded proof of work for "${errand.title}"`,
      null
    ).catch(console.error);

    res.json({
      success: true,
      data: {
        photoId: photoResult.rows[0].id,
        uploadedAt: photoResult.rows[0].uploaded_at,
        message: 'Photo saved! Ready for completion?',
      },
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// POST /api/tasks/:id/complete - Asker marks task as completed
router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const askerId = parseInt(req.userId || '0', 10);
    const { approved, notes } = req.body;

    // Get task
    const errandResult = await db.query(
      'SELECT * FROM errands WHERE id = $1',
      [taskId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const errand = errandResult.rows[0];

    // Verify user is asker
    if (errand.asker_id !== askerId) {
      return res.status(403).json({ error: 'Only the asker can mark task complete' });
    }

    // Verify task is in correct state
    if (!['in_progress', 'confirmed'].includes(errand.status)) {
      return res.status(400).json({
        error: `Cannot complete task in status "${errand.status}"`
      });
    }

    // Update task status
    const newStatus = approved !== false ? 'completed_unconfirmed' : 'in_progress';

    await db.query(
      `UPDATE errands
       SET status = $1,
           completion_notes = $2,
           completed_at = NOW()
       WHERE id = $3`,
      [newStatus, notes || null, taskId]
    );

    // Get doer info for notification
    const assignmentResult = await db.query(
      `SELECT ea.doer_id, u.display_name
       FROM errand_assignments ea
       JOIN users u ON ea.doer_id = u.id
       WHERE ea.errand_id = $1`,
      [taskId]
    );

    if (assignmentResult.rows.length > 0) {
      const assignment = assignmentResult.rows[0];

      // Notify doer
      if (approved !== false) {
        await createNotification(
          assignment.doer_id,
          'task_completed',
          'Errand Completed',
          `${errand.errand_id}: Your work on "${errand.title}" was approved. Payment will be released after 48h.`,
          null
        ).catch(console.error);
      } else {
        await createNotification(
          assignment.doer_id,
          'task_needs_revision',
          'Needs Revision',
          `${errand.errand_id}: Your work on "${errand.title}" needs revision: ${notes || 'Please rework it'}`,
          null
        ).catch(console.error);
      }
    }

    res.json({
      success: true,
      data: {
        taskId,
        status: newStatus,
        message: approved !== false
          ? 'Task completed! Payment will be released after 48 hours.'
          : 'Task needs revision. Doer has been notified.',
      },
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// GET /api/tasks/:id/status - Get task execution status
router.get('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);

    // Get task with assignment
    const result = await db.query(
      `SELECT
         e.id, e.title, e.status, e.completed_at, e.completion_notes,
         ea.doer_id, ea.status as assignment_status,
         u.display_name as doer_name,
         (SELECT COUNT(*) FROM task_photos WHERE task_id = e.id) as photo_count,
         (SELECT json_agg(json_build_object(
           'id', id, 'url', photo_url, 'caption', caption, 'uploadedAt', uploaded_at
         )) FROM task_photos WHERE task_id = e.id) as photos
       FROM errands e
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id
       LEFT JOIN users u ON ea.doer_id = u.id
       WHERE e.id = $1 AND (e.asker_id = $2 OR ea.doer_id = $2)`,
      [taskId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const task = result.rows[0];

    res.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        status: task.status,
        assignmentStatus: task.assignment_status,
        doerName: task.doer_name,
        photoCount: task.photo_count || 0,
        photos: task.photos || [],
        completedAt: task.completed_at,
        completionNotes: task.completion_notes,
      },
    });
  } catch (error) {
    console.error('Get task status error:', error);
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

// GET /api/tasks/:id/photos - Get all photos for a task
router.get('/:id/photos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);

    // Verify access
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [taskId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const errand = errandResult.rows[0];

    // Can be viewed by asker or the assigned doer
    const assignmentResult = await db.query(
      'SELECT doer_id FROM errand_assignments WHERE errand_id = $1 AND doer_id = $2',
      [taskId, userId]
    );

    const isDoer = assignmentResult.rows.length > 0;
    const isAsker = errand.asker_id === userId;

    if (!isAsker && !isDoer) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get photos
    const photosResult = await db.query(
      `SELECT id, photo_url as url, caption, uploaded_at as uploadedAt, doer_id
       FROM task_photos
       WHERE task_id = $1
       ORDER BY uploaded_at DESC`,
      [taskId]
    );

    res.json({
      success: true,
      data: {
        photos: photosResult.rows,
        count: photosResult.rows.length,
      },
    });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

export default router;
