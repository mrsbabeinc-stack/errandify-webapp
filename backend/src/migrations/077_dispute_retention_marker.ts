import db from '../db.js';

/**
 * Migration 077 — record that the retention sweep has run on a dispute.
 *
 * docs/DATA_RETENTION.md promises seven years for resolved dispute outcomes and
 * nothing enforced it. A schedule nobody runs is worse than no schedule: it is
 * evidence of an intention not being met, and it is the first document a
 * regulator reads (PDPC Key Concepts 18.8, and 18.5 on reviewing against it).
 *
 * The sweep does not delete the dispute. The financial and outcome record is
 * retained for the legal purpose — 18.4(b) expressly permits that — and what is
 * stripped is the personal narrative wrapped around it: both parties' written
 * statements, the appeal text, Hana's reasoning, the messages that went out, and
 * the evidence images themselves. 18.10(d) treats anonymising as ceasing to
 * retain; 18.11 is explicit that merely archiving or hiding does not count,
 * which is why the columns are nulled rather than flagged.
 *
 * This marker is what makes the sweep idempotent and, just as importantly,
 * auditable: it is the proof the policy actually ran on a given row.
 */
export async function up() {
  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS retention_stripped_at TIMESTAMP
  `);

  // The sweep looks for closed disputes past the cutoff that have not been done
  // yet; this is exactly that predicate.
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_retention_pending
      ON disputes (closed_at)
      WHERE retention_stripped_at IS NULL
  `);

  console.log('[077] ✅ disputes.retention_stripped_at added');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_disputes_retention_pending`);
  await db.query(`ALTER TABLE disputes DROP COLUMN IF EXISTS retention_stripped_at`);
}

if (process.argv[1] && process.argv[1].includes('077_dispute_retention_marker')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
