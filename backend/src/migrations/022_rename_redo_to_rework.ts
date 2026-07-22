import db from '../db.js';

/**
 * Migration 022 — "redo" becomes "rework" everywhere.
 *
 * The product vocabulary rule normally says change visible text only and leave
 * code and columns alone, because renaming deployed schema is risky. This is
 * the exception: these columns were added hours ago in migration 021 and have
 * never been deployed or used outside testing, so renaming now is free.
 *
 * Leaving `redo_*` columns behind a "Rework" label would recreate exactly the
 * kind of vocabulary drift that made this codebase hard to reason about.
 */
export async function up() {
  const renames: [string, string][] = [
    ['redo_deadline', 'rework_deadline'],
    ['redo_proposed_at', 'rework_proposed_at'],
    ['redo_asker_response', 'rework_asker_response'],
    ['redo_doer_response', 'rework_doer_response'],
    ['redo_consent_deadline', 'rework_consent_deadline'],
    ['redo_declined_by', 'rework_declined_by'],
    ['redo_decline_reason', 'rework_decline_reason'],
    ['redo_completed_at', 'rework_completed_at'],
    ['redo_round', 'rework_round'],
    ['redo_outcome', 'rework_outcome'],
  ];

  for (const [from, to] of renames) {
    // Idempotent: skip if 021 was never applied or 022 already ran
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name='disputes' AND column_name='${from}')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name='disputes' AND column_name='${to}') THEN
          ALTER TABLE disputes RENAME COLUMN ${from} TO ${to};
        END IF;
      END $$;
    `);
  }

  // The stored value changes too, or the constraint and the code disagree
  await db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_resolution_kind_check`);
  await db.query(`UPDATE disputes SET resolution_kind = 'rework' WHERE resolution_kind = 'redo'`);
  await db.query(`
    ALTER TABLE disputes
      ADD CONSTRAINT disputes_resolution_kind_check
      CHECK (resolution_kind IS NULL OR resolution_kind IN ('monetary', 'rework', 'non_monetary'))
  `);

  await db.query(`UPDATE disputes SET status = 'rework_proposed' WHERE status = 'redo_proposed'`);
  await db.query(`UPDATE disputes SET status = 'rework_in_progress' WHERE status = 'redo_in_progress'`);
  await db.query(`UPDATE notifications SET type = REPLACE(type, 'dispute_redo', 'dispute_rework') WHERE type LIKE 'dispute_redo%'`);

  await db.query(`DROP INDEX IF EXISTS idx_disputes_redo_pending`);
  await db.query(`DROP INDEX IF EXISTS idx_disputes_redo_consent`);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_rework_pending
      ON disputes (rework_deadline)
      WHERE resolution_kind = 'rework' AND rework_outcome = 'agreed'
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_rework_consent
      ON disputes (rework_consent_deadline)
      WHERE resolution_kind = 'rework' AND rework_outcome IS NULL
  `);

  console.log('[022] ✅ redo → rework');
}

export async function down() {
  console.log('[022] rollback not provided — rename forward only');
}

if (process.argv[1] && process.argv[1].includes('022_rename_redo')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
