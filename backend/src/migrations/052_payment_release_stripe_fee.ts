import db from '../db.js';

/**
 * Record the Stripe surcharge on each payout, for honest books.
 *
 * The asker now pays the errand price plus a processing surcharge, so the
 * platform keeps a clean 20% and the doer gets their full share. That makes the
 * existing platform_fee figure accurate again — but the surcharge itself was
 * invisible in the record. This adds it, so a payout row shows the whole story:
 *
 *   bid_amount      the errand price the doer was owed against
 *   stripe_fee      the processing surcharge the asker paid on top
 *   platform_fee    the platform's 20% commission (now genuinely kept)
 *   doer_payout     what the doer received
 *
 *   asker paid = bid_amount + stripe_fee
 *   platform net = platform_fee   (the surcharge covers Stripe's actual cut)
 *
 * stripe_fee here is the surcharge CHARGED (an estimate at 3.4% + $0.50).
 * Stripe's real deduction varies by card — international cards cost ~0.5% more —
 * so reconcile against Stripe's payout reports monthly; this column is what was
 * billed to the asker, not necessarily to the cent what Stripe took.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE payment_releases
      ADD COLUMN IF NOT EXISTS stripe_fee NUMERIC(10,2) DEFAULT 0
  `);
  await db.query(`
    COMMENT ON COLUMN payment_releases.stripe_fee IS
      'Processing surcharge the asker paid on top of bid_amount. asker paid = bid_amount + stripe_fee.'
  `);
  console.log('[052] payment_releases.stripe_fee added');
}

export async function down(): Promise<void> {
  await db.query(`ALTER TABLE payment_releases DROP COLUMN IF EXISTS stripe_fee`);
}
