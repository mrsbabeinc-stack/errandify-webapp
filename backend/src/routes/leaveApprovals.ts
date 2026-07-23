import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { LeaveService } from '../services/leaveService.js';
import { OperationHoursService } from '../services/operationHoursService.js';
import { requireCompanyRole, resolveCompanyRole, resolveMyCompany } from '../utils/companyRole.js';

const router = Router();

// ============================================================================
// LEAVE MANAGEMENT ENDPOINTS
// ============================================================================

// POST /api/leave/request - Staff applies for leave
router.post('/request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      company_id,
      leave_type,
      start_date,
      end_date,
      period = 'full-day',
      reason,
      notes,
      is_recurring,
      recurring_pattern
    } = req.body;

    const staff_id = parseInt(req.userId || '0', 10);

    if (!company_id || !leave_type || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'company_id, leave_type, and start_date required'
      });
    }

    // The applicant must actually belong to this company. Without this, any
    // signed-in user could file leave against any company by passing its id.
    const member = await db.query(
      `SELECT cs.id, COALESCE(u.alias, u.display_name) AS staff_name
         FROM company_staff cs
         JOIN users u ON u.id = cs.user_id
        WHERE cs.user_id = $1 AND cs.company_id = $2`,
      [staff_id, company_id]
    );

    if (!member.rows.length) {
      return res.status(403).json({ success: false, error: 'You are not staff of this company' });
    }

    // period and recurring were accepted from the body, echoed back in the
    // response, and then dropped on the floor — the INSERT wrote neither, so a
    // recurring morning-only request was stored as a one-off full day and the
    // applicant was told it had been submitted. Migration 077 added the columns.
    const wantedPeriod = ['full-day', 'morning', 'afternoon'].includes(String(period))
      ? String(period)
      : 'full-day';

    const leaveRes = await db.query(
      `INSERT INTO company_leave
         (company_id, staff_user_id, leave_type, start_date, end_date, reason, status,
          period, is_recurring, recurring_pattern)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
       RETURNING id, company_id, staff_user_id, leave_type, status,
                 period, is_recurring, recurring_pattern,
                 to_char(start_date, 'YYYY-MM-DD') AS start_date,
                 to_char(end_date,   'YYYY-MM-DD') AS end_date`,
      [company_id, staff_id, leave_type, start_date, end_date || start_date,
       [reason, notes].filter(Boolean).join(' — ') || null,
       wantedPeriod,
       !!is_recurring,
       is_recurring && recurring_pattern ? JSON.stringify(recurring_pattern) : null]
    );

    res.json({
      success: true,
      message: '✅ Leave request submitted',
      data: { ...leaveRes.rows[0], staff_name: member.rows[0].staff_name }
    });
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit leave request' });
  }
});

// GET /api/leave/requests?company_id=X - Get all leave requests
router.get('/requests', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, status, staff_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'company_id required' });
    }

    // company_id came straight off the query string and was never checked, so
    // any signed-in account could read another company's leave register —
    // including `reason`, which routinely carries medical detail.
    const gate = await requireCompanyRole(req.userId!, String(company_id), ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    const result = await db.query(
      `SELECT cl.id, cl.company_id, cl.staff_user_id, cl.leave_type, cl.status,
              cl.reason, cl.approved_by, cl.approved_at, cl.created_at,
              to_char(cl.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(cl.end_date,   'YYYY-MM-DD') AS end_date,
              (cl.end_date - cl.start_date + 1) AS days_count,
              -- Surfaced so the approver can see they're approving a half-day
              -- or a repeating block, not just a plain range (migration 077)
              cl.period, cl.is_recurring, cl.recurring_pattern,
              COALESCE(u.alias, u.display_name) AS staff_name
         FROM company_leave cl
         JOIN users u ON u.id = cl.staff_user_id
        WHERE cl.company_id = $1
          AND ($2::text IS NULL OR cl.status = $2)
          AND ($3::int  IS NULL OR cl.staff_user_id = $3)
        ORDER BY cl.status = 'pending' DESC, cl.start_date`,
      [parseInt(company_id as string), (status as string) || null,
       staff_id ? parseInt(staff_id as string) : null]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaves' });
  }
});

