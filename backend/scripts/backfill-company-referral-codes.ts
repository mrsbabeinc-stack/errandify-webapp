import db from '../src/db.js';
import { ensureCompanyCodes } from '../src/services/companyReferralService.js';

/**
 * Give every existing company a referral code, and every one of its active
 * staff a code of their own.
 *
 * Not strictly required — GET /api/referrals/company calls ensureCompanyCodes
 * on first view, so a company gets its codes the moment anyone opens the share
 * screen. This exists so the codes are there before that, which matters if you
 * want to print QR posters or hand a company its link without asking someone
 * to log in first.
 *
 * Idempotent. Each getter returns the existing code rather than minting a
 * second, so re-running it changes nothing and cannot rotate a code that has
 * already been shared.
 *
 * Run with:  npx tsx backend/scripts/backfill-company-referral-codes.ts [--commit]
 * Without --commit it reports what it would create and writes nothing.
 */

const COMMIT = process.argv.includes('--commit');

async function main() {
  const companies = await db.query(
    `SELECT c.id, c.company_name,
            (SELECT COUNT(*)::int FROM company_staff cs
              JOIN users u ON u.id = cs.user_id
              WHERE cs.company_id = c.id AND cs.status = 'active'
                AND u.anonymised_at IS NULL) AS active_staff,
            (SELECT COUNT(*)::int FROM company_referral_codes r
              WHERE r.company_id = c.id) AS existing_codes
       FROM companies c
      WHERE c.status <> 'deleted'
      ORDER BY c.id`
  );

  console.log(`\n=== Company referral codes ${COMMIT ? '(COMMIT)' : '(dry run)'} ===\n`);
  console.log(`  ${companies.rows.length} companies\n`);

  let created = 0;
  for (const c of companies.rows) {
    // One company code plus one per active staff member.
    const expected = 1 + c.active_staff;
    const missing = Math.max(0, expected - c.existing_codes);

    if (!COMMIT) {
      console.log(
        `  ${String(c.id).padStart(4)}  ${c.company_name.slice(0, 34).padEnd(34)} ` +
          `staff=${String(c.active_staff).padStart(3)}  has=${String(c.existing_codes).padStart(3)}  would create ${missing}`
      );
      created += missing;
      continue;
    }

    const { companyCode, staffCodes } = await ensureCompanyCodes(c.id);
    console.log(
      `  ${String(c.id).padStart(4)}  ${c.company_name.slice(0, 34).padEnd(34)} ` +
        `${companyCode}  + ${staffCodes} staff code(s)`
    );
  }

  if (COMMIT) {
    const total = await db.query(`SELECT COUNT(*)::int AS n FROM company_referral_codes`);
    console.log(`\n  ${total.rows[0].n} codes now exist.\n`);
  } else {
    console.log(`\n  Would create ${created} code(s). Re-run with --commit to write them.\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
