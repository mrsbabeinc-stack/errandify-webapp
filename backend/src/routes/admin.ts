import express, { Request, Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { sendCompanyApprovedNotice, sendCompanyRejectedNotice } from '../services/companyOnboarding.js';
import { creditFirstErrandForErrand } from '../services/referralService.js';
import { readAllMetrics, METRIC_BY_KEY } from '../services/alertMetrics.js';
import { evaluateAlertRules } from '../services/alertEvaluator.js';

const router = express.Router();

// Admin guard: authenticate first, then verify the role from the database.
// The JWT carries only { userId, email } — it has no role — so the previous
// check on req.user.role could never pass and every route here returned 403.
// Express flattens middleware arrays, so this drops into existing routes as-is.
const isAdmin: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

// ============================================
// TIER 1: OPERATIONS
// ============================================

// ---------------------------------------------------------------------------
// ADMIN ACCOUNTS
//
// These four routes used to read and write an `admin_users` table, in MySQL
// syntax (`?` placeholders, `result.insertId`), against a Postgres database
// that has no such table. Every one of them threw. Rewritten against `users`,
// which is where administrative access actually lives: requireAdmin() resolves
// a caller's rights from `users.role` and nothing consults any other table, so
// a separate admin_users would have been a second answer to "who is an admin"
// that granted nobody anything.
//
// Consequently there is no "create admin" here. Accounts are created by signing
// up through Singpass; an admin is an existing user who has been granted an
// administrative role. Granting and revoking that role is the whole API.
// ---------------------------------------------------------------------------

/**
 * Roles that grant back-office access, and the only values these routes will
 * write. Kept in step with requireAdmin's default allow-list. 'super-admin'
 * appears in some allow-lists but users_role_check rejects it, so it is
 * deliberately absent — offering it would only produce a constraint violation.
 */
const ADMIN_ROLES = ['admin', 'support_l2', 'support_l3'] as const;
/** What a revoked admin becomes. They keep their account, just not the access. */
const REVOKED_ROLE = 'asker';

/**
 * Stricter than isAdmin: full admins only. Granting and revoking admin access
 * must not be available to support_l2/l3, who would otherwise be able to
 * promote themselves. Same array shape as isAdmin so Express flattens it.
 */
const isFullAdmin: any = [authMiddleware, requireAdmin(['admin'])];

router.get('/admin-users', isAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, COALESCE(alias, display_name) AS name, email, role, status,
              last_active_at, created_at
         FROM users
        WHERE role = ANY($1::text[])
        ORDER BY role, created_at DESC`,
      [ADMIN_ROLES]
    );
    res.json({ success: true, data: result.rows, roles: ADMIN_ROLES });
  } catch (error) {
    console.error('[Admin] List admin users failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin users' });
  }
});

/**
 * Grant or change an administrative role on an existing user.
 *
 * Only a full 'admin' may do this — support_l2/l3 pass requireAdmin's default
 * allow-list, and without this narrower guard either of them could promote
 * themselves to admin, which is privilege escalation dressed as a settings
 * screen. Changing your own role is refused for the same reason.
 */
router.post('/admin-users/:userId/role', isFullAdmin, async (req: any, res: Response) => {
  try {
    const targetId = Number(req.params.userId);
    const { role } = req.body;
    if (!Number.isInteger(targetId)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }
    if (!ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `role must be one of: ${ADMIN_ROLES.join(', ')}` });
    }
    if (String(targetId) === String(req.userId)) {
      return res.status(400).json({ success: false, error: 'You cannot change your own role' });
    }

    const target = await db.query('SELECT id, role, status FROM users WHERE id = $1', [targetId]);
    if (!target.rows[0]) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (target.rows[0].status !== 'active') {
      return res.status(409).json({
        success: false,
        error: `Cannot grant admin access to a ${target.rows[0].status} account`,
      });
    }

    const updated = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, COALESCE(alias, display_name) AS name, email, role, status`,
      [role, targetId]
    );
    console.warn('[Admin] user', req.userId, 'set role of user', targetId, 'to', role);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Admin] Grant admin role failed:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

/**
 * Revoke administrative access. The account survives — only the role changes —
 * because deleting the user would take their errands, offers and dispute
 * history with it.
 */
