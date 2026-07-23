import db from '../db.js';

/**
 * Repairs leave_requests to match what routes/leaves.ts actually writes.
 *
 * Migration 009 created the table with a narrower shape than the route was
 * written against. Every POST /api/admin/leaves therefore died on
 *   column "period" of relation "leave_requests" does not exist
 * and returned a 500 — leave requests could never be filed through the admin.
 *
 * It went unnoticed because LeaveManagementDashboard caught the rejection,
 * logged "API save failed, using local storage only", and pushed the request
 * into React state anyway, so the screen showed a success toast either way.
 *
 * Columns added (all referenced by leaves.ts, none present):
 *   period          — full-day / morning / afternoon, drives the 0.5 day count
 *   days_count      — computed span, what the balance calculation sums
 *   is_recurring    — recurring-pattern flag, pairs with recurring_pattern
 *   approval_notes  — manager's note on approve/reject
 *   last_modified   — the route sets this; the table only had updated_at
 *
 * Additive only: no existing column is altered or dropped.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE leave_requests
      ADD COLUMN IF NOT EXISTS period         VARCHAR(20) DEFAULT 'full-day',
      ADD COLUMN IF NOT EXISTS days_count     NUMERIC(5,1),
      ADD COLUMN IF NOT EXISTS is_recurring   BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS approval_notes TEXT,
      ADD COLUMN IF NOT EXISTS last_modified  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  // Existing rows predate days_count; derive it from the dates they already
  // carry so leave-balance sums do not silently treat them as zero.
  await db.query(`
    UPDATE leave_requests
       SET days_count = (end_date - start_date) + 1
     WHERE days_count IS NULL
  `);

  console.log('[059] leave_requests columns repaired');
}

export async function down(): Promise<void> {
  await db.query(`
    ALTER TABLE leave_requests
      DROP COLUMN IF EXISTS period,
      DROP COLUMN IF EXISTS days_count,
      DROP COLUMN IF EXISTS is_recurring,
      DROP COLUMN IF EXISTS approval_notes,
      DROP COLUMN IF EXISTS last_modified
  `);
}
