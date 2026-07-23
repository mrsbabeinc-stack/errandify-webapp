import db from '../db.js';

/**
 * Correct the tier team sizes to the owner's canonical spec.
 *
 * subscription_tiers had gold = 20 and platinum = 100. The spec is gold = 15 and
 * platinum = unlimited. 999999 is the "unlimited" sentinel already used by the
 * /tiers display endpoint, so the two now agree.
 *
 * Commission (18/17/16%), ad credit (50/200/500) and EP multiplier (2/3/5x)
 * already matched the spec and are left alone. Prices live in the /tiers
 * endpoint and the Stripe price IDs, not this table.
 */

export async function up(): Promise<void> {
  await db.query(`UPDATE subscription_tiers SET max_team_members = 15, updated_at = NOW() WHERE name = 'gold'`);
  await db.query(`UPDATE subscription_tiers SET max_team_members = 999999, updated_at = NOW() WHERE name = 'platinum'`);
  console.log('[055] tier team sizes set to spec: gold 15, platinum unlimited');
}

export async function down(): Promise<void> {
  await db.query(`UPDATE subscription_tiers SET max_team_members = 20 WHERE name = 'gold'`);
  await db.query(`UPDATE subscription_tiers SET max_team_members = 100 WHERE name = 'platinum'`);
}
