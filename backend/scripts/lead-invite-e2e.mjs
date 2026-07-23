/**
 * Lead capture → invite → attributed signup, end to end.
 *
 * The loop the whole lead-generation module exists to close: someone fills the
 * pre-launch form, an admin invites them on launch day, and the lead row is
 * marked converted when their account is created. Without that last step
 * "how many of those leads became members" is unanswerable.
 *
 * The parts worth testing are the ones that fail silently:
 *
 *   - The token must be stored hashed. A plaintext column looks identical in
 *     every screen and is only wrong once the table leaks.
 *   - It must be single use, or one forwarded link inflates the conversion
 *     figure the module is built to report.
 *   - Redemption happens inside the signup transaction, so an invite is never
 *     burned by a signup that then fails.
 *
 * Creates its own lead and user and deletes exactly those. Run with the
 * backend up, FROM backend/:  node scripts/lead-invite-e2e.mjs
 */
import { execSync } from 'child_process';
import { call, step, results } from './journey.mjs';

const DB = 'errandify_local';
const q = (sql) =>
  execSync(`psql ${DB} -tAc ${JSON.stringify(sql.replace(/\s+/g, ' ').trim())}`, { encoding: 'utf8' })
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^(INSERT|UPDATE|DELETE|SELECT) \d/.test(l))[0] || '';

const MARK = `ZZINV${Math.floor(Math.random() * 1e6)}`;
const mobile = `9${Math.floor(1e6 + Math.random() * 8e6)}0`.slice(0, 8);
const email = `${MARK.toLowerCase()}@example.com`;
const created = { leadIds: [], userIds: [] };

function adminToken() {
  const id = q(`SELECT id FROM users WHERE role IN ('admin','super-admin') ORDER BY id LIMIT 1`);
  return execSync(
    `node -e "const jwt=require('jsonwebtoken');require('dotenv').config();console.log(jwt.sign({userId:'${id}'},process.env.JWT_SECRET,{expiresIn:'1h'}))"`,
    { encoding: 'utf8' }
  ).trim().split('\n').pop();
}

