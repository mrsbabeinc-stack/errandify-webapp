import db from '../db.js';

/**
 * Migration 075 — the columns the post-completion dispute window has always
 * needed.
 *
 * `POST /api/errands/:id/end-job` and `POST /api/errands/:id/reopen` were
 * written against seven columns that do not exist on `errands`. Postgres
 * throws on an unknown column, so both routes 500'd on every call:
 *
 *   end-job  → job_ended_at, dispute_deadline
 *   reopen   → dispute_deadline (in its SELECT list, so it failed before it
 *              even reached the UPDATE), reopened_reason, reopened_by
 *   work-proof → work_proof_description, work_proof_urls,
 *                work_proof_submitted_at
 *
 * The effect was a dead chain rather than one dead route: end-job is what sets
 * status to 'job_completed', and reopen refuses anything that is not
 * 'job_completed' — so even after fixing reopen in isolation nothing could
 * reach it. The 48-hour window in which a doer or asker can reopen a finished
 * job, which the code plainly intends, has never once been available.
 *
 * Found the same way as errands.confirm_at: comparing every column written to
 * `errands` across the backend against information_schema.
 *
 * Purely additive — every column is nullable with no default, so existing rows
 * are untouched and no behaviour changes until those routes are called.
 *
 * Deliberately NOT added here: `payment_released_at`, `reminder_24h_sent` and
 * `reminder_47h_sent`. They are also missing, but they belong to the payment
 * auto-release and reminder crons, which are commented out in startCrons(),
 * and to POST /api/jobs/:taskId/confirm, which executes a real Stripe transfer
 * before it hits the missing column. Adding them would switch on money
 * movement that has never run — that is a decision, not a repair.
 */
export async function up() {
  // The 48-hour reopen/dispute window
  await db.query(`ALTER TABLE errands ADD COLUMN IF NOT EXISTS job_ended_at TIMESTAMP`);
  await db.query(`ALTER TABLE errands ADD COLUMN IF NOT EXISTS dispute_deadline TIMESTAMP`);

  // Who reopened a finished job, and why
  await db.query(`ALTER TABLE errands ADD COLUMN IF NOT EXISTS reopened_reason TEXT`);
  await db.query(
    `ALTER TABLE errands ADD COLUMN IF NOT EXISTS reopened_by INTEGER REFERENCES users(id) ON DELETE SET NULL`
  );

  // Evidence a doer submits that the work was done
  await db.query(`ALTER TABLE errands ADD COLUMN IF NOT EXISTS work_proof_description TEXT`);
  await db.query(`ALTER TABLE errands ADD COLUMN IF NOT EXISTS work_proof_urls TEXT`);
  await db.query(`ALTER TABLE errands ADD COLUMN IF NOT EXISTS work_proof_submitted_at TIMESTAMP`);

  // The cron and the reopen guard both filter on the deadline.
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_errands_dispute_deadline ON errands(dispute_deadline)
      WHERE dispute_deadline IS NOT NULL`
  );

  console.log('[075] ✅ errands carries the dispute-window columns');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_errands_dispute_deadline`);
  for (const c of [
    'job_ended_at', 'dispute_deadline', 'reopened_reason', 'reopened_by',
    'work_proof_description', 'work_proof_urls', 'work_proof_submitted_at',
  ]) {
    await db.query(`ALTER TABLE errands DROP COLUMN IF EXISTS ${c}`);
  }
}

if (process.argv[1] && process.argv[1].includes('075_errand_dispute_window')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
