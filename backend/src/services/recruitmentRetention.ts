import db from '../db.js';

/**
 * Retention for recruitment data — job applicants and screening candidates.
 *
 * These people are NOT users. They have no account, so services/accountDeletion
 * and services/retentionPurge cannot reach them: that purge is clocked off
 * `users.anonymised_at`, and an applicant has no `users` row to anonymise. They
 * were therefore outside the retention schedule entirely, while
 * `job_applications` holds some of the most sensitive data in the product —
 * NRIC, date of birth, nationality, home address, health declaration,
 * employment history and referee contacts.
 *
 * PDPA s25 requires retention to cease once the purpose is served and there is
 * no remaining legal or business need. For an unsuccessful applicant the
 * purpose — deciding on that vacancy — is served when the decision is made.
 *
 * ANONYMISE, DO NOT SOFT-DELETE. PDPC 18.11 is explicit that data merely
 * hidden or access-limited is still retained; a status flag over a row that
 * still holds an NRIC discharges nothing. Identity columns are overwritten,
 * and free text is removed outright because prose cannot be reliably
 * de-identified — a "difficult delivery" answer can name the writer's employer,
 * estate or medical situation.
 *
 * Deliberately mirrors services/retentionPurge.ts:
 *  - DRY RUN BY DEFAULT. Runs unattended and is irreversible, so it reports
 *    what it would change and does nothing unless RETENTION_PURGE_ENABLED=true.
 *  - Refuses to run on a misconfigured period rather than reading it as
 *    "retain nothing".
 *  - Never touches a record that is still live: only decided applications and
 *    finished screenings are in scope.
 */

/**
 * Twelve months from the hiring decision.
 *
 * No contract is formed with an unsuccessful applicant, so the Limitation Act
 * six-year contract window that governs errands and payments does not apply
 * here. What remains is the business need to recognise a re-applicant and to
 * answer a fair-employment complaint, which TAFEP expects an employer to be
 * able to do for a reasonable period after the decision.
 *
 * Singapore sets no statutory retention period for unsuccessful applicants, so
 * this is a judgement, not a rule I can cite. It is deliberately much shorter
 * than the 7-year commercial period because the justification is weaker.
 * ⚠️ Confirm with a practitioner before relying on it — see the open questions
 * in docs/DATA_RETENTION.md. I am not a lawyer.
 */
const APPLICANT_RETENTION_MONTHS = Number(process.env.APPLICANT_RETENTION_MONTHS || 12);

const PURGE_ENABLED = process.env.RETENTION_PURGE_ENABLED === 'true';

export interface RecruitmentRetentionReport {
  dryRun: boolean;
  cutoff: string;
  applicationsEligible: number;
  applicationsAnonymised: number;
  invitesEligible: number;
  invitesAnonymised: number;
  answersRemoved: number;
}

function guardRetentionMonths(): void {
  if (
    !Number.isFinite(APPLICANT_RETENTION_MONTHS) ||
    APPLICANT_RETENTION_MONTHS < 1 ||
    APPLICANT_RETENTION_MONTHS > 120
  ) {
    throw new Error(
      `APPLICANT_RETENTION_MONTHS is ${process.env.APPLICANT_RETENTION_MONTHS} — refusing to run. ` +
      `Expected 1-120. See docs/DATA_RETENTION.md.`
    );
  }
}

async function computeCutoff(): Promise<string> {
  // to_char rather than ::date: a DATE returns from pg as a JS Date at local
  // midnight and shifts a day either side of UTC. This is evidence the policy
  // ran, so it must be unambiguous.
  const r = await db.query(
    `SELECT to_char(NOW() - ($1 || ' months')::interval, 'YYYY-MM-DD') AS cutoff`,
    [APPLICANT_RETENTION_MONTHS]
  );
  return r.rows[0].cutoff;
}

/**
 * A hired applicant is not covered here. Their record stops being a recruitment
 * record and becomes an employment one, which the schedule already keeps for
 * two years after leaving — anonymising it on the recruitment clock would
 * destroy an employment record still needed under the Employment Act.
 */
const DECIDED_AND_NOT_HIRED = `status IN ('rejected', 'withdrawn', 'declined')`;

/**
 * Marks a row as already anonymised.
 *
 * `job_applications.email` is NOT NULL, so it cannot simply be cleared — the
 * first run against real data failed on that constraint and rolled back. It is
 * overwritten with a per-row address on the RFC 2606 `.invalid` TLD, which is
 * reserved and can never route to a real mailbox. That placeholder then
 * doubles as the "done" marker, since `email IS NOT NULL` can never be false
 * on this table and would have made every run re-process the same rows.
 */
const NOT_YET_ANONYMISED = `email NOT LIKE 'redacted+%@invalid'`;

/** Same reasoning for candidate_invites.candidate_email, also NOT NULL. */
const INVITE_NOT_YET_ANONYMISED = `candidate_email NOT LIKE 'redacted+%@invalid'`;

