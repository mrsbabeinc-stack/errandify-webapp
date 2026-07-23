import db from '../db.js';

/**
 * Removes the columns `job_applications` should never have had.
 *
 * These held data collected from every applicant before any hiring decision:
 * NRIC, date of birth, nationality, residential status, home address and a
 * disability/medical declaration. `routes/recruitment.ts` stopped writing them
 * when the intake was split into application and hire stages, so they are
 * already dead — this removes them rather than leaving a loaded column a
 * future handler can quietly start filling again.
 *
 * Why each one had to go:
 *  - nric — PDPC's Advisory Guidelines on the PDPA for NRIC and other National
 *    Identification Numbers (1 Sep 2019). Collectable only where required by
 *    law or needed to verify identity to a high degree of fidelity; an
 *    application is neither. Lawful at hire, where `staff.nric` holds it for
 *    CPF and IRAS.
 *  - health_declaration — disability and medical condition asked pre-offer.
 *  - date_of_birth, nationality — age and nationality, the characteristics the
 *    Fair Consideration Framework is most concerned with.
 *  - home_address, city, postal_code, country, residential_status,
 *    emergency_contact_* — onboarding details, collected at hire into `staff`,
 *    which already has every one of these columns.
 *
 * DESTRUCTIVE, and deliberately so: anonymising in place would leave the
 * columns present, and PDPC 18.11 is clear that data merely hidden is still
 * retained. Run against 0 rows, so nothing was lost. `down()` restores the
 * columns but cannot restore data — there was none to restore.
 *
 * Nothing read these: no view, no index, and no application-side code
 * references them. `services/recruitmentRetention.ts` was updated in the same
 * change to stop trying to anonymise columns that no longer exist.
 */

const COLUMNS = [
  'nric',
  'date_of_birth',
  'nationality',
  'residential_status',
  'home_address',
  'city',
  'postal_code',
  'country',
  'emergency_contact_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
  'health_declaration',
];

export async function up(): Promise<void> {
  // Refuses rather than destroying data if this ever meets a populated table:
  // on a database where these columns hold real applicant data, dropping them
  // is a decision someone has to take knowingly, not something a migration
  // should do on its way past.
  const populated = await db.query(`
    SELECT COUNT(*) AS count FROM job_applications
     WHERE nric IS NOT NULL
        OR date_of_birth IS NOT NULL
        OR home_address IS NOT NULL
        OR (health_declaration IS NOT NULL AND health_declaration::text NOT IN ('{}', 'null'))
  `);

  if (Number(populated.rows[0].count) > 0) {
    throw new Error(
      `[069] ${populated.rows[0].count} application(s) still hold data in the columns this ` +
      `migration drops. Anonymise them first (services/recruitmentRetention.ts), ` +
      `then re-run. Refusing to destroy applicant data unattended.`
    );
  }

  for (const column of COLUMNS) {
    await db.query(`ALTER TABLE job_applications DROP COLUMN IF EXISTS ${column}`);
  }

  console.log(`[069] dropped ${COLUMNS.length} pre-offer columns from job_applications`);
}

export async function down(): Promise<void> {
  // Restores the shape, not the data. There was none.
  await db.query(`
    ALTER TABLE job_applications
      ADD COLUMN IF NOT EXISTS nric VARCHAR(20),
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
      ADD COLUMN IF NOT EXISTS residential_status VARCHAR(50),
      ADD COLUMN IF NOT EXISTS home_address TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS health_declaration JSONB DEFAULT '{}'::jsonb
  `);
}
