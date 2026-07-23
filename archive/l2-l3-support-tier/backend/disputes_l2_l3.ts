// Dispute L2+L3 Resolution Routes
// Support team endpoints for dispute escalation and resolution

import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import {
  escalateDisputeToL2,
  assignDisputeToAgent,
  getL2DisputesForAgent,
  resolveL2Dispute,
  getL3Appeals,
  getSupportQueue,
  getDashboardStats,
} from '../services/escalationService.js';
import db from '../db.js';

const router = Router();

// ============================================================================
// SUPPORT DASHBOARD ENDPOINTS
// ============================================================================

/**
 * GET /api/disputes/dashboard/stats
 * Get dashboard statistics (KPIs)
 * Auth: Support staff only
 */
router.get('/dashboard/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const stats = await getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /api/disputes/dashboard/queue
 * Get support queue
 * Auth: Support staff only
 */
router.get('/dashboard/queue', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const queue = await getSupportQueue();
    res.json({ success: true, data: queue });
  } catch (error) {
    console.error('Queue error:', error);
    res.status(500).json({ error: 'Failed to fetch support queue' });
  }
});

// ============================================================================
// L2 ESCALATION ENDPOINTS
// ============================================================================

/**
 * GET /api/disputes/:id/l2-details
 * Get dispute details for L2 review
 * Auth: Support staff only
 */
router.get('/:id/l2-details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const disputeId = parseInt(req.params.id, 10);

    // Verify user is support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get dispute details with escalation info
    const result = await db.query(
      `SELECT 
        d.*, 
        e.ai_confidence, 
        e.ai_recommendation, 
        e.ai_reasoning,
        er.formatted_id,
        er.asker_id,
        ab.doer_id,
        COALESCE(ab.amount, er.budget) AS amount,
        COALESCE(u1.alias, u1.display_name) as asker_name,
        u1.email as asker_email,
        COALESCE(u2.alias, u2.display_name) as doer_name,
        u2.email as doer_email
       FROM disputes d
       JOIN errands er ON er.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = er.accepted_bid_id
       LEFT JOIN dispute_escalations e ON d.id = e.dispute_id AND e.level = 2
       LEFT JOIN users u1 ON er.asker_id = u1.id
       LEFT JOIN users u2 ON ab.doer_id = u2.id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('L2 details error:', error);
    res.status(500).json({ error: 'Failed to fetch dispute details' });
  }
});

/**
 * POST /api/disputes/:id/escalate-to-l2
 * Manually escalate dispute to L2
 * Auth: Support staff only
 */
router.post('/:id/escalate-to-l2', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const disputeId = parseInt(req.params.id, 10);
    const { aiConfidence, aiRecommendation, aiReasoning } = req.body;

    // Verify user is support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await escalateDisputeToL2(disputeId, aiConfidence, aiRecommendation, aiReasoning);
    res.json({ success: true, message: 'Dispute escalated to L2' });
  } catch (error) {
    console.error('Escalation error:', error);
    res.status(500).json({ error: 'Failed to escalate dispute' });
  }
});

/**
 * GET /api/disputes/my-assignments/l2
 * Get L2 disputes assigned to current user
 * Auth: L2 support staff
 */
router.get('/my-assignments/l2', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is L2 support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const disputes = await getL2DisputesForAgent(userId);
    res.json({ success: true, data: disputes });
  } catch (error) {
    console.error('My assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

/**
 * POST /api/disputes/:id/resolve-l2
 * Submit L2 resolution (human decision)
 * Auth: L2 support staff
 */
router.post('/:id/resolve-l2', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const disputeId = parseInt(req.params.id, 10);
    const { decision, reasoning } = req.body;

    // Verify user is L2 support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get escalation ID
    const escalationResult = await db.query(
      'SELECT id FROM dispute_escalations WHERE dispute_id = $1 AND level = 2',
      [disputeId]
    );

    if (escalationResult.rows.length === 0) {
      return res.status(404).json({ error: 'L2 escalation not found' });
    }

    const escalationId = escalationResult.rows[0].id;
    await resolveL2Dispute(escalationId, decision, reasoning, userId);

    res.json({ success: true, message: 'L2 dispute resolved' });
  } catch (error) {
    console.error('Resolve L2 error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// ============================================================================
// L3 APPEAL ENDPOINTS
// ============================================================================

// POST /:id/appeal was defined here as well as in disputes.ts, and both files
// mount on /api/disputes. disputes.ts mounts first, so this copy never ran a
// single request — it was unreachable the day it was written. Removed rather
// than left to mislead: the live appeal route is the one in disputes.ts, which
// checks appeal rights and freezes settlement. Same for /:id/resolve-appeal,
// further down.

/**
 * GET /api/disputes/my-assignments/l3
 * Get L3 appeals assigned to current user
 * Auth: L3 support staff
 */
router.get('/my-assignments/l3', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is L3 support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const appeals = await getL3Appeals();
    // Filter for assigned to this user or unassigned
    const filtered = appeals.filter(
      (a) => a.assigned_to_user_id === userId || a.assigned_to_user_id === null
    );

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('L3 assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch appeals' });
  }
});

// POST /:id/resolve-appeal also lived here and was equally unreachable — see
// the note above. The live one is in disputes.ts, and unlike this copy it
// restates the settlement amounts, the fee and the legs from the appeal
// outcome, which is the part that decides what actually gets paid.

// ============================================================================
// QUEUE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/disputes/queue/:queueId/assign
 * Assign queue item to agent
 * Auth: Support staff
 */
router.post('/queue/:queueId/assign', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const queueId = parseInt(req.params.queueId, 10);
    const { agentId } = req.body;

    // Verify user is support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get the dispute associated with this queue item
    const queueResult = await db.query(
      'SELECT dispute_id FROM support_queue WHERE id = $1',
      [queueId]
    );

    if (queueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    const disputeId = queueResult.rows[0].dispute_id;

    // Get escalation ID
    const escalationResult = await db.query(
      'SELECT id FROM dispute_escalations WHERE dispute_id = $1 ORDER BY level DESC LIMIT 1',
      [disputeId]
    );

    if (escalationResult.rows.length > 0) {
      await assignDisputeToAgent(escalationResult.rows[0].id, agentId);
    }

    // Update queue status
    await db.query(
      'UPDATE support_queue SET assigned_to_user_id = $1, status = $2 WHERE id = $3',
      [agentId, 'in_progress', queueId]
    );

    res.json({ success: true, message: 'Dispute assigned to agent' });
  } catch (error) {
    console.error('Queue assign error:', error);
    res.status(500).json({ error: 'Failed to assign dispute' });
  }
});

/**
 * POST /api/disputes/queue/:queueId/resolve
 * Mark queue item as resolved
 * Auth: Support staff
 */
router.post('/queue/:queueId/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const queueId = parseInt(req.params.queueId, 10);

    // Verify user is support staff
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;

    if (!['support_l2', 'support_l3', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Mark queue item as resolved
    await db.query(
      'UPDATE support_queue SET status = $1, resolved_at = NOW() WHERE id = $2',
      ['resolved', queueId]
    );

    res.json({ success: true, message: 'Queue item marked as resolved' });
  } catch (error) {
    console.error('Queue resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve queue item' });
  }
});

export default router;