export async function runRecruitmentRetention(): Promise<RecruitmentRetentionReport> {
  guardRetentionMonths();
  const cutoff = await computeCutoff();
  const dryRun = !PURGE_ENABLED;

  // Already-anonymised rows are excluded so repeat runs report honestly rather
  // than re-counting the same people every day.
  const appEligible = await db.query(
    `SELECT COUNT(*) AS count FROM job_applications
      WHERE ${DECIDED_AND_NOT_HIRED}
        AND COALESCE(reviewed_at, submitted_at, created_at) < $1::date
        AND ${NOT_YET_ANONYMISED}`,
    [cutoff]
  );

  const inviteEligible = await db.query(
    `SELECT COUNT(*) AS count FROM candidate_invites
      WHERE (completed_at IS NOT NULL OR expires_at < NOW())
        AND COALESCE(completed_at, expires_at) < $1::date
        AND ${INVITE_NOT_YET_ANONYMISED}`,
    [cutoff]
  );

  const report: RecruitmentRetentionReport = {
    dryRun,
    cutoff,
    applicationsEligible: Number(appEligible.rows[0].count) || 0,
    applicationsAnonymised: 0,
    invitesEligible: Number(inviteEligible.rows[0].count) || 0,
    invitesAnonymised: 0,
    answersRemoved: 0,
  };

  if (dryRun) {
    console.log(
      `[RecruitmentRetention] DRY RUN — cutoff ${cutoff}: ` +
      `${report.applicationsEligible} application(s), ${report.invitesEligible} screening(s) ` +
      `would be anonymised. Set RETENTION_PURGE_ENABLED=true to apply.`
    );
    return report;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    /**
     * Every column that identifies or describes the person goes. The outcome
     * columns (status, scores, timestamps) stay: they carry no identity and are
     * what makes the hiring process auditable for bias.
     */
    const apps = await client.query(
      /**
       * NRIC, date of birth, nationality, address, residential status,
       * emergency contacts and the health declaration are absent from this
       * list because migration 069 dropped those columns — an application no
       * longer collects them at all, so there is nothing left to strip.
       *
       * What remains still needs stripping. `referee_contacts` in particular
       * is third-party personal data: referees never applied for anything, and
       * keeping their names and numbers past the vacancy serves no purpose.
       */
      /**
       * date_of_birth and the address fields are stripped here because
       * migration 070 restored them to the application after 069 had removed
       * them. They were briefly absent from this list, which would have left a
       * date of birth and home address on every rejected applicant forever —
       * the exact failure this service exists to prevent.
       *
       * adjustments_needed goes too: it is free text, and "I use a wheelchair"
       * identifies a person as surely as a name does.
       *
       * work_authorisation and can_perform_duties are deliberately KEPT. They
       * are categorical, identify nobody once the name is gone, and are what
       * makes it possible to audit later whether the process treated
       * sponsorship-needing or adjustment-needing applicants differently.
       */
      `UPDATE job_applications SET
         first_name = 'Redacted', last_name = 'Applicant',
         email = 'redacted+' || id || '@invalid',
         phone = NULL,
         date_of_birth = NULL, home_address = NULL, city = NULL,
         postal_code = NULL, country = NULL, adjustments_needed = NULL,
         employment_history = NULL, education_records = NULL,
         referee_contacts = NULL,
         cv_filename = NULL, cv_url = NULL, cv_extracted_skills = NULL,
         cv_extracted_education = NULL, cover_letter_url = NULL,
         certificates_url = NULL, notes = NULL,
         updated_at = NOW()
       WHERE ${DECIDED_AND_NOT_HIRED}
         AND COALESCE(reviewed_at, submitted_at, created_at) < $1::date
         AND ${NOT_YET_ANONYMISED}
       RETURNING id`,
      [cutoff]
    );
    report.applicationsAnonymised = apps.rowCount || 0;

    // Free text is deleted, not blanked: prose cannot be de-identified.
    const answers = await client.query(
      `DELETE FROM candidate_answers
        WHERE invite_id IN (
          SELECT id FROM candidate_invites
           WHERE (completed_at IS NOT NULL OR expires_at < NOW())
             AND COALESCE(completed_at, expires_at) < $1::date
        )
        RETURNING id`,
      [cutoff]
    );
    report.answersRemoved = answers.rowCount || 0;

    /**
     * The token is overwritten rather than left in place: it is a live
     * credential to the screening, and leaving a working one on a record we
     * have finished with keeps an access path open for no purpose. Scores are
     * kept — they are about the answers, not the person.
     */
    const invites = await client.query(
      `UPDATE candidate_invites SET
         candidate_name = 'Redacted Candidate',
         candidate_email = 'redacted+' || id || '@invalid',
         token = 'purged-' || id,
         status = 'expired'
       WHERE (completed_at IS NOT NULL OR expires_at < NOW())
         AND COALESCE(completed_at, expires_at) < $1::date
         AND ${INVITE_NOT_YET_ANONYMISED}
       RETURNING id`,
      [cutoff]
    );
    report.invitesAnonymised = invites.rowCount || 0;

    await client.query('COMMIT');

    console.log(
      `[RecruitmentRetention] cutoff ${cutoff}: anonymised ` +
      `${report.applicationsAnonymised} application(s), ${report.invitesAnonymised} screening(s), ` +
      `removed ${report.answersRemoved} free-text answer(s)`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RecruitmentRetention] failed, rolled back:', error);
    throw error;
  } finally {
    client.release();
  }

  return report;
}
