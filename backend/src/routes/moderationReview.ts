import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();
const adminOnly: any = [authMiddleware, requireAdmin(['admin', 'super-admin', 'support_l2', 'support_l3'])];

/**
 * The way back for someone the filter stopped.
 *
 * Until now an AI block was final and invisible: no record, no explanation a
 * person could act on, no human to ask. This is the appeal.
 */

// POST /api/moderation/:eventId/request-review — "I think you got this wrong"
router.post('/:eventId/request-review', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const userId = parseInt(req.userId || '0', 10);
    const { note } = req.body || {};

    const found = await db.query(
      'SELECT id, user_id, decision, review_requested_at FROM moderation_events WHERE id = $1',
      [eventId]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'We could not find that. Try posting again and let us know if it happens twice.' });
    }

    const event = found.rows[0];
    // Only the person who was actually stopped may ask
    if (Number(event.user_id) !== userId) {
      return res.status(403).json({ error: 'That review request is not yours to make.' });
    }
    if (event.decision === 'passed') {
      return res.status(400).json({ error: 'Nothing was blocked here, so there is nothing to review.' });
    }
    if (event.review_requested_at) {
      return res.status(409).json({ error: "You've already asked us to look at this one. We'll get back to you." });
    }

    await db.query(
      `UPDATE moderation_events
          SET review_requested_at = NOW(), review_note = $1
        WHERE id = $2`,
      [note ? String(note).slice(0, 1000) : null, eventId]
    );

    res.json({
      success: true,
      message: "Thanks — a person will take a look. We'll let you know either way.",
    });
  } catch (error) {
    console.error('[Moderation] Review request error:', error);
    res.status(500).json({ error: 'Could not send that request. Please try again.' });
  }
});

// GET /api/moderation/queue — blocks and flags waiting for a person
router.get('/queue', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const onlyRequested = req.query.requested === 'true';
    const result = await db.query(
      `SELECT m.id, m.surface, m.layer, m.decision, m.category, m.reason, m.flags,
              m.confidence, m.content_excerpt, m.created_at,
              m.review_requested_at, m.review_note,
              COALESCE(u.alias, u.display_name) AS user_name
         FROM moderation_events m
         LEFT JOIN users u ON u.id = m.user_id
        WHERE m.reviewed_at IS NULL
          AND m.decision IN ('blocked', 'flagged')
          AND ($1::boolean = false OR m.review_requested_at IS NOT NULL)
        ORDER BY m.review_requested_at DESC NULLS LAST, m.created_at DESC
        LIMIT 100`,
      [onlyRequested]
    );
    res.json({ success: true, data: { events: result.rows, total: result.rows.length } });
  } catch (error) {
    console.error('[Moderation] Queue error:', error);
    res.status(500).json({ error: 'Could not load the moderation queue' });
  }
});

// GET /api/moderation/stats — is the filter actually right?
router.get('/stats', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT layer, decision, COUNT(*)::int AS count
         FROM moderation_events
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY layer, decision`
    );
    const overturned = await db.query(
      `SELECT COUNT(*)::int AS count FROM moderation_events
        WHERE review_outcome = 'overturned' AND created_at > NOW() - INTERVAL '30 days'`
    );
    res.json({
      success: true,
      data: { breakdown: result.rows, overturnedLast30Days: overturned.rows[0]?.count ?? 0 },
    });
  } catch (error) {
    console.error('[Moderation] Stats error:', error);
    res.status(500).json({ error: 'Could not load moderation stats' });
  }
});

// POST /api/moderation/:eventId/decide — a person rules on it
router.post('/:eventId/decide', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const userId = parseInt(req.userId || '0', 10);
    const { outcome } = req.body || {};

    if (!['overturned', 'upheld'].includes(outcome)) {
      return res.status(400).json({ error: 'Outcome must be "overturned" or "upheld".' });
    }

    const result = await db.query(
      `UPDATE moderation_events
          SET review_outcome = $1, reviewed_at = NOW(), reviewed_by_user_id = $2
        WHERE id = $3 AND reviewed_at IS NULL
        RETURNING id, user_id, review_outcome`,
      [outcome, userId, eventId]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'That one has already been reviewed.' });
    }

    // Tell the person waiting — best effort
    const row = result.rows[0];
    if (row.user_id) {
      try {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, 'moderation_review', $2, $3)`,
          [
            row.user_id,
            outcome === 'overturned' ? 'Sorry about that' : 'We took another look',
            outcome === 'overturned'
              ? "We got that one wrong — you're clear to post it now. Thanks for flagging it."
              : "We had another look and it still doesn't meet our community guidelines. Try rewording it and you'll be good to go.",
          ]
        );
      } catch (notifyErr) {
        console.warn('[Moderation] Could not notify user of review outcome:', notifyErr);
      }
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error('[Moderation] Decide error:', error);
    res.status(500).json({ error: 'Could not record that decision' });
  }
});

/**
 * DELETE /api/moderation/posts/:id — take a community post down.
 *
 * Called from MyKampung itself, where an admin reading the feed can act on
 * something without leaving the page. The reason is collected in that dialog
 * and would otherwise be discarded.
 *
 * The row is archived rather than deleted: status = 'removed' takes it out of
 * the feed (which selects only 'published') while keeping the post and its
 * reason for review. A moderator deleting the evidence of their own decision
 * is not something to build on purpose.
 */
router.delete(
  '/posts/:id',
  authMiddleware,
  requireAdmin(['admin', 'super-admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });

      const reason = (req.body?.reason || '').trim();
      if (!reason) {
        return res.status(400).json({ error: 'A reason is required to remove a post' });
      }

      const post = await db.query(
        'SELECT id, author, content, status FROM community_posts WHERE id = $1',
        [id]
      );
      if (post.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

      // One transaction: a takedown that is not written to the audit log is a
      // takedown nobody can account for, so if the log fails the removal is
      // rolled back rather than left in place behind an error response.
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE community_posts
              SET status = 'removed', moderation_status = 'removed', updated_at = NOW()
            WHERE id = $1`,
          [id]
        );

        // layer 'admin' and decision 'removed' say a person took published
        // content down; the automated vocabulary (keyword/ai, blocked) would
        // describe a check that never ran. See migration 034.
        // content_excerpt keeps enough to understand the decision later
        // without duplicating the whole post.
        await client.query(
          `INSERT INTO moderation_events
             (user_id, surface, layer, decision, category, reason, content_excerpt,
              reviewed_at, reviewed_by_user_id)
           VALUES ($1, 'community_post', 'admin', 'removed', 'manual', $2, $3, NOW(), $4)`,
          [
            parseInt(req.userId || '0', 10),
            reason,
            String(post.rows[0].content || '').slice(0, 200),
            parseInt(req.userId || '0', 10),
          ]
        );

        await client.query('COMMIT');
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }

      console.log('[Moderation] Post', id, 'removed:', reason);
      res.json({ success: true, data: { id, status: 'removed' } });
    } catch (error) {
      console.error('[Moderation] Post removal failed:', error);
      res.status(500).json({ error: 'Could not remove that post' });
    }
  }
);

export default router;
