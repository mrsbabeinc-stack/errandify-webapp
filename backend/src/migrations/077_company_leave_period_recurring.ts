import db from '../db.js';

/**
 * Migration 077 — the half-day and recurring parts of company leave.
 *
 * StaffLeaveApplication.tsx collects a period (full-day / morning / afternoon)
 * and a full recurring pattern (weekly / bi-weekly / monthly, chosen days, an
 * end date or ongoing), and POSTs all of it to /api/leave/request. That handler
 * accepts the fields, echoes `period` back in its success response — and its
 * INSERT writes neither. `company_leave` had no column for either.
 *
 * So a staff member could block every Monday afternoon, be told "✅ Leave
 * request submitted", and have a full-day one-off stored instead. The company
 * calendar then showed something nobody had asked for.
 *
 * `recurring_pattern` is JSONB because the shape is owned by the frontend
 * helper (utils/recurringLeaveHelper) and expanding it into columns would
 * duplicate that contract in SQL for no gain — nothing queries inside it; it is
 * read whole and expanded client-side.
 *
 * Retention: this is personal data about an identified staff member and is
 * covered by whatever schedule applies to `company_leave` in
 * docs/DATA_RETENTION.md. `reason` can carry medical detail, so treat the whole
 * row as sensitive; these columns add no new category.
 */
export async function up() {
  await db.query(`
    ALTER TABLE company_leave
      ADD COLUMN IF NOT EXISTS period            VARCHAR(20) NOT NULL DEFAULT 'full-day',
      ADD COLUMN IF NOT EXISTS is_recurring      BOOLEAN     NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS recurring_pattern JSONB;
  `);

  // Existing rows are all one-off full-days, which is what the default gives
  // them, so there is nothing to backfill.

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'company_leave_period_check'
      ) THEN
        ALTER TABLE company_leave
          ADD CONSTRAINT company_leave_period_check
          CHECK (period IN ('full-day', 'morning', 'afternoon'));
      END IF;
    END $$;
  `);

  // The calendar always queries a company over a date window
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_company_leave_company_dates
      ON company_leave (company_id, start_date, end_date);
  `);

  console.log('✅ Migration 077: company_leave.period / is_recurring / recurring_pattern added');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_company_leave_company_dates;`);
  await db.query(`ALTER TABLE company_leave DROP CONSTRAINT IF EXISTS company_leave_period_check;`);
  await db.query(`
    ALTER TABLE company_leave
      DROP COLUMN IF EXISTS period,
      DROP COLUMN IF EXISTS is_recurring,
      DROP COLUMN IF EXISTS recurring_pattern;
  `);
  console.log('⏪ Migration 077 reverted');
}