router.delete('/admin-users/:userId/role', isFullAdmin, async (req: any, res: Response) => {
  try {
    const targetId = Number(req.params.userId);
    if (!Number.isInteger(targetId)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }
    if (String(targetId) === String(req.userId)) {
      return res.status(400).json({ success: false, error: 'You cannot revoke your own admin access' });
    }

    const target = await db.query('SELECT id, role FROM users WHERE id = $1', [targetId]);
    if (!target.rows[0]) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (!ADMIN_ROLES.includes(target.rows[0].role)) {
      return res.status(409).json({ success: false, error: 'That user is not an admin' });
    }

    // Never leave the platform with no one who can administer it — there would
    // be no supported way back in.
    if (target.rows[0].role === 'admin') {
      const remaining = await db.query(
        `SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND status = 'active' AND id <> $1`,
        [targetId]
      );
      if (remaining.rows[0].n === 0) {
        return res.status(409).json({
          success: false,
          error: 'This is the last active admin. Grant admin to someone else first.',
        });
      }
    }

    const updated = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, COALESCE(alias, display_name) AS name, email, role, status`,
      [REVOKED_ROLE, targetId]
    );
    console.warn('[Admin] user', req.userId, 'revoked admin access from user', targetId);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Admin] Revoke admin role failed:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke access' });
  }
});

// ---------------------------------------------------------------------------
// COMPANY MANAGEMENT
//
// The admin Company Management screen had no backend at all: it listed
// `mockCompanies` and its Suspend/Ban buttons only edited React state. There is
// no ban here — companies_status_check permits active/inactive/suspended only,
// and a permanent company ban has consequences nobody has decided (its open
// errands, its staff, money owed), so this offers the reversible control it can
// actually carry out rather than a button that would fail the constraint.
//
// Suspension is enforced in requireVerifiedCompany (routes/companyRoutes.ts).
// ---------------------------------------------------------------------------

router.get('/companies', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    const params: any[] = [];
    const where: string[] = [];

    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      params.push(status);
      where.push(`c.status = $${params.length}`);
    }
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`(c.company_name ILIKE $${params.length} OR c.uen ILIKE $${params.length})`);
    }

    const result = await db.query(
      `SELECT c.id, c.company_name, c.uen, c.status, c.certified, c.created_at,
              c.suspended_at, c.suspension_reason,
              COALESCE(u.alias, u.display_name) AS owner_name, u.email AS owner_email,
              (SELECT COUNT(*)::int FROM company_staff s
                WHERE s.company_id = c.id AND s.status = 'active') AS staff_count
         FROM companies c
         LEFT JOIN users u ON u.id = c.owner_user_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY c.created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Admin] List companies failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch companies' });
  }
});

/**
 * Suspend a company. A reason is required, not optional: the company is told
 * why when it next tries to act, and a restriction that cannot be explained to
 * the party it restricts should not be applied at all.
 */
router.post('/companies/:companyId/suspend', isAdmin, async (req: any, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    const reason = String(req.body?.reason || '').trim();
    if (!Number.isInteger(companyId)) {
      return res.status(400).json({ success: false, error: 'Invalid company id' });
    }
    if (reason.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Give a reason of at least 10 characters — the company is shown this.',
      });
    }

    const existing = await db.query('SELECT status FROM companies WHERE id = $1', [companyId]);
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    if (existing.rows[0].status === 'suspended') {
      return res.status(409).json({ success: false, error: 'That company is already suspended' });
    }

    const updated = await db.query(
      `UPDATE companies
          SET status = 'suspended', suspended_at = NOW(),
              suspension_reason = $1, suspended_by = $2
        WHERE id = $3
      RETURNING id, company_name, status, suspended_at, suspension_reason`,
      [reason, req.userId, companyId]
    );
    console.warn('[Admin] user', req.userId, 'suspended company', companyId, '-', reason);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Admin] Suspend company failed:', error);
    res.status(500).json({ success: false, error: 'Failed to suspend company' });
  }
});

/** Lift a suspension, clearing the record of it rather than leaving it stale. */
router.post('/companies/:companyId/restore', isAdmin, async (req: any, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!Number.isInteger(companyId)) {
      return res.status(400).json({ success: false, error: 'Invalid company id' });
    }

    const existing = await db.query('SELECT status FROM companies WHERE id = $1', [companyId]);
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    if (existing.rows[0].status !== 'suspended') {
      return res.status(409).json({ success: false, error: 'That company is not suspended' });
    }

    const updated = await db.query(
      `UPDATE companies
          SET status = 'active', suspended_at = NULL,
              suspension_reason = NULL, suspended_by = NULL
        WHERE id = $1
      RETURNING id, company_name, status`,
      [companyId]
    );
    console.warn('[Admin] user', req.userId, 'restored company', companyId);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Admin] Restore company failed:', error);
    res.status(500).json({ success: false, error: 'Failed to restore company' });
  }
});

// ---------------------------------------------------------------------------
// PDPA — DATA SUBJECT REQUESTS
//
// The Audit & Compliance screen kept an invented list of "GDPR requests" in
// localStorage. These are the real ones: every s21 export served and every s25
// erasure carried out is now recorded by the endpoints that do the work
// (routes/userDataExport.ts and routes/users.ts), so this reads records rather
// than producing them.
//
// Note the ids of erased users are retained deliberately — the record has to
// outlive the anonymisation it describes, or there is nothing to show that the
// obligation was met. No name or contact detail is stored here.
// ---------------------------------------------------------------------------

