import express, { Request, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Lead Generation — supply-side acquisition.
 *
 * Two things only, because at this stage two things are what get used:
 *
 *   1. `/supply-gap` — the errands nobody offered on, ranked. This is the
 *      recruitment worklist. Recruiting "doers" in general does not move a
 *      fill rate; recruiting a handyman for the four unfilled home-maintenance
 *      errands does.
 *   2. Manual lead entry — somewhere for a founder's phone calls to live that
 *      is not a notebook, with an audit trail of what was said and when.
 *
 * Public capture forms, invite tokens and campaign sends are deliberately not
 * here yet. See migrations/061_lead_generation.ts for the consent and
 * retention reasoning that any of those would have to honour.
 *
 * Guard at router level, not per handler, so a route added later cannot be
 * forgotten — same pattern as routes/finance.ts and routes/rbac.ts. Six
 * routers share the /api/admin mount and each needs its own guard.
 */
// The casts only bridge AuthRequest, which the express types in this repo do
// not accept as a Request; the middleware itself is unchanged.
router.use(
  authMiddleware as unknown as express.RequestHandler,
  requireAdmin(['admin', 'super-admin']) as unknown as express.RequestHandler
);

const uid = (req: Request): number | null => {
  const id = (req as unknown as AuthRequest).userId;
  return id ? parseInt(id, 10) : null;
};

const STAGES = [
  'new',
  'contacted',
  'qualified',
  'invited',
  'signed_up',
  'converted',
  'disqualified',
] as const;
type Stage = (typeof STAGES)[number];

const LEAD_TYPES = ['individual', 'company'] as const;

const SOURCES = [
  'admin',          // a founder call, keyed in by hand
  'interest_form',  // the pre-launch interest form
  'referral',
  'partner',
  'landing',
  'qr',
  'event',
  'directory',      // public business listing — see s4(5) note in the migration
] as const;

/** Lowercased and trimmed; null when there is nothing to key on. */
function normaliseEmail(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  return s ? s : null;
}

/**
 * Singapore mobile numbers, reduced to eight digits so that +65 9123 4567,
 * 6591234567 and 91234567 collide on the unique index instead of becoming
 * three leads for one person.
 */
function normaliseMobile(v: unknown): string | null {
  const digits = String(v ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith('65')) return digits.slice(2);
  return digits;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

async function logEvent(
  leadId: number,
  kind: string,
  note: string | null,
  actor: number | null
) {
  await db.query(
    `INSERT INTO lead_events (lead_id, kind, note, actor_admin_id) VALUES ($1,$2,$3,$4)`,
    [leadId, kind, note, actor]
  );
}

// ---------------------------------------------------------------- worklist

/**
 * GET /api/admin/leads/supply-gap — who to recruit, and for what.
 *
 * `byCategory` ranks the gap and is the answer to "what kind of person do I
 * need". `errands` is the call list itself: each row is an unfilled job with a
 * price, which is the only opening line that works on a busy tradesman.
 *
 * Two statuses, and the distinction matters operationally:
 *
 *   - `open`   — still live. You can offer this job to someone today, so these
 *                sort first and are the ones actually worth ringing about.
 *   - `expired` — timed out with nobody having offered. Dead as a job, but the
 *                strongest evidence you have of which trade is missing, and a
 *                customer who was failed outright.
 *
 * On the database this was written against, every one of the 33 unfilled
 * errands was already expired and none were open — which is why both are
 * counted separately rather than lumped into one number that would have read
 * as a healthy zero.
 *
 * `active_doers` counts people who have actually had an offer accepted in the
 * category, not people who ticked it in `category_can_help`. A doer who has
 * never completed anything is not coverage.
 */
const GAP_STATUSES = `('open','expired')`;

router.get('/supply-gap', async (_req: Request, res: Response) => {
  try {
    const byCategory = await db.query(`
      SELECT e.category,
             COUNT(*)::int                                    AS unfilled,
             COUNT(*) FILTER (WHERE e.status = 'open')::int    AS still_open,
             COUNT(*) FILTER (WHERE e.status = 'expired')::int AS expired,
             ROUND(AVG(NULLIF(e.budget, 0)), 0)               AS avg_budget,
             MAX(EXTRACT(DAY FROM NOW() - e.created_at))::int  AS oldest_days,
             (SELECT COUNT(DISTINCT b.doer_id)::int
                FROM bids b
                JOIN errands e2 ON e2.id = b.errand_id
               WHERE e2.category = e.category
                 AND b.status IN ('accepted','confirmed','closed')) AS active_doers,
             (SELECT COUNT(*)::int
                FROM leads l
               WHERE l.converted_at IS NULL
                 AND l.stage NOT IN ('disqualified')
                 AND e.category = ANY(l.interested_categories))     AS leads_in_pipeline
        FROM errands e
       WHERE e.status IN ${GAP_STATUSES}
         AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.errand_id = e.id)
       GROUP BY e.category
       ORDER BY unfilled DESC
    `);

    const errands = await db.query(`
      SELECT e.id,
             COALESCE(e.formatted_id, e.errand_id, e.id::text) AS ref,
             e.title,
             e.category,
             e.status,
             NULLIF(e.location, '')                            AS location,
             e.budget,
             e.created_at,
             EXTRACT(DAY FROM NOW() - e.created_at)::int       AS days_open
        FROM errands e
       WHERE e.status IN ${GAP_STATUSES}
         AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.errand_id = e.id)
       ORDER BY (e.status = 'open') DESC, e.created_at ASC
       LIMIT 200
    `);

    const rows = errands.rows as { status: string }[];
    res.json({
      success: true,
      data: {
        byCategory: byCategory.rows,
        errands: errands.rows,
        totalUnfilled: rows.length,
        stillOpen: rows.filter((r) => r.status === 'open').length,
        expired: rows.filter((r) => r.status === 'expired').length,
      },
    });
  } catch (error) {
    console.error('[Leads] supply-gap failed:', error);
    res.status(500).json({ error: 'Could not load the recruitment worklist' });
  }
});

/** GET /api/admin/leads/stats — funnel counts, for the header tiles. */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const byStage = await db.query(
      `SELECT stage, COUNT(*)::int AS n FROM leads GROUP BY stage`
    );
    const bySource = await db.query(
      `SELECT source, COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::int AS converted
         FROM leads GROUP BY source ORDER BY n DESC`
    );
    const totals = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::int AS converted,
              COUNT(*) FILTER (WHERE purge_after <= CURRENT_DATE + 30
                                AND converted_at IS NULL)::int      AS purging_soon
         FROM leads`
    );
    res.json({
      success: true,
      data: {
        byStage: byStage.rows,
        bySource: bySource.rows,
        ...totals.rows[0],
      },
    });
  } catch (error) {
    console.error('[Leads] stats failed:', error);
    res.status(500).json({ error: 'Could not load lead statistics' });
  }
});

// -------------------------------------------------------------------- list

/** GET /api/admin/leads — filterable list. */
router.get('/', async (req: Request, res: Response) => {
  try {
    const clauses: string[] = [];
    const params: any[] = [];

    const { stage, lead_type, source, category, q } = req.query as Record<string, string>;

    if (stage && STAGES.includes(stage as Stage)) {
      params.push(stage);
      clauses.push(`l.stage = $${params.length}`);
    }
    if (lead_type && LEAD_TYPES.includes(lead_type as any)) {
      params.push(lead_type);
      clauses.push(`l.lead_type = $${params.length}`);
    }
    if (source) {
      params.push(source);
      clauses.push(`l.source = $${params.length}`);
    }
    if (category) {
      params.push(category);
      clauses.push(`$${params.length} = ANY(l.interested_categories)`);
    }
    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      const i = params.length;
      clauses.push(
        `(LOWER(l.full_name) LIKE $${i} OR LOWER(COALESCE(l.company_name,'')) LIKE $${i}
          OR LOWER(COALESCE(l.email,'')) LIKE $${i} OR COALESCE(l.mobile,'') LIKE $${i})`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT l.*, u.display_name AS owner_name
         FROM leads l
         LEFT JOIN users u ON u.id = l.owner_admin_id
         ${where}
        ORDER BY l.updated_at DESC
        LIMIT 500`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Leads] list failed:', error);
    res.status(500).json({ error: 'Could not load leads' });
  }
});