async function main() {
  console.log('\n=== Lead invite → signup, end to end ===\n');
  const tAdmin = adminToken();

  // ---- 1. the public form captures a lead ------------------------------
  const captured = await call('POST', '/api/interest', tAdmin, {
    full_name: `${MARK} Lead`,
    mobile,
    email,
    interest: 'earn',
    interested_categories: ['home-maintenance'],
    service_areas: ['Tampines'],
    consent_contact: true,
  });
  step('interest form captures a lead', captured, (r) => r.status === 201);

  const leadId = Number(q(`SELECT id FROM leads WHERE email_normalised = '${email}'`));
  if (!leadId) throw new Error('lead was not created');
  created.leadIds.push(leadId);

  // ---- 2. issue the invite ---------------------------------------------
  const issued = await call('POST', `/api/admin/leads/${leadId}/invite`, tAdmin, { channel: 'link' });
  step('admin issues a signup link', issued, (r) =>
    r.status === 201 && typeof r.body?.data?.token === 'string' && r.body.data.token.length > 20);

  const token = issued.body?.data?.token;

  // ---- 3. stored hashed, never plaintext -------------------------------
  const plaintextRows = q(`SELECT COUNT(*) FROM lead_invites WHERE token_hash = '${token}'`);
  step('the token is stored hashed, not in plaintext',
    { status: plaintextRows === '0' ? 200 : 500, body: {} },
    () => plaintextRows === '0');

  step('the lead moved to the invited stage',
    { status: 200, body: {} },
    () => q(`SELECT stage FROM leads WHERE id = ${leadId}`) === 'invited');

  // ---- 4. public prefill ------------------------------------------------
  const prefill = await call('GET', `/api/interest/invite/${token}`, tAdmin);
  step('the invite link prefills the signup form', prefill, (r) =>
    r.status === 200 && r.body?.data?.fullName === `${MARK} Lead`);

  const bogus = await call('GET', '/api/interest/invite/not-a-real-token-at-all', tAdmin);
  step('an unknown token is refused', bogus, (r) => r.status === 404);

  // Looking is not consuming — people open a link and come back later.
  step('peeking does not consume the invite',
    { status: 200, body: {} },
    () => q(`SELECT used_at IS NULL FROM lead_invites WHERE lead_id = ${leadId} AND used_at IS NULL`) === 't');

  // ---- 5. issuing again retires the old one ----------------------------
  const reissued = await call('POST', `/api/admin/leads/${leadId}/invite`, tAdmin, { channel: 'link' });
  const token2 = reissued.body?.data?.token;
  step('re-issuing produces a different token', reissued, () => token2 && token2 !== token);

  const oldStillLive = await call('GET', `/api/interest/invite/${token}`, tAdmin);
  step('the previous invite is retired', oldStillLive, (r) => r.status === 404);

  // ---- 6. redeem it by signing up --------------------------------------
  const nric = `S${Math.floor(1e7 + Math.random() * 8e6)}Z`;
  const signup = await call('POST', '/api/auth/signup', tAdmin, {
    nric,
    displayName: `${MARK} Member`,
    email,
    phone: mobile,
    role: 'asker',
    inviteToken: token2,
  });
  step('signup succeeds with the invite token', signup, (r) => r.status === 200 || r.status === 201);

  const newUserId = Number(
    signup.body?.data?.user?.id || q(`SELECT id FROM users WHERE display_name = '${MARK} Member'`)
  );
  if (newUserId) created.userIds.push(newUserId);

  step('the lead is marked converted to that account',
    { status: 200, body: { leadId, newUserId } },
    () => q(`SELECT converted_user_id FROM leads WHERE id = ${leadId}`) === String(newUserId)
       && q(`SELECT stage FROM leads WHERE id = ${leadId}`) === 'converted');

  step('the invite is recorded as used',
    { status: 200, body: {} },
    () => q(`SELECT COUNT(*) FROM lead_invites WHERE lead_id = ${leadId} AND used_at IS NOT NULL`) === '2');

  // ---- 7. single use ----------------------------------------------------
  const reused = await call('GET', `/api/interest/invite/${token2}`, tAdmin);
  step('a redeemed token stops working', reused, (r) => r.status === 404);

  // ---- 8. a converted lead cannot be re-invited ------------------------
  const afterConversion = await call('POST', `/api/admin/leads/${leadId}/invite`, tAdmin, {});
  step('an already-converted lead cannot be invited again', afterConversion, (r) =>
    r.status === 400 && /already signed up/i.test(r.body?.error || ''));

  // ---- 9. consent gate --------------------------------------------------
  const noConsentId = Number(q(`
    INSERT INTO leads (lead_ref, lead_type, full_name, mobile, mobile_normalised, source, consent_contact)
    VALUES ('${MARK}-NC', 'individual', '${MARK} NoConsent', '90000001', '90000001', 'admin', FALSE)
    RETURNING id`));
  created.leadIds.push(noConsentId);

  const refused = await call('POST', `/api/admin/leads/${noConsentId}/invite`, tAdmin, {});
  step('a lead without consent cannot be invited', refused, (r) =>
    r.status === 400 && /not consented/i.test(r.body?.error || ''));

  // ---- results ----------------------------------------------------------
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n  ${passed}/${results.length} passed\n`);
  if (passed !== results.length) {
    for (const r of results.filter((x) => !x.pass)) console.log(`   FAIL  ${r.name}  ${r.detail}`);
  }
  return passed === results.length;
}

/** Deletes only the ids this run created. lead_invites and lead_events cascade. */
function teardown() {
  let n = 0;
  for (const id of created.leadIds) {
    q(`DELETE FROM leads WHERE id = ${id}`);
    n++;
  }
  for (const id of created.userIds) {
    q(`DELETE FROM referral_tracking WHERE referred_user_id = ${id}`);
    q(`DELETE FROM notifications WHERE user_id = ${id}`);
    q(`DELETE FROM users WHERE id = ${id}`);
    n++;
  }
  return n;
}

let ok = false;
try {
  ok = await main();
} catch (e) {
  console.error('\n  ERROR:', e.message, '\n');
} finally {
  console.log(`  torn down ${teardown()} fixture row(s)\n`);
}
process.exit(ok ? 0 : 1);
