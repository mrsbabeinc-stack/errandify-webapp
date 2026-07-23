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

    // Constrained at the DB too; validated here so a bad value returns a clear
    // 400 rather than a 500 from the check constraint.
    const workAuthorisation = b.work_authorisation || null;
    if (workAuthorisation && !['authorised', 'requires_sponsorship'].includes(workAuthorisation)) {
      return res.status(400).json({
        error: "work_authorisation must be 'authorised' or 'requires_sponsorship'",
      });
    }
    const canPerformDuties =
      typeof b.can_perform_duties === 'boolean' ? b.can_perform_duties : null;

    /**
     * Only what can actually bear on the hiring decision is stored.
     *
     * This endpoint previously accepted and wrote NRIC, date of birth,
     * nationality, residential status, home address, emergency contacts and a
     * disability/medical declaration — from anyone who applied, before anyone
     * had decided anything. Each of those is a separate problem:
     *
     *  - NRIC. PDPC's Advisory Guidelines on the PDPA for NRIC and other
     *    National Identification Numbers (in force 1 Sep 2019) bar collecting
     *    an NRIC number unless required by law or needed to verify identity to
     *    a high degree of fidelity. A job application is neither. It becomes
     *    lawful once someone is hired, because CPF and IRAS then require it —
     *    which is why `staff.nric` exists and this column should not.
     *
     *  - Disability and medical condition. Sensitive data collected before an
     *    offer, when it cannot lawfully affect the outcome; asking it at all at
     *    this stage is the evidence a discrimination complaint would rest on.
     *    TAFEP's fair-employment guidelines expect medical questions to be
     *    job-relevant and post-offer.
     *
     *  - Nationality. A protected characteristic under the Fair Consideration
     *    Framework, and not the question actually being asked.
     *
     *  - Emergency contacts. Onboarding details, and a third party who has
     *    not consented to anything.
     *
     * Date of birth and address ARE collected — no rule bars them, address
     * supports commute matching, and some roles carry statutory age limits.
     * Nationality is replaced by `work_authorisation`, which answers the
     * question actually needed (can they work here, do they need sponsoring)
     * without recording a protected characteristic. The health declaration is
     * replaced by `can_perform_duties` — whether someone can do the job, with
     * or without adjustment, is job-relevant; their medical history is not.
     *
     * NRIC and emergency contacts are collected at hire, by
     * POST /api/admin/job-applications/:id/hire below.
     *
     * Fields sent by an older client are ignored rather than rejected, so a
     * stale form degrades to a lawful application instead of a hard failure.
     */
    const result = await db.query(
      `INSERT INTO job_applications (
         job_id, first_name, last_name, email, phone,
         date_of_birth, home_address, city, postal_code, country,
         work_authorisation, can_perform_duties, adjustments_needed,
         position_applied, expected_salary, notice_period_days, available_start_date,
         years_of_experience, key_skills, highest_qualification, field_of_study,
         agreements, employment_history, education_records, referee_contacts,
         status, submitted_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
         $21,$22,$23,$24,$25,'submitted',NOW()
       )
       RETURNING id, application_id, status, submitted_at`,
      [
        b.job_id, b.first_name, b.last_name, b.email, b.phone || null,
        date(b.date_of_birth), b.home_address || null, b.city || null,
        b.postal_code || null, b.country || null,
        workAuthorisation, canPerformDuties, b.adjustments_needed || null,
        b.position_applied || null,
        num(b.expected_salary), num(b.notice_period_days), date(b.available_start_date),
        num(b.years_of_experience), b.key_skills || null, b.highest_qualification || null,
        b.field_of_study || null,
        JSON.stringify(agreements),
        JSON.stringify(b.employment_history || []), JSON.stringify(b.education_records || []),
        JSON.stringify(b.referee_contacts || []),
      ]
    );

    // Loud, because a client still sending these means a form somewhere is
    // still asking for them — and the data reached our logs even if not our
    // table. Field names only; never the values.
    const refused = ['nric', 'nationality', 'residential_status',
                     'emergency_contact_name', 'emergency_contact_phone',
                     'health_declaration']
      .filter((f) => b[f] !== undefined && b[f] !== null && b[f] !== '' &&
                     !(typeof b[f] === 'object' && Object.keys(b[f]).length === 0));
    if (refused.length) {
      console.warn(
        `[Recruitment] Ignored fields not collected at application stage: ${refused.join(', ')} ` +
        `— a client is still sending them. See docs/DATA_RETENTION.md.`
      );
    }

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

/**
 * NOTE ON ORDER: the hire route must stay ABOVE the '/:action' route below.
 * Express matches in definition order, and '/applications/:id/:action' happily
 * matches '/applications/13/hire' — which answered "Unknown action" until this
 * was moved up.
 */
