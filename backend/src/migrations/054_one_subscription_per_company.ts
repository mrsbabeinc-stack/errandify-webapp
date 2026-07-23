import db from '../db.js';

/**
 * One subscription row per company.
 *
 * createSubscription upserts on company_id, which needs a unique constraint to
 * conflict against — and one row per company is the right model anyway: a
 * company is on exactly one tier at a time, with a pending_tier for a scheduled
 * change rather than a second row.
 */

export async function up(): Promise<void> {
  // Collapse any accidental duplicates first (keep the most recent), so the
  // unique index can be created. There is one row today, so this is a no-op now
  // but safe if that changes.
  await db.query(`
    DELETE FROM company_subscriptions a
     USING company_subscriptions b
     WHERE a.company_id = b.company_id AND a.id < b.id
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_subscription
      ON company_subscriptions (company_id)
  `);
  console.log('[054] one subscription per company enforced');
}

export async function down(): Promise<void> {
  await db.query(`DROP INDEX IF EXISTS uniq_company_subscription`);
}
