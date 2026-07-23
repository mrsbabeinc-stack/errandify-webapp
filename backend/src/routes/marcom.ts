import express, { Response } from 'express';
import db from '../db.js';
import { config } from '../config.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { sendNotification } from '../utils/notificationHelper.js';
import {
  SEGMENTS,
  SegmentKey,
  isSegment,
  countAudience,
  resolveRecipients,
  needsMarketingConsent,
  Recipient,
} from '../services/marcomAudience.js';

/**
 * Communications (Marcom).
 *
 * Backing for the five admin screens that had none: Email Campaigns,
 * Notifications, Recognition, Hero Banners, and the reminder half of Event
 * Reminders. All five kept their state in localStorage, so a campaign existed
 * in one browser, an award reached nobody, and a banner was never rendered
 * anywhere.
 *
 * Three routers are exported because the audiences differ:
 *   marcom       /api/marcom        admin only — authoring and sending
 *   recognitions /api/recognitions  public read (MyKampung Hall of Stars)
 *   banners      /api/banners       public read (whatever is live right now)
 *
 * Guards are per-route, not on the mount. Six routers already share the
 * /api/admin mount in this codebase and each needed its own guard; putting the
 * check on the mount point is how that gap appeared.
 */

const adminOnly: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/**
 * Whether a send will actually leave the building.
 *
 * services/email.ts logs and returns true in development without contacting a
 * provider. A screen that says "Sent to 15 people" on the back of that is
 * lying, so every send response carries the mode it ran in and the UI repeats
 * it.
 */
function deliveryMode(): 'delivered' | 'logged-only' {
  const configured =
    (config.email.provider === 'sendgrid' && config.email.sendgridApiKey) ||
    (config.email.provider === 'mailgun' && config.email.mailgunApiKey);
  return config.nodeEnv !== 'development' && configured ? 'delivered' : 'logged-only';
}

const CHANNELS = ['push', 'inapp', 'email', 'sms'] as const;
type Channel = (typeof CHANNELS)[number];

function cleanChannels(input: unknown): Channel[] {
  if (!Array.isArray(input)) return ['push', 'inapp'];
  const kept = input.filter((c): c is Channel => CHANNELS.includes(c));
  return kept.length > 0 ? kept : ['push', 'inapp'];
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

/**
 * Campaign body as email.
 *
 * The unsubscribe line is not decoration: an unsolicited commercial message
 * has to carry a working opt-out, and the opt-out this platform already has is
 * the marketing toggle in notification settings.
 */
function campaignHtml(c: any, recipientName: string | null): string {
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,';
  const body = escapeHtml(c.content).replace(/\n/g, '<br>');
  const image = c.image_url
    ? `<img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.image_alt || '')}"
            style="max-width:100%;border-radius:8px;margin-bottom:16px">`
    : '';
  const optOut = needsMarketingConsent(c.template_type)
    ? `<p style="font-size:12px;color:#888;margin-top:24px">
         You are receiving this because you opted in to Errandify updates.
         <a href="${APP_URL}/my-account?tab=notifications">Change your preferences</a>.
       </p>`
    : '';
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#333">
    ${image}
    <p>${greeting}</p>
    <div>${body}</div>
    ${optOut}
  </div>`;
}

// ============================================================ admin router

const marcom = express.Router();

/** GET /api/marcom/segments — the audiences, with live counts. */
marcom.get('/segments', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const marketing = needsMarketingConsent(String(req.query.kind || ''));
    const keys = Object.keys(SEGMENTS) as SegmentKey[];
    const counts = await Promise.all(keys.map((k) => countAudience(k, marketing)));
    res.json({
      success: true,
      data: keys.map((k, i) => ({
        key: k,
        label: SEGMENTS[k].label,
        ...counts[i],
      })),
      marketingFiltered: marketing,
    });
  } catch (error) {
    console.error('[Marcom] Segment counts failed:', error);
    res.status(500).json({ error: 'Could not work out audience sizes' });
  }
});

// ------------------------------------------------------- email campaigns

/**
 * GET /api/marcom/campaigns
 *
 * Open and click rates are counted from email_logs rather than stored on the
 * campaign, so they cannot drift from what was actually delivered.
 */
marcom.get('/campaigns', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.subject, c.content, c.from_name AS "fromName",
              c.from_email AS "fromEmail", c.segment AS "recipientSegment",
              c.template_type AS "templateType", c.image_url AS "imageUrl",
              c.image_alt AS "imageAlt", c.status,
              c.scheduled_at AS "scheduledAt", c.sent_at AS "sentAt",
              c.recipient_count AS "recipientCount", c.sent_count AS "sentCount",
              c.error_count AS "errorCount", c.error_log AS "errorLog",
              c.created_at AS "createdAt",
              (SELECT COUNT(*) FROM email_logs l WHERE l.campaign_id = c.id)::int AS delivered,
              (SELECT COUNT(*) FROM email_logs l
                WHERE l.campaign_id = c.id AND l.opened_at IS NOT NULL)::int AS opened,
              (SELECT COUNT(*) FROM email_logs l
                WHERE l.campaign_id = c.id AND l.clicked_at IS NOT NULL)::int AS clicked
         FROM email_campaigns c
        ORDER BY c.created_at DESC
        LIMIT 200`
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        ...r,
        openRate: r.delivered > 0 ? Math.round((r.opened / r.delivered) * 100) : 0,
        clickRate: r.delivered > 0 ? Math.round((r.clicked / r.delivered) * 100) : 0,
      })),
      deliveryMode: deliveryMode(),
    });
  } catch (error) {
    console.error('[Marcom] Campaign list failed:', error);
    res.status(500).json({ error: 'Could not load campaigns' });
  }
});

