import db from '../db.js';

/**
 * Migration 060 — the errand has to know it is in dispute, and how to come back.
 *
 * Filing a dispute held the payment but left the errand sitting in whatever
 * status it had, so an errand under dispute was indistinguishable from one that
 * had gone through cleanly — on the asker's list, the doer's list and every
 * admin query. Resolving it changed nothing either: a settled dispute left its
 * errand looking unfinished forever.
 *
 * `pre_dispute_status` is what makes the return trip honest. A dispute that
 * ends with nothing changing hands (sorted between the two of them, an apology,
 * guidance) must put the errand back exactly where it was, not guess at a
 * plausible status. Monetary outcomes do move it — a full refund ends the
 * errand cancelled, anything else completed — but only once the money has
 * actually moved.
 */
export async function up() {
  await db.query(`
    ALTER TABLE errands
      ADD COLUMN IF NOT EXISTS pre_dispute_status VARCHAR(50)
  `);

  // Finding a stuck one later is worth more than the write cost of the index.
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_errands_disputed
      ON errands (id) WHERE status = 'disputed'
  `);

  console.log('[060] ✅ errands.pre_dispute_status added');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_errands_disputed`);
  await db.query(`ALTER TABLE errands DROP COLUMN IF EXISTS pre_dispute_status`);
}

if (process.argv[1] && process.argv[1].includes('060_dispute_errand_lifecycle')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
