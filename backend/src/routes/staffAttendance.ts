import express, { Response } from 'express';
import db from '../db.js';

import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Staff-facing attendance: the employee's own clock-in/out and history.
 *
 * Authenticated but NOT admin-guarded — this is the surface ordinary staff
 * use. Every handler is scoped to the caller's own staff record; none of them
 * accept a staff_id from the client, so one employee cannot clock in or read
 * history as another.
 */
router.use(authMiddleware);

/**
 * Resolves the logged-in user to their employee record via staff.user_id.
 *
 * Returns null rather than falling back to an email match. An unlinked account
 * is an administrative gap to be fixed by an admin, not something to guess at:
 * these rows become timesheet hours and then pay, so attributing them to the
 * wrong person by a fuzzy match is worse than refusing the request.
 */
async function resolveStaff(userId: string | undefined) {
  if (!userId) return null;
  const result = await db.query(
    `SELECT staff_id, first_name, last_name, department, position, status
       FROM staff WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

const NOT_LINKED = {
  success: false,
  error:
    'Your account is not linked to an employee record yet. Ask an administrator to link it under Staff Management.',
};

// Who am I, and am I currently clocked in?
router.get('/me/today', async (req: AuthRequest, res: Response) => {
  try {
    const staff = await resolveStaff(req.userId);
    if (!staff) return res.status(404).json(NOT_LINKED);

    const today = new Date().toISOString().split('T')[0];
    const result = await db.query(
      `SELECT id, work_date::text AS work_date, clock_in, clock_out,
              break_minutes, total_hours, status, COALESCE(notes,'') AS notes
         FROM attendance_records
        WHERE staff_id = $1 AND work_date = $2`,
      [staff.staff_id, today]
    );

    const record = result.rows[0] || null;

    res.json({
      success: true,
      data: {
        staff: {
          staff_id: staff.staff_id,
          name: `${staff.first_name} ${staff.last_name}`.trim(),
          department: staff.department,
          position: staff.position,
        },
        date: today,
        record,
        // Clocked in means there is a record with an in-time and no out-time.
        clocked_in: !!record && !!record.clock_in && !record.clock_out,
      },
    });
  } catch (error) {
    console.error('[StaffAttendance] Today error:', error);
    res.status(500).json({ success: false, error: "Failed to load today's attendance" });
  }
});

// Clock in
router.post('/me/clock-in', async (req: AuthRequest, res: Response) => {
  try {
    const staff = await resolveStaff(req.userId);
    if (!staff) return res.status(404).json(NOT_LINKED);

    if (staff.status && staff.status !== 'active') {
      return res.status(409).json({
        success: false,
        error: 'Your employee record is not active. Speak to an administrator.',
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const { notes } = req.body;

    const existing = await db.query(
      'SELECT id, clock_in, clock_out FROM attendance_records WHERE staff_id = $1 AND work_date = $2',
      [staff.staff_id, today]
    );

    if (existing.rows[0]?.clock_in && !existing.rows[0]?.clock_out) {
      return res.status(409).json({ success: false, error: 'You are already clocked in' });
    }
    if (existing.rows[0]?.clock_out) {
      return res.status(409).json({
        success: false,
        error: 'You have already clocked out today. Ask an administrator to amend the record.',
      });
    }

    /**
     * Late is decided server-side against a 09:00 start rather than trusted
     * from the client, which could otherwise choose its own status.
     * 09:00 is a placeholder default — there is no per-staff shift or
     * operating-hours table to read a real start time from yet.
     */
    const now = new Date();
    const lateThreshold = new Date(now);
    lateThreshold.setHours(9, 5, 0, 0); // 5 minutes' grace
    const status = now > lateThreshold ? 'late' : 'present';

    const result = await db.query(
      `INSERT INTO attendance_records (
         staff_id, work_date, clock_in, status, notes, created_at, last_modified
       ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (staff_id, work_date) DO UPDATE SET
         clock_in      = EXCLUDED.clock_in,
         status        = EXCLUDED.status,
         notes         = EXCLUDED.notes,
         last_modified = NOW()
       RETURNING id, work_date::text AS work_date, clock_in, clock_out, status, total_hours`,
      [staff.staff_id, today, now.toISOString(), status, notes || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[StaffAttendance] Clock-in error:', error);
    res.status(500).json({ success: false, error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/me/clock-out', async (req: AuthRequest, res: Response) => {
  try {
    const staff = await resolveStaff(req.userId);
    if (!staff) return res.status(404).json(NOT_LINKED);

    const today = new Date().toISOString().split('T')[0];
    const { break_minutes, notes } = req.body;

    const existing = await db.query(
      'SELECT id, clock_in, clock_out FROM attendance_records WHERE staff_id = $1 AND work_date = $2',
      [staff.staff_id, today]
    );

    if (!existing.rows[0]?.clock_in) {
      return res.status(409).json({ success: false, error: 'You have not clocked in today' });
    }
    if (existing.rows[0]?.clock_out) {
      return res.status(409).json({ success: false, error: 'You have already clocked out today' });
    }

    const result = await db.query(
      `UPDATE attendance_records SET
         clock_out     = NOW(),
         break_minutes = COALESCE($1, break_minutes),
         notes         = COALESCE($2, notes),
         last_modified = NOW()
       WHERE id = $3
       RETURNING id, work_date::text AS work_date, clock_in, clock_out,
                 break_minutes, total_hours, status`,
      [break_minutes ?? null, notes || null, existing.rows[0].id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[StaffAttendance] Clock-out error:', error);
    res.status(500).json({ success: false, error: 'Failed to clock out' });
  }
});

// My own attendance history
router.get('/me/history', async (req: AuthRequest, res: Response) => {
  try {
    const staff = await resolveStaff(req.userId);
    if (!staff) return res.status(404).json(NOT_LINKED);

    const { startDate, endDate } = req.query;
    const params: any[] = [staff.staff_id];
    let query = `
      SELECT id, work_date::text AS work_date, clock_in, clock_out,
             break_minutes, total_hours, status, COALESCE(notes,'') AS notes
        FROM attendance_records
       WHERE staff_id = $1`;

    if (startDate) {
      query += ` AND work_date >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND work_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ' ORDER BY work_date DESC LIMIT 90';

    const result = await db.query(query, params);

    const totalHours = result.rows.reduce((sum: number, r: any) => sum + (Number(r.total_hours) || 0), 0);

    res.json({
      success: true,
      data: {
        records: result.rows,
        summary: {
          days: result.rows.length,
          total_hours: Math.round(totalHours * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('[StaffAttendance] History error:', error);
    res.status(500).json({ success: false, error: 'Failed to load attendance history' });
  }
});

export default router;