marcom.post('/campaigns', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, subject, content, fromName, fromEmail, recipientSegment,
      templateType, imageUrl, imageAlt, scheduledAt,
    } = req.body || {};

    if (!name?.trim() || !subject?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Name, subject and content are required' });
    }
    const segment: SegmentKey = isSegment(recipientSegment) ? recipientSegment : 'all-users';

    // Stored so the list shows the size the campaign was aimed at. The send
    // path re-resolves rather than trusting this — an audience moves.
    const counts = await countAudience(segment, needsMarketingConsent(templateType));

    const result = await db.query(
      `INSERT INTO email_campaigns
         (name, subject, content, from_name, from_email, segment, template_type,
          image_url, image_alt, status, scheduled_at, recipient_count, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, name, status`,
      [name.trim(), subject.trim(), content.trim(),
       fromName?.trim() || 'Errandify', fromEmail?.trim() || config.email.fromEmail,
       segment, templateType || 'promotional', imageUrl || null, imageAlt || null,
       scheduledAt ? 'scheduled' : 'draft', scheduledAt || null,
       counts.withEmail, parseInt(req.userId || '0', 10) || null]
    );
    res.status(201).json({ success: true, data: result.rows[0], audience: counts });
  } catch (error) {
    console.error('[Marcom] Campaign create failed:', error);
    res.status(500).json({ error: 'Could not create that campaign' });
  }
});

marcom.patch('/campaigns/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid campaign id' });

    const {
      name, subject, content, fromName, fromEmail, recipientSegment,
      templateType, imageUrl, imageAlt, scheduledAt, status,
    } = req.body || {};

    // A campaign that has gone out is a record of what people received.
    // Editing it after the fact would make the record disagree with the inbox.
    const existing = await db.query('SELECT status FROM email_campaigns WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.rows[0].status === 'sent') {
      return res.status(409).json({ error: 'This campaign has already been sent and cannot be edited' });
    }

    const result = await db.query(
      `UPDATE email_campaigns
          SET name = COALESCE($1::varchar, name),
              subject = COALESCE($2::varchar, subject),
              content = COALESCE($3::text, content),
              from_name = COALESCE($4::varchar, from_name),
              from_email = COALESCE($5::varchar, from_email),
              segment = COALESCE($6::varchar, segment),
              template_type = COALESCE($7::varchar, template_type),
              image_url = COALESCE($8::text, image_url),
              image_alt = COALESCE($9::text, image_alt),
              scheduled_at = COALESCE($10::timestamp, scheduled_at),
              status = COALESCE($11::varchar, status),
              updated_at = NOW()
        WHERE id = $12
        RETURNING id, name, status`,
      [name ?? null, subject ?? null, content ?? null, fromName ?? null, fromEmail ?? null,
       isSegment(recipientSegment) ? recipientSegment : null, templateType ?? null,
       imageUrl ?? null, imageAlt ?? null, scheduledAt || null,
       status && ['draft', 'scheduled'].includes(status) ? status : null, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Marcom] Campaign update failed:', error);
    res.status(500).json({ error: 'Could not update that campaign' });
  }
});

