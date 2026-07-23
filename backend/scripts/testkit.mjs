/**
 * Test fixtures that CANNOT touch real data.
 *
 * A previous session seeded with ON CONFLICT DO UPDATE and overwrote a real
 * company owner, then a cleanup by marker deleted the real row. This kit makes
 * that impossible: it uses psql to INSERT only NEW rows, tracks their ids, and
 * teardown deletes exactly those ids — never by marker, never by UPDATE, never
 * touching anything it did not create.
 *
 * psql over the shell rather than importing src/db.js, so it runs under plain
 * node alongside the journey harness without needing tsx.
 */
import { execSync } from 'child_process';

const DB = 'errandify_local';
const q = (sql) => execSync(`psql ${DB} -tAc ${JSON.stringify(sql.replace(/\s+/g, ' ').trim())}`, { encoding: 'utf8' })
  .split('\n').map(l => l.trim()).filter(Boolean)
  .filter(l => !/^(INSERT|UPDATE|DELETE|SELECT) \d/.test(l))[0] || '';
const created = { errands: [], bids: [], orders: [], staff: [], users: [], notifs: [], disputes: [], companies: [] };
const rnd = () => Math.random().toString(36).slice(2, 11);

export function makeUser({ name = 'ZZKIT user', role = 'doer' } = {}) {
  const id = q(`INSERT INTO users (display_name, mobile, nric_hash, role, status)
    VALUES ('${name}', '+650${Math.floor(1e8 + Math.random()*9e8)}', 'ZZKIT_${rnd()}', '${role}', 'active') RETURNING id`);
  created.users.push(id); return Number(id);
}

/**
 * A disposable company. Always INSERTs a new row with a random UEN — it will
 * never find and reuse a real company, which is the mistake that once had a
 * seeder overwrite a live owner.
 */
export function makeCompany(ownerUserId, { name = 'ZZKIT Co', certified = true } = {}) {
  const id = q(`INSERT INTO companies (company_name, uen, owner_user_id, status, certified, certification_date)
    VALUES ('${name} ${rnd()}', 'ZZKIT${Math.floor(1e7 + Math.random()*9e7)}X', ${ownerUserId},
            'active', ${certified}, ${certified ? 'NOW()' : 'NULL'}) RETURNING id`);
  created.companies.push(id); return Number(id);
}

/** Refuses if the user is already staff of that company — cannot overwrite. */
export function addStaff(companyId, userId, role = 'staff') {
  const exists = q(`SELECT 1 FROM company_staff WHERE company_id=${companyId} AND user_id=${userId}`);
  if (exists) throw new Error(`refusing: user ${userId} already staff of company ${companyId} (real data)`);
  const id = q(`INSERT INTO company_staff (company_id, user_id, role, status, position)
    VALUES (${companyId}, ${userId}, '${role}', 'active', 'ZZKIT') RETURNING id`);
  created.staff.push(id); return Number(id);
}

export function makeErrand(askerId, { title = 'errand', category = 'delivery-moving', budget = 50, status = 'open', deadline = '2026-09-05 10:00' } = {}) {
  const id = q(`INSERT INTO errands (asker_id, title, description, category, budget, status, deadline, created_at)
    VALUES (${askerId}, 'ZZKIT ${title}', 't', '${category}', ${budget}, '${status}', '${deadline}', NOW()) RETURNING id`);
  created.errands.push(id); return Number(id);
}

export function makeBid(errandId, doerId, { companyId = null, amount = 40, status = 'pending' } = {}) {
  const id = q(`INSERT INTO bids (errand_id, doer_id, company_id, amount, status)
    VALUES (${errandId}, ${doerId}, ${companyId ?? 'NULL'}, ${amount}, '${status}') RETURNING id`);
  created.bids.push(id); return Number(id);
}

export function makeOrder(companyId, errandId, { status = 'open', assignedStaffId = null } = {}) {
  const id = q(`INSERT INTO company_orders (company_id, errand_id, status, assigned_staff_id)
    VALUES (${companyId}, ${errandId}, '${status}', ${assignedStaffId ?? 'NULL'}) RETURNING id`);
  created.orders.push(id); return Number(id);
}

export function trackDispute(id) { if (id) created.disputes.push(Number(id)); }
export function sql(s) { return q(s); }

const DISPUTE_CHILDREN = ['company_dispute_requests','dispute_admin_actions','dispute_ai_analysis',
  'dispute_appeals','dispute_audit_trail','dispute_compliance_queue','dispute_decisions',
  'dispute_defense_requests','dispute_escalations','dispute_evidence','dispute_notifications',
  'dispute_settlement_legs','dispute_tier_classification','support_queue'];

/** Deletes ONLY ids this kit created, children first. */
export function teardown() {
  const ids = (a) => `{${a.join(',')}}`;
  const del = (s, a) => { if (a.length) q(s.replace('$IDS', ids(a))); };
  if (created.errands.length) {
    q(`DELETE FROM chat_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE errand_id = ANY('${ids(created.errands)}'))`);
    q(`DELETE FROM conversations WHERE errand_id = ANY('${ids(created.errands)}')`);
    q(`DELETE FROM ratings WHERE errand_id = ANY('${ids(created.errands)}')`);
    q(`DELETE FROM notifications WHERE related_errand_id = ANY('${ids(created.errands)}')`);
  }
  // Disputes have many child tables; clear them first, then the disputes,
  // before the errands they hang off.
  const dIds = [...created.disputes];
  if (created.errands.length) {
    const errFilter = `dispute_id IN (SELECT id FROM disputes WHERE errand_id = ANY('${ids(created.errands)}'))`;
    q(`SELECT id FROM disputes WHERE errand_id = ANY('${ids(created.errands)}')`)
      .split(/\s+/).filter(Boolean).forEach(id => dIds.push(Number(id)));
  }
  if (dIds.length) {
    for (const t of DISPUTE_CHILDREN) q(`DELETE FROM ${t} WHERE dispute_id = ANY('${ids(dIds)}')`);
    q(`DELETE FROM disputes WHERE id = ANY('${ids(dIds)}')`);
  }
  del(`DELETE FROM company_orders WHERE id = ANY('$IDS')`, created.orders);
  del(`DELETE FROM bids WHERE id = ANY('$IDS')`, created.bids);
  del(`DELETE FROM errand_assignments WHERE errand_id = ANY('$IDS')`, created.errands);
  del(`DELETE FROM errands WHERE id = ANY('$IDS')`, created.errands);
  del(`DELETE FROM company_staff WHERE id = ANY('$IDS')`, created.staff);
  if (created.companies.length) {
    q(`DELETE FROM company_dispute_requests WHERE company_id = ANY('${ids(created.companies)}')`);
    q(`DELETE FROM company_orders WHERE company_id = ANY('${ids(created.companies)}')`);
    q(`DELETE FROM company_staff WHERE company_id = ANY('${ids(created.companies)}')`);
  }
  del(`DELETE FROM companies WHERE id = ANY('$IDS')`, created.companies);
  if (created.users.length) {
    q(`DELETE FROM screening_declarations WHERE user_id = ANY('${ids(created.users)}')`);
    q(`DELETE FROM user_category_restrictions WHERE user_id = ANY('${ids(created.users)}')`);
  }
  del(`DELETE FROM users WHERE id = ANY('$IDS')`, created.users);
  const total = Object.values(created).reduce((n, a) => n + a.length, 0);
  for (const k of Object.keys(created)) created[k] = [];
  return total;
}
