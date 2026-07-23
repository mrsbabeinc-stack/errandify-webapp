import db from '../db.js';

/**
 * Company role resolution — the single source of truth for "what may this person
 * do for this company".
 *
 * Until now only MEMBERSHIP was checked, so an active staff member had the same
 * access as the owner. Role comes from three places, in priority order:
 *   1. companies.owner_user_id    -> owner
 *   2. companies.manager_user_id  -> manager
 *   3. company_staff.role         -> owner | manager | staff  (status must be active)
 *
 * Everything company-scoped should gate on this rather than re-deriving it.
 */

export type CompanyRole = 'owner' | 'manager' | 'staff';

export interface CompanyMembership {
  companyId: number;
  companyName: string;
  role: CompanyRole;
  certified: boolean;
  /** true for owner/manager — the roles that can act on the company's behalf */
  canActForCompany: boolean;
  /** staff who are on approved leave shouldn't be handed new work */
  onLeave: boolean;
}

/**
 * Resolve this user's role in a specific company. Returns null if they are not
 * a member (or their staff record isn't active).
 */
export async function resolveCompanyRole(
  userId: number | string,
  companyId: number | string
): Promise<CompanyMembership | null> {
  const uid = Number(userId);
  const cid = Number(companyId);
  if (!uid || !cid) return null;

  const result = await db.query(
    `SELECT c.id, c.company_name, c.certified,
            c.owner_user_id, c.manager_user_id,
            cs.role AS staff_role, cs.status AS staff_status
       FROM companies c
       LEFT JOIN company_staff cs
              ON cs.company_id = c.id AND cs.user_id = $1
      WHERE c.id = $2
      LIMIT 1`,
    [uid, cid]
  );
  if (result.rows.length === 0) return null;

  const r = result.rows[0];
  let role: CompanyRole | null = null;

  if (Number(r.owner_user_id) === uid) role = 'owner';
  else if (Number(r.manager_user_id) === uid) role = 'manager';
  else if (r.staff_role && ['active', 'on_leave'].includes(r.staff_status)) {
    role = r.staff_role as CompanyRole;
  }

  if (!role) return null;

  return {
    companyId: r.id,
    companyName: r.company_name,
    role,
    certified: !!r.certified,
    canActForCompany: role === 'owner' || role === 'manager',
    onLeave: r.staff_status === 'on_leave',
  };
}

/** The company this user belongs to, if any (owner, manager, or active staff). */
export async function resolveMyCompany(userId: number | string): Promise<CompanyMembership | null> {
  const uid = Number(userId);
  if (!uid) return null;

  const result = await db.query(
    `SELECT c.id
       FROM companies c
       LEFT JOIN company_staff cs
              ON cs.company_id = c.id AND cs.user_id = $1
                 AND cs.status IN ('active', 'on_leave')
      WHERE c.owner_user_id = $1 OR c.manager_user_id = $1 OR cs.user_id = $1
      LIMIT 1`,
    [uid]
  );
  if (result.rows.length === 0) return null;
  return resolveCompanyRole(uid, result.rows[0].id);
}

export interface RoleGate {
  ok: boolean;
  status?: number;
  error?: string;
  membership?: CompanyMembership;
}

/**
 * Gate an endpoint on role. Pass `requireCertified` for anything that acts in the
 * marketplace — an unverified company may not post or offer.
 */
export async function requireCompanyRole(
  userId: number | string,
  companyId: number | string,
  allowed: CompanyRole[],
  opts: { requireCertified?: boolean } = {}
): Promise<RoleGate> {
  const m = await resolveCompanyRole(userId, companyId);

  if (!m) {
    return { ok: false, status: 403, error: 'You do not have access to this company' };
  }

  if (!allowed.includes(m.role)) {
    const need = allowed.join(' or ');
    return {
      ok: false,
      status: 403,
      error: `Only the company ${need} can do this. You're signed in as ${m.role}.`,
      membership: m,
    };
  }

  if (opts.requireCertified && !m.certified) {
    return {
      ok: false,
      status: 403,
      error: 'Verify your company first — attach your ACRA Business Profile in Company Profile.',
      membership: m,
    };
  }

  return { ok: true, membership: m };
}

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Sets req.companyId from the authenticated user's company membership.
 *
 * The subscription routes were written to read req.companyId, but nothing ever
 * populated it — the auth middleware sets only userId. So checkout, upgrade,
 * downgrade, cancel, ad-credits and billing all resolved company 0 and failed.
 * Runs after authMiddleware; leaves companyId unset (not an error) when the user
 * belongs to no company, so the handler can respond appropriately.
 */
export async function attachCompanyId(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.userId) {
      const m = await resolveMyCompany(req.userId);
      if (m?.companyId) req.companyId = String(m.companyId);
    }
  } catch (err) {
    console.error('[attachCompanyId] lookup failed:', err);
  }
  next();
}
