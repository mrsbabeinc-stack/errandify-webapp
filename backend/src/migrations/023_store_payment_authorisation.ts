import db from '../db.js';

/**
 * Migration 023 — remember the authorisation.
 *
 * Bid acceptance created a real Stripe PaymentIntent and returned its id to the
 * browser, then threw it away. Two consequences:
 *
 *   1. The payment can never be captured. You cannot capture an intent whose id
 *      you did not keep, so the money would sit authorised until it lapsed.
 *   2. Nothing knows WHEN it was authorised. Card authorisations expire in
 *      about 7 days, so any deadline we set — a rework in particular — has to
 *      fit inside that window, and we cannot check what we did not record.
 */
export async function up() {
  await db.query(`
    ALTER TABLE errands
      ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(120),
      ADD COLUMN IF NOT EXISTS payment_authorised_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS payment_captured_at TIMESTAMP
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_errands_payment_intent ON errands(payment_intent_id)
      WHERE payment_intent_id IS NOT NULL
  `);
  // Anything authorised and not yet captured is money on a clock
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_errands_awaiting_capture
      ON errands(payment_authorised_at)
      WHERE payment_authorised_at IS NOT NULL AND payment_captured_at IS NULL
  `);
  console.log('[023] ✅ payment authorisation columns added');
}

export async function down() {
  await db.query(`
    ALTER TABLE errands
      DROP COLUMN IF EXISTS payment_intent_id,
      DROP COLUMN IF EXISTS payment_authorised_at,
      DROP COLUMN IF EXISTS payment_captured_at
  `);
}

if (process.argv[1] && process.argv[1].includes('023_store_payment')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