marcom.delete('/campaigns/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid campaign id' });
    const r = await db.query('DELETE FROM email_campaigns WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Marcom] Campaign delete failed:', error);
    res.status(500).json({ error: 'Could not delete that campaign' });
  }
});

/**
 * POST /api/marcom/campaigns/:id/send
 *
 * Sends once. The status check is the guard against a double-click mailing
 * everyone twice — there is no undo on a delivered email.
 */
marcom.post('/campaigns/:id/send', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid campaign id' });

    const found = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
    if (found.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const campaign = found.rows[0];
    if (campaign.status === 'sent') {
      return res.status(409).json({ error: 'This campaign has already been sent' });
    }

    const segment: SegmentKey = isSegment(campaign.segment) ? campaign.segment : 'all-users';
    const marketing = needsMarketingConsent(campaign.template_type);
    const recipients = await resolveRecipients(segment, marketing, { requireEmail: true });

    if (recipients.length === 0) {
      // Not an error — an empty audience is a real answer, and for a
      // promotional campaign it usually means nobody has opted in yet.
      await db.query(
        `UPDATE email_campaigns SET recipient_count = 0, updated_at = NOW() WHERE id = $1`, [id]
      );
      return res.status(409).json({
        error: marketing
          ? 'Nobody in this audience has opted in to marketing email, so there is no one to send to'
          : 'Nobody in this audience has an email address on file',
        audience: await countAudience(segment, marketing),
      });
    }

    let sent = 0;
    const failures: string[] = [];
    for (const person of recipients) {
      try {
        const ok = await sendEmail({
          to: person.email as string,
          subject: campaign.subject,
          html: campaignHtml(campaign, person.displayName),
          text: campaign.content,
        });
        if (!ok) throw new Error('provider refused the message');
        await db.query(
          `INSERT INTO email_logs (user_id, email_type, subject, sent_at, campaign_id)
           VALUES ($1, 'campaign', $2, NOW(), $3)`,
          [person.id, campaign.subject, id]
        );
        sent += 1;
      } catch (err: any) {
        failures.push(`user ${person.id}: ${err?.message || 'send failed'}`);
      }
    }

    const status = sent === 0 ? 'failed' : 'sent';
    await db.query(
      `UPDATE email_campaigns
          SET status = $1, sent_at = NOW(), recipient_count = $2,
              sent_count = $3, error_count = $4, error_log = $5, updated_at = NOW()
        WHERE id = $6`,
      [status, recipients.length, sent, failures.length,
       failures.slice(0, 20).join('\n') || null, id]
    );

    res.json({
      success: true,
      data: { id, status, attempted: recipients.length, sent, failed: failures.length },
      deliveryMode: deliveryMode(),
    });
  } catch (error) {
    console.error('[Marcom] Campaign send failed:', error);
    res.status(500).json({ error: 'Could not send that campaign' });
  }
});

// ---------------------------------------------------------- audience groups

marcom.get('/groups', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, name, description, segment, channels, created_at AS "createdAt"
         FROM notification_groups ORDER BY id`
    );
    const counted = await Promise.all(
      result.rows.map(async (g: any) => {
        const segment: SegmentKey = isSegment(g.segment) ? g.segment : 'all-users';
        const counts = await countAudience(segment, false);
        return { ...g, userCount: counts.audience, segmentLabel: SEGMENTS[segment].label };
      })
    );
    res.json({ success: true, data: counted });
  } catch (error) {
    console.error('[Marcom] Group list failed:', error);
    res.status(500).json({ error: 'Could not load groups' });
  }
});

marcom.post('/groups', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, segment, channels } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });
    if (segment && !isSegment(segment)) {
      return res.status(400).json({ error: 'Unknown audience rule' });
    }
    const result = await db.query(
      `INSERT INTO notification_groups (name, description, segment, channels, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, description, segment, channels`,
      [name.trim(), description || null, segment || 'all-users',
       cleanChannels(channels), parseInt(req.userId || '0', 10) || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Marcom] Group create failed:', error);
    res.status(500).json({ error: 'Could not create that group' });
  }
});

marcom.patch('/groups/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid group id' });
    const { name, description, segment, channels } = req.body || {};
    if (segment && !isSegment(segment)) {
      return res.status(400).json({ error: 'Unknown audience rule' });
    }
    const result = await db.query(
      `UPDATE notification_groups
          SET name = COALESCE($1::varchar, name),
              description = COALESCE($2::text, description),
              segment = COALESCE($3::varchar, segment),
              channels = COALESCE($4::text[], channels),
              updated_at = NOW()
        WHERE id = $5 RETURNING id, name, description, segment, channels`,
      [name ?? null, description ?? null, segment ?? null,
       channels === undefined ? null : cleanChannels(channels), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Marcom] Group update failed:', error);
    res.status(500).json({ error: 'Could not update that group' });
  }
});

marcom.delete('/groups/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid group id' });
    const r = await db.query('DELETE FROM notification_groups WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Marcom] Group delete failed:', error);
    res.status(500).json({ error: 'Could not delete that group' });
  }
});

// ------------------------------------------------------------- broadcasts

marcom.get('/broadcasts', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT b.id, b.title, b.message, b.type, b.group_id AS "groupId", b.segment,
              b.channels, b.status, b.scheduled_at AS "scheduledTime",
              b.sent_at AS "sentAt", b.sent_count AS "sentCount",
              b.error_count AS "errorCount", b.error_log AS "errorLog",
              b.created_at AS "createdAt", g.name AS "groupName"
         FROM notification_broadcasts b
         LEFT JOIN notification_groups g ON g.id = b.group_id
        ORDER BY b.created_at DESC
        LIMIT 200`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Marcom] Broadcast list failed:', error);
    res.status(500).json({ error: 'Could not load notifications' });
  }
});

