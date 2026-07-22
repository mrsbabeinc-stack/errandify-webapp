import db from '../db.js';

/**
 * Migration 030 — recording why staff declined an allocation.
 *
 * StaffDashboard has a decline flow that collects a reason and free-text notes,
 * and posts them to /api/errands/:id/errand-decline — a route that did not
 * exist, so declining silently did nothing and the job stayed allocated to
 * someone who had refused it.
 *
 * company_orders had no way to record a decline either: no 'declined' status in
 * use and nowhere to put the reason. ManagerStaffAllocations already renders a
 * decline_reason field, which until now was hardcoded null on the way out.
 *
 * declined_at is separate from updated_at so a later status change does not
 * overwrite when the refusal happened.
 */
export async function up() {
  await db.query(`ALTER TABLE company_orders ADD COLUMN IF NOT EXISTS decline_reason TEXT`);
  await db.query(`ALTER TABLE company_orders ADD COLUMN IF NOT EXISTS decline_notes TEXT`);
  await db.query(`ALTER TABLE company_orders ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP`);
  await db.query(`ALTER TABLE company_orders ADD COLUMN IF NOT EXISTS declined_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_company_orders_staff ON company_orders(assigned_staff_id, status)`);
  console.log('[030] ✅ company_orders decline columns added');
}

export async function down() {
  await db.query(`ALTER TABLE company_orders DROP COLUMN IF EXISTS decline_reason`);
  await db.query(`ALTER TABLE company_orders DROP COLUMN IF EXISTS decline_notes`);
  await db.query(`ALTER TABLE company_orders DROP COLUMN IF EXISTS declined_at`);
  await db.query(`ALTER TABLE company_orders DROP COLUMN IF EXISTS declined_by`);
}

if (process.argv[1] && process.argv[1].includes('030_company_order_decline')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
