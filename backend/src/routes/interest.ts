import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { peekInvite } from '../services/leadInviteService.js';

const router = express.Router();

/**
 * Public interest capture — the pre-launch form on the landing page.
 *
 * Deliberately unauthenticated: the people filling this in do not have
 * Errandify accounts, which is the entire point. That makes it an open write
 * endpoint, so it validates hard, stores only known fields, and is rate
 * limited well below the global /api limiter. Same posture as
 * routes/recruitment.ts, which takes applications from the public.
 *
 * ── What it asks, and why so little ──────────────────────────────────────
 * The pre-launch Google Form collected name, email, phone and company across
 * 52 rows, and not one of them can be acted on: it never asked what anyone can
 * do or where they are. So this form asks four things that matter — do you
 * want to earn or to get help, what work can you do, which area, and may we
 * contact you — and deliberately does not ask for an address, NRIC, date of
 * birth or a full postal code. A prospect who has not signed up owes you no
 * identity documents, and under PDPA s25 every extra field is something you
 * must later justify keeping. SingPass collects the rest at actual signup.
 *
 * ── Account enumeration ──────────────────────────────────────────────────
 * When the email or mobile already belongs to a user, the response is the same
 * generic success as any other submission. Replying "you already have an
 * account" would turn a public form into an oracle for testing whether a given
 * mobile number is registered on a platform keyed to NRIC.
 *
 * I am not a lawyer. Relies on PDPA s13–15 (consent) and s25 (retention);
 * confirm before a live send.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** The notice text version stored against each consent, so it is auditable. */
const CONSENT_NOTICE_VERSION = '2026-07-v1';

/**
 * Tight, and per-IP. The global apiLimiter is sized for a logged-in app
 * browsing errands; an interest form has no reason to be hit ten times a
 * minute from one address, and this is a write that creates rows.
 */
const interestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this connection. Please try again later.' },
});

// ------------------------------------------------------------------ options

let cachedAreas: string[] | null = null;

/** Planning areas, read from the same file the address resolver uses. */
function planningAreas(): string[] {
  if (cachedAreas) return cachedAreas;
  try {
    const file = path.resolve(__dirname, '../data/ura-planning-areas-official.json');
    const geo = JSON.parse(fs.readFileSync(file, 'utf8'));
    cachedAreas = (geo.features ?? [])
      .map((f: any) => f?.properties?.name)
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b));
  } catch (e) {
    console.error('[Interest] Could not read planning areas:', e);
    cachedAreas = [];
  }
  return cachedAreas!;
}

/**
 * GET /api/interest/options — categories and areas for the form.
 *
 * Served rather than hardcoded in the bundle so the form cannot drift from the
 * categories the app actually runs on. A lead tagged with a category that no
 * longer exists never matches the supply gap it was captured for.
 */
router.get('/options', async (_req: Request, res: Response) => {
  try {
    const cats = await db.query(
      `SELECT slug, name FROM category_codes ORDER BY name`
    );
    res.json({
      success: true,
      data: {
        categories: cats.rows,
        areas: planningAreas(),
        consentVersion: CONSENT_NOTICE_VERSION,
      },
    });
  } catch (error) {
    console.error('[Interest] options failed:', error);
    res.status(500).json({ error: 'Could not load the form options' });
  }
});

/**
 * GET /api/interest/invite/:token — what the signup form should prefill.
 *
 * Public, because the person holding it has no account — the token in the URL
 * is the only credential, same as /screening/:token. Read-only: opening the
 * link does not consume the invite, since people open a link, close the tab,
 * and come back later.
 *
 * A bad token gets the same 404 whether it expired, was already used, or never
 * existed. Saying which would tell a stranger that a given token once did.
 */
