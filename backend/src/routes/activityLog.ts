import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Helper function to ensure activity log table exists
async function ensureActivityLogTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS errand_activity_log (
        id SERIAL PRIMARY KEY,
        errand_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        actor_name VARCHAR(255),
        actor_role VARCHAR(50),
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes if they don't exist
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_errand_activity_log_errand_id
      ON errand_activity_log(errand_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_errand_activity_log_created_at
      ON errand_activity_log(created_at)
    `);
  } catch (error) {
    console.error('Error creating activity log table:', error);
    // Don't throw - table might already exist
  }
}

// GET /api/errands/:errandId/activity-log - Get activity timeline for an errand
router.get('/:errandId/activity-log', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Ensure table exists
    await ensureActivityLogTable();

    // Verify user is asker or doer of this errand
    const errandResult = await db.query(
      `SELECT e.asker_id, e.id, e.status,
        (SELECT doer_id FROM bids WHERE errand_id = e.id AND status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress') LIMIT 1) as confirmed_doer_id,
        (SELECT doer_id FROM bids WHERE errand_id = e.id AND doer_id = $2 LIMIT 1) as user_bid_doer_id
       FROM errands e
       WHERE e.id = $1`,
      [errandId, userId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    const isAsker = errand.asker_id === userId;
    const isConfirmedDoer = errand.confirmed_doer_id === userId;
    const hasUserBidded = errand.user_bid_doer_id === userId;

    // Authorization logic:
    // - Asker can always view
    // - Confirmed doer can always view
    // - Other doers can view only if errand is still 'open' (not yet confirmed)
    const isJobConfirmed = errand.status !== 'open';
    const isUnselectedDoer = hasUserBidded && !isConfirmedDoer && isJobConfirmed;

    if (!isAsker && !isConfirmedDoer && (isUnselectedDoer || !hasUserBidded)) {
      return res.status(403).json({ error: 'Not authorized to view this errand' });
    }

    // Fetch activity log
    let activitiesResult;
    try {
      activitiesResult = await db.query(
        `SELECT id, activity_type, actor_name, actor_role, details, created_at
         FROM errand_activity_log
         WHERE errand_id = $1
         ORDER BY created_at ASC`,
        [errandId]
      );
    } catch (dbError) {
      console.warn('Activity log table may not be ready, returning empty:', dbError);
      return res.json({
        success: true,
        data: {
          activities: [],
          count: 0,
        },
      });
    }

    // Format the response with readable activity descriptions
    const activities = activitiesResult.rows.map((activity: any) => ({
      id: activity.id,
      type: activity.activity_type,
      actor: {
        name: activity.actor_name,
        role: activity.actor_role,
      },
      timestamp: activity.created_at,
      details: activity.details,
      displayText: getActivityDisplayText(activity.activity_type, activity.actor_name, activity.details),
    }));

    res.json({
      success: true,
      data: {
        activities,
        count: activities.length,
      },
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    // Return empty activities instead of error to not break the UI
    res.json({
      success: true,
      data: {
        activities: [],
        count: 0,
      },
    });
  }
});

// Helper function to generate display text for activities
function getActivityDisplayText(type: string, actorName: string, details: any): string {
  switch (type) {
    case 'posted':
      return `${actorName} posted this task`;
    case 'bid_placed':
      return `${actorName} submitted an offer of $${details?.amount || 'unknown'}`;
    case 'bid_rejected':
      return `${actorName}'s offer was not selected`;
    case 'bid_accepted':
      return `${actorName}'s offer was selected`;
    case 'confirmed':
      return `Offer confirmed - task is ready to start`;
    case 'started':
      return `${actorName} started the job`;
    case 'completed':
      return `${actorName} submitted completion evidence`;
    case 'review_submitted':
      return `${actorName} submitted a review`;
    case 'rating_submitted':
      return `${actorName} rated the work`;
    case 'changes_requested':
      return `${actorName} requested changes: ${details?.reason || 'see details'}`;
    case 'dispute_raised':
      return `A dispute was raised`;
    case 'dispute_resolved':
      return `Dispute resolved`;
    default:
      return `${type}`;
  }
}

export default router;