router.get('/data-requests', isAdmin, async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query as { type?: string; status?: string };
    const params: any[] = [];
    const where: string[] = [];

    if (type && ['access', 'erasure'].includes(type)) {
      params.push(type);
      where.push(`d.request_type = $${params.length}`);
    }
    if (status && ['received', 'in_progress', 'completed', 'refused'].includes(status)) {
      params.push(status);
      where.push(`d.status = $${params.length}`);
    }

    const result = await db.query(
      `SELECT d.id, d.user_id, d.request_type, d.status, d.requested_at,
              d.completed_at, d.outcome, d.notes,
              -- NULL once the account has been anonymised, which is the correct
              -- and expected outcome for a completed erasure.
              COALESCE(u.alias, u.display_name) AS user_name
         FROM data_subject_requests d
         LEFT JOIN users u ON u.id = d.user_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY d.requested_at DESC
        LIMIT 500`,
      params
    );

    const summary = await db.query(
      `SELECT request_type, status, COUNT(*)::int AS n
         FROM data_subject_requests GROUP BY request_type, status`
    );

    res.json({ success: true, data: result.rows, summary: summary.rows });
  } catch (error) {
    console.error('[Admin] List data subject requests failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch data requests' });
  }
});

/** Add a handling note. The request itself is a record of fact and is not edited. */
router.patch('/data-requests/:id/note', isAdmin, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    const note = String(req.body?.note || '').trim();
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    if (!note) {
      return res.status(400).json({ success: false, error: 'A note is required' });
    }
    const updated = await db.query(
      `UPDATE data_subject_requests
          SET notes = $1, handled_by = $2
        WHERE id = $3 RETURNING *`,
      [note, req.userId, id]
    );
    if (!updated.rows[0]) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Admin] Note data request failed:', error);
    res.status(500).json({ success: false, error: 'Failed to save note' });
  }
});

/**
 * GET /api/admin/activity-log — the real audit trail.
 *
 * The Audit & Compliance screen showed invented entries ("admin.login",
 * "192.168.1.1") from localStorage. `errand_activity_log` is the trail the app
 * actually writes as errands are posted, offered on, accepted and completed,
 * and it carries who did it. There is no separate `audit_logs` table — the
 * dead GET /audit-logs handler that queried one has been removed with this.
 */
router.get('/activity-log', isAdmin, async (req: Request, res: Response) => {
  try {
    const { type } = req.query as { type?: string };
    const params: any[] = [];
    let where = '';
    if (type?.trim()) {
      params.push(type.trim());
      where = `WHERE a.activity_type = $${params.length}`;
    }
    params.push(200);

    const result = await db.query(
      `SELECT a.id, a.errand_id, a.activity_type, a.actor_id, a.actor_name,
              a.actor_role, a.details, a.created_at, e.formatted_id AS errand_ref
         FROM errand_activity_log a
         LEFT JOIN errands e ON e.id = a.errand_id
         ${where}
        ORDER BY a.created_at DESC
        LIMIT $${params.length}`,
      params
    );

    const types = await db.query(
      `SELECT activity_type, COUNT(*)::int AS n FROM errand_activity_log
        GROUP BY activity_type ORDER BY n DESC`
    );

    res.json({ success: true, data: result.rows, types: types.rows });
  } catch (error) {
    console.error('[Admin] Activity log failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity log' });
  }
});

// ---------------------------------------------------------------------------
// OPERATIONAL ALERTS
//
// A rule may only reference a metric from services/alertMetrics.ts, and every
// metric there is a query over this database. That is deliberate: the previous
// screen let you define rules about "API response time" and "failed logins",
// neither of which this application measures, so nothing could ever fire.
//
// Rules are evaluated by cron every 15 minutes (evaluateAlertRules), which
// notifies admins and writes alert_events. The history this screen shows is
// therefore actual firings, not examples.
// ---------------------------------------------------------------------------

/** Every metric with its live value — the screen shows these as current state. */
router.get('/alert-metrics', isAdmin, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await readAllMetrics() });
  } catch (error) {
    console.error('[Admin] Alert metrics failed:', error);
    res.status(500).json({ success: false, error: 'Failed to read metrics' });
  }
});

router.get('/alert-rules', isAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT r.*, COALESCE(u.alias, u.display_name) AS created_by_name,
              (SELECT COUNT(*)::int FROM alert_events e WHERE e.rule_id = r.id) AS fire_count
         FROM alert_rules r
         LEFT JOIN users u ON u.id = r.created_by
        ORDER BY r.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Admin] List alert rules failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert rules' });
  }
});

