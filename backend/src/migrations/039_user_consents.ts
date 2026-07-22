import db from '../db.js';

/**
 * Migration 039 — record the signup consents.
 *
 * The verification step collects eight agreements — terms, privacy, responsible
 * use, work authorisation, accuracy of information, consent to background
 * verification, and declarations about past disputes and cancelled accounts —
 * and POSTed them to /api/screenings, a route that does not exist. The call
 * failed, the step showed "Verification Complete" anyway, and nothing was ever
 * stored. So there is no record that any user agreed to the terms.
 *
 * These are separate from the criminal declarations in screening_declarations:
 * those are statutory answers that drive category restrictions, these are
 * consents. Keeping them apart means a change to the terms does not touch a
 * legal declaration about convictions, and vice versa.
 *
 * One row per user, replaced if they re-consent, with the timestamp and IP kept
 * as evidence of when agreement was given.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_consents (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      agreed_terms BOOLEAN NOT NULL DEFAULT FALSE,
      agreed_privacy BOOLEAN NOT NULL DEFAULT FALSE,
      responsible_use BOOLEAN NOT NULL DEFAULT FALSE,
      authorized_to_work BOOLEAN NOT NULL DEFAULT FALSE,
      accurate_information BOOLEAN NOT NULL DEFAULT FALSE,
      agreed_background_verification BOOLEAN NOT NULL DEFAULT FALSE,
      no_disputes BOOLEAN NOT NULL DEFAULT FALSE,
      no_cancelled_accounts BOOLEAN NOT NULL DEFAULT FALSE,
      ip_address VARCHAR(64),
      consented_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log('[039] ✅ user_consents created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS user_consents CASCADE');
}

if (process.argv[1] && process.argv[1].includes('039_user_consents')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
