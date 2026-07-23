import db from '../db.js';

/**
 * Who the employer IS.
 *
 * Nothing recorded it. `companies` holds tenant companies on the marketplace,
 * not the entity that employs the people in `staff` — so payroll had no idea
 * whose name to put on a payslip.
 *
 * That is not cosmetic. MOM's itemised payslip requirements list the full name
 * of the employer as item 1 of 12, so every payslip issued so far has been
 * non-compliant. The CPF Submission Number is needed to remit contributions,
 * and the UEN for IR8A.
 *
 * Single row by construction: this system runs one employer's payroll.
 */

export async function up(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employer_profile (
      id                     INTEGER PRIMARY KEY DEFAULT 1,
      legal_name             VARCHAR(255),
      uen                    VARCHAR(20),
      cpf_submission_number  VARCHAR(30),
      registered_address     TEXT,
      postal_code            VARCHAR(10),
      /** Days an employee is required to work in a week — drives the daily
       *  gross rate of pay used for unpaid-leave deductions. */
      working_days_per_week  NUMERIC(3,1) NOT NULL DEFAULT 5,
      updated_by             INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at             TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT employer_profile_single_row CHECK (id = 1)
    )
  `);

  // Seed the row so reads never have to handle "no row yet", but leave the
  // fields NULL — an invented company name on a payslip is worse than a blank
  // one, because a blank prompts someone to fill it in.
  await db.query(`
    INSERT INTO employer_profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING
  `);

  console.log('[075] employer_profile created (legal name, UEN, CSN)');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS employer_profile CASCADE`);
  console.log('[075] employer_profile dropped');
}
