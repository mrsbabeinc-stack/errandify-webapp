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

    console.log(`[ActivityLog] Fetching for errandId=${errandId}, userId=${userId}`);

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

    console.log(`[ActivityLog] Auth check - isAsker=${isAsker}, isConfirmedDoer=${isConfirmedDoer}, hasUserBidded=${hasUserBidded}`);
    console.log(`[ActivityLog] Errand details - asker_id=${errand.asker_id}, confirmed_doer_id=${errand.confirmed_doer_id}, status=${errand.status}`);

    // Authorization logic:
    // - Asker can always view
    // - Confirmed doer can always view
    // - Other doers can view only if errand is still 'open' (not yet confirmed)
    const isJobConfirmed = errand.status !== 'open';
    const isUnselectedDoer = hasUserBidded && !isConfirmedDoer && isJobConfirmed;

    if (!isAsker && !isConfirmedDoer && (isUnselectedDoer || !hasUserBidded)) {
      console.log(`[ActivityLog] Authorization DENIED`);
      return res.status(403).json({ error: 'Not authorized to view this errand' });
    }

    console.log(`[ActivityLog] Authorization GRANTED`);

    // Fetch errand details to get formatted_id
    const errandDetailsResult = await db.query(
      'SELECT formatted_id FROM errands WHERE id = $1',
      [errandId]
    );
    const formattedId = errandDetailsResult.rows[0]?.formatted_id || `ER${errandId}`;

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
      console.log(`[ActivityLog] Found ${activitiesResult.rows.length} activities`);
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
      displayText: getActivityDisplayText(activity.activity_type, activity.actor_name, activity.details, formattedId),
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
function getActivityDisplayText(type: string, actorName: string, details: any, formattedId: string): string {
  const prefix = `${formattedId}: `;
  switch (type) {
    case 'posted':
      return `${prefix}${actorName} posted this task`;
    case 'bid_placed':
      return `${prefix}${actorName} submitted an offer`;
    case 'bid_rejected':
      return `${prefix}${actorName}'s offer was not selected`;
    case 'bid_accepted':
      return `${prefix}${actorName}'s offer was selected`;
    case 'confirmed':
      return `${prefix}Offer confirmed - ready to start`;
    case 'started':
      return `${prefix}${actorName} started the job`;
    case 'completed':
      return `${prefix}${actorName} submitted completion evidence`;
    case 'completion_evidence_viewed':
      return `${prefix}${actorName} viewed the completion evidence`;
    case 'review_submitted':
      return `${prefix}${actorName} submitted a review`;
    case 'rating_submitted':
      return `${prefix}${actorName} rated the work`;
    case 'changes_requested':
      return `${prefix}${actorName} requested changes: ${details?.reason || 'see details'}`;
    case 'dispute_raised':
      return `${prefix}A dispute was raised`;
    case 'dispute_resolved':
      return `${prefix}Dispute resolved`;
    default:
      return `${prefix}${type}`;
  }
}

// POST /api/errands/:errandId/log-viewed-evidence - Log when asker views completion evidence
router.post('/:errandId/log-viewed-evidence', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is the asker
    const errandResult = await db.query(
      'SELECT asker_id, status FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    if (errand.asker_id !== userId) {
      return res.status(403).json({ error: 'Only asker can log this action' });
    }

    // Get asker name
    const userResult = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [userId]
    );

    const askerName = userResult.rows[0]?.display_name || 'Unknown';

    // Log the activity
    await db.query(
      `INSERT INTO errand_activity_log (errand_id, activity_type, actor_id, actor_name, actor_role, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [errandId, 'completion_evidence_viewed', userId, askerName, 'asker']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Log evidence viewed error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

export default router;
