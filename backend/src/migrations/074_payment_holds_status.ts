import db from '../db.js';

/**
 * Migration 074 — the payment_holds_status table two services already write to.
 *
 * `advertisingService` inserts a hold when a campaign is approved and releases
 * it when the campaign ends, but no migration ever created the table, so
 * approving a campaign threw "relation payment_holds_status does not exist" and
 * rolled the whole approval back. Nothing surfaced it because the admin router
 * in front of it returned 403 to everybody (see routes/advertisingAdmin.ts).
 *
 * `transaction_id` is a caller-supplied business key, not a foreign key — the
 * advertising service writes `campaign_<id>` and the payments screen is expected
 * to write its own transaction references — so it is a plain unique VARCHAR
 * rather than a reference to one table.
 *
 * Retention: this is a financial record and stays under the 7-year schedule in
 * docs/DATA_RETENTION.md (PDPC Key Concepts 18.4(b), Limitation Act contract
 * window). It holds no personal data of its own — only an amount, a status and
 * a reference — so nothing here needs anonymising at the s25 point; the identity
 * lives on the company and campaign rows it points at.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_holds_status (
      id              SERIAL PRIMARY KEY,
      transaction_id  VARCHAR(255) NOT NULL UNIQUE,
      amount          NUMERIC(10,2) NOT NULL,
      status          VARCHAR(50)  NOT NULL DEFAULT 'held',
      hold_reason     TEXT,
      created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
      released_at     TIMESTAMP,
      CONSTRAINT payment_holds_status_status_check
        CHECK (status IN ('held', 'released', 'cancelled'))
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_holds_status_status
      ON payment_holds_status (status, created_at DESC)
  `);

  console.log('[074] ✅ payment_holds_status created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS payment_holds_status');
  console.log('[074] ⏪ payment_holds_status dropped');
}
