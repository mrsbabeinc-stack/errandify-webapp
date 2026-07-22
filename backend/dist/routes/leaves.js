import express from 'express';
import db from '../db.js';
const router = express.Router();
// Get all leave requests
router.get('/leaves', async (req, res) => {
    try {
        const { status, staffId, startDate, endDate } = req.query;
        let query = 'SELECT * FROM leave_requests WHERE 1=1';
        const params = [];
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
    }
    catch (error) {
        console.error('[Leaves] Get leaves error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
    }
});
// Get leave by ID
router.get('/leaves/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Leaves] Get leave error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leave request' });
    }
});
// Create leave request
router.post('/leaves', async (req, res) => {
    try {
        const { staff_id, staff_name, leave_type, start_date, end_date, period, reason, notes, is_recurring, recurring_pattern, } = req.body;
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
        const result = await db.query(`INSERT INTO leave_requests (
        staff_id, staff_name, leave_type, start_date, end_date, period,
        reason, notes, is_recurring, recurring_pattern, days_count,
        status, created_at, last_modified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`, [
            staff_id, staff_name, leave_type, start_date, end_date || start_date, period,
            reason, notes || '', is_recurring || false, recurring_pattern ? JSON.stringify(recurring_pattern) : null,
            dayCount, 'pending', new Date().toISOString(), new Date().toISOString(),
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Leaves] Create leave error:', error);
        res.status(500).json({ success: false, error: 'Failed to create leave request' });
    }
});
// Update leave request (manager approval)
router.put('/leaves/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approved_by, approval_notes } = req.body;
        if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: pending, approved, or rejected',
            });
        }
        const result = await db.query(`UPDATE leave_requests SET
        status = $1,
        approved_by = $2,
        approval_notes = $3,
        last_modified = $4
       WHERE id = $5
       RETURNING *`, [status, approved_by, approval_notes || '', new Date().toISOString(), id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Leaves] Update leave error:', error);
        res.status(500).json({ success: false, error: 'Failed to update leave request' });
    }
});
// Delete leave request
router.delete('/leaves/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM leave_requests WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }
        res.json({ success: true, message: 'Leave request deleted' });
    }
    catch (error) {
        console.error('[Leaves] Delete leave error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete leave request' });
    }
});
// Get leave balance for staff
router.get('/leave-balance/:staffId', async (req, res) => {
    try {
        const { staffId } = req.params;
        // Get staff entitlements
        const staffResult = await db.query(`SELECT annual_leave_entitlement, sick_leave_entitlement FROM staff WHERE id = $1`, [staffId]);
        if (staffResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff not found' });
        }
        const staff = staffResult.rows[0];
        // Get approved leave usage this year
        const currentYear = new Date().getFullYear();
        const leaveUsage = await db.query(`SELECT leave_type, SUM(days_count) as days_used
       FROM leave_requests
       WHERE staff_id = $1 AND status = 'approved'
       AND EXTRACT(YEAR FROM start_date) = $2
       GROUP BY leave_type`, [staffId, currentYear]);
        const balances = {
            annual_leave: staff.annual_leave_entitlement,
            sick_leave: staff.sick_leave_entitlement,
            unpaid_leave: 365,
            other_leaves: {},
        };
        // Deduct used days
        leaveUsage.rows.forEach((row) => {
            if (row.leave_type === 'Annual Leave') {
                balances.annual_leave -= row.days_used;
            }
            else if (row.leave_type === 'Sick Leave') {
                balances.sick_leave -= row.days_used;
            }
            else {
                balances.other_leaves[row.leave_type] = balances.other_leaves[row.leave_type] || 0 - row.days_used;
            }
        });
        res.json({ success: true, data: balances });
    }
    catch (error) {
        console.error('[Leaves] Get balance error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leave balance' });
    }
});
export default router;
