import db from '../db.js';

/**
 * Migration 031 — allow 'declined' on company_orders.status.
 *
 * Migration 030 added the columns for recording a decline, but the status
 * itself is constrained:
 *   CHECK (status IN ('open','assigned','in_progress','completed','cancelled'))
 * so writing 'declined' fails with company_orders_status_check and the decline
 * endpoint returns a 500 no matter what it is given.
 *
 * The other statuses in the codebase were checked before widening this:
 * bids.ts inserts 'open', companyRoutes sets 'assigned'/'in_progress'/
 * 'completed'. 'pending_company' appears nearby but belongs to
 * company_dispute_requests, a different table, so it is deliberately not
 * added here — the constraint stays as tight as the data allows.
 */
const ALLOWED = ['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'declined'];

export async function up() {
  await db.query('ALTER TABLE company_orders DROP CONSTRAINT IF EXISTS company_orders_status_check');
  await db.query(
    `ALTER TABLE company_orders ADD CONSTRAINT company_orders_status_check
       CHECK (status IN (${ALLOWED.map((s) => `'${s}'`).join(', ')}))`
  );
  console.log('[031] ✅ company_orders.status now allows: ' + ALLOWED.join(', '));
}

export async function down() {
  await db.query('ALTER TABLE company_orders DROP CONSTRAINT IF EXISTS company_orders_status_check');
  await db.query(
    `ALTER TABLE company_orders ADD CONSTRAINT company_orders_status_check
       CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled'))`
  );
}

if (process.argv[1] && process.argv[1].includes('031_company_order_declined_status')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
