import db from '../db.js';

/**
 * Migration 011 — the escalation columns.
 *
 * Columns written with NOW() rather than a placeholder, which is why migration
 * 010 missed them — it was derived from the `SET col = $n` writes.
 *
 *   escalation_notes / escalated_at -> every escalation returned "Escalation failed"
 *   closed_at                       -> resolving an appeal returned "Failed to resolve appeal"
 */
export async function up() {
  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS escalation_notes TEXT,
      ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS escalated_to VARCHAR(50),
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP
  `);
  console.log('[011] ✅ escalation columns added');
}

export async function down() {
  await db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS escalation_notes,
      DROP COLUMN IF EXISTS escalated_at,
      DROP COLUMN IF EXISTS escalated_to,
      DROP COLUMN IF EXISTS closed_at
  `);
}

if (process.argv[1] && process.argv[1].includes('011_dispute_escalation')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
