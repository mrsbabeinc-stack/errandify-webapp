import db from '../db.js';

/**
 * Migration 035 — rebuild user_category_restrictions to match its only consumer.
 *
 * Migration 016 created this table from a guess at its shape, and the guess was
 * wrong in every column that matters. routes/screening.ts — the only code that
 * touches it — needs:
 *
 *   restricted_category_id   FK to restricted_categories, joined in two queries
 *   is_active                filtered on in three places (016 called it 'active')
 *   restriction_start/_end   selected and written; 016 had neither
 *   UNIQUE(user_id, restricted_category_id)
 *                            required by ON CONFLICT in two inserts
 *
 * 016 instead created (user_id, category, reason, restricted_by_user_id,
 * active), so every statement in screening.ts failed against it.
 *
 * This matters more than a 500 on a status endpoint. These restrictions are the
 * enforcement half of the vulnerability-protection rules: declaring a conviction
 * is supposed to bar that account from Childcare, Elderly Care, Live-in Care and
 * the rest. The insert applying those bars targets restricted_category_id and
 * therefore threw every time — so a declared conviction restricted nothing, and
 * the declaration was recorded while the protection it exists to trigger
 * silently did not happen.
 *
 * The table holds no rows, so it is replaced rather than migrated column by
 * column. restricted_categories already exists and is seeded with the six
 * categories; it is left untouched.
 */
export async function up() {
  const count = await db.query('SELECT COUNT(*)::int AS n FROM user_category_restrictions');
  if (count.rows[0].n > 0) {
    throw new Error(
      `user_category_restrictions holds ${count.rows[0].n} rows — refusing to drop. ` +
      'Migrate the data by hand before running this.'
    );
  }

  await db.query('DROP TABLE IF EXISTS user_category_restrictions CASCADE');
  await db.query(`
    CREATE TABLE user_category_restrictions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      restricted_category_id INTEGER NOT NULL REFERENCES restricted_categories(id) ON DELETE CASCADE,
      reason TEXT,
      restriction_start TIMESTAMP NOT NULL DEFAULT NOW(),
      -- NULL means indefinite; the queries read it as
      -- "restriction_end IS NULL OR restriction_end > NOW()"
      restriction_end TIMESTAMP,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      restricted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      -- A plain UNIQUE constraint, not a partial index: ON CONFLICT
      -- (user_id, restricted_category_id) cannot use a partial one.
      UNIQUE (user_id, restricted_category_id)
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_category_restrictions_active
      ON user_category_restrictions(user_id, is_active)
  `);

  console.log('[035] ✅ user_category_restrictions rebuilt to match screening.ts');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS user_category_restrictions CASCADE');
}

if (process.argv[1] && process.argv[1].includes('035_fix_user_category_restrictions')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
