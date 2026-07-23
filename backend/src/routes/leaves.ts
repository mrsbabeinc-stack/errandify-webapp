import express, { Request, Response } from 'express';
import db from '../db.js';

import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Same gap as routes/holidays.ts: no guard of its own, protected only by the
 * router-level guard in routes/staffManagement.ts happening to sit earlier on
 * the /api/admin mount. These rows carry staff names alongside leave type and
 * reason — sick leave reasons are health data — so the guard belongs here
 * rather than being inherited by accident.
 */
router.use(authMiddleware, requireAdmin(['admin', 'super-admin']));

// Get all leave requests
router.get('/leaves', async (req: Request, res: Response) => {
  try {
    const { status, staffId, startDate, endDate } = req.query;
    // start_date/end_date are DATE columns. node-postgres parses them into JS
    // Dates at *local* midnight, so serialising to JSON converts them to UTC
    // and, from SGT (UTC+8), moves them back a day: a leave stored as
    // 2026-08-03 reached the UI as 2026-08-02T16:00:00Z, and every caller that
    // does .split('T')[0] then showed the leave starting a day early.
    // Casting to text keeps a calendar date a calendar date.
    let query = 'SELECT *, start_date::text AS start_date, end_date::text AS end_date FROM leave_requests WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (staffId) {
      query += ` AND staff_id = $${params.length + 1}`;
      params.push(staffId);
    }

    if (startDate) {
      query += ` AND start_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND end_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Leaves] Get leaves error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
  }
});

// Get leave by ID
router.get('/leaves/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT *, start_date::text AS start_date, end_date::text AS end_date FROM leave_requests WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Leaves] Get leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave request' });
  }
});

// Create leave request
router.post('/leaves', async (req: Request, res: Response) => {
  try {
    const {
      staff_id,
      staff_name,
      leave_type,
      start_date,
      end_date,
      period,
      reason,
      notes,
      is_recurring,
      recurring_pattern,
    } = req.body;

    if (!staff_id || !leave_type || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: staff_id, leave_type, start_date',
      });
    }

    // Calculate number of days
    const start = new Date(start_date);
    const end = new Date(end_date || start_date);
    let dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Adjust for half-day
    if (period === 'morning' || period === 'afternoon') {
      dayCount = 0.5;
    }

    const result = await db.query(
      `INSERT INTO leave_requests (
        staff_id, staff_name, leave_type, start_date, end_date, period,
        reason, notes, is_recurring, recurring_pattern, days_count,
        status, created_at, last_modified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        staff_id, staff_name, leave_type, start_date, end_date || start_date, period,
        reason, notes || '', is_recurring || false, recurring_pattern ? JSON.stringify(recurring_pattern) : null,
        dayCount, 'pending', new Date().toISOString(), new Date().toISOString(),
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Leaves] Create leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to create leave request' });
  }
});

// Update leave request (manager approval)
router.put('/leaves/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approved_by, approval_notes } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: pending, approved, or rejected',
      });
    }

    const result = await db.query(
      `UPDATE leave_requests SET
        status = $1,
        approved_by = $2,
        approval_notes = $3,
        last_modified = $4
       WHERE id = $5
       RETURNING *`,
      [status, approved_by, approval_notes || '', new Date().toISOString(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Leaves] Update leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to update leave request' });
  }
});

// Delete leave request
router.delete('/leaves/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM leave_requests WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    res.json({ success: true, message: 'Leave request deleted' });
  } catch (error) {
    console.error('[Leaves] Delete leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete leave request' });
  }
});

// Get leave balance for staff
router.get('/leave-balance/:staffId', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;

    // Keyed on staff.staff_id ("S001"), not the numeric primary key: the
    // usage query below joins on leave_requests.staff_id, which holds that
    // same varchar. Looking the staff row up by `id` meant the two halves of
    // this handler were keyed on different things — passing "S001" threw on
    // the integer comparison, and passing a numeric id found the staff member
    // but then matched no leave rows, so the balance always came back as the
    // full entitlement.
    const staffResult = await db.query(
      `SELECT annual_leave_entitlement, sick_leave_entitlement FROM staff WHERE staff_id = $1`,
      [staffId]
    );

    if (staffResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    const staff = staffResult.rows[0];

    // Get approved leave usage this year
    const currentYear = new Date().getFullYear();
    const leaveUsage = await db.query(
      `SELECT leave_type, SUM(days_count) as days_used
       FROM leave_requests
       WHERE staff_id = $1 AND status = 'approved'
       AND EXTRACT(YEAR FROM start_date) = $2
       GROUP BY leave_type`,
      [staffId, currentYear]
    );

    const balances: any = {
      annual_leave: Number(staff.annual_leave_entitlement) || 0,
      sick_leave: Number(staff.sick_leave_entitlement) || 0,
      unpaid_leave: 365,
      other_leaves: {},
    };

    // Deduct used days
    leaveUsage.rows.forEach((row: any) => {
      // SUM() comes back as a string; without Number() the "other" branch below
      // would concatenate rather than subtract.
      const daysUsed = Number(row.days_used) || 0;

      if (row.leave_type === 'Annual Leave') {
        balances.annual_leave -= daysUsed;
      } else if (row.leave_type === 'Sick Leave') {
        balances.sick_leave -= daysUsed;
      } else {
        // Parenthesised: `x || 0 - days` binds as `x || (0 - days)`, so the
        // first entry for a leave type recorded a negative running total and
        // any later entry for it was dropped.
        balances.other_leaves[row.leave_type] =
          (balances.other_leaves[row.leave_type] || 0) - daysUsed;
      }
    });

    res.json({ success: true, data: balances });
  } catch (error) {
    console.error('[Leaves] Get balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave balance' });
  }
});

export default router;