// PUT /api/leave/request/:id/approve - Manager approves leave
router.put('/request/:id/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;
    const approver_id = parseInt(req.userId || '0', 10);

    // Only an owner or manager of the SAME company may decide this. Previously
    // any signed-in user could approve any leave request by id.
    const leaveRes = await db.query(
      `SELECT cl.*, COALESCE(u.alias, u.display_name) AS staff_name
         FROM company_leave cl
         JOIN users u ON u.id = cl.staff_user_id
        WHERE cl.id = $1`,
      [id]
    );

    if (!leaveRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const leave = leaveRes.rows[0];

    const approver = await db.query(
      `SELECT 1 FROM company_staff
        WHERE user_id = $1 AND company_id = $2 AND role IN ('owner','manager')`,
      [approver_id, leave.company_id]
    );
    if (!approver.rows.length) {
      return res.status(403).json({ success: false, error: 'Only an owner or manager can decide leave' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Already ${leave.status}` });
    }

    await db.query(
      `UPDATE company_leave
          SET status = 'approved', approved_by = $1, approved_at = NOW(),
              reason = COALESCE(NULLIF($2, ''), reason)
        WHERE id = $3`,
      [approver_id, approval_notes || '', id]
    );

    res.json({
      success: true,
      message: `✅ Leave approved for ${leave.staff_name}`,
      data: { id, status: 'approved' }
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve leave' });
  }
});

// PUT /api/leave/request/:id/reject - Manager rejects leave
router.put('/request/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejected_reason } = req.body;
    const approver_id = parseInt(req.userId || '0', 10);

    const leaveRes = await db.query(
      `SELECT cl.*, COALESCE(u.alias, u.display_name) AS staff_name
         FROM company_leave cl
         JOIN users u ON u.id = cl.staff_user_id
        WHERE cl.id = $1`,
      [id]
    );

    if (!leaveRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const leave = leaveRes.rows[0];

    const approver = await db.query(
      `SELECT 1 FROM company_staff
        WHERE user_id = $1 AND company_id = $2 AND role IN ('owner','manager')`,
      [approver_id, leave.company_id]
    );
    if (!approver.rows.length) {
      return res.status(403).json({ success: false, error: 'Only an owner or manager can decide leave' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Already ${leave.status}` });
    }

    await db.query(
      `UPDATE company_leave
          SET status = 'rejected', approved_by = $1, approved_at = NOW(),
              reason = COALESCE(NULLIF($2, ''), reason)
        WHERE id = $3`,
      [approver_id, rejected_reason || '', id]
    );

    res.json({
      success: true,
      message: `❌ Leave rejected for ${leave.staff_name}`,
      data: { id, status: 'rejected' }
    });
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject leave' });
  }
});

// GET /api/leave/balance/:staff_id - Get leave balance
router.get('/balance/:staff_id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Your own balance, or one of your team's if you approve leave. Without
    // this, any account could read any staff member's leave entitlement.
    const target = parseInt(req.params.staff_id, 10);
    if (target !== parseInt(req.userId || '0', 10)) {
      const mine = await resolveMyCompany(req.userId!);
      const theirs = mine ? await resolveCompanyRole(target, mine.companyId) : null;
      if (!mine?.canActForCompany || !theirs) {
        return res.status(403).json({ success: false, error: 'You cannot view that leave balance' });
      }
    }
    const { staff_id } = req.params;

    // Entitlements are the MOM statutory minimums until a company sets its own.
    // Used days come from approved leave only — a pending request must not eat
    // someone's balance before anyone has agreed to it.
    const ENTITLEMENT: Record<string, number> = { annual: 14, sick: 14 };

    const used = await db.query(
      `SELECT leave_type, COALESCE(SUM(end_date - start_date + 1), 0) AS days
         FROM company_leave
        WHERE staff_user_id = $1 AND status = 'approved'
          AND date_part('year', start_date) = date_part('year', CURRENT_DATE)
        GROUP BY leave_type`,
      [parseInt(staff_id)]
    );

    // SUM returns a string from pg; Number() or the arithmetic below concatenates.
    const usedBy: Record<string, number> = {};
    for (const r of used.rows) usedBy[r.leave_type] = Number(r.days);

    const balance = Object.entries(ENTITLEMENT).map(([type, entitled]) => ({
      leave_type: type,
      entitled,
      used: usedBy[type] || 0,
      remaining: entitled - (usedBy[type] || 0),
    }));

    res.json({ success: true, data: balance });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave balance' });
  }
});

// GET /api/leave/check - Check if staff is on leave for a date
router.get('/check', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { staff_id, date } = req.query;

    if (!staff_id || !date) {
      return res.status(400).json({ success: false, error: 'staff_id and date required' });
    }

    // Approved leave only. Allocation must not skip someone because they have
    // merely asked for a day their manager has not agreed to yet.
    const r = await db.query(
      `SELECT 1 FROM company_leave
        WHERE staff_user_id = $1 AND status = 'approved'
          AND $2::date BETWEEN start_date AND end_date
        LIMIT 1`,
      [parseInt(staff_id as string), date]
    );

    res.json({
      success: true,
      data: { on_leave: r.rows.length > 0 }
    });
  } catch (error) {
    console.error('Leave check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check leave status' });
  }
});

// ============================================================================
// OPERATION HOURS ENDPOINTS
// ============================================================================

// GET /api/operations/hours/:company_id - Get company operation hours
router.get('/hours/:company_id', async (req: AuthRequest, res: Response) => {
  try {
    const { company_id } = req.params;
    const hours = await OperationHoursService.getCompanyHours(parseInt(company_id));

    if (!hours) {
      return res.status(404).json({ success: false, error: 'Operation hours not found' });
    }

    res.json({ success: true, data: hours });
  } catch (error) {
    console.error('Get operation hours error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch operation hours' });
  }
});

