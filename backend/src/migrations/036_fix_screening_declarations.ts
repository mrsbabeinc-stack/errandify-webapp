import db from '../db.js';

/**
 * Migration 036 — rebuild screening_declarations to match its only consumer.
 *
 * The companion to 035. Migration 016 created this table as a generic
 * key/value record (declaration_type, declared_value, details, expires_at),
 * but routes/screening.ts stores one row per user with a named boolean per
 * statute:
 *
 *   cypa_conviction            Children and Young Persons Act
 *   womens_charter_conviction  Women's Charter
 *   penal_code_conviction      Penal Code
 *   elder_abuse_conviction     elder abuse
 *   dishonesty_conviction      dishonesty offences
 *   any_conviction             derived, stored so queries need not re-OR them
 *   understood_restrictions    the acknowledgement that makes the rest binding
 *   ip_address, consent_timestamp
 *
 * and upserts with ON CONFLICT (user_id), which needs a unique constraint on
 * user_id that the old table did not have.
 *
 * The named columns are the right shape here, not a generic one: these are
 * specific legal declarations a person made about themselves, and each has to
 * be answerable on its own later. Flattening them into declaration_type /
 * declared_value would lose which statute was being answered.
 *
 * Consequence of the mismatch: POST /api/screening/declare failed at its first
 * statement, so nobody has ever completed criminal screening — see 035 for the
 * enforcement half that also never ran.
 */
export async function up() {
  const count = await db.query('SELECT COUNT(*)::int AS n FROM screening_declarations');
  if (count.rows[0].n > 0) {
    throw new Error(
      `screening_declarations holds ${count.rows[0].n} rows — refusing to drop. ` +
      'These are legal declarations; migrate them by hand before running this.'
    );
  }

  await db.query('DROP TABLE IF EXISTS screening_declarations CASCADE');
  await db.query(`
    CREATE TABLE screening_declarations (
      id SERIAL PRIMARY KEY,
      -- One standing declaration per person, replaced when they re-declare.
      -- UNIQUE is what ON CONFLICT (user_id) upserts against.
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      cypa_conviction BOOLEAN NOT NULL DEFAULT FALSE,
      womens_charter_conviction BOOLEAN NOT NULL DEFAULT FALSE,
      penal_code_conviction BOOLEAN NOT NULL DEFAULT FALSE,
      elder_abuse_conviction BOOLEAN NOT NULL DEFAULT FALSE,
      dishonesty_conviction BOOLEAN NOT NULL DEFAULT FALSE,
      any_conviction BOOLEAN NOT NULL DEFAULT FALSE,
      understood_restrictions BOOLEAN NOT NULL DEFAULT FALSE,
      -- Kept as evidence of when and from where consent was given
      ip_address VARCHAR(64),
      consent_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_screening_declarations_any ON screening_declarations(any_conviction)`);

  console.log('[036] ✅ screening_declarations rebuilt to match screening.ts');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS screening_declarations CASCADE');
}

if (process.argv[1] && process.argv[1].includes('036_fix_screening_declarations')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
