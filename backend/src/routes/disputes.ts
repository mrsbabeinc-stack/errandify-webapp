import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// POST /api/disputes - Raise a dispute
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, issueType, description, evidenceUrls } = req.body;
    const raisedBy = parseInt(req.userId || '0', 10);

    if (!taskId || !issueType || !description) {
      return res.status(400).json({ error: 'taskId, issueType, and description required' });
    }

    // Validate issue type
    const validIssueTypes = [
      'task_not_completed',
      'poor_quality',
      'payment_issue',
      'safety_concern',
      'other',
    ];
    if (!validIssueTypes.includes(issueType)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }

    // Get task details
    const taskResult = await db.query(
      `SELECT e.*, b.doer_id, b.amount FROM errands e
       LEFT JOIN bids b ON e.accepted_bid_id = b.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Verify user is involved
    if (task.asker_id !== raisedBy && task.doer_id !== raisedBy) {
      return res.status(403).json({ error: 'Only asker or doer can raise dispute' });
    }

    // Check if within 48-hour window
    if (task.completed_at) {
      const completedTime = new Date(task.completed_at).getTime();
      const now = Date.now();
      const hoursPassed = (now - completedTime) / (1000 * 60 * 60);

      if (hoursPassed > 48) {
        return res
          .status(400)
          .json({ error: 'Disputes can only be raised within 48 hours of completion' });
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
