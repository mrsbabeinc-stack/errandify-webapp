import db from '../db.js';

/**
 * Company referrals.
 *
 * Individuals already had this; companies could not be referrers at all
 * because referral_tracking.referrer_id was NOT NULL against users(id).
 * Migration 063 opened that up. This is the logic on top.
 *
 * Two rules decide everything here:
 *
 *  1. **Every code belongs to a company, and every code pays the company.**
 *     A staff member's company code credits `companies.errandify_points`, not
 *     their personal balance — that is where the subscription tier multipliers
 *     land, so it is the balance the company can actually spend.
 *
 *  2. **Who shared is recorded anyway.** `shared_by_user_id` on both the
 *     tracking row and the ledger entry answers "which of my twenty staff
 *     actually bring people in", which is the only reason to give them
 *     separate codes rather than one poster on the wall.
 *
 * Staff keep their personal `users.referral_code` as well. Sharing as yourself
 * and sharing on behalf of your employer pay different parties, deliberately.
 */

/** Same values as the individual programme, so one change moves both. */
export const COMPANY_JOIN_BONUS_EP = 50;
export const COMPANY_FIRST_JOB_BONUS_EP = 50;

/**
 * `BIZ-` rather than the individual `REF-`.
 *
 * A support ticket that says "my code isn't paying" is answerable from the
 * code alone, and a mis-resolved code is visible instead of silent.
 */
function newCode(): string {
  const body = Math.random().toString(16).slice(2, 8).toUpperCase().padEnd(6, '0');
  return `BIZ-${body}`;
}

/** Generates until unique across BOTH namespaces — a collision would pay the wrong party. */
async function uniqueCode(client: any = db): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = newCode();
    const clash = await client.query(
      `SELECT 1 FROM company_referral_codes WHERE code = $1
       UNION ALL
       SELECT 1 FROM users WHERE referral_code = $1
       LIMIT 1`,
      [code]
    );
    if (clash.rows.length === 0) return code;
  }
  throw new Error('Could not generate a unique company referral code');
}

/**
 * The company's own code — the one that goes on print and the public profile.
 * `staff_user_id IS NULL` marks it.
 */
export async function getCompanyCode(companyId: number): Promise<string> {
  const existing = await db.query(
    `SELECT code FROM company_referral_codes
      WHERE company_id = $1 AND staff_user_id IS NULL LIMIT 1`,
    [companyId]
  );
  if (existing.rows.length > 0) return existing.rows[0].code;

  const code = await uniqueCode();
  // ON CONFLICT covers two requests racing on first view of the share screen;
  // the partial unique index is what makes that safe.
  const inserted = await db.query(
    `INSERT INTO company_referral_codes (company_id, staff_user_id, code)
     VALUES ($1, NULL, $2)
     ON CONFLICT DO NOTHING
     RETURNING code`,
    [companyId, code]
  );
  if (inserted.rows.length > 0) return inserted.rows[0].code;

  const raced = await db.query(
    `SELECT code FROM company_referral_codes
      WHERE company_id = $1 AND staff_user_id IS NULL LIMIT 1`,
    [companyId]
  );
  return raced.rows[0].code;
}

/** A staff member's own code, which still credits the company. */
export async function getStaffCode(companyId: number, staffUserId: number): Promise<string> {
  const existing = await db.query(
    `SELECT code FROM company_referral_codes
      WHERE company_id = $1 AND staff_user_id = $2 LIMIT 1`,
    [companyId, staffUserId]
  );
  if (existing.rows.length > 0) return existing.rows[0].code;

  const code = await uniqueCode();
  const inserted = await db.query(
    `INSERT INTO company_referral_codes (company_id, staff_user_id, code)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING code`,
    [companyId, staffUserId, code]
  );
  if (inserted.rows.length > 0) return inserted.rows[0].code;

  const raced = await db.query(
    `SELECT code FROM company_referral_codes
      WHERE company_id = $1 AND staff_user_id = $2 LIMIT 1`,
    [companyId, staffUserId]
  );
  return raced.rows[0].code;
}

/**
 * Company code plus one per active staff member. Idempotent — safe to call on
 * every visit to the share screen and safe to re-run as a backfill, because
 * each getter returns the existing code rather than minting a second.
 *
 * Only `status = 'active'` staff: someone who has resigned should not still
 * have a live code earning for a company they have left.
 */
