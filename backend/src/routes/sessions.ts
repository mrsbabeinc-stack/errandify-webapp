import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { createNotification } from './notifications.js';

const router = Router();

// GET /api/errands/:errandId/sessions - Get all sessions for recurring errand
router.get('/:errandId/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const errandId = parseInt(req.params.errandId, 10);
    const userId = parseInt(req.userId || '0', 10);

    // Get errand
    const errandResult = await db.query(
      'SELECT * FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Check access (asker or assigned doer)
    const isAsker = errand.asker_id === userId;

    if (!isAsker) {
      // Check if user is assigned to any session
      const assignmentResult = await db.query(
        'SELECT * FROM errand_assignments WHERE errand_id = $1 AND doer_id = $2',
        [errandId, userId]
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get sessions
    // errand_sessions has no `scheduled_date` (the column is `start_date`), and
    // errand_assignments has no `session_id` — assignments are keyed by errand,
    // not by session. Both wrong references made this endpoint throw every call.
    // Attribute each session to the errand's most recent assignment (one row) so
    // the query runs and the doer name still resolves.
    const sessionsResult = await db.query(
      `SELECT
         es.id, es.errand_id, es.session_number, es.start_date AS scheduled_date, es.status,
         ea.doer_id, u.display_name as assigned_doer_name, ea.completed_at
       FROM errand_sessions es
       LEFT JOIN LATERAL (
         SELECT doer_id, completed_at
         FROM errand_assignments
         WHERE errand_id = es.errand_id
         ORDER BY created_at DESC
         LIMIT 1
       ) ea ON true
       LEFT JOIN users u ON ea.doer_id = u.id
       WHERE es.errand_id = $1
       ORDER BY es.session_number ASC`,
      [errandId]
    );

    // Calculate stats
    const sessions = sessionsResult.rows;
    const totalSessions = errand.recurring_end_date ?
      Math.ceil((new Date(errand.recurring_end_date).getTime() - new Date(errand.date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      : sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;

    res.json({
      success: true,
      data: {
        errand: {
          id: errand.id,
          title: errand.title,
          description: errand.description,
          frequency: errand.frequency || 'weekly',
          totalSessions,
          completedSessions,
          budget: errand.budget,
          category: errand.category,
        },
        sessions: sessions.map((s) => ({
          id: s.id,
          errandId: s.errand_id,
          sessionNumber: s.session_number,
          scheduledDate: s.scheduled_date,
          status: s.status,
          assignedDoerId: s.doer_id,
          assignedDoerName: s.assigned_doer_name,
          completedAt: s.completed_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// PATCH /api/errands/:errandId/sessions/:sessionId - Update session status
router.patch(
  '/:errandId/sessions/:sessionId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const errandId = parseInt(req.params.errandId, 10);
      const sessionId = parseInt(req.params.sessionId, 10);
      const userId = parseInt(req.userId || '0', 10);
      const { status } = req.body;

      // Get errand
      const errandResult = await db.query(
        'SELECT * FROM errands WHERE id = $1',
        [errandId]
      );

      if (errandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Errand not found' });
      }

      const errand = errandResult.rows[0];

      // Check access
      if (errand.asker_id !== userId) {
        return res.status(403).json({ error: 'Only asker can update session status' });
      }

      // Update session
      const updateResult = await db.query(
        `UPDATE errand_sessions
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, sessionId]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const session = updateResult.rows[0];

      // Get assigned doer for notification
      const assignmentResult = await db.query(
        'SELECT doer_id FROM errand_assignments WHERE session_id = $1',
        [sessionId]
      );

      if (assignmentResult.rows.length > 0) {
        const doerId = assignmentResult.rows[0].doer_id;

        // Notify doer
        if (status === 'completed') {
          await createNotification(
            doerId,
            'session_completed',
            '✅ Session Completed',
            `Your work on "${errand.title}" (Session ${session.session_number}) has been confirmed!`,
            null
          ).catch(console.error);
        } else if (status === 'cancelled') {
          await createNotification(
            doerId,
            'session_cancelled',
            '⏸ Session Cancelled',
            `Session ${session.session_number} of "${errand.title}" has been cancelled.`,
            null
          ).catch(console.error);
        }
      }

      res.json({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          message: `Session ${session.session_number} marked as ${status}`,
        },
      });
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  }
);

// GET /api/errands/:errandId/sessions-summary - Quick summary for dashboard
router.get(
  '/:errandId/sessions-summary',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const errandId = parseInt(req.params.errandId, 10);

      const result = await db.query(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
           COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
         FROM errand_sessions
         WHERE errand_id = $1`,
        [errandId]
      );

      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          total: parseInt(stats.total, 10),
          completed: parseInt(stats.completed, 10),
          assigned: parseInt(stats.assigned, 10),
          pending: parseInt(stats.pending, 10),
        },
      });
    } catch (error) {
      console.error('Get sessions summary error:', error);
      res.status(500).json({ error: 'Failed to get sessions summary' });
    }
  }
);

export default router;