/**
 * Hires an applicant: turns the application into a staff record.
 *
 * This is the missing step that made the application form over-collect. There
 * was no way to get from "accepted applicant" to "employee", so the form asked
 * for everything the staff record would eventually need — NRIC, residential
 * status, emergency contact — from everyone who applied, months before anyone
 * was hired. Collecting them here instead is the whole point: at this moment
 * the person IS an employee, so CPF and IRAS make the NRIC lawful and
 * necessary, and the emergency contact has an employment relationship to sit
 * in.
 *
 * The application keeps only what it already held; the onboarding details are
 * supplied by the admin now and written straight to `staff`.
 */
router.post('/applications/:id/hire', isAdmin, async (req: any, res: Response) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const {
      nric, residential_status, department, position, hire_date,
      employment_type, base_salary, cpf_membership_no,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      fitness_status, fitness_assessed_on, fitness_restrictions, workplace_adjustments,
    } = req.body;

    if (!nric || !String(nric).trim()) {
      return res.status(400).json({
        error: 'NRIC/FIN is required to create the employee record (CPF and IRAS need it)',
      });
    }
    if (!hire_date) {
      return res.status(400).json({ error: 'Hire date is required' });
    }
    if (fitness_status &&
        !['pending', 'fit', 'fit_with_adjustments', 'not_yet_cleared'].includes(fitness_status)) {
      return res.status(400).json({ error: 'Invalid fitness status' });
    }

    await client.query('BEGIN');

    const app = await client.query(
      `SELECT id, application_id, first_name, last_name, email, phone,
              home_address, city, postal_code, country, status,
              adjustments_needed
         FROM job_applications WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (app.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }

    const a = app.rows[0];

    if (a.status === 'hired') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This applicant has already been hired' });
    }

    const existing = await client.query(
      'SELECT staff_id FROM staff WHERE LOWER(email) = LOWER($1)',
      [a.email]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `A staff record already exists for that email (${existing.rows[0].staff_id})`,
      });
    }

    // Same id scheme the staff route uses.
    const countResult = await client.query('SELECT COUNT(*) AS count FROM staff');
    const staffId = `S${String(Number(countResult.rows[0].count) + 1).padStart(3, '0')}`;

    const staff = await client.query(
      `INSERT INTO staff (
         staff_id, first_name, last_name, email, phone, nric,
         home_address, city, postal_code, country, residential_status,
         emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
         department, position, hire_date, employment_type, base_salary,
         cpf_membership_no, annual_leave_entitlement, sick_leave_entitlement,
         fitness_status, fitness_assessed_on, fitness_restrictions, workplace_adjustments,
         status, created_at, last_modified
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
         12, 4, $21, $22, $23, $24, 'active', NOW(), NOW()
       )
       RETURNING id, staff_id, first_name, last_name`,
      [
        staffId, a.first_name, a.last_name, a.email, a.phone, String(nric).trim(),
        a.home_address, a.city, a.postal_code, a.country, residential_status || null,
        emergency_contact_name || null, emergency_contact_relationship || null,
        emergency_contact_phone || null,
        department || null, position || null, hire_date, employment_type || 'Permanent',
        base_salary ?? null, cpf_membership_no || null,
        fitness_status || 'pending', fitness_assessed_on || null,
        fitness_restrictions || null,
        // Any adjustment the applicant asked for carries over, so a request
        // made at application is not lost the moment they are hired.
        workplace_adjustments || a.adjustments_needed || null,
      ]
    );

    await client.query(
      `UPDATE job_applications
          SET status = 'hired', reviewed_at = NOW(), reviewed_by = $1, updated_at = NOW()
        WHERE id = $2`,
      [req.user?.email || 'admin', id]
    );

    await client.query('COMMIT');

    console.log(`[Recruitment] ${a.application_id} hired as ${staff.rows[0].staff_id}`);
    res.status(201).json({ success: true, data: staff.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[Recruitment] Hire failed:', error);
    if (error?.constraint === 'staff_fitness_status_valid') {
      return res.status(400).json({ error: 'Invalid fitness status' });
    }
    // staff.nric is UNIQUE, which is right — one NRIC, one employee. Say so
    // plainly instead of returning a 500 that looks like our fault: the likely
    // causes are a typo or the person already being on the payroll.
    if (error?.constraint === 'staff_nric_key') {
      return res.status(409).json({
        error: 'That NRIC/FIN already belongs to an existing employee. Check for a typo, or whether this person is already on the staff list.',
      });
    }
    res.status(500).json({ error: 'Failed to create the employee record' });
  } finally {
    client.release();
  }
});

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
