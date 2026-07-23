import db from '../db.js';

/**
 * Migration 079 — dates a company does not operate.
 *
 * The "Special Dates & Public Holidays" panel in CompanyOperatingHours.tsx lets
 * an owner block individual days — public holidays they don't work, plus their
 * own custom closures. It was pure local state: blocking Christmas showed a
 * blocked Christmas until the next reload, then forgot.
 *
 * Public holidays themselves are NOT stored here. They are reference data and
 * already come from utils/publicHolidayService; duplicating the 2026 calendar
 * into every company's rows would mean re-seeding it every year. This table
 * records only the company's DECISION about a date — which is the part that
 * differs per company and the part the panel exists to capture. A holiday the
 * company works simply has no row.
 *
 * Retention: no personal data — a company id, a date, and a label. It describes
 * the business, not a person, so nothing here falls under the PDPA s25 purge in
 * docs/DATA_RETENTION.md; it lives and dies with the company row.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_blocked_dates (
      id           SERIAL PRIMARY KEY,
      company_id   INTEGER     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      blocked_date DATE        NOT NULL,
      name         VARCHAR(160),
      -- 'holiday' = a public holiday the company chose not to work
      -- 'custom'  = a closure of its own (stocktake, company trip, …)
      kind         VARCHAR(20) NOT NULL DEFAULT 'custom',
      created_by   INTEGER     REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT company_blocked_dates_unique UNIQUE (company_id, blocked_date),
      CONSTRAINT company_blocked_dates_kind_check CHECK (kind IN ('holiday', 'custom'))
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_company_blocked_dates_lookup
      ON company_blocked_dates (company_id, blocked_date);
  `);

  console.log('✅ Migration 079: company_blocked_dates created');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_company_blocked_dates_lookup;`);
  await db.query(`DROP TABLE IF EXISTS company_blocked_dates;`);
  console.log('⏪ Migration 079 reverted');
}