marcom.post('/broadcasts', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type, groupId, channels, scheduledTime } = req.body || {};
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // The audience comes from the group, so a group whose rule changes later
    // changes who a draft would reach — which is the point of naming it.
    let segment: SegmentKey = 'all-users';
    let resolvedGroupId: number | null = null;
    if (groupId) {
      const g = await db.query('SELECT id, segment FROM notification_groups WHERE id = $1', [groupId]);
      if (g.rows.length === 0) return res.status(400).json({ error: 'That group no longer exists' });
      resolvedGroupId = g.rows[0].id;
      if (isSegment(g.rows[0].segment)) segment = g.rows[0].segment;
    }

    const result = await db.query(
      `INSERT INTO notification_broadcasts
         (title, message, type, group_id, segment, channels, status, scheduled_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, title, status`,
      [title.trim(), message.trim(), type || 'announcement', resolvedGroupId, segment,
       cleanChannels(channels), scheduledTime ? 'scheduled' : 'draft',
       scheduledTime || null, parseInt(req.userId || '0', 10) || null]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      audience: await countAudience(segment, needsMarketingConsent(type)),
    });
  } catch (error) {
    console.error('[Marcom] Broadcast create failed:', error);
    res.status(500).json({ error: 'Could not create that notification' });
  }
});

marcom.delete('/broadcasts/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid notification id' });
    const r = await db.query(
      'DELETE FROM notification_broadcasts WHERE id = $1 RETURNING id', [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Marcom] Broadcast delete failed:', error);
    res.status(500).json({ error: 'Could not delete that notification' });
  }
});

/**
 * POST /api/marcom/broadcasts/:id/send
 *
 * in-app and push go through the shared notification helper, so a broadcast
 * lands in the same bell as everything else. Email uses the campaign path.
 * SMS has no provider wired anywhere in this codebase — rather than count it
 * as delivered, the send reports it as skipped and says why.
 */
