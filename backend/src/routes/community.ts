import express, { Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';

/**
 * MyKampung content.
 *
 * Content is authored in Errandify admin and read by MyKampung. Both ends
 * existed and neither was connected: the admin screens saved to localStorage,
 * and MyKampung called endpoints that were never built.
 *
 * Reads are open — MyKampung is a logged-in page but this is public-facing
 * content, and the optional token only decides whether "liked"/"attending"
 * come back true. Writes are admin-only, because this is Errandify speaking to
 * its community, not user-generated posting.
 *
 * Field names are camelCase in responses to match what the page destructures.
 */

const adminOnly: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

/** Reads the caller's id from a token if one is present, without requiring it. */
async function optionalUserId(req: AuthRequest): Promise<number | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const jwt = await import('jsonwebtoken');
    const decoded: any = jwt.default.verify(header.slice(7), process.env.JWT_SECRET as string);
    const id = parseInt(decoded.userId ?? decoded.id, 10);
    return Number.isNaN(id) ? null : id;
  } catch {
    // An expired or bad token means "not signed in", not an error — the
    // content is public and should still render.
    return null;
  }
}

// ---------------------------------------------------------------- community

const community = express.Router();

/** GET /api/community/posts */
community.get('/posts', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await optionalUserId(req);
    const result = await db.query(
      `SELECT p.id, p.title, p.content, p.excerpt, p.author,
              p.author_rating AS "authorRating", p.category,
              p.read_time AS "readTime", p.likes,
              p.comments_count AS comments,
              p.moderation_status AS "moderationStatus",
              p.created_at AS "createdAt",
              CASE WHEN $1::int IS NULL THEN false
                   ELSE EXISTS (SELECT 1 FROM community_post_likes l
                                 WHERE l.post_id = p.id AND l.user_id = $1::int)
              END AS "isLiked"
         FROM community_posts p
        WHERE p.status = 'published'
        ORDER BY p.created_at DESC
        LIMIT 100`,
      [userId]
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        ...r,
        authorRating: r.authorRating === null ? null : Number(r.authorRating),
      })),
    });
  } catch (error) {
    console.error('[Community] Posts fetch failed:', error);
    res.status(500).json({ error: 'Could not load posts' });
  }
});

/** GET /api/community/discussions */
community.get('/discussions', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, title, author, category, replies, views,
              last_updated AS "lastUpdated"
         FROM community_discussions
        WHERE status = 'published'
        ORDER BY last_updated DESC
        LIMIT 100`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Community] Discussions fetch failed:', error);
    res.status(500).json({ error: 'Could not load discussions' });
  }
});

/** POST /api/community/discussions — admin authoring. */
community.post('/discussions', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, author, category } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const result = await db.query(
      `INSERT INTO community_discussions (title, author, category, created_by)
       VALUES ($1,$2,$3,$4)
       RETURNING id, title, category, replies, views, last_updated AS "lastUpdated"`,
      [title.trim(), (author || 'Errandify').trim(), category || 'general',
       parseInt(req.userId || '0', 10)]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Community] Discussion create failed:', error);
    res.status(500).json({ error: 'Could not create that discussion' });
  }
});

/**
 * PATCH /api/community/discussions/:id
 *
 * last_updated is only touched when the content actually changes — it is what
 * the feed sorts on, so bumping it for a status change would push an untouched
 * thread back to the top.
 */
community.patch('/discussions/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid discussion id' });
    const { title, author, category, status } = req.body || {};
    const contentChanged = title !== undefined || author !== undefined || category !== undefined;

    const result = await db.query(
      `UPDATE community_discussions
          SET title = COALESCE($1::varchar, title),
              author = COALESCE($2::varchar, author),
              category = COALESCE($3::varchar, category),
              status = COALESCE($4::varchar, status),
              last_updated = CASE WHEN $5::boolean THEN NOW() ELSE last_updated END
        WHERE id = $6
        RETURNING id, title, author, category, status, last_updated AS "lastUpdated"`,
      [title ?? null, author ?? null, category ?? null, status ?? null, contentChanged, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Discussion not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Community] Discussion update failed:', error);
    res.status(500).json({ error: 'Could not update that discussion' });
  }
});

/** DELETE /api/community/discussions/:id */
community.delete('/discussions/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid discussion id' });
    const r = await db.query('DELETE FROM community_discussions WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Discussion not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Community] Discussion delete failed:', error);
    res.status(500).json({ error: 'Could not delete that discussion' });
  }
});

/** GET /api/community/discussions/all — including unpublished, for admin. */
community.get('/discussions/all', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, title, author, category, replies, views, status,
              last_updated AS "lastUpdated", created_at AS "createdAt"
         FROM community_discussions
        ORDER BY last_updated DESC
        LIMIT 200`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Community] Discussion admin list failed:', error);
    res.status(500).json({ error: 'Could not load discussions' });
  }
});

