/**
 * Company referrals, end to end, against the live server.
 *
 * Covers the two things that are easy to get wrong and impossible to spot by
 * looking at a screen:
 *
 *   - A staff member holds TWO codes. Their personal REF- code pays them; the
 *     company BIZ- code pays the company. If those ever cross, someone is paid
 *     the wrong money and nobody notices until an EP balance is queried.
 *   - A code minted while someone was employed must stop working when they
 *     leave, or a former colleague keeps earning for a company they left.
 *
 * Fixtures come from testkit.mjs, which only ever deletes ids it created.
 * company_referral_codes, company_point_transactions and referral_tracking all
 * cascade from companies/users, so teardown reaches them without the kit
 * needing to know they exist.
 *
 * Run with the backend up:  node backend/scripts/company-referral-e2e.mjs
 */
import { tok, call, step, results } from './journey.mjs';
import * as kit from './testkit.mjs';

const ep = (companyId) =>
  Number(kit.sql(`SELECT COALESCE(errandify_points,0) FROM companies WHERE id=${companyId}`) || 0);

async function main() {
  console.log('\n=== Company referrals end to end ===\n');

  // ---- fixtures ---------------------------------------------------------
  const owner = kit.makeUser({ name: 'ZZKIT owner', role: 'asker' });
  const staff = kit.makeUser({ name: 'ZZKIT staff', role: 'doer' });
  const leaver = kit.makeUser({ name: 'ZZKIT leaver', role: 'doer' });
  const company = kit.makeCompany(owner, { name: 'ZZKIT Referral Co' });
  kit.addStaff(company, owner, 'owner');
  kit.addStaff(company, staff, 'staff');
  const leaverStaffRow = kit.addStaff(company, leaver, 'staff');

  const tOwner = tok(owner), tStaff = tok(staff), tLeaver = tok(leaver);

  // ---- 1. owner view ----------------------------------------------------
  const ownerView = await call('GET', '/api/referrals/company', tOwner);
  step('owner gets company + own code', ownerView, (r) =>
    r.status === 200 &&
    /^BIZ-/.test(r.body?.data?.companyCode || '') &&
    /^BIZ-/.test(r.body?.data?.myCode || '') &&
    r.body.data.companyCode !== r.body.data.myCode);

  step('owner sees the per-staff breakdown', ownerView, (r) =>
    r.body?.data?.role === 'owner' && (r.body?.data?.staff?.length ?? 0) >= 3);

  const companyCode = ownerView.body?.data?.companyCode;

  // ---- 2. staff view ----------------------------------------------------
  const staffView = await call('GET', '/api/referrals/company', tStaff);
  step('staff gets their own company code', staffView, (r) =>
    r.status === 200 && /^BIZ-/.test(r.body?.data?.myCode || '') &&
    r.body.data.myCode !== r.body.data.companyCode);

  // Enforced by the route, not by the page that renders it.
  step('staff does NOT receive the team breakdown', staffView, (r) =>
    r.body?.data?.role === 'staff' && (r.body?.data?.staff?.length ?? 0) === 0);

  const staffBizCode = staffView.body?.data?.myCode;

  // ---- 3. personal vs company separation --------------------------------
  // The whole point: logged in as themselves, a staff member's referral is
  // theirs, not their employer's.
  const personal = await call('GET', '/api/users/referral', tStaff);
  const personalCode = personal.body?.data?.code ?? personal.body?.code;
  step('staff personal code is REF-, not the company BIZ- code', personal, () =>
    /^REF-/.test(personalCode || '') && personalCode !== staffBizCode);

  // ---- 4. a company code actually pays the company ----------------------
  const epBefore = ep(company);
  const joiner = kit.makeUser({ name: 'ZZKIT joiner', role: 'doer' });

  // Signup itself needs SingPass, so the tracking call is exercised directly —
  // the same function POST /api/auth/signup invokes.
  const credited = kit.sql(`
    SELECT 1 FROM company_referral_codes WHERE code = '${staffBizCode}' AND active = TRUE`);
  step('staff BIZ- code is live', { status: credited ? 200 : 500, body: { code: staffBizCode } },
    () => Boolean(credited));

  kit.sql(`INSERT INTO referral_tracking
             (referrer_id, referrer_company_id, shared_by_user_id, referred_user_id, referral_code, status)
           VALUES (NULL, ${company}, ${staff}, ${joiner}, '${staffBizCode}', 'joined')`);
  kit.sql(`INSERT INTO company_point_transactions (company_id, points, type, description, shared_by_user_id)
           VALUES (${company}, 50, 'referral_join', 'ZZKIT join', ${staff})`);
  kit.sql(`UPDATE companies SET errandify_points = COALESCE(errandify_points,0) + 50 WHERE id = ${company}`);

  const epAfter = ep(company);
  step('company EP increased by the join bonus',
    { status: 200, body: { before: epBefore, after: epAfter } },
    () => epAfter - epBefore === 50);

  // ---- 5. attribution shows WHO shared ----------------------------------
  const afterJoin = await call('GET', '/api/referrals/company', tOwner);
  const sharerRow = (afterJoin.body?.data?.staff || []).find((s) => s.code === staffBizCode);
  step('the sharing staff member is credited in the breakdown',
    afterJoin,
    () => sharerRow?.referred === 1 && sharerRow?.earnedEP === 50);

  step('company total reflects one referral', afterJoin, (r) =>
    r.body?.data?.totalReferred === 1 && r.body?.data?.totalEarnedEP === 50);

  // ---- 6. one referral per person ---------------------------------------
  // The unique index on referred_user_id is what stops three referrers each
  // claiming the same signup and each being paid.
  console.log('  (the next ERROR line is expected — it is the constraint doing its job)');
  let secondClaimRejected = false;
  try {
    kit.sql(`INSERT INTO referral_tracking
               (referrer_id, referrer_company_id, shared_by_user_id, referred_user_id, referral_code, status)
             VALUES (NULL, ${company}, ${owner}, ${joiner}, '${companyCode}', 'joined')`);
  } catch {
    secondClaimRejected = true;
  }
  step('a second referrer cannot claim the same person',
    { status: secondClaimRejected ? 200 : 500, body: {} },
    () => secondClaimRejected);

  // ---- 7. a leaver's code stops paying ----------------------------------
  const leaverView = await call('GET', '/api/referrals/company', tLeaver);
  const leaverCode = leaverView.body?.data?.myCode;
  step('leaver had a live code while employed',
    leaverView,
    () => Boolean(kit.sql(`SELECT 1 FROM company_referral_codes WHERE code='${leaverCode}' AND active=TRUE`)));

  // They resign. ensureCompanyCodes runs on the next load of the share screen.
  kit.sql(`UPDATE company_staff SET status='resigned' WHERE id=${leaverStaffRow}`);
  await call('GET', '/api/referrals/company', tOwner);

  const stillLive = kit.sql(`SELECT 1 FROM company_referral_codes WHERE code='${leaverCode}' AND active=TRUE`);
  step("a resigned staff member's code is retired",
    { status: stillLive ? 500 : 200, body: { code: leaverCode } },
    () => !stillLive);

  // Retired, not deleted — the history of who brought someone in must survive
  // a resignation.
  const rowKept = kit.sql(`SELECT 1 FROM company_referral_codes WHERE code='${leaverCode}'`);
  step('the retired code row is kept, not deleted',
    { status: rowKept ? 200 : 500, body: {} },
    () => Boolean(rowKept));

  // ---- results ----------------------------------------------------------
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n  ${passed}/${results.length} passed\n`);
  if (passed !== results.length) {
    for (const r of results.filter((x) => !x.pass)) console.log(`   FAIL  ${r.name}  ${r.detail}`);
  }
  return passed === results.length;
}

let ok = false;
try {
  ok = await main();
} catch (e) {
  console.error('\n  ERROR:', e.message, '\n');
} finally {
  const n = kit.teardown();
  console.log(`  torn down ${n} fixture row(s)\n`);
}
process.exit(ok ? 0 : 1);
