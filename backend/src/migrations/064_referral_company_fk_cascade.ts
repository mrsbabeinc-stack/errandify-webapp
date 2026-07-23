import db from '../db.js';

/**
 * Migration 064 — fix an unremovable company.
 *
 * 063 added `referral_tracking.referrer_company_id` with ON DELETE SET NULL,
 * alongside a CHECK requiring exactly one of referrer_id / referrer_company_id
 * to be set. Those two rules contradict each other: deleting a company makes
 * Postgres null the column, and because referrer_id is already NULL on a
 * company referral the row then satisfies neither branch of the CHECK. The
 * delete aborts.
 *
 *     ERROR: new row for relation "referral_tracking" violates check
 *            constraint "referral_tracking_one_referrer"
 *
 * So any company that had ever referred anyone could not be deleted at all —
 * which also blocks account closure and anything that cascades through
 * companies. Found by scripts/company-referral-e2e.mjs on teardown, not in
 * review; the two constraints only conflict at delete time.
 *
 * CASCADE is the right rule, and matches the individual side, where
 * referral_tracking_referrer_id_fkey has cascaded from the start. A referral
 * credited to a company that no longer exists is not history worth keeping —
 * there is nobody left to have earned it, and the EP has already been spent or
 * died with the company row.
 */
export async function up() {
  await db.query(`
    ALTER TABLE referral_tracking
      DROP CONSTRAINT IF EXISTS referral_tracking_referrer_company_id_fkey
  `);
  await db.query(`
    ALTER TABLE referral_tracking
      ADD CONSTRAINT referral_tracking_referrer_company_id_fkey
      FOREIGN KEY (referrer_company_id) REFERENCES companies(id) ON DELETE CASCADE
  `);

  console.log('[064] ✅ referral_tracking.referrer_company_id now cascades');
}

export async function down() {
  await db.query(`
    ALTER TABLE referral_tracking
      DROP CONSTRAINT IF EXISTS referral_tracking_referrer_company_id_fkey
  `);
  await db.query(`
    ALTER TABLE referral_tracking
      ADD CONSTRAINT referral_tracking_referrer_company_id_fkey
      FOREIGN KEY (referrer_company_id) REFERENCES companies(id) ON DELETE SET NULL
  `);
}

if (process.argv[1] && process.argv[1].includes('064_referral_company_fk_cascade')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