/** GET /api/admin/leads/:id — one lead plus its trail. */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid lead id' });

    const lead = await db.query(
      `SELECT l.*, u.display_name AS owner_name
         FROM leads l LEFT JOIN users u ON u.id = l.owner_admin_id
        WHERE l.id = $1`,
      [id]
    );
    if (lead.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    const events = await db.query(
      `SELECT ev.*, u.display_name AS actor_name
         FROM lead_events ev LEFT JOIN users u ON u.id = ev.actor_admin_id
        WHERE ev.lead_id = $1
        ORDER BY ev.created_at DESC`,
      [id]
    );
    res.json({ success: true, data: { ...lead.rows[0], events: events.rows } });
  } catch (error) {
    console.error('[Leads] detail failed:', error);
    res.status(500).json({ error: 'Could not load that lead' });
  }
});

// ------------------------------------------------------------------ create

/**
 * POST /api/admin/leads — record a lead, typically straight after a call.
 *
 * Dedupe is an update, not a 409: when you ring someone who already turned up
 * on the interest form, you want the two facts on one row, not a duplicate and
 * a reconciliation job. The event trail records that it happened.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const actor = uid(req);

    const fullName = String(b.full_name ?? '').trim();
    if (!fullName) return res.status(400).json({ error: 'A name is required' });

    const leadType = LEAD_TYPES.includes(b.lead_type) ? b.lead_type : 'individual';
    if (leadType === 'company' && !String(b.company_name ?? '').trim()) {
      return res.status(400).json({ error: 'A company lead needs a company name' });
    }

    const email = normaliseEmail(b.email);
    const mobile = normaliseMobile(b.mobile);
    if (!email && !mobile) {
      return res.status(400).json({ error: 'An email address or a mobile number is required' });
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'That email address does not look right' });
    }

    const source = SOURCES.includes(b.source) ? b.source : 'admin';

    // Consent to be contacted is required for an individual. For a company
    // lead taken from a public business listing the s4(5) business-contact
    // exemption applies instead, so the flag records what is true rather than
    // blocking the write — see the migration header.
    const consentContact = b.consent_contact === true;
    if (leadType === 'individual' && !consentContact) {
      return res.status(400).json({
        error:
          'An individual lead needs their consent to be contacted. Ask on the call and tick the box.',
      });
    }

    const existing = await db.query(
      `SELECT id FROM leads
        WHERE (email_normalised IS NOT NULL AND email_normalised = $1)
           OR (mobile_normalised IS NOT NULL AND mobile_normalised = $2)
        LIMIT 1`,
      [email, mobile]
    );

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await db.query(
        `UPDATE leads SET
           full_name = COALESCE(NULLIF($2,''), full_name),
           email = COALESCE($3, email),
           email_normalised = COALESCE($3, email_normalised),
           mobile = COALESCE($4, mobile),
           mobile_normalised = COALESCE($4, mobile_normalised),
           interested_categories = CASE WHEN cardinality($5::text[]) > 0
                                        THEN $5::text[] ELSE interested_categories END,
           service_areas = CASE WHEN cardinality($6::text[]) > 0
                                THEN $6::text[] ELSE service_areas END,
           consent_contact = consent_contact OR $7,
           consent_at = CASE WHEN consent_contact OR $7 THEN COALESCE(consent_at, NOW()) END,
           notes = COALESCE(NULLIF($8,''), notes),
           updated_at = NOW()
         WHERE id = $1`,
        [
          id, fullName, email, mobile,
          asArray(b.interested_categories), asArray(b.service_areas),
          consentContact, String(b.notes ?? '').trim(),
        ]
      );
      await logEvent(id, 'merged', 'Matched an existing lead on email or mobile', actor);
      const merged = await db.query(`SELECT * FROM leads WHERE id = $1`, [id]);
      return res.status(200).json({ success: true, merged: true, data: merged.rows[0] });
    }

    const result = await db.query(
      `INSERT INTO leads (
         lead_ref, lead_type, full_name, email, email_normalised, mobile, mobile_normalised,
         company_name, uen, contact_person_role, staff_count_estimate,
         interested_categories, service_areas, source, source_detail,
         stage, owner_admin_id, notes, sourced_errand_id,
         consent_contact, consent_marketing, consent_notice_version, consent_at, created_by
       ) VALUES (
         'LD26-' || LPAD(nextval('lead_ref_seq')::text, 5, '0'),
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'new',$15,$16,$17,$18,$19,$20,
         CASE WHEN $18 THEN NOW() END, $15
       ) RETURNING *`,
      [
        leadType, fullName, b.email ? String(b.email).trim() : null, email,
        b.mobile ? String(b.mobile).trim() : null, mobile,
        b.company_name ? String(b.company_name).trim() : null,
        b.uen ? String(b.uen).trim() : null,
        b.contact_person_role ? String(b.contact_person_role).trim() : null,
        Number.isFinite(Number(b.staff_count_estimate)) && b.staff_count_estimate !== ''
          ? Number(b.staff_count_estimate) : null,
        asArray(b.interested_categories), asArray(b.service_areas),
        source, b.source_detail ? String(b.source_detail).trim() : null,
        actor, String(b.notes ?? '').trim() || null,
        Number.isFinite(Number(b.sourced_errand_id)) ? Number(b.sourced_errand_id) : null,
        consentContact, b.consent_marketing === true,
        b.consent_notice_version ? String(b.consent_notice_version) : null,
      ]
    );

    const lead = result.rows[0];
    await logEvent(lead.id, 'created', `Added from ${source}`, actor);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    console.error('[Leads] create failed:', error);
    res.status(500).json({ error: 'Could not save that lead' });
  }
});

// ------------------------------------------------------------------ update

/** PATCH /api/admin/leads/:id — stage, owner, notes, consent. */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid lead id' });

    const current = await db.query(`SELECT * FROM leads WHERE id = $1`, [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    const b = req.body || {};
    const actor = uid(req);
    const sets: string[] = [];
    const params: any[] = [];
    const set = (col: string, value: any) => {
      params.push(value);
      sets.push(`${col} = $${params.length}`);
    };

    if (b.stage !== undefined) {
      if (!STAGES.includes(b.stage)) {
        return res.status(400).json({ error: `Unknown stage: ${b.stage}` });
      }
      if (b.stage === 'disqualified' && !String(b.disqualify_reason ?? '').trim()) {
        return res.status(400).json({ error: 'Say why the lead was disqualified' });
      }
      set('stage', b.stage);
      set('stage_changed_at', new Date());
    }
    if (b.disqualify_reason !== undefined) set('disqualify_reason', String(b.disqualify_reason).trim() || null);
    if (b.notes !== undefined) set('notes', String(b.notes).trim() || null);
    if (b.owner_admin_id !== undefined) {
      set('owner_admin_id', Number.isFinite(Number(b.owner_admin_id)) ? Number(b.owner_admin_id) : null);
    }
    if (b.interested_categories !== undefined) set('interested_categories', asArray(b.interested_categories));
    if (b.service_areas !== undefined) set('service_areas', asArray(b.service_areas));
    if (b.consent_marketing !== undefined) set('consent_marketing', b.consent_marketing === true);
    if (b.consent_contact === true) {
      set('consent_contact', true);
      if (!current.rows[0].consent_at) set('consent_at', new Date());
    }

    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    sets.push('updated_at = NOW()');
    params.push(id);
    const result = await db.query(
      `UPDATE leads SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (b.stage !== undefined && b.stage !== current.rows[0].stage) {
      await logEvent(
        id,
        'stage_change',
        `${current.rows[0].stage} → ${b.stage}${b.disqualify_reason ? `: ${b.disqualify_reason}` : ''}`,
        actor
      );
    }
    if (b.note_entry && String(b.note_entry).trim()) {
      await logEvent(id, 'note', String(b.note_entry).trim(), actor);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Leads] update failed:', error);
    res.status(500).json({ error: 'Could not update that lead' });
  }
});

/** POST /api/admin/leads/:id/note — a call outcome, without changing stage. */
router.post('/:id/note', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const note = String(req.body?.note ?? '').trim();
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid lead id' });
    if (!note) return res.status(400).json({ error: 'The note is empty' });

    const exists = await db.query(`SELECT id FROM leads WHERE id = $1`, [id]);
    if (exists.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    await logEvent(id, 'note', note, uid(req));
    await db.query(`UPDATE leads SET updated_at = NOW() WHERE id = $1`, [id]);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('[Leads] note failed:', error);
    res.status(500).json({ error: 'Could not save that note' });
  }
});

/**
 * DELETE /api/admin/leads/:id — a real delete.
 *
 * Not an is_deleted flag: PDPC 18.11 is explicit that data merely archived or
 * access-limited is still being retained, so a hidden row holding a name and a
 * mobile number does not discharge s25. lead_events cascades with it.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid lead id' });

    const result = await db.query(`DELETE FROM leads WHERE id = $1 RETURNING lead_ref`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    console.log('[Leads] deleted', result.rows[0].lead_ref, 'by admin', uid(req));
    res.json({ success: true });
  } catch (error) {
    console.error('[Leads] delete failed:', error);
    res.status(500).json({ error: 'Could not delete that lead' });
  }
});

export default router;