/** POST /api/community/posts — admin authoring. */
community.post('/posts', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, excerpt, author, category, readTime, authorRating } = req.body || {};
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // The admin feed composer collects a body but no headline, while MyKampung
    // renders a title above every post. Rather than force a field into that
    // form, fall back to the opening line of the content — trimmed at a word
    // boundary so it does not cut mid-word.
    const derived = content.trim().split(/(?<=[.!?])\s/)[0];
    const heading = (title?.trim() || (derived.length > 80
      ? derived.slice(0, 80).replace(/\s+\S*$/, '') + '…'
      : derived)).slice(0, 200);
    const result = await db.query(
      `INSERT INTO community_posts
         (title, content, excerpt, author, category, read_time, author_rating, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, title, created_at`,
      [
        heading, content.trim(), excerpt || null, (author || 'Errandify').trim(),
        category || 'tip', readTime ?? null, authorRating ?? null,
        parseInt(req.userId || '0', 10),
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Community] Post create failed:', error);
    res.status(500).json({ error: 'Could not create that post' });
  }
});

/** PATCH /api/community/posts/:id — edit or change status. */
community.patch('/posts/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });
    const { title, content, excerpt, category, status, moderationStatus } = req.body || {};

    // The composer has no title field, so titles are derived from the opening
    // line of the content. If the content is edited and no title is supplied,
    // the title has to be re-derived or the card would show the old wording
    // above the new text — MyKampung renders both.
    let heading = title?.trim() || null;
    if (!heading && content?.trim()) {
      const derived = content.trim().split(/(?<=[.!?])\s/)[0];
      heading = (derived.length > 80
        ? derived.slice(0, 80).replace(/\s+\S*$/, '') + '…'
        : derived).slice(0, 200);
    }

    const result = await db.query(
      `UPDATE community_posts
          SET title = COALESCE($1::varchar, title),
              content = COALESCE($2::text, content),
              excerpt = COALESCE($3::text, excerpt),
              category = COALESCE($4::varchar, category),
              status = COALESCE($5::varchar, status),
              moderation_status = COALESCE($6::varchar, moderation_status),
              updated_at = NOW()
        WHERE id = $7
        RETURNING id, title, status, moderation_status`,
      [heading, content ?? null, excerpt ?? null, category ?? null,
       status ?? null, moderationStatus ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Community] Post update failed:', error);
    res.status(500).json({ error: 'Could not update that post' });
  }
});

/** DELETE /api/community/posts/:id */
community.delete('/posts/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });
    const r = await db.query('DELETE FROM community_posts WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Community] Post delete failed:', error);
    res.status(500).json({ error: 'Could not delete that post' });
  }
});

/** POST /api/community/posts/:id/like — toggle, signed-in users. */
community.post('/posts/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });

    const existing = await db.query(
      'SELECT 1 FROM community_post_likes WHERE post_id = $1 AND user_id = $2', [id, userId]
    );
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM community_post_likes WHERE post_id = $1 AND user_id = $2', [id, userId]);
    } else {
      await db.query(
        'INSERT INTO community_post_likes (post_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, userId]
      );
    }
    // Recount rather than increment, so the stored total cannot drift from the
    // rows that justify it.
    const c = await db.query(
      `UPDATE community_posts SET likes =
         (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1)
       WHERE id = $1 RETURNING likes`, [id]
    );
    res.json({
      success: true,
      data: { likes: Number(c.rows[0]?.likes) || 0, isLiked: existing.rows.length === 0 },
    });
  } catch (error) {
    console.error('[Community] Like failed:', error);
    res.status(500).json({ error: 'Could not register that' });
  }
});

// ------------------------------------------------------------ announcements

const announcements = express.Router();

