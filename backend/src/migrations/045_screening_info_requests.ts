import db from '../db.js';

/**
 * Migration 045 — asking the applicant for more, and keeping the history.
 *
 * Three things the review queue could not do.
 *
 * ASK. A reviewer could only clear or bar. Most real cases turn on one missing
 * fact — was that a fine or imprisonment, how much was it — and there was no
 * way to ask. So a case that needed one question got a permanent decision.
 *
 * PAUSE THE CLOCK. The age badge exists so nobody waits unseen, but it should
 * measure OUR delay. If it keeps counting while we wait on the applicant, every
 * case eventually turns red and the badge stops meaning anything.
 *
 * REVERSE. review_status already recorded who decided and why, but a decision
 * could not be undone. An audit trail that cannot be corrected just records the
 * mistake permanently — and people do get cleared and barred wrongly.
 *
 * Deliberately no AI anywhere near this. Assessing a case would mean sending
 * criminal-conviction data to a third-party processor outside Singapore, which
 * is a PDPA question this does not need to raise: the legal test is already
 * deterministic, and what the reviewer actually lacks is a number, not a
 * judgement. Ask for the number.
 */
export async function up() {
  await db.query('ALTER TABLE screening_declarations DROP CONSTRAINT IF EXISTS screening_review_status_check');
  await db.query(`
    ALTER TABLE screening_declarations ADD CONSTRAINT screening_review_status_check
      CHECK (review_status IN ('auto', 'pending_review', 'info_requested', 'cleared', 'barred'))
  `);

  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS info_request TEXT`);
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS info_requested_at TIMESTAMP`);
  // Total time spent waiting on the applicant, so the age badge can measure
  // our delay rather than theirs.
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS waiting_on_applicant_seconds INTEGER NOT NULL DEFAULT 0`);

  // The numbers that remove the ambiguity in the first place. s7C(b) turns on
  // "more than 3 months" and "over $2,000" — both are amounts, and asking for
  // the amount is more reliable than asking someone to compare it to a
  // threshold they have just been told.
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS sentence_months NUMERIC(6,2)`);
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS fine_amount_sgd NUMERIC(10,2)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS screening_decision_log (
      id SERIAL PRIMARY KEY,
      declaration_id INTEGER NOT NULL REFERENCES screening_declarations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(20) NOT NULL CHECK (action IN ('cleared', 'barred', 'info_requested', 'reopened')),
      note TEXT NOT NULL,
      decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_screening_log_decl ON screening_decision_log(declaration_id, created_at DESC)`);

  console.log('[045] ✅ info requests, SLA pause and decision history ready');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS screening_decision_log CASCADE');
  for (const c of ['info_request', 'info_requested_at', 'waiting_on_applicant_seconds', 'sentence_months', 'fine_amount_sgd']) {
    await db.query(`ALTER TABLE screening_declarations DROP COLUMN IF EXISTS ${c}`);
  }
}

if (process.argv[1] && process.argv[1].includes('045_screening_info_requests')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
