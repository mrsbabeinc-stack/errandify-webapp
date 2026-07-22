import db from '../db.js';

/**
 * Migration 015 — cache payout readiness on users.
 *
 * Companies already carry `stripe_payouts_enabled`; individual doers only had
 * `stripe_account_id`, which says an account exists but not whether money can
 * actually reach it. Checking that on Stripe for every offer would put a network
 * call in the middle of the offer flow, so the answer is cached here and only
 * refreshed when it is stale or negative.
 */
export async function up() {
  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS stripe_status_checked_at TIMESTAMP
  `);
  await db.query(`
    ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS stripe_status_checked_at TIMESTAMP
  `);
  console.log('[015] ✅ payout readiness cache added');
}

export async function down() {
  await db.query(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS stripe_payouts_enabled,
      DROP COLUMN IF EXISTS stripe_status_checked_at
  `);
  await db.query('ALTER TABLE companies DROP COLUMN IF EXISTS stripe_status_checked_at');
}

if (process.argv[1] && process.argv[1].includes('015_user_payout')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
