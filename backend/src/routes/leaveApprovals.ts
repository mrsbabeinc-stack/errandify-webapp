import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { LeaveService } from '../services/leaveService.js';
import { OperationHoursService } from '../services/operationHoursService.js';

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

    // Get staff info
    const staffRes = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [staff_id]
    );

    if (!staffRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    const staff_name = staffRes.rows[0].display_name;

    // Calculate days
    const start = new Date(start_date);
    const end = new Date(end_date || start_date);
    let dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (period === 'morning' || period === 'afternoon') {
      dayCount = 0.5;
    }

    // Insert leave request
    const leaveRes = await db.query(
      `INSERT INTO leave_requests (
        company_id, staff_id, staff_name, leave_type,
        start_date, end_date, period, reason, notes,
        days_count, is_recurring, recurring_pattern, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
      RETURNING *`,
      [
        company_id, staff_id, staff_name, leave_type,
        start_date, end_date || start_date, period, reason || '', notes || '',
        dayCount, is_recurring || false, recurring_pattern ? JSON.stringify(recurring_pattern) : null
      ]
    );

    res.json({
      success: true,
      message: '✅ Leave request submitted',
      data: leaveRes.rows[0]
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

    const leaves = await LeaveService.getLeaveRequests(parseInt(company_id as string), {
      status: status as string,
      staffId: staff_id ? parseInt(staff_id as string) : undefined
    });

    res.json({ success: true, data: leaves });
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

    // Get leave request
    const leaveRes = await db.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );

    if (!leaveRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const leave = leaveRes.rows[0];

    // Approve and deduct leave days
    await db.query(
      `UPDATE leave_requests
       SET status = 'approved', approved_by = $1, approval_notes = $2, approved_at = NOW()
       WHERE id = $3`,
      [approver_id, approval_notes || '', id]
    );

    // Deduct leave days from entitlement
    await LeaveService.deductLeaveDays(leave.staff_id, leave.leave_type, leave.days_count);

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
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );

    if (!leaveRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const leave = leaveRes.rows[0];

    await db.query(
      `UPDATE leave_requests
       SET status = 'rejected', approved_by = $1, rejected_reason = $2
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
    const { staff_id } = req.params;
    const balance = await LeaveService.getLeaveBalance(parseInt(staff_id));

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

    const isOnLeave = await LeaveService.isStaffOnLeave(
      parseInt(staff_id as string),
      new Date(date as string)
    );

    res.json({
      success: true,
      data: { on_leave: isOnLeave }
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
