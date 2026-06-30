import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import {
  autoResolveDispute,
  analyzeDisputeWithAI,
  escalateDispute,
  createDispute,
  holdPayment,
  releaseHeldPayment,
  getDisputeStatus,
} from '../services/disputeResolutionService.js';

const router = Router();

// POST /api/disputes - Create a new dispute
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { errandId, type, description, evidence } = req.body;

    if (!errandId || !type || !description) {
      return res.status(400).json({ error: 'errandId, type, description required' });
    }

    // Create dispute
    const result = await createDispute({
      errandId: parseInt(errandId),
      filedByUserId: userId,
      type: type as any,
      description,
      evidence,
    });

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to create dispute' });
    }

    // Hold payment during dispute
    await holdPayment(parseInt(errandId), `Dispute #${result.disputeId} filed`);

    res.status(201).json({
      success: true,
      disputeId: result.disputeId,
    });
  } catch (error) {
    console.error('[Disputes] Create error:', error);
    res.status(500).json({ error: 'Dispute creation failed' });
  }
});

// GET /api/disputes/:id - Get dispute status
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const status = await getDisputeStatus(parseInt(id));

    if (!status) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json({ dispute: status });
  } catch (error) {
    console.error('[Disputes] Status error:', error);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// GET /api/disputes/:id/analysis - Get AI analysis (Level 2)
router.get('/:id/analysis', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const analysis = await analyzeDisputeWithAI(parseInt(id));

    res.json({ analysis });
  } catch (error) {
    console.error('[Disputes] Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// POST /api/disputes/:id/escalate - Escalate to Level 3
router.post('/:id/escalate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, priority } = req.body;

    const result = await escalateDispute(parseInt(id), notes, priority || 'normal');

    if (!result.success) {
      return res.status(500).json({ error: 'Escalation failed' });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[Disputes] Escalation error:', error);
    res.status(500).json({ error: 'Escalation failed' });
  }
});

// POST /api/disputes/:id/resolve - Resolve dispute (admin only)
router.post('/:id/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, notes, releasePayment: shouldRelease } = req.body;

    // Update dispute
    const result = await db.query(
      `UPDATE disputes
       SET status = 'resolved', resolution = $1, resolution_notes = $2, resolved_at = NOW()
       WHERE id = $3
       RETURNING id, errand_id, resolution`,
      [resolution, notes, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = result.rows[0];

    // Release payment if approved
    if (shouldRelease && resolution === 'approved') {
      await releaseHeldPayment(dispute.errand_id);
    }

    res.json({ success: true, dispute });
  } catch (error) {
    console.error('[Disputes] Resolve error:', error);
    res.status(500).json({ error: 'Resolution failed' });
  }
});

// GET /api/disputes - List disputes (admin only)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, limit } = req.query;

    let query = 'SELECT * FROM disputes WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND priority = $${params.length + 1}`;
      params.push(priority);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string) || 50);

    const result = await db.query(query, params);

    res.json({ disputes: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('[Disputes] List error:', error);
    res.status(500).json({ error: 'Failed to list disputes' });
  }
});

export default router;