export async function ensureCompanyCodes(
  companyId: number
): Promise<{ companyCode: string; staffCodes: number; deactivated: number }> {
  const companyCode = await getCompanyCode(companyId);

  const staff = await db.query(
    `SELECT cs.user_id
       FROM company_staff cs
       JOIN users u ON u.id = cs.user_id
      WHERE cs.company_id = $1
        AND cs.status = 'active'
        AND u.anonymised_at IS NULL`,
    [companyId]
  );

  for (const row of staff.rows) {
    await getStaffCode(companyId, row.user_id);
  }

  /**
   * Retire codes belonging to people who are no longer active staff.
   *
   * Filtering on `status = 'active'` above only governs which codes get
   * *created*. Without this, a code minted while someone was employed keeps
   * working forever: they leave, share the link from their own phone, and the
   * company they no longer work for is credited — and the per-staff table
   * still lists them as a contributor.
   *
   * Deactivated rather than deleted, because `referral_tracking` rows already
   * reference the code and the history of who brought someone in should not
   * silently rewrite itself when a person resigns. `resolveReferralCode`
   * requires `active = TRUE`, so a retired code simply stops paying.
   *
   * Runs on every load of the company share screen, so it self-heals without
   * needing anything hooked into the offboarding flow.
   */
  const retired = await db.query(
    `UPDATE company_referral_codes c
        SET active = FALSE
      WHERE c.company_id = $1
        AND c.staff_user_id IS NOT NULL
        AND c.active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM company_staff cs
                   JOIN users u ON u.id = cs.user_id
           WHERE cs.company_id = c.company_id
             AND cs.user_id = c.staff_user_id
             AND cs.status = 'active'
             AND u.anonymised_at IS NULL
        )
      RETURNING c.id`,
    [companyId]
  );
  if (retired.rows.length > 0) {
    console.log(
      `[CompanyReferral] Retired ${retired.rows.length} code(s) for company ${companyId} — staff no longer active`
    );
  }

  return { companyCode, staffCodes: staff.rows.length, deactivated: retired.rows.length };
}

export interface ResolvedReferrer {
  kind: 'user' | 'company';
  userId?: number;
  companyId?: number;
  /** Which staff member's code was used, when it was a company code. */
  sharedByUserId?: number | null;
}

/**
 * Turn a `?ref=` value into whoever should be paid.
 *
 * Checked in one place so signup, the interest form and anything added later
 * cannot disagree about what a code means. Users first, because that is the
 * older and far larger namespace.
 */
export async function resolveReferralCode(
  code: string,
  client: any = db
): Promise<ResolvedReferrer | null> {
  if (!code || !code.trim()) return null;
  const trimmed = code.trim();

  const asUser = await client.query(
    `SELECT id FROM users WHERE referral_code = $1 AND anonymised_at IS NULL LIMIT 1`,
    [trimmed]
  );
  if (asUser.rows.length > 0) return { kind: 'user', userId: asUser.rows[0].id };

  const asCompany = await client.query(
    `SELECT company_id, staff_user_id FROM company_referral_codes
      WHERE code = $1 AND active = TRUE LIMIT 1`,
    [trimmed]
  );
  if (asCompany.rows.length > 0) {
    return {
      kind: 'company',
      companyId: asCompany.rows[0].company_id,
      sharedByUserId: asCompany.rows[0].staff_user_id,
    };
  }
  return null;
}

/**
 * Credit company EP and write the ledger entry.
 *
 * The unique index on (referral_tracking_id, type) is what actually prevents a
 * double award — checked at the database rather than trusting every caller to
 * remember. A conflict means it was already paid, so the balance is left alone.
 */
async function creditCompany(
  client: any,
  companyId: number,
  points: number,
  type: string,
  description: string,
  trackingId: number | null,
  sharedByUserId: number | null
): Promise<boolean> {
  const ledger = await client.query(
    `INSERT INTO company_point_transactions
       (company_id, points, type, description, referral_tracking_id, shared_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [companyId, points, type, description, trackingId, sharedByUserId]
  );
  if (ledger.rows.length === 0) return false; // already paid

  await client.query(
    `UPDATE companies SET errandify_points = COALESCE(errandify_points, 0) + $2 WHERE id = $1`,
    [companyId, points]
  );
  return true;
}

/**
 * Someone signed up on a company code. Called inside the signup transaction,
 * so the tracking row, the ledger entry and the balance move together or not
 * at all.
 */
export async function trackCompanyReferralJoin(
  client: any,
  companyId: number,
  sharedByUserId: number | null,
  referredUserId: number,
  code: string,
  referredName: string
): Promise<{ tracked: boolean; pointsAwarded: number }> {
  const tracking = await client.query(
    `INSERT INTO referral_tracking
       (referrer_id, referrer_company_id, shared_by_user_id, referred_user_id, referral_code, status)
     VALUES (NULL, $1, $2, $3, $4, 'joined')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [companyId, sharedByUserId, referredUserId, code]
  );

  // Already referred by someone — the unique index on referred_user_id means
  // the first claim stands. Nothing is paid twice.
  if (tracking.rows.length === 0) return { tracked: false, pointsAwarded: 0 };

  const paid = await creditCompany(
    client,
    companyId,
    COMPANY_JOIN_BONUS_EP,
    'referral_join',
    `${referredName} signed up on a company invite`,
    tracking.rows[0].id,
    sharedByUserId
  );
  return { tracked: true, pointsAwarded: paid ? COMPANY_JOIN_BONUS_EP : 0 };
}

/**
 * The referred person completed their first errand. Mirrors
 * referralService.creditFirstCompletedErrand on the individual side.
 */
