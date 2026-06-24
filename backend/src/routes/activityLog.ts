import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/errands/:errandId/activity-log - Get activity timeline for an errand
router.get('/:errandId/activity-log', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is asker or doer of this errand
    const errandResult = await db.query(
      `SELECT asker_id, id FROM errands e
       LEFT JOIN bids b ON e.id = b.errand_id AND b.status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress')
       WHERE e.id = $1`,
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    if (errand.asker_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this errand' });
    }

    // Fetch activity log
    const activitiesResult = await db.query(
      `SELECT id, activity_type, actor_name, actor_role, details, created_at
       FROM errand_activity_log
       WHERE errand_id = $1
       ORDER BY created_at ASC`,
      [errandId]
    );

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
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// Helper function to generate display text for activities
function getActivityDisplayText(type: string, actorName: string, details: any): string {
  switch (type) {
    case 'posted':
      return `📝 ${actorName} posted the errand`;
    case 'bid_placed':
      return `💰 ${actorName} placed an offer of $${details?.amount || 'unknown'}`;
    case 'bid_rejected':
      return `❌ ${actorName}'s offer was not selected`;
    case 'bid_accepted':
      return `✅ ${actorName}'s offer was selected`;
    case 'confirmed':
      return `🤝 Offer confirmed - task is ready to start`;
    case 'started':
      return `🚀 ${actorName} started the job`;
    case 'completed':
      return `✓ ${actorName} submitted completion evidence`;
    case 'review_submitted':
      return `⭐ ${actorName} submitted a review`;
    case 'rating_submitted':
      return `🌟 ${actorName} rated the work`;
    case 'changes_requested':
      return `🔄 ${actorName} requested changes: ${details?.reason || 'see details'}`;
    case 'dispute_raised':
      return `⚠️ A dispute was raised`;
    case 'dispute_resolved':
      return `✓ Dispute resolved`;
    default:
      return `📌 ${type}`;
  }
}

export default router;
