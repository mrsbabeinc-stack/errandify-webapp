import db from '../db.js';

/**
 * Restores the application fields that had a real business purpose, and adds
 * the two things migration 069 removed without replacing: a lawful way to ask
 * about work eligibility, and a lawful place to record fitness to work.
 *
 * 069 dropped twelve columns together. Two of them — NRIC and the
 * disability/medical declaration — carry genuine legal exposure at application
 * stage. The rest were only *inadvisable*, and treating both groups the same
 * was too blunt. This restores the second group.
 *
 * RESTORED to job_applications:
 *  - date_of_birth, home_address, city, postal_code, country. No PDPA rule
 *    bars these; address supports commute and location matching, and some
 *    roles carry statutory age requirements.
 *
 * REPLACED rather than restored:
 *  - nationality → `work_authorisation`. The underlying need is real: can this
 *    person work here, and do they need a pass sponsored? That is answerable
 *    without recording nationality, which is a protected characteristic under
 *    the Fair Consideration Framework and the Workplace Fairness Act. Asking
 *    the question you actually need is both safer and more useful than
 *    inferring it from nationality.
 *  - health_declaration → `can_perform_duties` + `adjustments_needed`. An
 *    employer may ask whether someone can do the job, with or without
 *    reasonable adjustment; that is job-relevant. What it may not do is ask
 *    every applicant for a medical and disability history as a screening
 *    filter. `adjustments_needed` exists to support the applicant, not to
 *    grade them.
 *
 * STILL NOT restored: nric, residential_status, emergency_contact_*. All three
 * are collected at hire — see the fitness and onboarding columns added to
 * `staff` below, and the hire endpoint in routes/recruitment.ts.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE job_applications
      ADD COLUMN IF NOT EXISTS date_of_birth      DATE,
      ADD COLUMN IF NOT EXISTS home_address       TEXT,
      ADD COLUMN IF NOT EXISTS city               VARCHAR(100),
      ADD COLUMN IF NOT EXISTS postal_code        VARCHAR(20),
      ADD COLUMN IF NOT EXISTS country            VARCHAR(100),
      ADD COLUMN IF NOT EXISTS work_authorisation VARCHAR(30),
      ADD COLUMN IF NOT EXISTS can_perform_duties BOOLEAN,
      ADD COLUMN IF NOT EXISTS adjustments_needed TEXT
  `);

  await db.query(`
    ALTER TABLE job_applications
      DROP CONSTRAINT IF EXISTS application_work_authorisation_valid
  `);
  await db.query(`
    ALTER TABLE job_applications
      ADD CONSTRAINT application_work_authorisation_valid
      CHECK (work_authorisation IS NULL OR work_authorisation IN (
        'authorised',          -- citizen, PR, or holds a valid pass already
        'requires_sponsorship' -- would need the employer to sponsor a pass
      ))
  `);

  /**
   * Fitness to work belongs here, on the employee, not on the applicant.
   *
   * Post-offer is the point at which a health question becomes lawful and
   * useful: the hiring decision has been made on the person's ability to do
   * the job, so a medical check can be a genuine condition of employment
   * rather than a screen. Singapore also *requires* statutory medical
   * examinations for some work — work-pass holders and certain hazardous
   * occupations under the WSH (Medical Examinations) Regulations — so this
   * column set is where that obligation is evidenced.
   *
   * ⚠️ Which roles need a statutory exam, and how often, depends on the work.
   * Confirm against MOM's requirements for the actual job scope.
   */
  await db.query(`
    ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS fitness_status          VARCHAR(30),
      ADD COLUMN IF NOT EXISTS fitness_assessed_on     DATE,
      ADD COLUMN IF NOT EXISTS fitness_next_review_on  DATE,
      ADD COLUMN IF NOT EXISTS fitness_restrictions    TEXT,
      ADD COLUMN IF NOT EXISTS workplace_adjustments   TEXT
  `);

  await db.query(`
    ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_fitness_status_valid
  `);
  await db.query(`
    ALTER TABLE staff
      ADD CONSTRAINT staff_fitness_status_valid
      CHECK (fitness_status IS NULL OR fitness_status IN (
        'pending',                -- offer accepted, check not yet done
        'fit',                    -- cleared for the role
        'fit_with_adjustments',   -- cleared, with the adjustments recorded
        'not_yet_cleared'         -- outstanding; NOT a diagnosis
      ))
  `);

  /**
   * Deliberately absent from `staff`: any column for a diagnosis, condition
   * name or medical detail. The employer needs to know whether someone is
   * cleared for the work and what adjustments to make — not what is wrong with
   * them. Storing the underlying condition would be collecting more than the
   * purpose needs, and it is the most sensitive category we could hold.
   */

  console.log('[070] application fields restored; fitness-to-work added to staff');
}

export async function down(): Promise<void> {
  await db.query(`
    ALTER TABLE job_applications
      DROP CONSTRAINT IF EXISTS application_work_authorisation_valid,
      DROP COLUMN IF EXISTS date_of_birth,
      DROP COLUMN IF EXISTS home_address,
      DROP COLUMN IF EXISTS city,
      DROP COLUMN IF EXISTS postal_code,
      DROP COLUMN IF EXISTS country,
      DROP COLUMN IF EXISTS work_authorisation,
      DROP COLUMN IF EXISTS can_perform_duties,
      DROP COLUMN IF EXISTS adjustments_needed
  `);
  await db.query(`
    ALTER TABLE staff
      DROP CONSTRAINT IF EXISTS staff_fitness_status_valid,
      DROP COLUMN IF EXISTS fitness_status,
      DROP COLUMN IF EXISTS fitness_assessed_on,
      DROP COLUMN IF EXISTS fitness_next_review_on,
      DROP COLUMN IF EXISTS fitness_restrictions,
      DROP COLUMN IF EXISTS workplace_adjustments
  `);
}
