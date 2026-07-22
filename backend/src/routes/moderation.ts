import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import {
  moderateContent,
  flagContent,
  getFlaggedContent,
  reviewFlaggedContent,
} from '../services/contentModerationService.js';

const router = Router();

// POST /api/moderation/check - Check if content is acceptable
router.post('/check', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content, context } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    const result = await moderateContent(
      content,
      context || 'task_description'
    );

    res.json(result);
  } catch (error) {
    console.error('[Moderation] Check error:', error);
    res.status(500).json({ error: 'Moderation check failed' });
  }
});

// POST /api/moderation/flag - Flag content for admin review
router.post('/flag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { contentType, content, errandId, conversationId, reason, severity } = req.body;

    if (!contentType || !content || !reason) {
      return res.status(400).json({ error: 'contentType, content, and reason required' });
    }

    await flagContent({
      contentType: contentType as any,
      content,
      userId,
      errandId: parseInt(errandId) || undefined,
      conversationId: parseInt(conversationId) || undefined,
      reason,
      severity: (severity || 'medium') as any,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Moderation] Flag error:', error);
    res.status(500).json({ error: 'Flag submission failed' });
  }
});

// GET /api/moderation/flagged - Get flagged content (admin only)
router.get('/flagged', authMiddleware, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { severity, status, limit } = req.query;

    const flagged = await getFlaggedContent(
      parseInt(limit as string) || 50,
      severity as string,
      status as string
    );

    res.json({ flagged, count: flagged.length });
  } catch (error) {
    console.error('[Moderation] Fetch error:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// POST /api/moderation/review/:id - Review flagged content (admin only)
router.post('/review/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;

    if (!decision) {
      return res.status(400).json({ error: 'Decision required' });
    }

    const result = await reviewFlaggedContent(
      parseInt(id),
      decision as any,
      notes
    );

    if (!result) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Moderation] Review error:', error);
    res.status(500).json({ error: 'Review failed' });
  }
});

export default router;
