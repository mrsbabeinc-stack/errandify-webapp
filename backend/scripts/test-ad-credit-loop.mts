/**
 * Disposable end-to-end test for the ad-credit spend loop.
 * Creates its own user + company + subscription, exercises the REAL service
 * code (allocate → approve → deduct → reject/refund), asserts the money math,
 * then deletes everything it created by id. Touches no real data.
 */
import db from '../src/db.js';
import * as adCredit from '../src/services/adCreditService.js';
import { advertisingService } from '../src/services/advertisingService.js';
import * as adPaymentService from '../src/services/adCreditPaymentService.js';

let ok = 0, fail = 0;
const eq = (label: string, got: any, want: any) => {
  const pass = Number(got) === Number(want);
  console.log(`${pass ? '✅' : '❌'} ${label}: got ${got}, want ${want}`);
  pass ? ok++ : fail++;
};

const ids: { user?: number; company?: number; campaigns: number[] } = { campaigns: [] };

async function main() {
  // --- disposable fixtures ---
  const u = await db.query(
    `INSERT INTO users (email, display_name, role, nric_hash, mobile) VALUES ($1,$2,'asker',$3,$4) RETURNING id`,
    [`adtest_${Date.now()}@disposable.local`, 'Ad Test Owner', `disposable_${Date.now()}`, `+65${Date.now().toString().slice(-8)}`]
  );
  ids.user = u.rows[0].id;

  const c = await db.query(
    `INSERT INTO companies (company_name, uen, owner_user_id) VALUES ($1,$2,$3) RETURNING id`,
    ['Ad Test Co', `TESTUEN${Date.now()}`, ids.user]
  );
  ids.company = c.rows[0].id;

  // platinum subscription so allocation gives $500
  await db.query(
    `INSERT INTO company_subscriptions (company_id, subscription_tier, expires_at)
     VALUES ($1, 'platinum', NOW() + INTERVAL '30 days')`,
    [ids.company]
  );

  // --- allocate monthly credits (real allocator) ---
  await adCredit.allocateMonthlyCredits(ids.company);
  let cr = await adCredit.getCredits(ids.company);
  eq('allocated (cents) = $500', cr?.allocated_amount, 50000);
  eq('used starts at 0', cr?.used_amount, 0);
  eq('available = $500', cr?.available_amount, 50000);

  // --- approve a $40 campaign ---
  const mk = async (budget: number, title: string) => {
    const r = await db.query(
      `INSERT INTO campaigns (company_id, title, budget, starts_at, ends_at, status, created_by)
       VALUES ($1,$2,$3, NOW()+INTERVAL '1 day', NOW()+INTERVAL '8 days', 'submitted', $4) RETURNING id`,
      [ids.company, title, budget, ids.user]
    );
    ids.campaigns.push(r.rows[0].id);
    return r.rows[0].id;
  };

  const camp1 = await mk(40, 'Campaign A $40');
  const res1 = await advertisingService.approveCampaign(camp1, ids.user!, 'ok');
  eq('approve1 creditsRemaining = 460', res1.creditsRemaining, 460);
  cr = await adCredit.getCredits(ids.company);
  eq('spent after $40 = 4000c', cr?.used_amount, 4000);
  eq('available after $40 = 46000c', cr?.available_amount, 46000);

  const usage1 = await db.query(
    `SELECT amount, action FROM ad_credit_usage_log WHERE company_id=$1 AND campaign_id=$2`,
    [ids.company, camp1]
  );
  eq('usage_log rows for camp1', usage1.rows.length, 1);
  eq('usage_log amount = 4000c', usage1.rows[0]?.amount, 4000);

  // --- insufficient guard: $500 budget with only $460 left must throw ---
  const camp2 = await mk(500, 'Campaign B $500 (should fail)');
  let threw = false;
  try { await advertisingService.approveCampaign(camp2, ids.user!, 'ok'); }
  catch (e) { threw = true; console.log(`   ↳ blocked as expected: ${(e as Error).message.slice(0, 60)}…`); }
  eq('over-budget campaign blocked', threw ? 1 : 0, 1);
  cr = await adCredit.getCredits(ids.company);
  eq('spent unchanged after blocked approve', cr?.used_amount, 4000);

  // --- reject the approved camp1 → refund ---
  await advertisingService.rejectCampaign(camp1, ids.user!, 'testing refund');
  cr = await adCredit.getCredits(ids.company);
  eq('spent back to 0 after refund', cr?.used_amount, 0);
  eq('available restored to $500', cr?.available_amount, 50000);

  // --- new billing period resets spend; same-month re-run keeps it ---
  await adCredit.deductCredits(ids.company, 3000); // spend $30 this period
  // same-month re-allocation (expiry unchanged) must KEEP the spend
  await adCredit.allocateMonthlyCredits(ids.company);
  cr = await adCredit.getCredits(ids.company);
  eq('same-month re-alloc keeps spend', cr?.used_amount, 3000);
  // simulate rolling into a new month: push the stored expiry into the past,
  // so the next allocation's end-of-month expiry is DISTINCT → resets spend
  await db.query(
    `UPDATE subscription_ad_credits SET expires_at = NOW() - INTERVAL '2 days' WHERE company_id=$1`,
    [ids.company]
  );
  await adCredit.allocateMonthlyCredits(ids.company); // new period
  cr = await adCredit.getCredits(ids.company);
  eq('new-period re-alloc resets spend to 0', cr?.used_amount, 0);

  // --- live /process flow (credits-only): processAdPayment deducts once and
  //     marks the campaign approved. Previously the route 500'd on SELECT name
  //     AFTER this deducted, so credits moved but the user saw failure. ---
  const camp3 = await mk(30, 'Campaign C $30 processAdPayment');
  const pay = await adPaymentService.processAdPayment(ids.company!, camp3, 'Campaign C', 3000);
  eq('processAdPayment success', pay.success ? 1 : 0, 1);
  cr = await adCredit.getCredits(ids.company);
  eq('spent once after processAdPayment $30', cr?.used_amount, 3000);
  const st = await db.query(`SELECT status FROM campaigns WHERE id=$1`, [camp3]);
  eq('campaign approved by processAdPayment', st.rows[0]?.status === 'approved' ? 1 : 0, 1);
}