marcom.post('/broadcasts/:id/send', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid notification id' });

    const found = await db.query('SELECT * FROM notification_broadcasts WHERE id = $1', [id]);
    if (found.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    const b = found.rows[0];
    if (b.status === 'sent') {
      return res.status(409).json({ error: 'This notification has already been sent' });
    }

    const segment: SegmentKey = isSegment(b.segment) ? b.segment : 'all-users';
    const marketing = needsMarketingConsent(b.type);
    const channels: Channel[] = cleanChannels(b.channels);
    const recipients = await resolveRecipients(segment, marketing);

    if (recipients.length === 0) {
      return res.status(409).json({
        error: marketing
          ? 'Nobody in this audience has opted in to marketing messages'
          : 'This audience is empty',
        audience: await countAudience(segment, marketing),
      });
    }

    const wantsInApp = channels.includes('inapp') || channels.includes('push');
    const wantsEmail = channels.includes('email');
    const skipped: string[] = [];
    if (channels.includes('sms')) {
      skipped.push('SMS: no SMS provider is configured, so nothing was sent on that channel');
    }

    let sent = 0;
    const failures: string[] = [];
    for (const person of recipients) {
      let reached = false;
      if (wantsInApp) {
        try {
          await sendNotification({
            userId: person.id,
            type: 'admin_broadcast',
            title: b.title,
            message: b.message,
          });
          reached = true;
        } catch (err: any) {
          failures.push(`user ${person.id} (in-app): ${err?.message || 'failed'}`);
        }
      }
      if (wantsEmail && person.email) {
        try {
          const ok = await sendEmail({
            to: person.email,
            subject: b.title,
            html: campaignHtml(
              { content: b.message, template_type: b.type, image_url: null, image_alt: null },
              person.displayName
            ),
            text: b.message,
          });
          if (!ok) throw new Error('provider refused the message');
          await db.query(
            `INSERT INTO email_logs (user_id, email_type, subject, sent_at)
             VALUES ($1, 'broadcast', $2, NOW())`,
            [person.id, b.title]
          );
          reached = true;
        } catch (err: any) {
          failures.push(`user ${person.id} (email): ${err?.message || 'failed'}`);
        }
      }
      if (reached) sent += 1;
    }

    const status = sent === 0 ? 'error' : 'sent';
    const errorLog = [...skipped, ...failures.slice(0, 20)].join('\n') || null;
    await db.query(
      `UPDATE notification_broadcasts
          SET status = $1, sent_at = NOW(), sent_count = $2, error_count = $3,
              error_log = $4, updated_at = NOW()
        WHERE id = $5`,
      [status, sent, failures.length, errorLog, id]
    );

    res.json({
      success: true,
      data: {
        id, status, attempted: recipients.length, sent,
        failed: failures.length, skipped,
      },
      deliveryMode: wantsEmail ? deliveryMode() : 'delivered',
    });
  } catch (error) {
    console.error('[Marcom] Broadcast send failed:', error);
    res.status(500).json({ error: 'Could not send that notification' });
  }
});

// ------------------------------------------------------------ recognition

marcom.get('/recognitions', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.user_id AS "userId", r.award, r.reason, r.icon, r.visibility,
              r.award_image_url AS "awardImageUrl", r.award_image_alt AS "awardImageAlt",
              r.awarded_at AS "awardedAt",
              COALESCE(u.alias, u.display_name) AS "userName",
              u.formatted_user_id AS "userRef",
              (SELECT COUNT(*) FROM recognition_votes v WHERE v.recognition_id = r.id)::int AS votes
         FROM recognitions r
         JOIN users u ON u.id = r.user_id
        ORDER BY r.awarded_at DESC
        LIMIT 200`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Marcom] Recognition list failed:', error);
    res.status(500).json({ error: 'Could not load recognitions' });
  }
});

/**
 * GET /api/marcom/users/search?q= — for picking who to award.
 *
 * The old screen took a typed name. Two people called Alex Wong, or a typo,
 * and the award attached to nobody at all; there was no user behind it to
 * notify. Awards now reference an account, so this is how one is found.
 */
marcom.get('/users/search', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });
    const result = await db.query(
      `SELECT id, COALESCE(alias, display_name) AS name, formatted_user_id AS "userRef",
              COALESCE(average_rating, 0)::float AS rating
         FROM users
        WHERE status = 'active' AND anonymised_at IS NULL
          AND (display_name ILIKE $1 OR alias ILIKE $1 OR formatted_user_id ILIKE $1)
        ORDER BY display_name
        LIMIT 20`,
      [`%${q}%`]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Marcom] User search failed:', error);
    res.status(500).json({ error: 'Could not search users' });
  }
});

marcom.post('/recognitions', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, award, reason, icon, visibility, awardImageUrl, awardImageAlt } = req.body || {};
    const uid = parseInt(userId, 10);
    if (Number.isNaN(uid)) return res.status(400).json({ error: 'Choose who the award is for' });
    if (!award?.trim() || !reason?.trim()) {
      return res.status(400).json({ error: 'Award and reason are required' });
    }

    const person = await db.query(
      `SELECT id, COALESCE(alias, display_name) AS name FROM users WHERE id = $1`, [uid]
    );
    if (person.rows.length === 0) return res.status(404).json({ error: 'That user no longer exists' });

    const vis = visibility === 'private' ? 'private' : 'public';
    const result = await db.query(
      `INSERT INTO recognitions
         (user_id, award, reason, icon, visibility, award_image_url, award_image_alt, awarded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, award, visibility, awarded_at AS "awardedAt"`,
      [uid, award.trim(), reason.trim(), icon || '🏅', vis,
       awardImageUrl || null, awardImageAlt || null, parseInt(req.userId || '0', 10) || null]
    );

    // The point of an award is that the person hears about it.
    try {
      await sendNotification({
        userId: uid,
        type: 'recognition_awarded',
        title: `You've been recognised: ${award.trim()}`,
        message: reason.trim(),
      });
    } catch (err) {
      console.error('[Marcom] Recognition notification failed:', err);
    }

    res.status(201).json({
      success: true,
      data: { ...result.rows[0], userId: uid, userName: person.rows[0].name },
    });
  } catch (error) {
    console.error('[Marcom] Recognition create failed:', error);
    res.status(500).json({ error: 'Could not award that recognition' });
  }
});

