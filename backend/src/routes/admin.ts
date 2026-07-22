import express, { Request, Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { sendCompanyApprovedNotice, sendCompanyRejectedNotice } from '../services/companyOnboarding.js';

const router = express.Router();

// Admin guard: authenticate first, then verify the role from the database.
// The JWT carries only { userId, email } — it has no role — so the previous
// check on req.user.role could never pass and every route here returned 403.
// Express flattens middleware arrays, so this drops into existing routes as-is.
const isAdmin: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

// ============================================
// TIER 1: OPERATIONS
// ============================================

// CREATE ADMIN USER
router.post('/admins', isAdmin, async (req: Request, res: Response) => {
  try {
    const { email, name, role, twoFactorEnabled } = req.body;
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await db.query(
      'INSERT INTO admin_users (email, name, role, two_factor_enabled, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [email, name, role, twoFactorEnabled ? 1 : 0, 'active']
    );
    res.status(201).json({ id: result.insertId, email, name, role, twoFactorEnabled, status: 'active' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// GET ALL ADMINS
router.get('/admins', isAdmin, async (req: Request, res: Response) => {
  try {
    const admins = await db.query('SELECT id, email, name, role, status, last_login, two_factor_enabled FROM admin_users ORDER BY created_at DESC');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// DELETE ADMIN
router.delete('/admins/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM admin_users WHERE id = ?', [id]);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// TOGGLE 2FA
router.patch('/admins/:id/2fa', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    await db.query('UPDATE admin_users SET two_factor_enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
    res.json({ message: '2FA toggled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update 2FA' });
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
    const result = await db.query('INSERT INTO company_staff (company_id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [companyId, name, email, role, 'active']);
    res.status(201).json({ id: result.insertId, name, email, role });
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
    const result = await db.query('INSERT INTO api_keys (company_id, name, key, status, created_at) VALUES (?, ?, ?, ?, NOW())', [companyId, name, apiKey, 'active']);
    res.status(201).json({ id: result.insertId, name, key: apiKey });
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
    const result = await db.query('INSERT INTO webhooks (company_id, url, events, status, created_at) VALUES (?, ?, ?, ?, NOW())', [companyId, url, JSON.stringify(events), 'active']);
    res.status(201).json({ id: result.insertId, url, events });
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

// ADD HOLIDAY
router.post('/holidays', isAdmin, async (req: Request, res: Response) => {
  try {
    const { date, name, country } = req.body;
    if (!date || !name) return res.status(400).json({ error: 'Date and name required' });
    const result = await db.query('INSERT INTO holidays (date, name, country, created_at) VALUES (?, ?, ?, NOW())', [date, name, country || 'SG']);
    res.status(201).json({ id: result.insertId, date, name, country });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add holiday' });
  }
});

// DELETE HOLIDAY
router.delete('/holidays/:holidayId', isAdmin, async (req: Request, res: Response) => {
  try {
    const { holidayId } = req.params;
    await db.query('DELETE FROM holidays WHERE id = ?', [holidayId]);
    res.json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

// GET AUDIT LOGS
router.get('/audit-logs', isAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

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
    const result = await db.query('INSERT INTO alert_rules (name, condition, threshold, channels, enabled, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [name, condition, threshold, JSON.stringify(channels), 1]);
    res.status(201).json({ id: result.insertId, name, condition, threshold, channels });
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

// CREATE EMAIL CAMPAIGN
router.post('/campaigns/email', isAdmin, async (req: Request, res: Response) => {
  try {
    const { name, subject, recipientCount } = req.body;
    if (!name || !subject) return res.status(400).json({ error: 'Name and subject required' });
    const result = await db.query('INSERT INTO email_campaigns (name, subject, recipient_count, status, created_at) VALUES (?, ?, ?, ?, NOW())', [name, subject, recipientCount, 'draft']);
    res.status(201).json({ id: result.insertId, name, subject, status: 'draft' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create email campaign' });
  }
});

// SEND NOTIFICATION
router.post('/notifications/send', isAdmin, async (req: Request, res: Response) => {
  try {
    const { title, message, type, targetAudience } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
    const result = await db.query('INSERT INTO notifications (title, message, type, target_audience, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [title, message, type, targetAudience, 'scheduled']);
    res.status(201).json({ id: result.insertId, title, message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// CREATE EVENT REMINDER
router.post('/event-reminders', isAdmin, async (req: Request, res: Response) => {
  try {
    const { eventName, description, scheduledDate, reminderTiming } = req.body;
    if (!eventName || !scheduledDate) return res.status(400).json({ error: 'Event name and date required' });
    const result = await db.query('INSERT INTO event_reminders (event_name, description, scheduled_date, reminder_timing, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [eventName, description, scheduledDate, reminderTiming, 'active']);
    res.status(201).json({ id: result.insertId, eventName, scheduledDate });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event reminder' });
  }
});

// CREATE BLOG ARTICLE
router.post('/blog/articles', isAdmin, async (req: Request, res: Response) => {
  try {
    const { title, author, category, content } = req.body;
    if (!title || !author) return res.status(400).json({ error: 'Title and author required' });
    const result = await db.query('INSERT INTO blog_articles (title, author, category, content, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [title, author, category, content, 'draft']);
    res.status(201).json({ id: result.insertId, title, author, status: 'draft' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// AWARD RECOGNITION
router.post('/recognition/award', isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, award, reason } = req.body;
    if (!userId || !award) return res.status(400).json({ error: 'User ID and award required' });
    const result = await db.query('INSERT INTO recognitions (user_id, award, reason, visibility, awarded_at) VALUES (?, ?, ?, ?, NOW())', [userId, award, reason, 'public']);
    res.status(201).json({ id: result.insertId, award });
  } catch (error) {
    res.status(500).json({ error: 'Failed to award recognition' });
  }
});

// CREATE HERO BANNER
router.post('/banners/hero', isAdmin, async (req: Request, res: Response) => {
  try {
    const { title, subtitle, ctaText, ctaLink, displayLocation } = req.body;
    if (!title || !ctaText) return res.status(400).json({ error: 'Title and CTA text required' });
    const result = await db.query('INSERT INTO hero_banners (title, subtitle, cta_text, cta_link, display_location, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [title, subtitle, ctaText, ctaLink, displayLocation, 'scheduled']);
    res.status(201).json({ id: result.insertId, title });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

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

export default router;