router.post('/alert-rules', isAdmin, async (req: any, res: Response) => {
  try {
    const { name, metric_key, comparator, threshold, severity, cooldown_minutes, notify_admins } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'A name is required' });
    // Rejecting an unknown metric here is what stops this becoming a form that
    // stores rules nothing can evaluate.
    if (!METRIC_BY_KEY.has(metric_key)) {
      return res.status(400).json({
        success: false,
        error: `Unknown metric "${metric_key}". Pick one the platform actually measures.`,
        available: [...METRIC_BY_KEY.keys()],
      });
    }
    if (!['>', '>=', '<', '<=', '='].includes(comparator)) {
      return res.status(400).json({ success: false, error: 'comparator must be one of > >= < <= =' });
    }
    if (!Number.isFinite(Number(threshold))) {
      return res.status(400).json({ success: false, error: 'threshold must be a number' });
    }

    const result = await db.query(
      `INSERT INTO alert_rules (name, metric_key, comparator, threshold, severity, cooldown_minutes, notify_admins, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        name.trim(), metric_key, comparator, Number(threshold),
        ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning',
        Number.isFinite(Number(cooldown_minutes)) ? Number(cooldown_minutes) : 60,
        notify_admins !== false,
        req.userId,
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Admin] Create alert rule failed:', error);
    res.status(500).json({ success: false, error: 'Failed to create alert rule' });
  }
});

router.patch('/alert-rules/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { enabled, threshold, cooldown_minutes, severity } = req.body || {};
    const sets: string[] = [];
    const params: any[] = [];

    if (typeof enabled === 'boolean') { params.push(enabled); sets.push(`enabled = $${params.length}`); }
    if (Number.isFinite(Number(threshold))) { params.push(Number(threshold)); sets.push(`threshold = $${params.length}`); }
    if (Number.isFinite(Number(cooldown_minutes))) { params.push(Number(cooldown_minutes)); sets.push(`cooldown_minutes = $${params.length}`); }
    if (['info', 'warning', 'critical'].includes(severity)) { params.push(severity); sets.push(`severity = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nothing to update' });

    params.push(id);
    const result = await db.query(
      `UPDATE alert_rules SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Admin] Update alert rule failed:', error);
    res.status(500).json({ success: false, error: 'Failed to update alert rule' });
  }
});

router.delete('/alert-rules/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const result = await db.query('DELETE FROM alert_rules WHERE id = $1 RETURNING id', [Number(req.params.id)]);
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Delete alert rule failed:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alert rule' });
  }
});

/** Dry run: evaluate now and report, without notifying anyone or recording it. */
router.post('/alert-rules/:id/test', isAdmin, async (req: Request, res: Response) => {
  try {
    const out = await evaluateAlertRules({ dryRun: true, ruleId: Number(req.params.id) });
    if (!out.results.length) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, data: out.results[0] });
  } catch (error) {
    console.error('[Admin] Test alert rule failed:', error);
    res.status(500).json({ success: false, error: 'Failed to test rule' });
  }
});

/** Run the whole evaluation now, for real. Same path cron takes. */
router.post('/alert-rules/evaluate', isAdmin, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await evaluateAlertRules() });
  } catch (error) {
    console.error('[Admin] Evaluate alert rules failed:', error);
    res.status(500).json({ success: false, error: 'Evaluation failed' });
  }
});

router.get('/alert-events', isAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM alert_events ORDER BY fired_at DESC LIMIT 200`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Admin] Alert events failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert history' });
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// ============================================
// COMPANY VERIFICATION REVIEW
// The ACRA profile holds directors' personal data, so the document is dropped
// as soon as a decision is made — we keep the outcome, not the file.
// ============================================

// GET /api/admin/verifications - pending queue (document excluded from the list)
router.get('/verifications', isAdmin, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const result = await db.query(
      `SELECT v.id, v.company_id, v.status, v.submitted_at, v.acra_profile_date,
              v.matched_officer, v.reviewed_at, v.rejection_reason,
              v.document_name, v.document_mime,
              c.company_name, c.uen, c.certified,
              u.display_name AS submitted_by_name
         FROM company_verifications v
         JOIN companies c ON c.id = v.company_id
         LEFT JOIN users u ON u.id = v.submitted_by
        WHERE v.status = $1
        ORDER BY v.submitted_at ASC`,
      [status]
    );
    const pending = await db.query(
      "SELECT COUNT(*)::int AS n FROM company_verifications WHERE status = 'pending'"
    );
    res.json({
      success: true,
      data: { verifications: result.rows, pendingCount: pending.rows[0]?.n ?? 0 },
    });
  } catch (error) {
    console.error('[Admin] Verification queue failed:', error);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

// GET /api/admin/verifications/:id/document - fetch the file only while reviewing
router.get('/verifications/:id/document', isAdmin, async (req: Request, res: Response) => {
  try {
    const r = await db.query(
      "SELECT document_data, document_mime, document_name, status FROM company_verifications WHERE id = $1",
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Verification not found' });
    if (!r.rows[0].document_data) {
      return res.status(410).json({ error: 'Document was discarded after the decision was recorded' });
    }
    res.json({
      success: true,
      data: {
        document: r.rows[0].document_data,
        mime: r.rows[0].document_mime,
        name: r.rows[0].document_name,
      },
    });
  } catch (error) {
    console.error('[Admin] Verification document failed:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /api/admin/verifications/:id/approve
router.post('/verifications/:id/approve', isAdmin, async (req: any, res: Response) => {
  try {
    const { matchedOfficer } = req.body;
    const v = await db.query(
      "SELECT company_id, status FROM company_verifications WHERE id = $1",
      [req.params.id]
    );
    if (v.rows.length === 0) return res.status(404).json({ error: 'Verification not found' });
    if (v.rows[0].status !== 'pending') {
      return res.status(409).json({ error: `Already ${v.rows[0].status}` });
    }

    // Record the outcome and DROP the document in the same statement
    const upd = await db.query(
      `UPDATE company_verifications
          SET status = 'verified', reviewed_by = $1, reviewed_at = NOW(),
              matched_officer = COALESCE($2, matched_officer),
              document_data = NULL
        WHERE id = $3
        RETURNING id, company_id, status, reviewed_at, matched_officer`,
      [req.userId || null, matchedOfficer || null, req.params.id]
    );

    await db.query(
      'UPDATE companies SET certified = TRUE, certification_date = NOW() WHERE id = $1',
      [v.rows[0].company_id]
    );

    console.log('[Admin] Company verified:', v.rows[0].company_id, 'by', req.userId);

    // Signup is only complete now — welcome them and say what's next.
    // Fire and forget: a mail failure must not undo the approval.
    sendCompanyApprovedNotice(v.rows[0].company_id).catch(() => {});

    res.json({ success: true, message: 'Company verified', data: upd.rows[0] });
  } catch (error) {
    console.error('[Admin] Approve verification failed:', error);
    res.status(500).json({ error: 'Failed to approve verification' });
  }
});

// POST /api/admin/verifications/:id/reject
router.post('/verifications/:id/reject', isAdmin, async (req: any, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Please give a reason so the company knows what to fix' });
    }
    const v = await db.query(
      "SELECT company_id, status FROM company_verifications WHERE id = $1",
      [req.params.id]
    );
    if (v.rows.length === 0) return res.status(404).json({ error: 'Verification not found' });
    if (v.rows[0].status !== 'pending') {
      return res.status(409).json({ error: `Already ${v.rows[0].status}` });
    }

    const upd = await db.query(
      `UPDATE company_verifications
          SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
              rejection_reason = $2, document_data = NULL
        WHERE id = $3
        RETURNING id, company_id, status, rejection_reason, reviewed_at`,
      [req.userId || null, String(reason).trim(), req.params.id]
    );

    console.log('[Admin] Verification rejected:', v.rows[0].company_id, 'by', req.userId);
    sendCompanyRejectedNotice(v.rows[0].company_id, String(reason).trim()).catch(() => {});
    res.json({ success: true, message: 'Verification rejected', data: upd.rows[0] });
  } catch (error) {
    console.error('[Admin] Reject verification failed:', error);
    res.status(500).json({ error: 'Failed to reject verification' });
  }
});

/**
 * GET /api/admin/users — the platform user list.
 *
 * AdminUserManagement offered Ban, Suspend, Unban and Change Tier and never
 * called the server: every action wrote to the admin's own browser, so a
 * banned user stayed active, the ban vanished with the cache, and a second
 * admin saw nothing. The ban endpoints below were already real and the auth
 * middleware already blocks banned users — only the list and the wiring were
 * missing.
 *
 * `reputation` maps to average_rating. There is no tier or violations column;
 * those are returned as null rather than invented, and the tier endpoint still
 * answers 501.
 */
router.get('/users', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    const params: any[] = [];
    const where: string[] = [];

    if (status && ['active', 'suspended', 'banned'].includes(status)) {
      params.push(status);
      where.push(`COALESCE(u.status, 'active') = $${params.length}`);
    }
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`(u.display_name ILIKE $${params.length} OR u.alias ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const result = await db.query(
      `SELECT u.id,
              COALESCE(u.alias, u.display_name) AS name,
              u.email,
              u.role,
              COALESCE(u.status, 'active') AS status,
              u.average_rating AS reputation,
              u.errandify_points,
              u.ban_reason,
              u.banned_at,
              u.suspended_at,
              u.last_active_at,
              u.created_at,
              NULL::text AS tier,
              NULL::int AS violations
         FROM users u
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY u.created_at DESC
        LIMIT 500`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        ...r,
        id: String(r.id),
        reputation: r.reputation === null ? null : Number(r.reputation),
        errandify_points: Number(r.errandify_points) || 0,
      })),
    });
  } catch (error) {
    console.error('[Admin] User list failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// SUSPEND USER
router.post('/users/:userId/suspend', isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Suspension reason required' });
    const r = await db.query(
      `UPDATE users SET status = $1, suspension_reason = $2, suspended_at = NOW()
       WHERE id = $3 RETURNING id, display_name, status`,
      ['suspended', reason, userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    console.log('[Admin] User suspended:', userId, 'by', (req as any).userId);
    res.json({ success: true, message: 'User suspended successfully', data: r.rows[0] });
  } catch (error) {
    console.error('[Admin] Suspend failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// BAN USER
router.post('/users/:userId/ban', isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Ban reason required' });
    const r = await db.query(
      `UPDATE users SET status = $1, ban_reason = $2, banned_at = NOW()
       WHERE id = $3 RETURNING id, display_name, status`,
      ['banned', reason, userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    console.log('[Admin] User banned:', userId, 'by', (req as any).userId);
    res.json({ success: true, message: 'User banned successfully', data: r.rows[0] });
  } catch (error) {
    console.error('[Admin] Ban failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// RESTORE USER
router.post('/users/:userId/restore', isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const r = await db.query(
      `UPDATE users SET status = $1, suspension_reason = NULL, ban_reason = NULL,
              banned_at = NULL, suspended_at = NULL
       WHERE id = $2 RETURNING id, display_name, status`,
      ['active', userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    console.log('[Admin] User restored:', userId, 'by', (req as any).userId);
    res.json({ success: true, message: 'User restored successfully', data: r.rows[0] });
  } catch (error) {
    console.error('[Admin] Restore failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to restore user' });
  }
});

// CHANGE USER TIER — not implemented: users has no `tier` column.
router.patch('/users/:userId/tier', isAdmin, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'User tiers are not implemented yet (no tier field on users).',
  });
});

// ============================================
// PAYMENT MANAGEMENT
// ============================================
// The `payments`, `payment_refunds` and `admin_compensation` tables do not exist.
// These endpoints return 501 rather than pretending money moved — a refund that
// silently fails is far worse than one that clearly refuses.

// PROCESS REFUND — not implemented
router.post('/payments/:transactionId/refund', isAdmin, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Refunds are not implemented yet. Issue this refund in Stripe directly and record it manually.',
  });
});

// RETRY FAILED PAYMENT — not implemented
router.post('/payments/:transactionId/retry', isAdmin, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Payment retry is not implemented yet. Retry the charge in Stripe directly.',
  });
});

// ============================================
// ERRAND MANAGEMENT
// ============================================

// CANCEL ERRAND WITH COMPENSATION
/**
 * GET /api/admin/errands — the platform errand list.
 *
 * AdminErrandManagement kept its errands in localStorage, so Cancel, Extend
 * and Force Complete changed nothing: the errand stayed live for both parties
 * and the "cancellation" disappeared with the admin's cache. The four action
 * endpoints below were already real; the list and the wiring were missing.
 *
 * There is no errands.doer_id — the doer is whoever made the accepted offer,
 * so it comes through accepted_bid_id -> bids.doer_id.
 */
router.get('/errands', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    const params: any[] = [];
    const where: string[] = [];

    if (status && status !== 'all') {
      params.push(status);
      where.push(`e.status = $${params.length}`);
    }
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`(e.title ILIKE $${params.length} OR e.formatted_id ILIKE $${params.length})`);
    }

    const result = await db.query(
      `SELECT e.id,
              COALESCE(e.formatted_id, e.id::text) AS formatted_id,
              e.title, e.category, e.status, e.budget,
              e.deadline, e.created_at,
              e.cancellation_reason, e.cancelled_at, e.completed_at,
              COALESCE(asker.alias, asker.display_name) AS "askerName",
              COALESCE(doer.alias, doer.display_name) AS "doerName"
         FROM errands e
         LEFT JOIN users asker ON asker.id = e.asker_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
         LEFT JOIN users doer ON doer.id = ab.doer_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY e.created_at DESC
        LIMIT 500`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        ...r,
        id: String(r.id),
        budget: Number(r.budget) || 0,
      })),
    });
  } catch (error) {
    console.error('[Admin] Errand list failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to load errands' });
  }
});

router.post('/errands/:errandId/cancel', isAdmin, async (req: Request, res: Response) => {
  try {
    const { errandId } = req.params;
    const { reason, compensationAmount } = req.body;
    if (!reason) return res.status(400).json({ error: 'Cancellation reason required' });
    const r = await db.query(
      `UPDATE errands SET status = $1, cancellation_reason = $2, cancelled_at = NOW()
       WHERE id = $3 RETURNING id, formatted_id, status`,
      ['cancelled', reason, errandId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Errand not found' });

    // Compensation is not implemented — there is no payouts table yet. Say so
    // rather than reporting success for money that was never issued.
    if (compensationAmount > 0) {
      console.warn('[Admin] Cancel: compensation requested but not implemented', errandId, compensationAmount);
      return res.status(501).json({
        success: false,
        error: 'Errand was cancelled, but compensation could not be issued — payouts are not implemented yet. Please refund manually.',
        data: r.rows[0],
      });
    }

    console.log('[Admin] Errand cancelled:', errandId, 'by', (req as any).userId);
    res.json({ success: true, message: 'Errand cancelled', data: r.rows[0] });
  } catch (error) {
    console.error('[Admin] Cancel errand failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to cancel errand' });
  }
});

// REASSIGN ERRAND — not implemented. Errands have no assigned_to column; the
// doer is derived from the accepted offer (errands.accepted_bid_id -> bids.doer_id),
// so reassigning means moving the accepted offer, which needs its own flow.
router.patch('/errands/:errandId/reassign', isAdmin, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Reassigning an errand is not implemented yet. The doer comes from the accepted offer, so this needs an offer-transfer flow.',
  });
});

// EXTEND DEADLINE
router.patch('/errands/:errandId/extend', isAdmin, async (req: Request, res: Response) => {
  try {
    const { errandId } = req.params;
    const { newDeadline } = req.body;
    if (!newDeadline) return res.status(400).json({ error: 'New deadline required' });
    const r = await db.query(
      'UPDATE errands SET deadline = $1 WHERE id = $2 RETURNING id, formatted_id, deadline',
      [newDeadline, errandId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Errand not found' });
    console.log('[Admin] Deadline extended:', errandId, 'by', (req as any).userId);
    res.json({ success: true, message: 'Errand deadline extended', data: r.rows[0] });
  } catch (error) {
    console.error('[Admin] Extend deadline failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to extend deadline' });
  }
});

// FORCE MARK COMPLETE
router.post('/errands/:errandId/complete', isAdmin, async (req: Request, res: Response) => {
  try {
    const { errandId } = req.params;
    const r = await db.query(
      `UPDATE errands SET status = $1, completed_at = NOW()
       WHERE id = $2 RETURNING id, formatted_id, status`,
      ['completed', errandId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Errand not found' });
    console.log('[Admin] Errand force-completed:', errandId, 'by', (req as any).userId);

    // A force-complete is still a completed errand, so it can still be the one
    // that earns a referrer their first-errand bonus. Idempotent — if the doer
    // has already had an errand completed, this does nothing.
    creditFirstErrandForErrand(errandId).catch(() => undefined);

    res.json({ success: true, message: 'Errand marked as completed', data: r.rows[0] });
  } catch (error) {
    console.error('[Admin] Force complete failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to mark errand complete' });
  }
});

// ============================================
// TIER 2: CONFIGURATION
// ============================================

// ADD STAFF TO COMPANY
router.post('/companies/:companyId/staff', isAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { name, email, role } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: 'Missing required fields' });
    const result = await db.query('INSERT INTO company_staff (company_id, name, email, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id', [companyId, name, email, role, 'active']);
    res.status(201).json({ id: result.rows[0].id, name, email, role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add staff' });
  }
});

// REMOVE STAFF
router.delete('/companies/:companyId/staff/:staffId', isAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId, staffId } = req.params;
    await db.query('DELETE FROM company_staff WHERE id = ? AND company_id = ?', [staffId, companyId]);
    res.json({ message: 'Staff member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove staff' });
  }
});

// GENERATE API KEY
router.post('/companies/:companyId/api-keys', isAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { name } = req.body;
    const apiKey = `sk_live_${Math.random().toString(36).substr(2, 20)}`;
    const result = await db.query('INSERT INTO api_keys (company_id, name, key, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id', [companyId, name, apiKey, 'active']);
    res.status(201).json({ id: result.rows[0].id, name, key: apiKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// REVOKE API KEY
router.patch('/api-keys/:keyId/revoke', isAdmin, async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    await db.query('UPDATE api_keys SET status = ? WHERE id = ?', ['revoked', keyId]);
    res.json({ message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// CREATE WEBHOOK
router.post('/companies/:companyId/webhooks', isAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { url, events } = req.body;
    if (!url || !events || events.length === 0) return res.status(400).json({ error: 'URL and events required' });
    const result = await db.query('INSERT INTO webhooks (company_id, url, events, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id', [companyId, url, JSON.stringify(events), 'active']);
    res.status(201).json({ id: result.rows[0].id, url, events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// TOGGLE WEBHOOK
router.patch('/webhooks/:webhookId/toggle', isAdmin, async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    const webhook = await db.query('SELECT status FROM webhooks WHERE id = ?', [webhookId]);
    const newStatus = webhook[0]?.status === 'active' ? 'inactive' : 'active';
    await db.query('UPDATE webhooks SET status = ? WHERE id = ?', [newStatus, webhookId]);
    res.json({ message: 'Webhook status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle webhook' });
  }
});

// DELETE WEBHOOK
router.delete('/webhooks/:webhookId', isAdmin, async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    await db.query('DELETE FROM webhooks WHERE id = ?', [webhookId]);
    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// TOGGLE FEATURE FLAG
router.patch('/feature-flags/:flagId', isAdmin, async (req: Request, res: Response) => {
  try {
    const { flagId } = req.params;
    const { enabled } = req.body;
    await db.query('UPDATE feature_flags SET enabled = ?, updated_at = NOW() WHERE id = ?', [enabled ? 1 : 0, flagId]);
    res.json({ message: 'Feature flag updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// UPDATE ROLLOUT
router.patch('/feature-flags/:flagId/rollout', isAdmin, async (req: Request, res: Response) => {
  try {
    const { flagId } = req.params;
    const { percentage } = req.body;
    if (percentage < 0 || percentage > 100) return res.status(400).json({ error: 'Percentage must be 0-100' });
    await db.query('UPDATE feature_flags SET rollout_percentage = ?, updated_at = NOW() WHERE id = ?', [percentage, flagId]);
    res.json({ message: 'Rollout percentage updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rollout' });
  }
});

/*
 * The POST /holidays and DELETE /holidays/:holidayId handlers that used to sit
 * here have been removed in favour of the full CRUD set in routes/holidays.ts.
 *
 * This router is mounted first on /api/admin, so these two shadowed the working
 * handlers — and they could never succeed: MySQL `?` placeholders against a
 * Postgres pool, a MySQL-only `result.insertId`, and an INSERT into a `country`
 * column the holidays table does not have. Creating or deleting a holiday from
 * the admin returned 500 every time.
 */

/*
 * GET /audit-logs removed: it selected from `audit_logs`, a table that does not
 * exist, and returned the raw pg QueryResult rather than rows even in theory.
 * The real trail is GET /api/admin/activity-log above.
 */

// PROCESS GDPR REQUEST
router.post('/gdpr-requests/:requestId/process', isAdmin, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    if (!['pending', 'processing', 'completed', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await db.query('UPDATE gdpr_requests SET status = ?, updated_at = NOW() WHERE id = ?', [status, requestId]);
    res.json({ message: 'GDPR request updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process GDPR request' });
  }
});

// CREATE ALERT RULE
router.post('/alert-rules', isAdmin, async (req: Request, res: Response) => {
  try {
    const { name, condition, threshold, channels } = req.body;
    if (!name || !condition || !channels || channels.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await db.query('INSERT INTO alert_rules (name, condition, threshold, channels, enabled, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id', [name, condition, threshold, JSON.stringify(channels), 1]);
    res.status(201).json({ id: result.rows[0].id, name, condition, threshold, channels });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

// TOGGLE ALERT RULE
router.patch('/alert-rules/:ruleId', isAdmin, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;
    await db.query('UPDATE alert_rules SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, ruleId]);
    res.json({ message: 'Alert rule updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

/*
 * The Marcom write handlers that used to live here — POST /campaigns/email,
 * /notifications/send, /event-reminders, /blog/articles, /recognition/award
 * and /banners/hero — have been removed rather than repaired.
 *
 * None of them could ever have worked. They used MySQL `?` placeholders and
 * `result.insertId` against a Postgres pool, and four of the five tables they
 * inserted into (email_campaigns, event_reminders, blog_articles,
 * recognitions, hero_banners) did not exist. Every call returned a 500 that
 * the frontend never made, because the screens saved to localStorage instead.
 *
 * The real implementations are:
 *   campaigns, broadcasts, recognition, banners, reminders → routes/marcom.ts
 *   blog articles                                          → routes/blog.ts
 *
 * POST /alert-rules and PATCH /alert-rules/:ruleId above have the same two
 * faults and no `alert_rules` table, but they belong to monitoring rather than
 * Marcom and are left for whoever owns that screen.
 */

/**
 * GET /api/admin/subscriptions — every company's plan, for the admin table.
 *
 * Reads company_subscriptions rather than /api/subscriptions/status, which
 * returns a hardcoded silver tier to whoever asks; an admin overview built on
 * that would show every company as silver regardless of what they pay.
 *
 * stripe_subscription_id and pending_downgrade_to are surfaced only if those
 * columns exist — the billing columns were added at different times and this
 * page should not 500 on a database that predates them.
 */
router.get('/subscriptions', isAdmin, async (_req: Request, res: Response) => {
  try {
    const cols = await db.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'company_subscriptions'`
    );
    const has = new Set(cols.rows.map((r: any) => r.column_name));
    const opt = (name: string, as = name) =>
      has.has(name) ? `cs.${name} AS ${as}` : `NULL AS ${as}`;

    const result = await db.query(
      `SELECT cs.company_id,
              c.company_name,
              cs.subscription_tier AS current_tier,
              ${opt('billing_cycle', 'billing_type')},
              CASE WHEN cs.expires_at IS NULL OR cs.expires_at > NOW()
                   THEN 'active' ELSE 'expired' END AS status,
              cs.expires_at AS renewal_date,
              ${opt('stripe_subscription_id')},
              ${opt('pending_downgrade_to')},
              cs.created_at
         FROM company_subscriptions cs
         JOIN companies c ON c.id = cs.company_id
        ORDER BY cs.created_at DESC
        LIMIT 500`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Admin] Subscriptions fetch failed:', error);
    res.status(500).json({ error: 'Could not load subscriptions' });
  }
});

// ── Data retention approvals ────────────────────────────────────────────────
// The purge never runs on a timer alone: a report is raised a week ahead and
// only an approved batch is ever deleted. See services/retentionPurge.ts.

router.get('/retention/pending', isAdmin, async (_req: Request, res: Response) => {
  try {
    const r = await db.query(
      `SELECT id, status, to_char(cutoff_date,'YYYY-MM-DD') AS cutoff, eligible_count,
              to_char(purge_not_before,'YYYY-MM-DD') AS purge_not_before,
              report, created_at
         FROM retention_purge_approvals
        WHERE status IN ('pending','approved')
        ORDER BY created_at DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    console.error('[Admin] retention pending failed:', e);
    res.status(500).json({ error: 'Could not load retention approvals' });
  }
});

router.post('/retention/:batchId/decide', isAdmin, async (req: any, res: Response) => {
  try {
    const { decision, note } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
    }
    const { decideRetentionBatch } = await import('../services/retentionPurge.js');
    const ok = await decideRetentionBatch(
      parseInt(req.params.batchId, 10), parseInt(req.userId, 10), decision, note
    );
    if (!ok) return res.status(409).json({ error: 'That batch is not pending — already decided.' });
    res.json({ success: true, message: decision === 'approved'
      ? 'Approved. The purge runs after its 7-day window.'
      : 'Rejected. Nothing will be deleted.' });
  } catch (e) {
    console.error('[Admin] retention decide failed:', e);
    res.status(500).json({ error: 'Could not record that decision' });
  }
});

export default router;