// PUT /api/operations/hours/:company_id - Update company operation hours
router.put('/hours/:company_id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id } = req.params;
    const hoursData = req.body;

    // Anyone could rewrite any company's opening hours
    const gate = await requireCompanyRole(req.userId!, company_id, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    const updated = await OperationHoursService.updateCompanyHours(
      parseInt(company_id),
      hoursData
    );

    if (!updated) {
      return res.status(400).json({ success: false, error: 'Failed to update hours' });
    }

    res.json({
      success: true,
      message: '✅ Operation hours updated',
      data: updated
    });
  } catch (error) {
    console.error('Update operation hours error:', error);
    res.status(500).json({ success: false, error: 'Failed to update operation hours' });
  }
});

// GET /api/operations/check - Check if time is within operating hours
router.get('/check', async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, date_time } = req.query;

    if (!company_id || !date_time) {
      return res.status(400).json({ success: false, error: 'company_id and date_time required' });
    }

    const check = await OperationHoursService.isWithinOperatingHours(
      parseInt(company_id as string),
      new Date(date_time as string)
    );

    res.json({ success: true, data: check });
  } catch (error) {
    console.error('Operation hours check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check operating hours' });
  }
});

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

// POST /api/approvals/request - Create approval request
router.post('/approvals/request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      company_id,
      module,
      request_type,
      amount,
      description,
      justification
    } = req.body;

    const requester_id = parseInt(req.userId || '0', 10);

    if (!company_id || !module || !request_type) {
      return res.status(400).json({
        success: false,
        error: 'company_id, module, and request_type required'
      });
    }

    // Get requester name
    const userRes = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [requester_id]
    );

    const requester_name = userRes.rows[0]?.display_name || 'Unknown';

    // Generate request number
    const countRes = await db.query(
      'SELECT COUNT(*) as count FROM approval_requests WHERE company_id = $1 AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())',
      [company_id]
    );
    const request_number = `APR-${new Date().getFullYear()}-${String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0')}`;

    // Create request
    const reqRes = await db.query(
      `INSERT INTO approval_requests (
        company_id, request_number, module, request_type,
        requester_id, requester_name, amount, description, justification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [company_id, request_number, module, request_type, requester_id, requester_name, amount, description, justification]
    );

    res.json({
      success: true,
      message: '✅ Approval request created',
      data: reqRes.rows[0]
    });
  } catch (error) {
    console.error('Create approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to create approval request' });
  }
});

// GET /api/approvals/requests - Get approval requests
router.get('/approvals/requests', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, status, module } = req.query;

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'company_id required' });
    }

    let query = 'SELECT * FROM approval_requests WHERE company_id = $1';
    const params: any[] = [company_id];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (module) {
      query += ` AND module = $${params.length + 1}`;
      params.push(module);
    }

    query += ' ORDER BY submission_date DESC';
    const result = await db.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch approvals' });
  }
});

// PUT /api/approvals/request/:id/step/:step/approve - Approve at step
router.put('/approvals/request/:id/step/:step/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, step } = req.params;
    const { approver_notes } = req.body;
    const approver_id = parseInt(req.userId || '0', 10);

    // Update step
    await db.query(
      `UPDATE approval_steps
       SET status = 'approved', approver_id = $1, approver_notes = $2, approved_at = NOW()
       WHERE approval_request_id = $3 AND step_level = $4`,
      [approver_id, approver_notes || '', id, step]
    );

    // Check if all steps approved
    const stepsRes = await db.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'approved\') as approved FROM approval_steps WHERE approval_request_id = $1',
      [id]
    );

    const { total, approved } = stepsRes.rows[0];

    // If all approved, update request status
    if (total === approved) {
      await db.query(
        'UPDATE approval_requests SET status = \'approved\', final_decision_date = NOW() WHERE id = $1',
        [id]
      );
    } else {
      // Move to next step
      await db.query(
        'UPDATE approval_requests SET current_level = current_level + 1 WHERE id = $1',
        [id]
      );
    }

    res.json({
      success: true,
      message: '✅ Step approved',
      data: { request_id: id, step, status: 'approved' }
    });
  } catch (error) {
    console.error('Approve step error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve step' });
  }
});

// PUT /api/approvals/request/:id/step/:step/reject - Reject at step
router.put('/approvals/request/:id/step/:step/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, step } = req.params;
    const { approver_notes } = req.body;
    const approver_id = parseInt(req.userId || '0', 10);

    // Reject step and mark entire request as rejected
    await db.query(
      `UPDATE approval_steps
       SET status = 'rejected', approver_id = $1, approver_notes = $2, approved_at = NOW()
       WHERE approval_request_id = $3 AND step_level = $4`,
      [approver_id, approver_notes || '', id, step]
    );

    await db.query(
      'UPDATE approval_requests SET status = \'rejected\', final_decision_date = NOW() WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: '❌ Request rejected',
      data: { request_id: id, step, status: 'rejected' }
    });
  } catch (error) {
    console.error('Reject step error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject step' });
  }
});

export default router;
