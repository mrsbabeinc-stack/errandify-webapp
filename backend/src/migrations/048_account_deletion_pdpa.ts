import db from '../db.js';

/**
 * Account deletion that actually discharges PDPA s25.
 *
 * The previous implementation set `is_deleted = true` and nulled four fields.
 * Two of the columns it wrote (is_deleted, password_hash) do not exist, so it
 * threw before deleting anything — but even had it run, it would not have been
 * compliant:
 *
 *   PDPC Advisory Guidelines on Key Concepts, 18.11 —
 *   "personal data in electronic form(s) which are archived or to which access
 *    is limited will still be considered to be retained"
 *
 * A deleted flag is retention with the lights off. Eighteen identifying fields
 * survived it, including nric_hash, singpass_id, account_number,
 * stripe_account_id and conviction_details.
 *
 * The lawful options under s25 are to destroy the data or to anonymise it
 * (18.10(d)); anonymised data is deemed no longer retained (18.14). Rows cannot
 * simply be dropped, because the counterparty's errand and payment history is
 * retained for a legal purpose — 18.4(b), and PDPC's own worked example uses
 * the Limitation Act's six-year window for contract claims and suggests keeping
 * contract records about seven years.
 *
 * So: strip the person from the row, keep the transaction, and purge on a
 * schedule (18.8 expects that schedule to be written down —
 * docs/DATA_RETENTION.md).
 *
 * anonymised_at records WHEN, so the purge job has something to count from and
 * so we can evidence compliance. It holds no personal data itself.
 */

export async function up(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS anonymised_at   TIMESTAMP,
        ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(40)
    `);

    // The purge job scans on this; without it the scan is a full table sweep.
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_anonymised_at
        ON users (anonymised_at) WHERE anonymised_at IS NOT NULL
    `);

    // 'deleted' was not in the existing status vocabulary, so a deleted account
    // had no state to sit in.
    await client.query(`
      COMMENT ON COLUMN users.anonymised_at IS
        'When the identity was stripped under PDPA s25. Retained rows are pseudonymous after this point; the purge job removes them once every retention period in docs/DATA_RETENTION.md has elapsed.'
    `);

    await client.query('COMMIT');
    console.log('[048] users.anonymised_at + deletion_reason added');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function down(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`DROP INDEX IF EXISTS idx_users_anonymised_at`);
    await client.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS anonymised_at,
        DROP COLUMN IF EXISTS deletion_reason
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
