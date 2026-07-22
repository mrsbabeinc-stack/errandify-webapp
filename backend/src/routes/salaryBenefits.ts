import express, { Request, Response } from 'express';
import db from '../db.js';

import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Every route in this file was unauthenticated while mounted at /api/admin.
 * Salary, allowance and benefit records were readable and writable with no
 * credentials at all.
 *
 * Applied at router level rather than per route so a handler added later
 * cannot be forgotten — the same fix as routes/rbac.ts.
 */
router.use(authMiddleware, requireAdmin(['admin', 'super-admin']));

// Get staff salary info
router.get('/salary/:staffId', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const result = await db.query(
      `SELECT id, staff_id, staff_name, position, department, base_salary,
              total_allowances, gross_salary, notes, last_modified
       FROM staff_salary WHERE staff_id = $1`,
      [staffId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Salary record not found' });
    }

    // Get allowances
    const allowances = await db.query(
      `SELECT id, name, amount, frequency, description FROM staff_allowances
       WHERE staff_salary_id = $1 ORDER BY created_at DESC`,
      [result.rows[0].id]
    );

    // Get benefits
    const benefits = await db.query(
      `SELECT id, name, amount, frequency, description FROM staff_benefits
       WHERE staff_salary_id = $1 ORDER BY created_at DESC`,
      [result.rows[0].id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        allowances: allowances.rows,
        benefits: benefits.rows
      }
    });
  } catch (error) {
    console.error('[Salary] Get salary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch salary' });
  }
});

// Create or update staff salary
router.post('/salary/:staffId', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { staff_name, position, department, base_salary, notes } = req.body;

    // Check if salary record exists
    let salaryId;
    const existing = await db.query(
      'SELECT id FROM staff_salary WHERE staff_id = $1',
      [staffId]
    );

    if (existing.rows.length > 0) {
      salaryId = existing.rows[0].id;
      // Update existing
      await db.query(
        `UPDATE staff_salary SET
          base_salary = $1, notes = $2, last_modified = $3
         WHERE id = $4`,
        [base_salary, notes, new Date().toISOString(), salaryId]
      );
    } else {
      // Create new
      const result = await db.query(
        `INSERT INTO staff_salary (
          staff_id, staff_name, position, department, base_salary,
          total_allowances, gross_salary, last_modified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [staffId, staff_name, position, department, base_salary, 0, base_salary, new Date().toISOString()]
      );
      salaryId = result.rows[0].id;
    }

    res.json({ success: true, data: { id: salaryId } });
  } catch (error) {
    console.error('[Salary] Create/update salary error:', error);
    res.status(500).json({ success: false, error: 'Failed to save salary' });
  }
});

// Add allowance
router.post('/salary/:staffId/allowances', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { name, amount, frequency, description } = req.body;

    // Get salary record
    const salaryResult = await db.query(
      'SELECT id FROM staff_salary WHERE staff_id = $1',
      [staffId]
    );

    if (salaryResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Salary record not found' });
    }

    const salaryId = salaryResult.rows[0].id;

    const result = await db.query(
      `INSERT INTO staff_allowances (staff_salary_id, name, amount, frequency, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [salaryId, name, amount, frequency, description, new Date().toISOString()]
    );

    // Update total allowances
    const totalsResult = await db.query(
      'SELECT SUM(amount) as total FROM staff_allowances WHERE staff_salary_id = $1',
      [salaryId]
    );
    const totalAllowances = totalsResult.rows[0].total || 0;

    const salaryData = await db.query(
      'SELECT base_salary FROM staff_salary WHERE id = $1',
      [salaryId]
    );

    await db.query(
      `UPDATE staff_salary SET total_allowances = $1, gross_salary = $2
       WHERE id = $3`,
      [totalAllowances, salaryData.rows[0].base_salary + totalAllowances, salaryId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Salary] Add allowance error:', error);
    res.status(500).json({ success: false, error: 'Failed to add allowance' });
  }
});

// Remove allowance
router.delete('/allowances/:allowanceId', async (req: Request, res: Response) => {
  try {
    const { allowanceId } = req.params;

    const allowance = await db.query(
      'SELECT staff_salary_id FROM staff_allowances WHERE id = $1',
      [allowanceId]
    );

    if (allowance.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Allowance not found' });
    }

    const salaryId = allowance.rows[0].staff_salary_id;

    await db.query('DELETE FROM staff_allowances WHERE id = $1', [allowanceId]);

    // Update total
    const totalsResult = await db.query(
      'SELECT SUM(amount) as total FROM staff_allowances WHERE staff_salary_id = $1',
      [salaryId]
    );
    const totalAllowances = totalsResult.rows[0].total || 0;

    const salaryData = await db.query(
      'SELECT base_salary FROM staff_salary WHERE id = $1',
      [salaryId]
    );

    await db.query(
      `UPDATE staff_salary SET total_allowances = $1, gross_salary = $2
       WHERE id = $3`,
      [totalAllowances, salaryData.rows[0].base_salary + totalAllowances, salaryId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Salary] Delete allowance error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete allowance' });
  }
});

// Add benefit
router.post('/salary/:staffId/benefits', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { name, amount, frequency, description } = req.body;

    const salaryResult = await db.query(
      'SELECT id FROM staff_salary WHERE staff_id = $1',
      [staffId]
    );

    if (salaryResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Salary record not found' });
    }

    const salaryId = salaryResult.rows[0].id;

    const result = await db.query(
      `INSERT INTO staff_benefits (staff_salary_id, name, amount, frequency, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [salaryId, name, amount, frequency, description, new Date().toISOString()]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Salary] Add benefit error:', error);
    res.status(500).json({ success: false, error: 'Failed to add benefit' });
  }
});

// Remove benefit
router.delete('/benefits/:benefitId', async (req: Request, res: Response) => {
  try {
    const { benefitId } = req.params;
    const result = await db.query(
      'DELETE FROM staff_benefits WHERE id = $1 RETURNING staff_salary_id',
      [benefitId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Benefit not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Salary] Delete benefit error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete benefit' });
  }
});

export default router;
