import express, { Request, Response } from 'express';
import db from '../db.js';

import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Every route in this file was unauthenticated while mounted at /api/admin.
 * GET /api/admin/staff returned full staff records — including NRIC,
 * email and phone — to an anonymous caller. Verified against a running server.
 *
 * Applied at router level rather than per route so a handler added later
 * cannot be forgotten — the same fix as routes/rbac.ts.
 */
// Casts bridge AuthRequest, which the express types in this repo do not accept
// as a Request; the middleware itself is unchanged.
router.use(
  authMiddleware as unknown as express.RequestHandler,
  requireAdmin(['admin', 'super-admin']) as unknown as express.RequestHandler
);

/**
 * Account numbers arrive with spaces and dashes depending on who typed them.
 * A GIRO file wants digits only, and "123-45678-9" not matching "123456789"
 * would look like two different accounts in a duplicate check.
 */
function normaliseAccountNumber(value: unknown): string | null {
  if (value == null || value === '') return null;
  const digits = String(value).replace(/[^0-9]/g, '');
  return digits || null;
}

// Get all staff
router.get('/staff', async (req: Request, res: Response) => {
  try {
    // No NRIC in the list. Holding it for an employee is lawful — CPF and IRAS
    // require it — but shipping every employee's NRIC to a browser just to
    // render a roster is more disclosure than the roster needs. It stays on
    // GET /staff/:id, which is what the edit form loads. Same reasoning as the
    // masked account number below.
    const result = await db.query(`
      SELECT id, staff_id, first_name, last_name, email, phone,
             department, position, hire_date, employment_type, status,
             base_salary, annual_leave_entitlement, sick_leave_entitlement,
             cpf_membership_no, user_id, created_at, last_modified,
             bank_account_name, bank_code, bank_branch_code,
             -- Masked. The full number leaves the system in exactly one place:
             -- the audited bank-file export in routes/finance.ts.
             CASE WHEN bank_account_number IS NULL THEN NULL
                  ELSE repeat('*', GREATEST(length(bank_account_number) - 4, 0))
                       || right(bank_account_number, 4) END AS bank_account_number_masked,
             (bank_account_number IS NOT NULL AND bank_code IS NOT NULL) AS bank_details_complete
      FROM staff
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Staff] Get staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// Get staff by ID
router.get('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, staff_id, first_name, last_name, email, phone, nric,
              department, position, hire_date, employment_type, status,
              base_salary, annual_leave_entitlement, sick_leave_entitlement,
              cpf_membership_no, created_at, last_modified
       FROM staff WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Staff] Get staff by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// Create staff
router.post('/staff', async (req: Request, res: Response) => {
  try {
    const {
      first_name, last_name, email, phone, nric, department, position,
      hire_date, employment_type, base_salary, annual_leave_entitlement,
      sick_leave_entitlement, cpf_membership_no,
      bank_account_name, bank_account_number, bank_code, bank_branch_code
    } = req.body;

    // Generate staff_id
    const countResult = await db.query('SELECT COUNT(*) as count FROM staff');
    const staff_id = `S${String(countResult.rows[0].count + 1).padStart(3, '0')}`;

    const result = await db.query(
      // Bank columns were missing from this list, so the account details the
      // staff form collects were silently dropped on save and payroll had
      // nowhere to send anyone's salary.
      `INSERT INTO staff (
        staff_id, first_name, last_name, email, phone, nric, department,
        position, hire_date, employment_type, base_salary,
        annual_leave_entitlement, sick_leave_entitlement, cpf_membership_no,
        status, created_at, last_modified,
        bank_account_name, bank_account_number, bank_code, bank_branch_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21)
      RETURNING *`,
      [
        staff_id, first_name, last_name, email, phone, nric, department,
        position, hire_date, employment_type, base_salary,
        annual_leave_entitlement || 12, sick_leave_entitlement || 4,
        cpf_membership_no, 'active', new Date().toISOString(), new Date().toISOString(),
        bank_account_name || null, normaliseAccountNumber(bank_account_number),
        bank_code || null, bank_branch_code || null
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Staff] Create staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to create staff' });
  }
});

// Update staff
router.put('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone, nric, department, position,
      employment_type, status, base_salary, annual_leave_entitlement,
      sick_leave_entitlement, cpf_membership_no,
      bank_account_name, bank_account_number, bank_code, bank_branch_code
    } = req.body;

    const result = await db.query(
      `UPDATE staff SET
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
        bank_account_name = COALESCE($14, bank_account_name),
        bank_account_number = COALESCE($15, bank_account_number),
        bank_code = COALESCE($16, bank_code),
        bank_branch_code = COALESCE($17, bank_branch_code),
        last_modified = $18
       WHERE id = $19
       RETURNING *`,
      [
        first_name, last_name, email, phone, nric, department, position,
        employment_type, status, base_salary, annual_leave_entitlement,
        sick_leave_entitlement, cpf_membership_no,
        bank_account_name || null, normaliseAccountNumber(bank_account_number),
        bank_code || null, bank_branch_code || null,
        new Date().toISOString(), id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Staff] Update staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to update staff' });
  }
});

// Delete staff
router.delete('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM staff WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deleted' });
  } catch (error) {
    console.error('[Staff] Delete staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete staff' });
  }
});

/**
 * Links (or unlinks) a staff record to a login account.
 *
 * Deliberately an explicit admin action rather than anything automatic. This
 * link is what the staff clock-in trusts to decide whose hours it is
 * recording, and those hours become pay — so it is set by a person who can
 * see both records, not inferred from a matching email.
 *
 * Pass user_id: null to unlink.
 */
router.put('/staff/:id/user-link', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const staff = await db.query('SELECT id, staff_id FROM staff WHERE id = $1', [id]);
    if (staff.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    if (user_id !== null && user_id !== undefined) {
      const user = await db.query('SELECT id, email FROM users WHERE id = $1', [user_id]);
      if (user.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No such user account' });
      }

      const taken = await db.query(
        'SELECT staff_id FROM staff WHERE user_id = $1 AND id <> $2',
        [user_id, id]
      );
      if (taken.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: `That login is already linked to staff ${taken.rows[0].staff_id}`,
        });
      }
    }

    const result = await db.query(
      `UPDATE staff SET user_id = $1, last_modified = $2 WHERE id = $3
       RETURNING id, staff_id, first_name, last_name, user_id`,
      [user_id ?? null, new Date().toISOString(), id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Staff] User link error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user link' });
  }
});

/**
 * Candidate logins for linking. Returns only what is needed to pick the right
 * account — no password or token material — and requires a search term so this
 * cannot be used to enumerate the whole user table.
 */
router.get('/staff-user-search', async (req: Request, res: Response) => {
  try {
    const term = String(req.query.q || '').trim();
    if (term.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Enter at least 3 characters to search',
      });
    }

    const result = await db.query(
      `SELECT u.id, u.email, u.role,
              (SELECT staff_id FROM staff WHERE user_id = u.id) AS linked_staff_id
         FROM users u
        WHERE u.email ILIKE $1
        ORDER BY u.email
        LIMIT 20`,
      [`%${term}%`]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Staff] User search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

export default router;