marcom.patch('/recognitions/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recognition id' });
    const { award, reason, icon, visibility } = req.body || {};
    const result = await db.query(
      `UPDATE recognitions
          SET award = COALESCE($1::varchar, award),
              reason = COALESCE($2::text, reason),
              icon = COALESCE($3::varchar, icon),
              visibility = COALESCE($4::varchar, visibility)
        WHERE id = $5 RETURNING id, award, visibility`,
      [award ?? null, reason ?? null, icon ?? null,
       visibility === 'public' || visibility === 'private' ? visibility : null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Recognition not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Marcom] Recognition update failed:', error);
    res.status(500).json({ error: 'Could not update that recognition' });
  }
});

marcom.delete('/recognitions/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recognition id' });
    const r = await db.query('DELETE FROM recognitions WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Recognition not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Marcom] Recognition delete failed:', error);
    res.status(500).json({ error: 'Could not delete that recognition' });
  }
});

// ---------------------------------------------------------- hero banners

marcom.get('/banners', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, title, subtitle, emoji AS image, image_url AS "imageUrl",
              cta_text AS "ctaText", cta_link AS "ctaLink",
              display_location AS "displayLocation", status,
              active_from AS "activeFrom", active_to AS "activeTo",
              created_at AS "createdAt"
         FROM hero_banners ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Marcom] Banner list failed:', error);
    res.status(500).json({ error: 'Could not load banners' });
  }
});

const BANNER_STATUSES = ['active', 'scheduled', 'archived'];

marcom.post('/banners', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, subtitle, image, imageUrl, ctaText, ctaLink,
      displayLocation, status, activeFrom, activeTo,
    } = req.body || {};
    if (!title?.trim() || !ctaText?.trim()) {
      return res.status(400).json({ error: 'Title and button text are required' });
    }
    if (status && !BANNER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Unknown banner status' });
    }
    const result = await db.query(
      `INSERT INTO hero_banners
         (title, subtitle, emoji, image_url, cta_text, cta_link, display_location,
          status, active_from, active_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, title, status`,
      [title.trim(), subtitle || null, image || '📢', imageUrl || null,
       ctaText.trim(), ctaLink || '/browse', displayLocation || 'home',
       status || 'scheduled', activeFrom || null, activeTo || null,
       parseInt(req.userId || '0', 10) || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Marcom] Banner create failed:', error);
    res.status(500).json({ error: 'Could not create that banner' });
  }
});

marcom.patch('/banners/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid banner id' });
    const {
      title, subtitle, image, imageUrl, ctaText, ctaLink,
      displayLocation, status, activeFrom, activeTo,
    } = req.body || {};
    if (status && !BANNER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Unknown banner status' });
    }
    const result = await db.query(
      `UPDATE hero_banners
          SET title = COALESCE($1::varchar, title),
              subtitle = COALESCE($2::varchar, subtitle),
              emoji = COALESCE($3::varchar, emoji),
              image_url = COALESCE($4::text, image_url),
              cta_text = COALESCE($5::varchar, cta_text),
              cta_link = COALESCE($6::varchar, cta_link),
              display_location = COALESCE($7::varchar, display_location),
              status = COALESCE($8::varchar, status),
              active_from = COALESCE($9::timestamp, active_from),
              active_to = COALESCE($10::timestamp, active_to),
              updated_at = NOW()
        WHERE id = $11 RETURNING id, title, status`,
      [title ?? null, subtitle ?? null, image ?? null, imageUrl ?? null,
       ctaText ?? null, ctaLink ?? null, displayLocation ?? null, status ?? null,
       activeFrom || null, activeTo || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Marcom] Banner update failed:', error);
    res.status(500).json({ error: 'Could not update that banner' });
  }
});

