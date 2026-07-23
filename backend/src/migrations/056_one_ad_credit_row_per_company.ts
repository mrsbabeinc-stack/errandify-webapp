import db from '../db.js';

/**
 * One ad-credit row per company.
 *
 * allocateMonthlyCredits upserts on company_id (ON CONFLICT (company_id)), which
 * needs a unique constraint to conflict against — without it the monthly
 * allocation threw, so even once the tier join was fixed no credits landed. One
 * row per company is the right model: the monthly grant tops the same row up.
 */

export async function up(): Promise<void> {
  await db.query(`
    DELETE FROM subscription_ad_credits a
     USING subscription_ad_credits b
     WHERE a.company_id = b.company_id AND a.id < b.id
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_ad_credit
      ON subscription_ad_credits (company_id)
  `);
  console.log('[056] one ad-credit row per company enforced');
}

export async function down(): Promise<void> {
  await db.query(`DROP INDEX IF EXISTS uniq_company_ad_credit`);
}
