/**
 * HTTP test of the real Stripe Checkout leg for over-budget ad campaigns.
 * Proves the integration up to the hosted card-entry boundary (which only the
 * user can complete): /calculate split, /stripe-session returns a real Checkout
 * URL, /verify-session rejects an unpaid session and deducts nothing, and the
 * auth gate blocks a non-owner. Disposable fixtures, torn down by id.
 */
import db from '../src/db.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';
import * as adCredit from '../src/services/adCreditService.js';

const BASE = 'http://localhost:3000';
let ok = 0, fail = 0;
const eq = (label: string, got: any, want: any) => {
  const numeric = !isNaN(Number(got)) && !isNaN(Number(want));
  const pass = numeric ? Number(got) === Number(want) : String(got) === String(want);
  console.log(`${pass ? '✅' : '❌'} ${label}: got ${got}, want ${want}`);
  pass ? ok++ : fail++;
};
const truthy = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${label}${detail ? ` (${detail})` : ''}`);
  cond ? ok++ : fail++;
};
const token = (u: number, e: string) => jwt.sign({ userId: String(u), email: e }, config.jwtSecret);

const ids: { owner?: number; stranger?: number; company?: number; campaign?: number } = {};
async function mkUser(tag: string) {
  const r = await db.query(
    `INSERT INTO users (email, display_name, role, nric_hash, mobile, status)
     VALUES ($1,$2,'asker',$3,$4,'active') RETURNING id`,
    [`stripe_${tag}_${Date.now()}@disposable.local`, `Stripe ${tag}`, `disp_${tag}_${Date.now()}`, `+65${Date.now().toString().slice(-8)}`]
  );
  return r.rows[0].id as number;
}
async function post(path: string, tok: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  ids.owner = await mkUser('owner');
  ids.stranger = await mkUser('stranger');
  const c = await db.query(
    `INSERT INTO companies (company_name, uen, owner_user_id) VALUES ($1,$2,$3) RETURNING id`,
    ['Stripe Leg Co', `SLEGUEN${Date.now()}`, ids.owner]);
  ids.company = c.rows[0].id;
  await db.query(`INSERT INTO company_subscriptions (company_id, subscription_tier, expires_at)
     VALUES ($1,'platinum', NOW() + INTERVAL '30 days')`, [ids.company]);
  await adCredit.allocateMonthlyCredits(ids.company); // $500 credits

  // budget $600 > $500 credits → $500 credits + $100 Stripe
  const camp = await db.query(
    `INSERT INTO campaigns (company_id, title, budget, starts_at, ends_at, status, created_by)
     VALUES ($1,'Over-budget $600', 600, NOW()+INTERVAL '1 day', NOW()+INTERVAL '8 days', 'submitted', $2) RETURNING id`,
    [ids.company, ids.owner]);
  ids.campaign = camp.rows[0].id;

  const ownerTok = token(ids.owner!, 'o@x');
  const strangerTok = token(ids.stranger!, 's@x');
  const body = { campaign_id: ids.campaign, company_id: ids.company, return_url: 'http://localhost:5173/advertising' };

  // 1) calculate split
  const calc = await post('/api/ad-payment/calculate', ownerTok, { campaign_id: ids.campaign, company_id: ids.company });
  eq('calculate ok', calc.status, 200);
  eq('requires_stripe_payment', String(calc.json.data?.requires_stripe_payment), 'true');
  eq('credits_to_use = $500', calc.json.data?.credits_to_use_cents, 50000);
  eq('stripe_amount = $100', calc.json.data?.stripe_amount_cents, 10000);

  // 2) stranger blocked from creating a session
  const s0 = await post('/api/ad-payment/stripe-session', strangerTok, body);
  eq('stranger stripe-session blocked', s0.status, 403);

  // 3) owner creates a real Stripe Checkout session
  const s1 = await post('/api/ad-payment/stripe-session', ownerTok, body);
  eq('stripe-session ok', s1.status, 200);
  eq('server-computed stripe amount = $100', s1.json.data?.stripe_amount_cents, 10000);
  const url: string = s1.json.data?.url || '';
  const sid: string = s1.json.data?.session_id || '';
  truthy('returns real Checkout URL', url.startsWith('https://checkout.stripe.com/') || url.includes('stripe.com'), url.slice(0, 40));
  truthy('returns a session id', sid.startsWith('cs_'), sid.slice(0, 12));

  // 4) verify-session on the UNPAID session must fail and deduct nothing
  const v1 = await post('/api/ad-payment/verify-session', ownerTok, { session_id: sid, company_id: ids.company });
  eq('unpaid verify rejected', v1.status, 400);
  truthy('rejection mentions payment not completed', /not completed|unpaid|finish/i.test(v1.json.error || ''), v1.json.error?.slice(0, 40));
  const cr = await adCredit.getCredits(ids.company);
  eq('no credits deducted (still 0 used)', cr?.used_amount, 0);
  const st = await db.query(`SELECT status FROM campaigns WHERE id=$1`, [ids.campaign]);
  eq('campaign still submitted (not approved)', st.rows[0]?.status, 'submitted');
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
  for (const u of [ids.owner, ids.stranger]) if (u) {
    await db.query(`DELETE FROM notifications WHERE user_id=$1`, [u]).catch(() => {});
    await db.query(`DELETE FROM users WHERE id=$1`, [u]).catch(() => {});
  }
  console.log('🧹 cleaned up', ids);
}

main().catch((e) => { console.error('TEST ERROR:', e); fail++; })
  .finally(async () => { await cleanup(); console.log(`\n=== ${ok} passed, ${fail} failed ===`); await db.end?.(); process.exit(fail ? 1 : 0); });
