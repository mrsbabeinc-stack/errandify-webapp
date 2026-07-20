import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { checkVulnerabilityRestrictions } from '../services/vulnerabilityCheck.js';

const router = Router();

// POST /api/staff/allocate - Company allocates errand to staff member
router.post('/allocate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errand_id, staff_user_id, company_id } = req.body;
    const requester_id = parseInt(req.userId || '0', 10);

    // Validate inputs
    if (!errand_id || !staff_user_id || !company_id) {
      return res.status(400).json({
        success: false,
        error: 'errand_id, staff_user_id, and company_id required'
      });
    }

    // Verify requester is company manager/supervisor
    const authRes = await db.query(
      `SELECT role FROM company_staff_assignments
       WHERE company_id = $1 AND user_id = $2 AND status = 'active'`,
      [company_id, requester_id]
    );

    if (!authRes.rows.length || !['manager', 'supervisor', 'owner'].includes(authRes.rows[0].role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to allocate errands'
      });
    }

    // Get errand details
    const errandRes = await db.query(
      `SELECT id, title, description, created_by_id
       FROM errands WHERE id = $1 AND created_by_id IN (
         SELECT user_id FROM company_staff_assignments
         WHERE company_id = $1 AND status = 'active'
       )`,
      [errand_id, company_id]
    );

    if (!errandRes.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Errand not found or not owned by your company'
      });
    }

    const errand = errandRes.rows[0];

    // Verify staff member is active in this company
    const staffRes = await db.query(
      `SELECT user_id, role FROM company_staff_assignments
       WHERE company_id = $1 AND user_id = $2 AND status = 'active'`,
      [company_id, staff_user_id]
    );

    if (!staffRes.rows.length) {
      return res.status(400).json({
        success: false,
        error: 'Staff member is not active in this company'
      });
    }

    // CHECK VULNERABILITY RESTRICTIONS
    const vulnCheck = await checkVulnerabilityRestrictions(
      staff_user_id,
      errand.title,
      errand.description
    );

    if (!vulnCheck.allowed) {
      // Blocked due to vulnerability restrictions
      return res.status(400).json({
        success: false,
        error: vulnCheck.reason,
        blocked_by_restriction: true,
        vulnerability_type: vulnCheck.vulnerabilityType,
        restrictions: vulnCheck.restrictions
      });
    }

    // Get staff member details for audit log
    const staffDetailRes = await db.query(
      `SELECT display_name, vulnerability_type FROM users WHERE id = $1`,
      [staff_user_id]
    );

    const staffDetail = staffDetailRes.rows[0];

    // Create allocation record
    const allocationRes = await db.query(
      `INSERT INTO errand_staff_allocations (errand_id, staff_user_id, company_id, allocated_by_user_id, status)
       VALUES ($1, $2, $3, $4, 'allocated')
       ON CONFLICT (errand_id, staff_user_id) DO UPDATE SET status = 'allocated'
       RETURNING id, allocated_at`,
      [errand_id, staff_user_id, company_id, requester_id]
    );

    // Update errand status if this is the first allocation
    await db.query(
      `UPDATE errands SET status = 'allocated_to_staff'
       WHERE id = $1 AND status IN ('pending', 'open')`,
      [errand_id]
    );

    // Audit log
    await db.query(
      `INSERT INTO allocation_audit_log (errand_id, staff_user_id, company_id, allocated_by_user_id, action, details)
       VALUES ($1, $2, $3, $4, 'allocated', $5)`,
      [
        errand_id,
        staff_user_id,
        company_id,
        requester_id,
        `Allocated to ${staffDetail.display_name}${
          vulnCheck.vulnerabilityType
            ? ` (${vulnCheck.vulnerabilityType} - safe allocation)`
            : ''
        }`
      ]
    );

    return res.json({
      success: true,
      message: `✅ Errand allocated to ${staffDetail.display_name}`,
      allocation_id: allocationRes.rows[0].id,
      allocated_at: allocationRes.rows[0].allocated_at,
      ...(vulnCheck.vulnerabilityType && {
        note: `Staff member is protected (${vulnCheck.vulnerabilityType}). Assignment verified as safe.`
      })
    });
  } catch (error) {
    console.error('Allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to allocate errand'
    });
  }
});

