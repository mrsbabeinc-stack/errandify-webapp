import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { createNotification } from './notifications.js';

const router = Router();

// POST /api/disputes - Create a new dispute
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { taskId, reason, description, evidence } = req.body;

    if (!taskId || !reason) {
      return res.status(400).json({ error: 'taskId and reason required' });
    }

    // Verify task exists and user is involved
    const taskResult = await db.query(
      'SELECT * FROM errands WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Check if task is eligible for dispute (completed or in progress)
    if (!['in_progress', 'completed_unconfirmed', 'completed_confirmed'].includes(task.status)) {
      return res.status(400).json({ error: 'Can only dispute in-progress or completed tasks' });
    }

    // Check if user is asker or assigned doer
    const isAsker = task.asker_id === userId;
    const isDoerResult = await db.query(
      'SELECT * FROM errand_assignments WHERE errand_id = $1 AND doer_id = $2',
      [taskId, userId]
    );
    const isDoer = isDoerResult.rows.length > 0;

    if (!isAsker && !isDoer) {
      return res.status(403).json({ error: 'Only task participants can file disputes' });
    }

    // Check if dispute already exists
    const existingResult = await db.query(
      'SELECT id FROM disputes WHERE task_id = $1 AND filed_by = $2 AND status NOT IN ($3, $4)',
      [taskId, userId, 'rejected', 'resolved']
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active dispute for this task' });
    }

    // Create dispute
    const disputeResult = await db.query(
      `INSERT INTO disputes (task_id, filed_by, reason, description, evidence, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, created_at`,
      [taskId, userId, reason, description || null, evidence || null, 'open']
    );

    const dispute = disputeResult.rows[0];

    // Determine other party (asker or doer)
    const otherUserId = isAsker ? isDoerResult.rows[0].doer_id : task.asker_id;

    // Notify other party
    await createNotification(
      otherUserId,
      'dispute_filed',
      '⚖️ Dispute Filed',
      `A dispute has been filed for "${task.title}" - reason: ${reason}`,
      null
    ).catch(console.error);

    res.status(201).json({
      success: true,
      data: {
        disputeId: dispute.id,
        taskId,
        status: 'open',
        createdAt: dispute.created_at,
      },
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// GET /api/disputes - Get all disputes for current user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { status = 'all', limit = 50, offset = 0 } = req.query;

    let statusFilter = '';
    if (status !== 'all') {
      statusFilter = `AND d.status = '${status}'`;
    }

    const result = await db.query(
      `SELECT
         d.id,
         d.task_id,
         d.filed_by,
         d.reason,
         d.description,
         d.evidence,
         d.status,
         d.admin_notes,
         d.resolution,
         d.created_at,
         d.updated_at,
         e.title as task_title,
         e.budget,
         u.display_name as filer_name
       FROM disputes d
       JOIN errands e ON d.task_id = e.id
       JOIN users u ON d.filed_by = u.id
       WHERE (e.asker_id = $1 OR e.accepted_bid_id IN (
         SELECT id FROM bids WHERE errand_id = e.id AND doer_id = $1
       ))
       ${statusFilter}
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        disputes: result.rows.map((d) => ({
          id: d.id,
          taskId: d.task_id,
          taskTitle: d.task_title,
          budget: d.budget,
          filedBy: d.filer_name,
          reason: d.reason,
          description: d.description,
          evidence: d.evidence,
          status: d.status,
          adminNotes: d.admin_notes,
          resolution: d.resolution,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        })),
        count: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ error: 'Failed to get disputes' });
  }
});

// GET /api/disputes/:disputeId - Get dispute details
router.get('/:disputeId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const disputeId = parseInt(req.params.disputeId, 10);

    const result = await db.query(
      `SELECT
         d.id,
         d.task_id,
         d.filed_by,
         d.reason,
         d.description,
         d.evidence,
         d.status,
         d.admin_notes,
         d.resolution,
         d.created_at,
         d.updated_at,
         e.title as task_title,
         e.budget,
         e.asker_id,
         e.status as task_status,
         u.display_name as filer_name,
         a.display_name as asker_name,
         ea.doer_id
       FROM disputes d
       JOIN errands e ON d.task_id = e.id
       JOIN users u ON d.filed_by = u.id
       JOIN users a ON e.asker_id = a.id
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = result.rows[0];

    // Check access (user must be involved in the task)
    if (dispute.asker_id !== userId && dispute.doer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        id: dispute.id,
        taskId: dispute.task_id,
        taskTitle: dispute.task_title,
        taskStatus: dispute.task_status,
        budget: dispute.budget,
        filedBy: dispute.filer_name,
        askerName: dispute.asker_name,
        reason: dispute.reason,
        description: dispute.description,
        evidence: dispute.evidence,
        status: dispute.status,
        adminNotes: dispute.admin_notes,
        resolution: dispute.resolution,
        createdAt: dispute.created_at,
        updatedAt: dispute.updated_at,
      },
    });
  } catch (error) {
    console.error('Get dispute details error:', error);
    res.status(500).json({ error: 'Failed to get dispute details' });
  }
});

