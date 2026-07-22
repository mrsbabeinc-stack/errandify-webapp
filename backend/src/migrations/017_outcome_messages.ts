import db from '../db.js';

/**
 * Migration 017 — drafted outcome messages.
 *
 * After an admin decides, Hana drafts what each party is told. The drafts are
 * stored rather than sent, because a message to a neighbour about their money
 * is outward-facing: the admin reads it, edits it if they want, and sends it.
 * Nothing leaves the platform without a person approving it.
 */
export async function up() {
  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS outcome_message_asker TEXT,
      ADD COLUMN IF NOT EXISTS outcome_message_doer TEXT,
      ADD COLUMN IF NOT EXISTS outcome_messages_drafted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS outcome_messages_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS outcome_messages_sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);
  console.log('[017] ✅ outcome message columns added');
}

export async function down() {
  await db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS outcome_message_asker,
      DROP COLUMN IF EXISTS outcome_message_doer,
      DROP COLUMN IF EXISTS outcome_messages_drafted_at,
      DROP COLUMN IF EXISTS outcome_messages_sent_at,
      DROP COLUMN IF EXISTS outcome_messages_sent_by
  `);
}

if (process.argv[1] && process.argv[1].includes('017_outcome_messages')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