/** GET /api/announcements */
announcements.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, title, content, type, icon,
              is_pinned AS "isPinned", created_at AS "createdAt"
         FROM announcements
        WHERE status = 'published'
        ORDER BY is_pinned DESC, created_at DESC
        LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Announcements] Fetch failed:', error);
    res.status(500).json({ error: 'Could not load announcements' });
  }
});

announcements.post('/', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, type, icon, isPinned } = req.body || {};
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const result = await db.query(
      `INSERT INTO announcements (title, content, type, icon, is_pinned, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, is_pinned AS "isPinned", created_at`,
      [title.trim(), content.trim(), type || 'tip', icon || null,
       Boolean(isPinned), parseInt(req.userId || '0', 10)]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Announcements] Create failed:', error);
    res.status(500).json({ error: 'Could not create that announcement' });
  }
});

announcements.patch('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { title, content, type, icon, isPinned, status } = req.body || {};
    const result = await db.query(
      `UPDATE announcements
          SET title = COALESCE($1::varchar, title),
              content = COALESCE($2::text, content),
              type = COALESCE($3::varchar, type),
              icon = COALESCE($4::varchar, icon),
              is_pinned = COALESCE($5::boolean, is_pinned),
              status = COALESCE($6::varchar, status),
              updated_at = NOW()
        WHERE id = $7 RETURNING id, title, is_pinned AS "isPinned", status`,
      [title ?? null, content ?? null, type ?? null, icon ?? null,
       isPinned === undefined ? null : Boolean(isPinned), status ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Announcements] Update failed:', error);
    res.status(500).json({ error: 'Could not update that announcement' });
  }
});

announcements.delete('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await db.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Announcements] Delete failed:', error);
    res.status(500).json({ error: 'Could not delete that announcement' });
  }
});

// ------------------------------------------------------------------- events

const events = express.Router();

/** GET /api/events */
events.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await optionalUserId(req);
    const result = await db.query(
      // to_char, not the bare column: pg hands a DATE back as a JS Date at
      // local midnight, so 2026-08-15 leaves here as 2026-08-14T16:00Z in SGT
      // and the page renders the day before the event.
      `SELECT e.id, e.title, e.description,
              to_char(e.event_date, 'YYYY-MM-DD') AS date, e.event_time AS time,
              e.end_time AS "endTime", e.location, e.type, e.format,
              e.online_link AS "onlineLink",
              to_char(e.cutoff_date, 'YYYY-MM-DD') AS "cutoffDate",
              e.cutoff_time AS "cutoffTime",
              e.cost, e.min_pax AS "minPax", e.max_pax AS "maxPax",
              e.status,
              (SELECT COUNT(*) FROM community_event_attendees a WHERE a.event_id = e.id) AS attendees,
              CASE WHEN $1::int IS NULL THEN false
                   ELSE EXISTS (SELECT 1 FROM community_event_attendees a
                                 WHERE a.event_id = e.id AND a.user_id = $1::int)
              END AS "isAttending"
         FROM community_events e
        WHERE e.status = 'active'
        ORDER BY e.event_date NULLS LAST, e.id
        LIMIT 100`,
      [userId]
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        ...r,
        attendees: Number(r.attendees) || 0,
        cost: Number(r.cost) || 0,
        minPax: r.minPax === null ? null : Number(r.minPax),
        maxPax: r.maxPax === null ? null : Number(r.maxPax),
      })),
    });
  } catch (error) {
    console.error('[Events] Fetch failed:', error);
    res.status(500).json({ error: 'Could not load events' });
  }
});

/**
 * GET /api/events/all — every event including drafts, for the admin screen.
 * The public list above deliberately shows only 'active', so the authoring
 * screen needs its own view or drafts would vanish the moment they were saved.
 */