marcom.delete('/banners/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid banner id' });
    const r = await db.query('DELETE FROM hero_banners WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[Marcom] Banner delete failed:', error);
    res.status(500).json({ error: 'Could not delete that banner' });
  }
});

// -------------------------------------------------------- event reminders

const REMINDER_KINDS = ['7day', '24hour', '1hour', 'dayof'] as const;
type ReminderKind = (typeof REMINDER_KINDS)[number];

const REMINDER_COPY: Record<ReminderKind, (title: string) => string> = {
  '7day': (t) => `${t} is one week away. Your spot is booked — see you there.`,
  '24hour': (t) => `${t} is tomorrow. Here are the details for your visit.`,
  '1hour': (t) => `${t} starts in about an hour.`,
  dayof: (t) => `${t} is today.`,
};

/** GET /api/marcom/events/:id/reminders — what has already gone out. */
marcom.get('/events/:id/reminders', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });
    const result = await db.query(
      `SELECT kind, sent_count AS "sentCount", sent_at AS "sentAt"
         FROM event_reminder_log WHERE event_id = $1 ORDER BY sent_at`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Marcom] Reminder log failed:', error);
    res.status(500).json({ error: 'Could not load reminder history' });
  }
});

/**
 * POST /api/marcom/events/:id/reminders — send one reminder to attendees.
 *
 * Attendees only. A reminder for an event you did not sign up for is a
 * promotion, and would need the consent the attendee list already implies.
 * The unique constraint on (event_id, kind) is what stops a second click from
 * mailing everyone again.
 */
