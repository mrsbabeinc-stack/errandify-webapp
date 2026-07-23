import db from '../db.js';

/**
 * Recurring per-staff deductions.
 *
 * StaffSalaryBenefitsEditor has offered a "deduction" alongside allowances and
 * benefits since it was written, but only allowances and benefits ever had a
 * table. Adding a deduction therefore updated React state, showed a success
 * toast, and was gone on reload — the same silent no-op the rest of this module
 * had.
 *
 * Scope note: this is for standing deductions the employer agrees per staff
 * member (insurance premium, equipment repayment). Statutory CPF and income tax
 * are rate-driven and belong to a payroll run, not to a hand-entered row here —
 * that subsystem does not exist yet.
 *
 * Mirrors staff_allowances so the two read and cascade identically.
 */

export async function up(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_deductions (
      id              SERIAL PRIMARY KEY,
      staff_salary_id INTEGER NOT NULL
                        REFERENCES staff_salary(id) ON DELETE CASCADE,
      name            VARCHAR(100) NOT NULL,
      amount          NUMERIC(12,2) NOT NULL,
      frequency       VARCHAR(50),
      description     TEXT,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_staff_deductions_salary_id
      ON staff_deductions (staff_salary_id)
  `);
  console.log('[058] staff_deductions created');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS staff_deductions`);
}