router.get('/invite/:token', interestLimiter, async (req: Request, res: Response) => {
  try {
    const prefill = await peekInvite(req.params.token);
    if (!prefill) {
      return res.status(404).json({ error: 'That invite link is no longer valid' });
    }
    res.json({ success: true, data: prefill });
  } catch (error) {
    console.error('[Interest] invite lookup failed:', error);
    res.status(500).json({ error: 'Could not check that invite' });
  }
});

// ------------------------------------------------------------------ capture

const INTERESTS = ['earn', 'get_help', 'both'] as const;

const normEmail = (v: unknown): string | null => {
  const s = String(v ?? '').trim().toLowerCase();
  return s || null;
};

/** Singapore mobiles reduced to eight digits so formats collide, not multiply. */
const normMobile = (v: unknown): string | null => {
  const d = String(v ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 10 && d.startsWith('65')) return d.slice(2);
  return d;
};

const clean = (v: unknown, max = 200): string | null => {
  const s = String(v ?? '').trim().slice(0, max);
  return s || null;
};

/** The generic answer. Identical whether the person is new, a duplicate, or already a user. */
const ACCEPTED = {
  success: true,
  message: "Thanks — you're on the list. We'll be in touch when we launch in your area.",
};

router.post('/', interestLimiter, async (req: Request, res: Response) => {
  try {
    const b = req.body || {};

    // Honeypot. A field hidden from humans; anything that fills it is a bot.
    // Answered with the normal success so the bot has nothing to learn.
    if (String(b.website ?? '').trim()) {
      console.log('[Interest] Honeypot triggered, discarded');
      return res.status(201).json(ACCEPTED);
    }

    const fullName = clean(b.full_name, 160);
    if (!fullName) return res.status(400).json({ error: 'Please tell us your name' });

    const email = normEmail(b.email);
    const mobile = normMobile(b.mobile);
    if (!email && !mobile) {
      return res.status(400).json({ error: 'Please leave a mobile number or an email address' });
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'That email address does not look right' });
    }
    // Singapore mobiles are 8 digits starting 8 or 9. Checked because a
    // mistyped number is a lead you can never reach and never know is dead.
    if (mobile && !/^[89]\d{7}$/.test(mobile)) {
      return res.status(400).json({ error: 'That mobile number does not look like a Singapore number' });
    }

    // Consent is the thing that authorises the row existing at all, so it is
    // checked before anything is written rather than stored and sorted out
    // later. Same rule as recruitment.ts.
    if (b.consent_contact !== true) {
      return res.status(400).json({
        error: 'Please tick the box to say we may contact you',
      });
    }

    const leadType = b.lead_type === 'company' ? 'company' : 'individual';
    const interest = INTERESTS.includes(b.interest) ? b.interest : 'earn';

    // Categories are validated against the real slugs. Anything unrecognised is
    // dropped rather than stored, so a tampered payload cannot seed junk that
    // later shows up in the admin worklist.
    const known = new Set(
      (await db.query(`SELECT slug FROM category_codes`)).rows.map((r: any) => r.slug)
    );
    const categories = Array.isArray(b.interested_categories)
      ? [...new Set(b.interested_categories.map(String).filter((c: string) => known.has(c)))].slice(0, 16)
      : [];

    const validAreas = new Set(planningAreas());
    const areas = Array.isArray(b.service_areas)
      ? [...new Set(b.service_areas.map(String).filter((a: string) => validAreas.has(a)))].slice(0, 5)
      : [];

    // Where the link was shared. One code per poster, QR or chat group, so you
    // can tell after a month which three actually produced anything.
    const sourceDetail = clean(b.src, 80);

    const existing = await db.query(
      `SELECT id FROM leads
        WHERE (email_normalised IS NOT NULL AND email_normalised = $1)
           OR (mobile_normalised IS NOT NULL AND mobile_normalised = $2)
        LIMIT 1`,
      [email, mobile]
    );

    if (existing.rows.length > 0) {
      // Resubmission — update rather than stack a second row for an admin to
      // reconcile. Consent can only ever be turned on here, never off, because
      // withdrawal has its own path.
      const id = existing.rows[0].id;
      await db.query(
        `UPDATE leads SET
           full_name = COALESCE($2, full_name),
           email = COALESCE($3, email),
           email_normalised = COALESCE($4, email_normalised),
           mobile = COALESCE($5, mobile),
           mobile_normalised = COALESCE($6, mobile_normalised),
           interest = $7,
           interested_categories = CASE WHEN cardinality($8::text[]) > 0
                                        THEN $8::text[] ELSE interested_categories END,
           service_areas = CASE WHEN cardinality($9::text[]) > 0
                                THEN $9::text[] ELSE service_areas END,
           skills_text = COALESCE($10, skills_text),
           consent_contact = TRUE,
           consent_at = COALESCE(consent_at, NOW()),
           consent_marketing = consent_marketing OR $11,
           consent_notice_version = $12,
           updated_at = NOW()
         WHERE id = $1`,
        [
          id, fullName, clean(b.email), email, clean(b.mobile, 30), mobile,
          interest, categories, areas, clean(b.skills_text, 500),
          b.consent_marketing === true, CONSENT_NOTICE_VERSION,
        ]
      );
      await db.query(
        `INSERT INTO lead_events (lead_id, kind, note) VALUES ($1,'resubmitted',$2)`,
        [id, `Interest form again${sourceDetail ? ` via ${sourceDetail}` : ''}`]
      );
      return res.status(201).json(ACCEPTED);
    }

    // Already has an account. Recorded in the log for the funnel, but no lead
    // row is created and the caller is told nothing that distinguishes this
    // case — see the enumeration note at the top.
    const asUser = await db.query(
      `SELECT id FROM users
        WHERE (email IS NOT NULL AND LOWER(email) = $1)
           OR (mobile IS NOT NULL AND regexp_replace(mobile,'\\D','','g') LIKE '%' || $2)
        LIMIT 1`,
      [email, mobile ?? ' ']
    );
    if (asUser.rows.length > 0) {
      console.log('[Interest] Submission from an existing account, no lead created');
      return res.status(201).json(ACCEPTED);
    }

    const inserted = await db.query(
      `INSERT INTO leads (
         lead_ref, lead_type, full_name, email, email_normalised, mobile, mobile_normalised,
         company_name, uen, contact_person_role, staff_count_estimate,
         interest, interested_categories, service_areas, skills_text,
         source, source_detail, consent_contact, consent_marketing,
         consent_notice_version, consent_at
       ) VALUES (
         'LD26-' || LPAD(nextval('lead_ref_seq')::text, 5, '0'),
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'landing',$15,TRUE,$16,$17,NOW()
       ) RETURNING id, lead_ref`,
      [
        leadType, fullName, clean(b.email), email, clean(b.mobile, 30), mobile,
        leadType === 'company' ? clean(b.company_name) : null,
        leadType === 'company' ? clean(b.uen, 20) : null,
        leadType === 'company' ? clean(b.contact_person_role, 80) : null,
        leadType === 'company' && Number.isFinite(Number(b.staff_count_estimate)) && b.staff_count_estimate !== ''
          ? Math.max(0, Math.min(9999, Number(b.staff_count_estimate)))
          : null,
        interest, categories, areas, clean(b.skills_text, 500),
        sourceDetail, b.consent_marketing === true, CONSENT_NOTICE_VERSION,
      ]
    );

    await db.query(
      `INSERT INTO lead_events (lead_id, kind, note) VALUES ($1,'created',$2)`,
      [inserted.rows[0].id, `Interest form${sourceDetail ? ` via ${sourceDetail}` : ''}`]
    );
    console.log('[Interest] New lead', inserted.rows[0].lead_ref, leadType, interest);

    res.status(201).json(ACCEPTED);
  } catch (error) {
    console.error('[Interest] capture failed:', error);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }
});

export default router;
