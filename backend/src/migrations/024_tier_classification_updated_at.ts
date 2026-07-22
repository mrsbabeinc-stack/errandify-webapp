import db from '../db.js';

/**
 * Migration 024 — the column that silenced every defence request.
 *
 * classifyDisputeTier() upserts into dispute_tier_classification with
 * `ON CONFLICT (dispute_id) DO UPDATE SET ... updated_at = NOW()`, but the
 * table (created by migration 003) has no updated_at. Every call threw, was
 * swallowed by its catch, and returned a default classification.
 *
 * The consequence was invisible and serious: the block that assigns the
 * defendant and sets their response deadline sits AFTER that insert, so it
 * never ran. Nobody was ever asked for their side of a dispute, no response
 * deadline was ever set — and because a defendant who does not respond forfeits
 * their right to appeal, people were losing that right without ever being asked.
 */
export async function up() {
  await db.query(`
    ALTER TABLE dispute_tier_classification
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  console.log('[024] ✅ dispute_tier_classification.updated_at added');
}

export async function down() {
  await db.query(`ALTER TABLE dispute_tier_classification DROP COLUMN IF EXISTS updated_at`);
}

if (process.argv[1] && process.argv[1].includes('024_tier_classification')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
