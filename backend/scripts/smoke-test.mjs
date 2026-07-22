/**
 * Smoke test across all three surfaces: individual, company, admin.
 *
 * Every endpoint the main screens depend on, hit against a running server.
 * Not a unit test — it answers one question: is anything that used to work now
 * returning an error? That question went unanswered for a long time here, which
 * is how seven separate features stayed dead without anyone noticing.
 *
 *   cd backend && node scripts/smoke-test.mjs
 *
 * Needs the server running and JWT_SECRET in .env. It only reads — nothing in
 * it creates, modifies or deletes data.
 */
import { tok, call } from './journey.mjs';
const U = tok(2), A = tok(9,'admin'), O = tok(12);
const checks = [
  ['INDIVIDUAL','browse errands','GET','/api/errands?status=open',U],
  ['INDIVIDUAL','my errands (as asker)','GET','/api/errands?myErrands=true',U],
  ['INDIVIDUAL','my offers','GET','/api/bids/my-bids',U],
  ['INDIVIDUAL','notifications','GET','/api/notifications',U],
  ['INDIVIDUAL','unread count','GET','/api/messages/unread-count',U],
  ['INDIVIDUAL','my ratings','GET','/api/ratings/user/2',U],
  ['INDIVIDUAL','rating summary','GET','/api/ratings/user/2/summary',U],
  ['INDIVIDUAL','PDPA data export','GET','/api/user-data/export',U],
  ['INDIVIDUAL','deletion eligibility','GET','/api/users/deletion-eligibility',U],
  ['INDIVIDUAL','screening status','GET','/api/screening/status',U],
  ['INDIVIDUAL','referrals','GET','/api/referrals/me',U],
  ['INDIVIDUAL','blocked list','GET','/api/users/blocked-users',U],
  ['COMPANY','my company','GET','/api/companies/user/my-company',O],
  ['COMPANY','staff list','GET','/api/companies/3/staff',O],
  ['COMPANY','allocations','GET','/api/companies/3/allocations',O],
  ['COMPANY','leave requests','GET','/api/leave/requests?company_id=3',O],
  ['COMPANY','leave balance','GET','/api/leave/balance/12',O],
  ['COMPANY','subscription','GET','/api/companies/3/subscription',O],
  ['COMPANY','verification','GET','/api/companies/3/verification',O],
  ['COMPANY','staff my-work','GET','/api/companies/3/staff/my-work',O],
  ['ADMIN','users','GET','/api/admin/users',A],
  ['ADMIN','disputes','GET','/api/disputes',A],
  ['ADMIN','cases','GET','/api/cases',A],
  ['ADMIN','screening reviews','GET','/api/screening/reviews',A],
  ['ADMIN','verifications queue','GET','/api/admin/verifications',A],
  ['ADMIN','announcements','GET','/api/announcements',A],
  ['ADMIN','community posts','GET','/api/community/posts',A],
  ['ADMIN','community discussions','GET','/api/community/discussions',A],
  ['ADMIN','events','GET','/api/events',A],
  ['ADMIN','news','GET','/api/news',A],
  ['ADMIN','blog','GET','/api/blog',A],
  ['ADMIN','moderation queue','GET','/api/moderation/queue',A],
];
let group = '', pass = 0, fail = [];
for (const [g, name, verb, path, t] of checks) {
  if (g !== group) { group = g; console.log(`\n${g}`); }
  const r = await call(verb, path, t);
  const ok = r.status >= 200 && r.status < 300;
  if (ok) pass++; else fail.push(`${g} · ${name} · ${r.status} · ${JSON.stringify(r.body).slice(0,60)}`);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(24)} ${r.status}`);
}
console.log(`\n${pass}/${checks.length} passing`);
if (fail.length) { console.log('\nFAILURES:'); fail.forEach(f => console.log('  ' + f)); }