// POST /api/disputes/:disputeId/evidence - Add evidence to dispute
router.post('/:disputeId/evidence', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const disputeId = parseInt(req.params.disputeId, 10);
    const { evidence } = req.body;

    if (!evidence) {
      return res.status(400).json({ error: 'Evidence required' });
    }

    // Verify user is involved in dispute
    const disputeResult = await db.query(
      `SELECT d.*, e.asker_id, ea.doer_id
       FROM disputes d
       JOIN errands e ON d.task_id = e.id
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];
    if (dispute.asker_id !== userId && dispute.doer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update dispute with new evidence
    const updateResult = await db.query(
      `UPDATE disputes
       SET evidence = CONCAT(COALESCE(evidence, ''), '|||', $1),
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, evidence`,
      [evidence, disputeId]
    );

    res.json({
      success: true,
      data: {
        disputeId,
        evidence: updateResult.rows[0].evidence,
      },
    });
  } catch (error) {
    console.error('Add evidence error:', error);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

// POST /api/disputes/:disputeId/resolve (Admin only) - Resolve dispute
router.post('/:disputeId/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const disputeId = parseInt(req.params.disputeId, 10);
    const { resolution, adminNotes, refundAmount } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: 'Resolution required' });
    }

    // Check if user is admin (TODO: implement admin role check)
    // For now, assume authorization is handled elsewhere

    const result = await db.query(
      `UPDATE disputes
       SET status = $1,
           resolution = $2,
           admin_notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, task_id, status`,
      [resolution, adminNotes || null, adminNotes || null, disputeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = result.rows[0];

    // If refund issued, update task payment status
    if (refundAmount && refundAmount > 0) {
      await db.query(
        `UPDATE errands
         SET payment_status = 'refunded'
         WHERE id = $1`,
        [dispute.task_id]
      );
    }

    // Notify both parties
    const taskResult = await db.query(
      `SELECT asker_id FROM errands WHERE id = $1`,
      [dispute.task_id]
    );

    const taskParties = taskResult.rows[0];
    const notificationMessage = `Dispute resolved: ${resolution}`;

    await createNotification(
      taskParties.asker_id,
      'dispute_resolved',
      '✅ Dispute Resolved',
      notificationMessage,
      null
    ).catch(console.error);

    res.json({
      success: true,
      data: {
        disputeId,
        status: resolution,
        message: 'Dispute resolved',
      },
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// POST /api/disputes/:disputeId/appeal - Appeal dispute resolution
router.post('/:disputeId/appeal', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const disputeId = parseInt(req.params.disputeId, 10);
    const { appealReason } = req.body;

    if (!appealReason) {
      return res.status(400).json({ error: 'Appeal reason required' });
    }

    // Verify user is involved in dispute
    const disputeResult = await db.query(
      `SELECT d.*, e.asker_id, ea.doer_id
       FROM disputes d
       JOIN errands e ON d.task_id = e.id
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];
    if (dispute.asker_id !== userId && dispute.doer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (dispute.status !== 'resolved') {
      return res.status(400).json({ error: 'Only resolved disputes can be appealed' });
    }

    // Create appeal (open new dispute with appeal status)
    const appealResult = await db.query(
      `INSERT INTO disputes (task_id, filed_by, reason, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [dispute.task_id, userId, 'appeal', appealReason, 'appeal_pending']
    );

    res.status(201).json({
      success: true,
      data: {
        appealId: appealResult.rows[0].id,
        status: 'appeal_pending',
      },
    });
  } catch (error) {
    console.error('Appeal dispute error:', error);
    res.status(500).json({ error: 'Failed to appeal dispute' });
  }
});

// POST /api/disputes - Raise a dispute
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, issueType, description, evidenceUrls } = req.body;
    const raisedBy = req.userId;

    // Verify task exists and get details
    const taskResult = await db.query('SELECT * FROM errands WHERE id = $1', [taskId]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Verify user is involved in task
    if (task.asker_id !== raisedBy && task.doer_id !== raisedBy) {
      return res.status(403).json({ error: 'You can only dispute tasks you are involved in' });
    }

    // Check if dispute is within 48 hours of completion
    if (task.status === 'completed') {
      const completedTime = new Date(task.completed_at).getTime();
      const now = Date.now();
      const hoursPassed = (now - completedTime) / (1000 * 60 * 60);

      if (hoursPassed > 48) {
        return res.status(400).json({ error: 'Disputes can only be raised within 48 hours of completion' });
      }
    }

    // Generate case ID
    const caseId = `ERD-${Date.now().toString().slice(-4)}`;

    // Create dispute
    const disputeResult = await db.query(
      `INSERT INTO disputes (task_id, opened_by, reason, status, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, task_id, opened_by, reason, status, created_at`,
      [taskId, raisedBy, `[${issueType}] ${description}`, 'open']
    );

    const dispute = disputeResult.rows[0];

    // Freeze payment (set payment_release_at to far future)
    await db.query(
      `UPDATE errands SET dispute_status = $1 WHERE id = $2`,
      ['open', taskId]
    );

    // TODO: Get chat log summary for AI analysis
    const chatSummary = 'Chat log will be provided';

    // AI Evidence Analysis (dummy for now)
    const aiRecommendation = await analyzeDisputeAI({
      taskTitle: task.title,
      description,
      issueType,
      evidenceUrls: evidenceUrls || [],
      chatSummary,
    });

    // Store AI recommendation
    await db.query(
      `UPDATE disputes SET ai_recommendation = $1 WHERE id = $2`,
      [JSON.stringify(aiRecommendation), dispute.id]
    );

    // TODO: Send email to user
    // TODO: Notify admin
    // TODO: Emit notification

    res.status(201).json({
      success: true,
      data: {
        disputeId: dispute.id,
        caseId,
        taskId: dispute.task_id,
        status: dispute.status,
        message: 'Dispute raised. Payment frozen. Our team will review within 24-48 hours.',
        aiRecommendation: aiRecommendation.recommendation,
      },
    });
  } catch (error) {
    console.error('Raise dispute error:', error);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// GET /api/disputes/:id - Get dispute details
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    const disputeResult = await db.query(
      `SELECT d.*, e.title as task_title, e.asker_id, e.budget
       FROM disputes d
       JOIN errands e ON d.task_id = e.id
       WHERE d.id = $1`,
      [id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];

    // Verify authorization (involved parties or admin)
    // TODO: Check if admin
    if (dispute.opened_by !== userId && dispute.asker_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      success: true,
      data: {
        id: dispute.id,
        taskId: dispute.task_id,
        taskTitle: dispute.task_title,
        openedBy: dispute.opened_by,
        reason: dispute.reason,
        status: dispute.status,
        resolution: dispute.resolution,
        aiRecommendation: dispute.ai_recommendation ? JSON.parse(dispute.ai_recommendation) : null,
        createdAt: dispute.created_at,
      },
    });
  } catch (error) {
    console.error('Get dispute error:', error);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// POST /api/disputes/:id/resolve - Admin resolves dispute
router.post('/:id/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, decisionNotes, splitPercentage } = req.body;

    // TODO: Check if user is admin
    // For now, allow any authenticated user
    const isAdmin = true; // Placeholder

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Validate decision
    const validDecisions = ['FULL_TO_ASKER', 'FULL_TO_DOER', 'SPLIT'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    if (decision === 'SPLIT' && !splitPercentage) {
      return res.status(400).json({ error: 'splitPercentage required for SPLIT decision' });
    }

    // Get dispute and task
    const disputeResult = await db.query(
      `SELECT d.*, e.accepted_bid_id, b.amount FROM disputes d
       JOIN errands e ON d.task_id = e.id
       LEFT JOIN bids b ON e.accepted_bid_id = b.id
       WHERE d.id = $1`,
      [id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];
    const bidAmount = parseFloat(dispute.amount || '0');

    // Calculate payout based on decision
    let doerPayout = 0;
    let askerPayout = 0;

    switch (decision) {
      case 'FULL_TO_DOER':
        doerPayout = bidAmount * 0.8; // Minus platform fee
        askerPayout = 0;
        break;
      case 'FULL_TO_ASKER':
        doerPayout = 0;
        askerPayout = bidAmount;
        break;
      case 'SPLIT':
        const doerPercent = splitPercentage / 100;
        const askerPercent = 1 - doerPercent;
        doerPayout = bidAmount * doerPercent * 0.8; // Minus platform fee
        askerPayout = bidAmount * askerPercent;
        break;
    }

    // TODO: Execute Stripe transfers

    // Update dispute
    const resolveResult = await db.query(
      `UPDATE disputes SET status = $1, resolution = $2, resolved_at = NOW()
       WHERE id = $3
       RETURNING id, status, resolved_at`,
      ['resolved', JSON.stringify({ decision, doerPayout, askerPayout }), id]
    );

    // Update errands dispute status
    await db.query(
      `UPDATE errands SET dispute_status = $1 WHERE id = $2`,
      ['resolved', dispute.task_id]
    );

    // TODO: Send resolution emails to both parties

    res.json({
      success: true,
      data: {
        disputeId: resolveResult.rows[0].id,
        status: resolveResult.rows[0].status,
        decision,
        doerPayout,
        askerPayout,
        message: 'Dispute resolved. Payments will be transferred accordingly.',
      },
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// Helper function to analyze dispute via Qwen
async function analyzeDisputeAI(context: {
  taskTitle: string;
  description: string;
  issueType: string;
  evidenceUrls: string[];
  chatSummary: string;
}): Promise<{
  recommendation: 'FULL_TO_DOER' | 'FULL_TO_ASKER' | 'SPLIT_50';
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}> {
  try {
    // TODO: Call real Qwen API for analysis
    // For now, return a balanced recommendation

    return {
      recommendation: 'SPLIT_50',
      reasoning:
        'Based on available information, a fair split appears balanced. ' +
        'Review chat logs and evidence for final decision.',
      confidence: 'medium',
    };
  } catch (error) {
    console.error('AI analysis error:', error);

    return {
      recommendation: 'SPLIT_50',
      reasoning: 'Unable to perform AI analysis. Recommend 50/50 split pending review.',
      confidence: 'low',
    };
  }
}

export default router;