// GET /api/staff/suggest - Get staff suggestions for errand (filtered by vulnerability)
router.get('/suggest', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errand_id, company_id } = req.query as { errand_id: string; company_id: string };

    if (!errand_id || !company_id) {
      return res.status(400).json({
        success: false,
        error: 'errand_id and company_id required'
      });
    }

    // Get errand details
    const errandRes = await db.query(
      `SELECT title, description FROM errands WHERE id = $1`,
      [errand_id]
    );

    if (!errandRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Errand not found' });
    }

    const errand = errandRes.rows[0];

    // Get all active staff in company
    const staffRes = await db.query(
      `SELECT u.id, u.display_name, u.email, u.vulnerability_type, u.is_vulnerable_person,
              csa.role, (SELECT COUNT(*) FROM errands WHERE created_by_id = u.id) as errand_count
       FROM company_staff_assignments csa
       JOIN users u ON csa.user_id = u.id
       WHERE csa.company_id = $1 AND csa.status = 'active'
       ORDER BY csa.assigned_at DESC`,
      [company_id]
    );

    // Check each staff member for vulnerability restrictions
    const suggestions = await Promise.all(
      staffRes.rows.map(async (staff) => {
        const vulnCheck = await checkVulnerabilityRestrictions(
          staff.id,
          errand.title,
          errand.description
        );

        return {
          id: staff.id,
          name: staff.display_name,
          email: staff.email,
          role: staff.role,
          errand_count: staff.errand_count,
          is_vulnerable: staff.is_vulnerable_person,
          vulnerability_type: staff.vulnerability_type,
          can_allocate: vulnCheck.allowed,
          restriction_reason: !vulnCheck.allowed ? vulnCheck.reason : null,
          restrictions: vulnCheck.restrictions || []
        };
      })
    );

    // Sort: allocatable staff first
    const sorted = suggestions.sort((a, b) => {
      if (a.can_allocate !== b.can_allocate) {
        return a.can_allocate ? -1 : 1;
      }
      return 0;
    });

    return res.json({
      success: true,
      errand_title: errand.title,
      suggestions: sorted,
      allocatable_count: sorted.filter(s => s.can_allocate).length,
      restricted_count: sorted.filter(s => !s.can_allocate).length
    });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

// POST /api/staff/unallocate - Remove allocation
router.post('/unallocate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errand_id, staff_user_id, company_id } = req.body;
    const requester_id = parseInt(req.userId || '0', 10);

    if (!errand_id || !staff_user_id || !company_id) {
      return res.status(400).json({
        success: false,
        error: 'errand_id, staff_user_id, and company_id required'
      });
    }

    // Verify authorization
    const authRes = await db.query(
      `SELECT role FROM company_staff_assignments
       WHERE company_id = $1 AND user_id = $2 AND status = 'active'`,
      [company_id, requester_id]
    );

    if (!authRes.rows.length || !['manager', 'supervisor', 'owner'].includes(authRes.rows[0].role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Remove allocation
    await db.query(
      `DELETE FROM errand_staff_allocations
       WHERE errand_id = $1 AND staff_user_id = $2 AND company_id = $3`,
      [errand_id, staff_user_id, company_id]
    );

    // Audit log
    await db.query(
      `INSERT INTO allocation_audit_log (errand_id, staff_user_id, company_id, allocated_by_user_id, action, details)
       VALUES ($1, $2, $3, $4, 'unallocated', 'Allocation removed')`,
      [errand_id, staff_user_id, company_id, requester_id]
    );

    return res.json({
      success: true,
      message: '✅ Allocation removed'
    });
  } catch (error) {
    console.error('Unallocate error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove allocation' });
  }
});

export default router;
