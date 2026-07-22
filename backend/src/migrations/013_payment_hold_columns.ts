import db from '../db.js';

/**
 * Migration 013 — the payment hold columns.
 *
 * `holdPayment()` writes payment_held / payment_held_reason / payment_held_at
 * and `releaseHeldPayment()` clears them, but none of the columns existed. Both
 * functions threw on every call and swallowed the error, so filing a dispute
 * never actually flagged the money as frozen.
 *
 * Also records the settlement an admin decided, so the Stripe wiring has
 * something concrete to act on and can be made idempotent.
 */
export async function up() {
  await db.query(`
    ALTER TABLE errands
      ADD COLUMN IF NOT EXISTS payment_held BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS payment_held_reason TEXT,
      ADD COLUMN IF NOT EXISTS payment_held_at TIMESTAMP
  `);

  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS settlement_doer_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS settlement_asker_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(30) DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS settlement_reference VARCHAR(120),
      ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP
  `);

  // settlement_status: not_started -> pending -> settled | failed
  // settlement_reference holds the Stripe transfer/refund id once money moves,
  // and is the idempotency anchor: never move money twice for one dispute.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_settlement_reference
      ON disputes (settlement_reference)
      WHERE settlement_reference IS NOT NULL
  `);

  console.log('[013] ✅ payment hold + settlement columns added');
}

export async function down() {
  await db.query(`
    ALTER TABLE errands
      DROP COLUMN IF EXISTS payment_held,
      DROP COLUMN IF EXISTS payment_held_reason,
      DROP COLUMN IF EXISTS payment_held_at
  `);
  await db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS settlement_doer_amount,
      DROP COLUMN IF EXISTS settlement_asker_amount,
      DROP COLUMN IF EXISTS settlement_status,
      DROP COLUMN IF EXISTS settlement_reference,
      DROP COLUMN IF EXISTS settled_at
  `);
}

if (process.argv[1] && process.argv[1].includes('013_payment_hold')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
