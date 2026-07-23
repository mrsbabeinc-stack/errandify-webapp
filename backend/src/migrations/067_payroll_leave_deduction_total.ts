import db from '../db.js';

/**
 * Carry the unpaid-leave total on the payroll run itself.
 *
 * Without it the GL posting could not balance: the journal debited gross wages
 * but credited only CPF payable and net pay, so an unpaid-leave deduction left
 * the entry short by exactly the deduction. (The balance guard in the posting
 * route refused to write it, which is how this was caught rather than silently
 * posting a lopsided journal.)
 *
 * The run now records the deduction total, so the journal can carry a contra
 * line for it and the P&L can report the salary cost actually incurred rather
 * than the gross before adjustment.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE payroll_runs
      ADD COLUMN IF NOT EXISTS total_leave_deduction NUMERIC(14,2) NOT NULL DEFAULT 0
  `);

  // Backfill from the payslips already generated.
  await db.query(`
    UPDATE payroll_runs r
       SET total_leave_deduction = COALESCE(t.total, 0)
      FROM (SELECT payroll_run_id, SUM(leave_deduction) AS total
              FROM payroll_items GROUP BY payroll_run_id) t
     WHERE t.payroll_run_id = r.id
  `);

  console.log('[067] payroll_runs.total_leave_deduction added and backfilled');
}

export async function down(): Promise<void> {
  await db.query(`ALTER TABLE payroll_runs DROP COLUMN IF EXISTS total_leave_deduction`);
}