events.get('/all', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT e.id, e.title, e.description,
              to_char(e.event_date, 'YYYY-MM-DD') AS date, e.event_time AS time,
              e.end_time AS "endTime", e.location, e.type, e.format,
              e.online_link AS "onlineLink",
              to_char(e.cutoff_date, 'YYYY-MM-DD') AS "cutoffDate",
              e.cutoff_time AS "cutoffTime",
              e.cost, e.min_pax AS "minPax", e.max_pax AS "maxPax",
              e.status, e.reminders_sent AS "remindersSent", e.created_at AS "createdAt",
              (SELECT COUNT(*) FROM community_event_attendees a WHERE a.event_id = e.id) AS attendees
         FROM community_events e
        ORDER BY e.created_at DESC
        LIMIT 200`
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        ...r,
        attendees: Number(r.attendees) || 0,
        cost: Number(r.cost) || 0,
        minPax: r.minPax === null ? null : Number(r.minPax),
        maxPax: r.maxPax === null ? null : Number(r.maxPax),
      })),
    });
  } catch (error) {
    console.error('[Events] Admin list failed:', error);
    res.status(500).json({ error: 'Could not load events' });
  }
});

events.post('/', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, description, date, time, endTime, location, type, format,
      onlineLink, cutoffDate, cutoffTime, cost, minPax, maxPax, status,
    } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    // Events are created as drafts unless told otherwise — the admin screen has
    // a separate Publish action, and an event appearing in MyKampung the moment
    // someone starts typing it would be worse than one that needs a click.
    const result = await db.query(
      `INSERT INTO community_events
         (title, description, event_date, event_time, end_time, location, type,
          format, online_link, cutoff_date, cutoff_time, cost, min_pax, max_pax,
          status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id, title, status, to_char(event_date, 'YYYY-MM-DD') AS date`,
      [title.trim(), description || null, date || null, time || null, endTime || null,
       location || null, type || 'meetup', format || 'offline', onlineLink || null,
       cutoffDate || null, cutoffTime || null, Number(cost) || 0,
       minPax ?? null, maxPax ?? null, status || 'draft',
       parseInt(req.userId || '0', 10)]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Events] Create failed:', error);
    res.status(500).json({ error: 'Could not create that event' });
  }
});

events.patch('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const {
      title, description, date, time, endTime, location, type, format,
      onlineLink, cutoffDate, cutoffTime, cost, minPax, maxPax, status,
    } = req.body || {};

    const STATUSES = ['draft', 'active', 'cancelled', 'completed'];
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Unknown event status' });
    }

    const result = await db.query(
      `UPDATE community_events
          SET title = COALESCE($1::varchar, title),
              description = COALESCE($2::text, description),
              event_date = COALESCE($3::date, event_date),
              event_time = COALESCE($4::varchar, event_time),
              end_time = COALESCE($5::varchar, end_time),
              location = COALESCE($6::varchar, location),
              type = COALESCE($7::varchar, type),
              format = COALESCE($8::varchar, format),
              online_link = COALESCE($9::text, online_link),
              cutoff_date = COALESCE($10::date, cutoff_date),
              cutoff_time = COALESCE($11::varchar, cutoff_time),
              cost = COALESCE($12::numeric, cost),
              min_pax = COALESCE($13::int, min_pax),
              max_pax = COALESCE($14::int, max_pax),
              status = COALESCE($15::varchar, status),
              updated_at = NOW()
        WHERE id = $16 RETURNING id, title, status`,
      [title ?? null, description ?? null, date || null, time ?? null, endTime ?? null,
       location ?? null, type ?? null, format ?? null, onlineLink ?? null,
       cutoffDate || null, cutoffTime ?? null,
       cost === undefined ? null : Number(cost),
       minPax ?? null, maxPax ?? null, status ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Events] Update failed:', error);
    res.status(500).json({ error: 'Could not update that event' });
  }
});

events.delete('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await db.query('DELETE FROM community_events WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Events] Delete failed:', error);
    res.status(500).json({ error: 'Could not delete that event' });
  }
});

/** POST /api/events/:id/attend — toggle attendance. */
events.post('/:id/attend', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });

    const existing = await db.query(
      'SELECT 1 FROM community_event_attendees WHERE event_id = $1 AND user_id = $2', [id, userId]
    );
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM community_event_attendees WHERE event_id = $1 AND user_id = $2', [id, userId]);
    } else {
      const e = await db.query('SELECT 1 FROM community_events WHERE id = $1', [id]);
      if (e.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
      await db.query(
        'INSERT INTO community_event_attendees (event_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, userId]
      );
    }
    const c = await db.query(
      'SELECT COUNT(*) AS n FROM community_event_attendees WHERE event_id = $1', [id]
    );
    res.json({
      success: true,
      data: { attendees: Number(c.rows[0].n) || 0, isAttending: existing.rows.length === 0 },
    });
  } catch (error) {
    console.error('[Events] Attend failed:', error);
    res.status(500).json({ error: 'Could not update your attendance' });
  }
});

export { community, announcements, events };
export default community;