async function cleanup() {
  if (ids.campaigns.length) {
    await db.query(`DELETE FROM ad_schedules WHERE campaign_id = ANY($1)`, [ids.campaigns]).catch(() => {});
    await db.query(`DELETE FROM ad_credit_usage_log WHERE campaign_id = ANY($1)`, [ids.campaigns]).catch(() => {});
    await db.query(`DELETE FROM payment_holds_status WHERE transaction_id = ANY($1)`,
      [ids.campaigns.map((i) => `campaign_${i}`)]).catch(() => {});
    await db.query(`DELETE FROM campaigns WHERE id = ANY($1)`, [ids.campaigns]).catch(() => {});
  }
  if (ids.company) {
    await db.query(`DELETE FROM subscription_ad_credits WHERE company_id=$1`, [ids.company]).catch(() => {});
    await db.query(`DELETE FROM company_subscriptions WHERE company_id=$1`, [ids.company]).catch(() => {});
    await db.query(`DELETE FROM companies WHERE id=$1`, [ids.company]).catch(() => {});
  }
  if (ids.user) {
    await db.query(`DELETE FROM notifications WHERE user_id=$1`, [ids.user]).catch(() => {});
    await db.query(`DELETE FROM users WHERE id=$1`, [ids.user]).catch(() => {});
  }
  console.log('🧹 cleaned up disposable fixtures', ids);
}

main()
  .catch((e) => { console.error('TEST ERROR:', e); fail++; })
  .finally(async () => {
    await cleanup();
    console.log(`\n=== ${ok} passed, ${fail} failed ===`);
    await db.end?.();
    process.exit(fail ? 1 : 0);
  });
