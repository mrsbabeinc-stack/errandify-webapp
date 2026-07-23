import db from '../db.js';

/**
 * Migration 075 — make a company suspension accountable.
 *
 * `companies.status` already allows 'suspended', but nothing in the codebase
 * ever read the column, so the admin screen's Suspend button changed a value
 * that gated nothing: the company carried on posting exactly as before. This
 * adds the record that has to exist alongside the enforcement — who suspended
 * them, when, and on what grounds.
 *
 * A reason is required at the route, not merely allowed. A restriction that
 * cannot be explained to the party it restricts should not be applied, and the
 * company has to be told something specific if they ask why they are blocked.
 *
 * Note there is deliberately no 'banned' status. The check constraint permits
 * active/inactive/suspended only, and a permanent company ban is a product
 * decision with its own consequences (existing errands, staff, payouts) that
 * nobody has taken — so the screen offers suspension, which is reversible, and
 * does not pretend to offer a ban it cannot carry out.
 *
 * Retention: this is an enforcement record tied to the company, not personal
 * data of its own; it stays for as long as the company row does under the
 * schedule in docs/DATA_RETENTION.md.
 */
export async function up() {
  await db.query(`
    ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS suspended_at      TIMESTAMP,
      ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
      ADD COLUMN IF NOT EXISTS suspended_by      INTEGER REFERENCES users(id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_companies_status ON companies (status)
  `);

  console.log('[075] ✅ company suspension columns added');
}

export async function down() {
  await db.query(`
    ALTER TABLE companies
      DROP COLUMN IF EXISTS suspended_at,
      DROP COLUMN IF EXISTS suspension_reason,
      DROP COLUMN IF EXISTS suspended_by
  `);
  console.log('[075] ⏪ company suspension columns dropped');
}
