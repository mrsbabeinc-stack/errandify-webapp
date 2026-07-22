import express, { Request, Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Recruitment intake and review.
 *
 * Both halves of this feature existed only as UI. The application form
 * assembled its payload and dropped it, showing "Application submitted
 * successfully!" regardless; the admin dashboard rendered a hardcoded John Doe
 * and its approve button changed nothing but local state. Neither called a
 * server — the fetches were commented out on both sides.
 *
 * job_applications and job_openings were already in the database, and
 * migration 029 added the missing id generation and the three jsonb columns
 * the form collects, so this wires the two ends to the schema that was waiting.
 */

const isAdmin: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

/** Statuses the dashboard knows how to render. Anything else is rejected. */
const STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'offered',
  'rejected',
  'accepted',
] as const;

/**
 * POST /api/recruitment/applications — submit an application.
 *
 * Deliberately unauthenticated: applicants are members of the public and do
 * not have Errandify accounts. That makes this an open write endpoint, so it
 * validates hard and stores only known fields.
 */
router.post('/applications', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const required = ['job_id', 'first_name', 'last_name', 'email'];
    const missing = required.filter((f) => !String(b[f] || '').trim());
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) {
      return res.status(400).json({ error: 'That email address does not look right' });
    }

    // The declarations are the applicant's consent to us holding this data.
    // Without them there is nothing authorising the row, so refuse the write
    // rather than storing it and sorting consent out later.
    const agreements = b.agreements || {};
    if (!agreements.agree_to_terms || !agreements.agree_to_privacy) {
      return res.status(400).json({ error: 'The terms and privacy declarations must be accepted' });
    }

    const job = await db.query('SELECT job_id, status FROM job_openings WHERE job_id = $1', [b.job_id]);
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'That role is no longer open' });
    }
    if (job.rows[0].status && job.rows[0].status !== 'open') {
      return res.status(409).json({ error: 'That role has closed for applications' });
    }

    // One live application per person per role. A resubmission should not
    // create a second row an admin has to reconcile.
    const dupe = await db.query(
      `SELECT application_id FROM job_applications
        WHERE job_id = $1 AND LOWER(email) = LOWER($2) AND status NOT IN ('rejected')`,
      [b.job_id, b.email]
    );
    if (dupe.rows.length > 0) {
      return res.status(409).json({
        error: 'You have already applied for this role',
        application_id: dupe.rows[0].application_id,
      });
    }

    const num = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v) || 0);
    const date = (v: any) => (v ? v : null);

    const result = await db.query(
      `INSERT INTO job_applications (
         job_id, first_name, last_name, email, phone, nric, date_of_birth,
         nationality, home_address, city, postal_code, country, residential_status,
         emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
         position_applied, expected_salary, notice_period_days, available_start_date,
         years_of_experience, key_skills, highest_qualification, field_of_study,
         health_declaration, agreements,
         employment_history, education_records, referee_contacts,
         status, submitted_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
         $21,$22,$23,$24,$25,$26,$27,$28,$29,'submitted',NOW()
       )
       RETURNING id, application_id, status, submitted_at`,
      [
        b.job_id, b.first_name, b.last_name, b.email, b.phone || null, b.nric || null,
        date(b.date_of_birth), b.nationality || null, b.home_address || null, b.city || null,
        b.postal_code || null, b.country || null, b.residential_status || null,
        b.emergency_contact_name || null, b.emergency_contact_relationship || null,
        b.emergency_contact_phone || null, b.position_applied || null,
        num(b.expected_salary), num(b.notice_period_days), date(b.available_start_date),
        num(b.years_of_experience), b.key_skills || null, b.highest_qualification || null,
        b.field_of_study || null,
        JSON.stringify(b.health_declaration || {}), JSON.stringify(agreements),
        JSON.stringify(b.employment_history || []), JSON.stringify(b.education_records || []),
        JSON.stringify(b.referee_contacts || []),
      ]
    );

    console.log('[Recruitment] Application', result.rows[0].application_id, 'received for', b.job_id);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Recruitment] Submit failed:', error);
    res.status(500).json({ error: 'We could not submit your application. Please try again.' });
  }
});

/**
 * GET /api/recruitment/applications — the review queue.
 * Returns the summary fields the dashboard lists; the full record, which holds
 * NRIC and health declarations, is only served per-application below.
 */
router.get('/applications', isAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const params: any[] = [];
    let where = '';
    if (status && STATUSES.includes(status as any)) {
      params.push(status);
      where = 'WHERE status = $1';
    }

    const result = await db.query(
      `SELECT id, application_id, job_id, first_name, last_name, email,
              position_applied, years_of_experience, status, ai_match_score,
              submitted_at, interview_stage, reviewed_by
         FROM job_applications
         ${where}
        ORDER BY submitted_at DESC
        LIMIT 200`,
      params
    );

    res.json({
      success: true,
      applications: result.rows.map((r: any) => ({
        ...r,
        years_of_experience: Number(r.years_of_experience) || 0,
        ai_match_score: r.ai_match_score === null ? null : Number(r.ai_match_score),
      })),
    });
  } catch (error) {
    console.error('[Recruitment] List failed:', error);
    res.status(500).json({ error: 'Could not load applications' });
  }
});

/** GET /api/recruitment/applications/:id — the full record. */
router.get('/applications/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid application id' });

    const result = await db.query('SELECT * FROM job_applications WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Recruitment] Fetch failed:', error);
    res.status(500).json({ error: 'Could not load that application' });
  }
});

/**
 * POST /api/recruitment/applications/:id/:action — move an application along.
 *
 * The dashboard sends approve/reject/shortlist/schedule_interview/offer, which
 * map onto the stored statuses. A rejection reason is recorded when given so
 * the decision can be explained later.
 */
const ACTIONS: Record<string, string> = {
  approve: 'accepted',
  reject: 'rejected',
  shortlist: 'shortlisted',
  schedule_interview: 'interview_scheduled',
  offer: 'offered',
  review: 'under_review',
};

router.post('/applications/:id/:action', isAdmin, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid application id' });

    const next = ACTIONS[req.params.action];
    if (!next) return res.status(400).json({ error: 'Unknown action' });

    const result = await db.query(
      // The casts are load-bearing: $1 is both assigned to status and compared
      // against a literal, and without them Postgres reports "inconsistent
      // types deduced for parameter $1" and the update never runs. $3 needs one
      // for the same reason — COALESCE cannot type a bare NULL parameter.
      `UPDATE job_applications
          SET status = $1::varchar,
              rejection_reason = CASE WHEN $1::varchar = 'rejected' THEN $2::text ELSE rejection_reason END,
              interview_stage = COALESCE($3::varchar, interview_stage),
              reviewed_at = NOW(),
              reviewed_by = $4,
              updated_at = NOW()
        WHERE id = $5
        RETURNING id, application_id, status, reviewed_at`,
      [next, req.body?.reason || null, req.body?.interview_stage || null, String(req.userId || ''), id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    console.log('[Recruitment]', result.rows[0].application_id, '->', next);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Recruitment] Action failed:', error);
    res.status(500).json({ error: 'Could not update that application' });
  }
});

export default router;
