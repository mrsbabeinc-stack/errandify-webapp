import db from '../db.js';

/**
 * Migration 027 — ep_transactions.multiplier.
 *
 * ep_transactions is written by five call sites and only one of them matched
 * the table, so EP has been logging almost nothing. Two different column
 * vocabularies are in the codebase:
 *
 *   (user_id, amount, reason, related_errand_id, created_at)
 *       the table as it actually exists, and as
 *       backend/migrations/add_gamification_tables.sql defines it — canonical
 *
 *   (user_id, transaction_type, points_change, description, ...)
 *       auth.ts, errands.ts x2, referralService.ts — none of these columns
 *       exist, so every one of those inserts throws
 *
 * The four outliers are being rewritten to the canonical names rather than the
 * table being reshaped, because the canonical shape is the one with data in it
 * and the one the SQL file agrees with.
 *
 * gamificationService is the exception: it uses canonical names but also writes
 * `multiplier`, which the table lacks. That column is worth having rather than
 * dropping from the insert — the subscription tiers award 2x/3x/5x EP, and
 * without the multiplier a ledger row cannot explain why a user received the
 * points it shows. Added here with DEFAULT 1 so existing rows read as unmultiplied.
 */
export async function up() {
  await db.query(`
    ALTER TABLE ep_transactions
      ADD COLUMN IF NOT EXISTS multiplier NUMERIC(4,2) NOT NULL DEFAULT 1
  `);
  console.log('[027] ✅ ep_transactions.multiplier added');
}

export async function down() {
  await db.query('ALTER TABLE ep_transactions DROP COLUMN IF EXISTS multiplier');
}

if (process.argv[1] && process.argv[1].includes('027_ep_transactions_multiplier')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
