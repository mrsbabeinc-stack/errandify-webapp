import db from '../db.js';

/**
 * Staff onboarding: the employee fills in their own details once they are hired.
 *
 * Until now an admin typed someone else's bank account number into a form. That
 * is wrong twice over — it is the single most consequential field in payroll to
 * mistype, and it means an administrator handles an account number that only
 * the employee and the bank need to see. The person who owns the account should
 * enter it.
 *
 * SECURITY, because this collects bank details and a home address:
 *
 *  - The token is stored HASHED. The candidate-screening invites in this repo
 *    keep their token in plaintext, which is a fair trade for questionnaire
 *    answers; it is not a fair trade for a field that decides where a salary
 *    lands. A dump of this table yields no working links.
 *  - The token alone is not enough. The employee also proves who they are with
 *    the last four characters of the NRIC the employer already holds, so a
 *    forwarded email or a shared device does not hand someone the ability to
 *    redirect a salary.
 *  - Attempts are limited and the invite locks, so the four characters cannot
 *    be guessed.
 *  - The form is WRITE-ONLY. It never shows the details already on file, so the
 *    link cannot be used to read anything back.
 *
 * On using NRIC to verify: PDPC's NRIC advisory allows it where identity must
 * be established to a high degree of fidelity. An employer confirming its own
 * employee before accepting new bank details is that case, and the NRIC is
 * already lawfully held for CPF and IRAS. Only the last four characters are
 * ever compared, and they are never returned.
 */

export async function up(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_onboarding_invites (
      id              SERIAL PRIMARY KEY,
      staff_id        VARCHAR(10) NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
      token_hash      VARCHAR(64) NOT NULL UNIQUE,
      status          VARCHAR(20) NOT NULL DEFAULT 'sent'
                      CHECK (status IN ('sent','verified','completed','revoked')),
      expires_at      TIMESTAMP NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until    TIMESTAMP,
      verified_at     TIMESTAMP,
      completed_at    TIMESTAMP,
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      revoked_at      TIMESTAMP
    )
  `);
  // One live invite per employee; re-inviting revokes the old one first.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_live_onboarding_invite
      ON staff_onboarding_invites (staff_id)
      WHERE status IN ('sent','verified')
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_onboarding_token_hash
      ON staff_onboarding_invites (token_hash)
  `);

  /**
   * What the employee submitted and when. Kept separately from the staff row so
   * there is a record that THEY provided it, not an administrator — which is
   * the point of the exercise and the thing you would want on hand if a payment
   * ever went to the wrong account.
   */
  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_onboarding_submissions (
      id            SERIAL PRIMARY KEY,
      invite_id     INTEGER NOT NULL REFERENCES staff_onboarding_invites(id) ON DELETE CASCADE,
      staff_id      VARCHAR(10) NOT NULL,
      fields        TEXT[] NOT NULL DEFAULT '{}',
      submitted_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Consent captured at the point of collection, per PDPA notification duty.
  await db.query(`
    ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS onboarding_notice_accepted_at TIMESTAMP
  `);

  console.log('[073] staff onboarding invites and submissions created');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS staff_onboarding_submissions CASCADE`);
  await db.query(`DROP TABLE IF EXISTS staff_onboarding_invites CASCADE`);
  await db.query(`
    ALTER TABLE staff
      DROP COLUMN IF EXISTS onboarding_completed_at,
      DROP COLUMN IF EXISTS onboarding_notice_accepted_at
  `);
  console.log('[073] staff onboarding tables dropped');
}