export async function creditCompanyFirstErrand(
  referredUserId: number,
  referredName = 'Someone you invited'
): Promise<{ awarded: boolean; companyId?: number }> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const tracking = await client.query(
      `SELECT id, referrer_company_id, shared_by_user_id
         FROM referral_tracking
        WHERE referred_user_id = $1
          AND referrer_company_id IS NOT NULL
          AND status <> 'first_job_completed'
        LIMIT 1`,
      [referredUserId]
    );
    if (tracking.rows.length === 0) {
      await client.query('COMMIT');
      return { awarded: false };
    }

    const t = tracking.rows[0];
    await client.query(
      `UPDATE referral_tracking
          SET status = 'first_job_completed', first_job_completed_at = NOW(),
              bonus_awarded = TRUE, updated_at = NOW()
        WHERE id = $1`,
      [t.id]
    );

    const paid = await creditCompany(
      client,
      t.referrer_company_id,
      COMPANY_FIRST_JOB_BONUS_EP,
      'referral_first_job',
      `${referredName} completed their first errand`,
      t.id,
      t.shared_by_user_id
    );

    await client.query('COMMIT');
    return { awarded: paid, companyId: t.referrer_company_id };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CompanyReferral] first errand credit failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export interface CompanyReferralStats {
  companyCode: string;
  totalReferred: number;
  firstErrandCompleted: number;
  totalEarnedEP: number;
  staff: {
    userId: number | null;
    name: string;
    code: string;
    referred: number;
    completed: number;
    earnedEP: number;
    /** False once the person is no longer active staff; the code stops paying. */
    active: boolean;
  }[];
}

/**
 * Totals plus the per-staff breakdown.
 *
 * Counts come from scalar subqueries rather than joins: joining the ledger
 * alongside tracking fans the rows out, so one referral that has earned both
 * bonuses would be counted as two referrals. That exact bug was already found
 * and fixed once on the admin overview query.
 */
export async function getCompanyReferralStats(companyId: number): Promise<CompanyReferralStats> {
  const companyCode = await getCompanyCode(companyId);

  const totals = await db.query(
    `SELECT COUNT(*)::int AS total_referred,
            COUNT(*) FILTER (WHERE status = 'first_job_completed')::int AS completed
       FROM referral_tracking WHERE referrer_company_id = $1`,
    [companyId]
  );

  const earned = await db.query(
    `SELECT COALESCE(SUM(points), 0)::int AS ep
       FROM company_point_transactions
      WHERE company_id = $1 AND type LIKE 'referral_%'`,
    [companyId]
  );

  const staff = await db.query(
    `SELECT c.staff_user_id AS user_id,
            c.code,
            COALESCE(u.alias, u.display_name, 'Company code') AS name,
            (SELECT COUNT(*)::int FROM referral_tracking t
              WHERE t.referrer_company_id = c.company_id
                AND t.shared_by_user_id IS NOT DISTINCT FROM c.staff_user_id) AS referred,
            (SELECT COUNT(*)::int FROM referral_tracking t
              WHERE t.referrer_company_id = c.company_id
                AND t.shared_by_user_id IS NOT DISTINCT FROM c.staff_user_id
                AND t.status = 'first_job_completed') AS completed,
            (SELECT COALESCE(SUM(x.points), 0)::int FROM company_point_transactions x
              WHERE x.company_id = c.company_id
                AND x.shared_by_user_id IS NOT DISTINCT FROM c.staff_user_id
                AND x.type LIKE 'referral_%') AS earned_ep,
            c.active
       FROM company_referral_codes c
       LEFT JOIN users u ON u.id = c.staff_user_id
      WHERE c.company_id = $1
        -- Retired codes stay visible only while they have history to show.
        -- Dropping them outright would quietly delete a former colleague's
        -- contribution from the company's own totals; keeping every retired
        -- code forever would bury the current team in leavers.
        AND (
          c.active = TRUE
          OR EXISTS (
            SELECT 1 FROM referral_tracking t
             WHERE t.referrer_company_id = c.company_id
               AND t.shared_by_user_id IS NOT DISTINCT FROM c.staff_user_id
          )
        )
      ORDER BY referred DESC, c.staff_user_id NULLS FIRST`,
    [companyId]
  );

  return {
    companyCode,
    totalReferred: totals.rows[0].total_referred,
    firstErrandCompleted: totals.rows[0].completed,
    totalEarnedEP: earned.rows[0].ep,
    staff: staff.rows.map((r: any) => ({
      userId: r.user_id,
      name: r.name,
      code: r.code,
      referred: r.referred,
      completed: r.completed,
      earnedEP: r.earned_ep,
      active: r.active,
    })),
  };
}

export default {
  COMPANY_JOIN_BONUS_EP,
  COMPANY_FIRST_JOB_BONUS_EP,
  getCompanyCode,
  getStaffCode,
  ensureCompanyCodes,
  resolveReferralCode,
  trackCompanyReferralJoin,
  creditCompanyFirstErrand,
  getCompanyReferralStats,
};
