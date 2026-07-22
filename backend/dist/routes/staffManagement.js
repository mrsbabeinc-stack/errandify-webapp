import express from 'express';
import db from '../db.js';
const router = express.Router();
// Get all staff
router.get('/staff', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT id, staff_id, first_name, last_name, email, phone, nric,
             department, position, hire_date, employment_type, status,
             base_salary, annual_leave_entitlement, sick_leave_entitlement,
             cpf_membership_no, created_at, last_modified
      FROM staff
      ORDER BY created_at DESC
    `);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('[Staff] Get staff error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
});
// Get staff by ID
router.get('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`SELECT id, staff_id, first_name, last_name, email, phone, nric,
              department, position, hire_date, employment_type, status,
              base_salary, annual_leave_entitlement, sick_leave_entitlement,
              cpf_membership_no, created_at, last_modified
       FROM staff WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Staff] Get staff by ID error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
});
// Create staff
router.post('/staff', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, nric, department, position, hire_date, employment_type, base_salary, annual_leave_entitlement, sick_leave_entitlement, cpf_membership_no } = req.body;
        // Generate staff_id
        const countResult = await db.query('SELECT COUNT(*) as count FROM staff');
        const staff_id = `S${String(countResult.rows[0].count + 1).padStart(3, '0')}`;
        const result = await db.query(`INSERT INTO staff (
        staff_id, first_name, last_name, email, phone, nric, department,
        position, hire_date, employment_type, base_salary,
        annual_leave_entitlement, sick_leave_entitlement, cpf_membership_no,
        status, created_at, last_modified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`, [
            staff_id, first_name, last_name, email, phone, nric, department,
            position, hire_date, employment_type, base_salary,
            annual_leave_entitlement || 12, sick_leave_entitlement || 4,
            cpf_membership_no, 'active', new Date().toISOString(), new Date().toISOString()
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Staff] Create staff error:', error);
        res.status(500).json({ success: false, error: 'Failed to create staff' });
    }
});
// Update staff
router.put('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, email, phone, nric, department, position, employment_type, status, base_salary, annual_leave_entitlement, sick_leave_entitlement, cpf_membership_no } = req.body;
        const result = await db.query(`UPDATE staff SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        nric = COALESCE($5, nric),
        department = COALESCE($6, department),
        position = COALESCE($7, position),
        employment_type = COALESCE($8, employment_type),
        status = COALESCE($9, status),
        base_salary = COALESCE($10, base_salary),
        annual_leave_entitlement = COALESCE($11, annual_leave_entitlement),
        sick_leave_entitlement = COALESCE($12, sick_leave_entitlement),
        cpf_membership_no = COALESCE($13, cpf_membership_no),
        last_modified = $14
       WHERE id = $15
       RETURNING *`, [
            first_name, last_name, email, phone, nric, department, position,
            employment_type, status, base_salary, annual_leave_entitlement,
            sick_leave_entitlement, cpf_membership_no, new Date().toISOString(), id
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Staff] Update staff error:', error);
        res.status(500).json({ success: false, error: 'Failed to update staff' });
    }
});
// Delete staff
router.delete('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM staff WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff not found' });
        }
        res.json({ success: true, message: 'Staff deleted' });
    }
    catch (error) {
        console.error('[Staff] Delete staff error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete staff' });
    }
});
export default router;