marcom.post('/events/:id/reminders', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });
    const kind = String(req.body?.kind || '') as ReminderKind;
    if (!REMINDER_KINDS.includes(kind)) {
      return res.status(400).json({ error: 'Unknown reminder type' });
    }

    const ev = await db.query(
      `SELECT id, title, to_char(event_date,'YYYY-MM-DD') AS date, event_time, location,
              format, online_link, status
         FROM community_events WHERE id = $1`, [id]
    );
    if (ev.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = ev.rows[0];
    if (event.status !== 'active') {
      return res.status(409).json({ error: 'Publish the event before sending reminders' });
    }

    const already = await db.query(
      'SELECT sent_at, sent_count FROM event_reminder_log WHERE event_id = $1 AND kind = $2',
      [id, kind]
    );
    if (already.rows.length > 0) {
      return res.status(409).json({
        error: `That reminder already went out to ${already.rows[0].sent_count} attendee(s)`,
        sentAt: already.rows[0].sent_at,
      });
    }

    const attendees = await db.query(
      `SELECT u.id, u.email, COALESCE(u.alias, u.display_name) AS name
         FROM community_event_attendees a
         JOIN users u ON u.id = a.user_id
        WHERE a.event_id = $1 AND u.status = 'active' AND u.anonymised_at IS NULL`,
      [id]
    );
    if (attendees.rows.length === 0) {
      return res.status(409).json({ error: 'Nobody has signed up for this event yet' });
    }

    const where = event.format === 'online'
      ? event.online_link || 'Online — link to follow'
      : event.location || 'Location to be confirmed';
    const body = `${REMINDER_COPY[kind](event.title)}\n\nWhen: ${event.date || 'TBC'} ${event.event_time || ''}\nWhere: ${where}`;

    let sent = 0;
    const failures: string[] = [];
    for (const person of attendees.rows) {
      try {
        await sendNotification({
          userId: person.id,
          type: 'event_reminder',
          title: `Reminder: ${event.title}`,
          message: body,
        });
        if (person.email) {
          await sendEmail({
            to: person.email,
            subject: `Reminder: ${event.title}`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
                     <p>Hi ${escapeHtml(person.name || '')},</p>
                     <div>${escapeHtml(body).replace(/\n/g, '<br>')}</div>
                   </div>`,
            text: body,
          });
          await db.query(
            `INSERT INTO email_logs (user_id, email_type, subject, sent_at)
             VALUES ($1, 'event_reminder', $2, NOW())`,
            [person.id, `Reminder: ${event.title}`]
          );
        }
        sent += 1;
      } catch (err: any) {
        failures.push(`user ${person.id}: ${err?.message || 'failed'}`);
      }
    }

    await db.query(
      `INSERT INTO event_reminder_log (event_id, kind, sent_count, sent_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (event_id, kind) DO NOTHING`,
      [id, kind, sent, parseInt(req.userId || '0', 10) || null]
    );
    await db.query(
      'UPDATE community_events SET reminders_sent = TRUE WHERE id = $1', [id]
    );

    res.json({
      success: true,
      data: { kind, attempted: attendees.rows.length, sent, failed: failures.length },
      deliveryMode: deliveryMode(),
    });
  } catch (error) {
    console.error('[Marcom] Reminder send failed:', error);
    res.status(500).json({ error: 'Could not send those reminders' });
  }
});

// ================================================= public: Hall of Stars

const recognitions = express.Router();

/**
 * GET /api/recognitions — MyKampung's Hall of Stars.
 *
 * The tab has always rendered from a `recognitions` array that nothing ever
 * populated, so it has shown "No recognitions yet" since it was built. Public
 * awards only; a private one is between the admin and the person.
 */
recognitions.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const header = req.headers.authorization;
    let viewerId: number | null = null;
    if (header?.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded: any = jwt.default.verify(header.slice(7), process.env.JWT_SECRET as string);
        const parsed = parseInt(decoded.userId ?? decoded.id, 10);
        viewerId = Number.isNaN(parsed) ? null : parsed;
      } catch {
        viewerId = null;
      }
    }

    const result = await db.query(
      `SELECT r.id,
              COALESCE(u.alias, u.display_name) AS name,
              r.icon AS title,
              COALESCE(u.average_rating, 0)::float AS rating,
              r.award AS description,
              r.reason AS testimonial,
              'Errandify' AS "nominatedBy",
              r.awarded_at AS "nominationDate",
              r.award_image_url AS "imageUrl",
              (SELECT COUNT(*) FROM recognition_votes v WHERE v.recognition_id = r.id)::int AS votes,
              CASE WHEN $1::int IS NULL THEN false
                   ELSE EXISTS (SELECT 1 FROM recognition_votes v
                                 WHERE v.recognition_id = r.id AND v.user_id = $1::int)
              END AS "hasVoted"
         FROM recognitions r
         JOIN users u ON u.id = r.user_id
        WHERE r.visibility = 'public' AND u.anonymised_at IS NULL
        ORDER BY r.awarded_at DESC
        LIMIT 50`,
      [viewerId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Recognition] Fetch failed:', error);
    res.status(500).json({ error: 'Could not load recognitions' });
  }
});

/** POST /api/recognitions/:id/vote — toggle an applause. One per person. */
recognitions.post('/:id/vote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recognition id' });

    const existing = await db.query(
      'SELECT 1 FROM recognition_votes WHERE recognition_id = $1 AND user_id = $2', [id, userId]
    );
    if (existing.rows.length > 0) {
      await db.query(
        'DELETE FROM recognition_votes WHERE recognition_id = $1 AND user_id = $2', [id, userId]
      );
    } else {
      const r = await db.query(
        `SELECT 1 FROM recognitions WHERE id = $1 AND visibility = 'public'`, [id]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Recognition not found' });
      await db.query(
        `INSERT INTO recognition_votes (recognition_id, user_id) VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [id, userId]
      );
    }
    const c = await db.query(
      'SELECT COUNT(*)::int AS n FROM recognition_votes WHERE recognition_id = $1', [id]
    );
    res.json({
      success: true,
      data: { votes: c.rows[0].n, hasVoted: existing.rows.length === 0 },
    });
  } catch (error) {
    console.error('[Recognition] Vote failed:', error);
    res.status(500).json({ error: 'Could not register your applause' });
  }
});

// ==================================================== public: hero banners

const banners = express.Router();

/**
 * GET /api/banners?location=home — banners that are live now.
 *
 * "Live" means status 'active' and, if a window was set, inside it. A banner
 * left in 'scheduled' with a start date in the future does not appear, which
 * is the whole reason the scheduling fields exist.
 */
banners.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const location = String(req.query.location || 'home');
    const result = await db.query(
      `SELECT id, title, subtitle, emoji AS image, image_url AS "imageUrl",
              cta_text AS "ctaText", cta_link AS "ctaLink",
              display_location AS "displayLocation"
         FROM hero_banners
        WHERE display_location = $1
          AND status = 'active'
          AND (active_from IS NULL OR active_from <= NOW())
          AND (active_to   IS NULL OR active_to   >= NOW())
        ORDER BY created_at DESC
        LIMIT 10`,
      [location]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Banners] Fetch failed:', error);
    res.status(500).json({ error: 'Could not load banners' });
  }
});

export { marcom, recognitions, banners };
export default marcom;
