/**
 * HTTP-level test of the /api/ad-payment/process guards against the LIVE server.
 * Verifies: non-owner is rejected (403), owner pays once (200 + single deduct +
 * approved), and a retry is idempotent (409, no double-deduct). Disposable
 * fixtures only, torn down by id.
 */
import db from '../src/db.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';
import * as adCredit from '../src/services/adCreditService.js';

const BASE = 'http://localhost:3000';
let ok = 0, fail = 0;
const eq = (label: string, got: any, want: any) => {
  // numeric when both look numeric (pg returns NUMERIC as "2000.00"), else string
  const numeric = !isNaN(Number(got)) && !isNaN(Number(want));
  const pass = numeric ? Number(got) === Number(want) : String(got) === String(want);
  console.log(`${pass ? '✅' : '❌'} ${label}: got ${got}, want ${want}`);
  pass ? ok++ : fail++;
};
const token = (userId: number, email: string) => jwt.sign({ userId: String(userId), email }, config.jwtSecret);

const ids: { owner?: number; stranger?: number; company?: number; campaign?: number } = {};

async function mkUser(tag: string) {
  const r = await db.query(
    `INSERT INTO users (email, display_name, role, nric_hash, mobile, status)
     VALUES ($1,$2,'asker',$3,$4,'active') RETURNING id`,
    [`adhttp_${tag}_${Date.now()}@disposable.local`, `Ad HTTP ${tag}`, `disp_${tag}_${Date.now()}`, `+65${Date.now().toString().slice(-8)}`]
  );
  return r.rows[0].id as number;
}

async function post(path: string, tok: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  ids.owner = await mkUser('owner');
  ids.stranger = await mkUser('stranger');

  const c = await db.query(
    `INSERT INTO companies (company_name, uen, owner_user_id) VALUES ($1,$2,$3) RETURNING id`,
    ['Ad HTTP Co', `HTTPUEN${Date.now()}`, ids.owner]
  );
  ids.company = c.rows[0].id;
  await db.query(
    `INSERT INTO company_subscriptions (company_id, subscription_tier, expires_at)
     VALUES ($1,'platinum', NOW() + INTERVAL '30 days')`, [ids.company]);
  await adCredit.allocateMonthlyCredits(ids.company);

  const camp = await db.query(
    `INSERT INTO campaigns (company_id, title, budget, starts_at, ends_at, status, created_by)
     VALUES ($1,'HTTP Campaign $20', 20, NOW()+INTERVAL '1 day', NOW()+INTERVAL '8 days', 'submitted', $2) RETURNING id`,
    [ids.company, ids.owner]);
  ids.campaign = camp.rows[0].id;

  const ownerTok = token(ids.owner!, 'owner@x');
  const strangerTok = token(ids.stranger!, 'stranger@x');
  const body = { campaign_id: ids.campaign, company_id: ids.company, stripe_payment_intent_id: null };

  // 1) stranger (not owner/manager) must be blocked BEFORE any money moves
  const r1 = await post('/api/ad-payment/process', strangerTok, body);
  eq('stranger /process blocked', r1.status, 403);
  let cr = await adCredit.getCredits(ids.company);
  eq('no deduction after blocked call', cr?.used_amount, 0);

  // 2) owner pays once → 200, $20 deducted, campaign approved
  const r2 = await post('/api/ad-payment/process', ownerTok, body);
  eq('owner /process ok', r2.status, 200);
  cr = await adCredit.getCredits(ids.company);
  eq('deducted $20 once', cr?.used_amount, 2000);
  const st = await db.query(`SELECT status FROM campaigns WHERE id=$1`, [ids.campaign]);
  eq('campaign approved', st.rows[0]?.status, 'approved');

  // 3) retry is idempotent → 409, NO second deduction
  const r3 = await post('/api/ad-payment/process', ownerTok, body);
  eq('retry blocked (idempotent)', r3.status, 409);
  cr = await adCredit.getCredits(ids.company);
  eq('still only $20 deducted', cr?.used_amount, 2000);
}

async function cleanup() {
  if (ids.campaign) {
    await db.query(`DELETE FROM ad_schedules WHERE campaign_id=$1`, [ids.campaign]).catch(() => {});
    await db.query(`DELETE FROM ad_credit_usage_log WHERE campaign_id=$1`, [ids.campaign]).catch(() => {});
    await db.query(`DELETE FROM payment_holds_status WHERE transaction_id=$1`, [`campaign_${ids.campaign}`]).catch(() => {});
    await db.query(`DELETE FROM campaigns WHERE id=$1`, [ids.campaign]).catch(() => {});
  }
  if (ids.company) {
    await db.query(`DELETE FROM subscription_ad_credits WHERE company_id=$1`, [ids.company]).catch(() => {});
    await db.query(`DELETE FROM company_subscriptions WHERE company_id=$1`, [ids.company]).catch(() => {});
    await db.query(`DELETE FROM companies WHERE id=$1`, [ids.company]).catch(() => {});
  }
  for (const u of [ids.owner, ids.stranger]) {
    if (u) {
      await db.query(`DELETE FROM notifications WHERE user_id=$1`, [u]).catch(() => {});
      await db.query(`DELETE FROM users WHERE id=$1`, [u]).catch(() => {});
    }
  }
  console.log('🧹 cleaned up', ids);
}

main()
  .catch((e) => { console.error('TEST ERROR:', e); fail++; })
  .finally(async () => { await cleanup(); console.log(`\n=== ${ok} passed, ${fail} failed ===`); await db.end?.(); process.exit(fail ? 1 : 0); });
