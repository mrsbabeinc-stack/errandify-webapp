import db from '../db.js';

/**
 * Migration 044 — let the applicant say something in their own words.
 *
 * A reviewer currently sees three booleans and a date. That is enough to apply
 * a rule and not enough to judge a person, which is what a review actually is.
 * This is the only field in the declaration that can widen the picture rather
 * than narrow it — every other question can only count against them.
 *
 * Optional, and blank is not evidence of anything.
 *
 * ⚠️ Holds conviction details in free text, so it is more sensitive than the
 * booleans beside it. Visible to reviewing admins only, and cleared when a
 * declaration is superseded so it does not outlive its purpose.
 */
export async function up() {
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS applicant_note TEXT`);
  console.log('[044] ✅ applicant_note added');
}

export async function down() {
  await db.query('ALTER TABLE screening_declarations DROP COLUMN IF EXISTS applicant_note');
}

if (process.argv[1] && process.argv[1].includes('044_applicant_note')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
