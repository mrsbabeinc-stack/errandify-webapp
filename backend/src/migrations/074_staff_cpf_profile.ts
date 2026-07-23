import db from '../db.js';

/**
 * The two facts CPF cannot be computed without, neither of which was recorded.
 *
 * CPF contribution rates are banded by AGE (55 and below, above 55–60, 60–65,
 * 65–70, above 70) and reduced for Singapore Permanent Residents in their first
 * and second year of PR status. The staff table held neither a date of birth
 * nor a usable residency flag, so every employee was silently charged one flat
 * rate — and the flat rate in use was not a statutory one either.
 *
 * `cpf_status` is deliberately NOT defaulted to 'citizen'. Guessing here means
 * quietly paying a first-year PR at full rates, or a foreigner at any rate at
 * all when they attract no CPF whatsoever. NULL means "nobody has said", and
 * the payroll run refuses to compute rather than assume.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS cpf_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS pr_start_date DATE
  `);

  await db.query(`
    ALTER TABLE staff
      DROP CONSTRAINT IF EXISTS staff_cpf_status_check
  `);
  await db.query(`
    ALTER TABLE staff
      ADD CONSTRAINT staff_cpf_status_check
      CHECK (cpf_status IS NULL OR cpf_status IN (
        'citizen',      -- SC, or SPR from the 3rd year: full rates
        'pr_year_1',    -- graduated rates, first year of PR
        'pr_year_2',    -- graduated rates, second year of PR
        'foreigner'     -- work pass holder: no CPF at all
      ))
  `);

  /**
   * The rates that were actually applied to a payroll run, frozen onto the
   * payslip. Rates and ceilings change every January; a payslip reprinted in
   * two years must still show what was used at the time, not today's table.
   */
  await db.query(`
    ALTER TABLE payroll_items
      ADD COLUMN IF NOT EXISTS cpf_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS age_at_payroll INTEGER,
      ADD COLUMN IF NOT EXISTS cpf_rate_employee NUMERIC(6,3),
      ADD COLUMN IF NOT EXISTS cpf_rate_employer NUMERIC(6,3),
      ADD COLUMN IF NOT EXISTS cpf_ow_ceiling NUMERIC(14,2)
  `);

  console.log('[074] staff CPF profile (dob, status) and payslip rate snapshot added');
}

export async function down(): Promise<void> {
  await db.query(`ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_cpf_status_check`);
  await db.query(`
    ALTER TABLE staff
      DROP COLUMN IF EXISTS date_of_birth,
      DROP COLUMN IF EXISTS cpf_status,
      DROP COLUMN IF EXISTS pr_start_date
  `);
  await db.query(`
    ALTER TABLE payroll_items
      DROP COLUMN IF EXISTS cpf_status,
      DROP COLUMN IF EXISTS age_at_payroll,
      DROP COLUMN IF EXISTS cpf_rate_employee,
      DROP COLUMN IF EXISTS cpf_rate_employer,
      DROP COLUMN IF EXISTS cpf_ow_ceiling
  `);
  console.log('[074] staff CPF profile removed');
}
