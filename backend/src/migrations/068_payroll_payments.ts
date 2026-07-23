import db from '../db.js';

/**
 * Paying staff: the step between "Net Salaries Payable 4,661.16" and money in
 * someone's bank account.
 *
 * Posting a payroll run raised a liability and stopped there. Nothing paid it,
 * and nothing could have: the bank details captured on the staff form were
 * never persisted (routes/staffManagement.ts omitted all three columns from its
 * INSERT and UPDATE), so the account numbers collected from employees were
 * discarded on save.
 *
 * The model here is a bank BULK PAYMENT BATCH, which is how salaries actually
 * move in Singapore: the system produces a GIRO/FAST bulk credit file, a human
 * uploads and authorises it in corporate internet banking (DBS IDEAL, OCBC
 * Velocity, UOB BIBPlus), and the bank reference comes back to be recorded.
 *
 * Deliberately NOT built: anything that transmits money on its own. Direct
 * host-to-host initiation exists (ISO 20022 pain.001 over a bank's corporate
 * channel) but needs a signed agreement, mTLS certificates and the bank's own
 * authorisation matrix. Even with it, a maker-checker gate before money leaves
 * is a basic financial control, not an optional nicety.
 */

export async function up(): Promise<void> {
  // Branch code is separate from bank code: a GIRO file needs both, and jamming
  // them into one varchar makes the file generator guess.
  await db.query(`
    ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS bank_branch_code VARCHAR(10)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payroll_payment_batches (
      id              SERIAL PRIMARY KEY,
      payroll_run_id  INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
      reference       VARCHAR(50) NOT NULL UNIQUE,
      value_date      DATE NOT NULL,
      status          VARCHAR(20) NOT NULL DEFAULT 'awaiting_approval'
                      CHECK (status IN ('awaiting_approval','approved','exported','settled','cancelled')),
      item_count      INTEGER NOT NULL DEFAULT 0,
      total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      approved_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at     TIMESTAMP,
      exported_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      exported_at     TIMESTAMP,
      settled_at      TIMESTAMP,
      settled_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      bank_reference  VARCHAR(100),
      gl_entry_posted BOOLEAN NOT NULL DEFAULT false,
      notes           TEXT
    )
  `);
  // One live batch per run; a cancelled one can be replaced.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_live_batch_per_run
      ON payroll_payment_batches (payroll_run_id)
      WHERE status <> 'cancelled'
  `);

  /**
   * Bank details are COPIED onto the batch item rather than read live from
   * staff at export time. If someone changes their account next month, the
   * record of where this payment was actually sent must not change with it —
   * that is the whole point of a payment record.
   */
  await db.query(`
    CREATE TABLE IF NOT EXISTS payroll_payment_items (
      id                  SERIAL PRIMARY KEY,
      batch_id            INTEGER NOT NULL REFERENCES payroll_payment_batches(id) ON DELETE CASCADE,
      payroll_item_id     INTEGER REFERENCES payroll_items(id) ON DELETE SET NULL,
      staff_id            VARCHAR(10) NOT NULL,
      staff_name          VARCHAR(255) NOT NULL,
      bank_code           VARCHAR(20),
      bank_branch_code    VARCHAR(10),
      bank_account_number VARCHAR(50),
      bank_account_name   VARCHAR(255),
      amount              NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','failed')),
      failure_reason      TEXT
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_items_batch ON payroll_payment_items (batch_id)
  `);

  /**
   * Who read full account numbers, and when. The export is the only place they
   * leave the system in the clear, so it is the one action worth logging by
   * itself — a PDPA question as much as a financial one.
   */
  await db.query(`
    CREATE TABLE IF NOT EXISTS payroll_export_audit (
      id          SERIAL PRIMARY KEY,
      batch_id    INTEGER NOT NULL REFERENCES payroll_payment_batches(id) ON DELETE CASCADE,
      exported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      format      VARCHAR(30) NOT NULL,
      item_count  INTEGER NOT NULL,
      total_amount NUMERIC(14,2) NOT NULL,
      exported_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  console.log('[068] payroll payment batches, items and export audit created');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS payroll_export_audit CASCADE`);
  await db.query(`DROP TABLE IF EXISTS payroll_payment_items CASCADE`);
  await db.query(`DROP TABLE IF EXISTS payroll_payment_batches CASCADE`);
  await db.query(`ALTER TABLE staff DROP COLUMN IF EXISTS bank_branch_code`);
  console.log('[068] payroll payment tables dropped');
}
