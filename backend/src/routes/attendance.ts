import express, { Request, Response } from 'express';
import db from '../db.js';

import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware, requireAdmin(['admin', 'super-admin']));

/** Dates cast to text so they survive JSON as calendar dates. */
const SELECT_ATTENDANCE = `
  SELECT a.id,
         a.staff_id,
         (s.first_name || ' ' || s.last_name) AS staff_name,
         s.department,
         a.work_date::text AS work_date,
         a.clock_in,
         a.clock_out,
         a.break_minutes,
         a.total_hours,
         a.status,
         COALESCE(a.notes, '') AS notes
    FROM attendance_records a
    JOIN staff s ON s.staff_id = a.staff_id
`;

// Daily attendance, optionally filtered to a date range or one staff member
router.get('/attendance', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, staffId, status } = req.query;
    let query = SELECT_ATTENDANCE + ' WHERE 1=1';
    const params: any[] = [];

    if (startDate) {
      query += ` AND a.work_date >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.work_date <= $${params.length + 1}`;
      params.push(endDate);
    }
    if (staffId) {
      query += ` AND a.staff_id = $${params.length + 1}`;
      params.push(staffId);
    }
    if (status && status !== 'all') {
      query += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY a.work_date DESC, a.staff_id';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Attendance] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
});

/**
 * Headline numbers for the attendance dashboard, for one day.
 *
 * Computed in SQL over the whole staff table rather than counted in the
 * browser, so "absent" means every active employee with no present record for
 * that day — a screen that only counts the rows it happens to have loaded
 * cannot see the people who are missing.
 */
router.get('/attendance/summary', async (req: Request, res: Response) => {
  try {
    const day = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM staff WHERE status = 'active')            AS total_staff,
         COUNT(*) FILTER (WHERE a.status = 'present')                    AS present,
         COUNT(*) FILTER (WHERE a.status = 'late')                       AS late,
         COUNT(*) FILTER (WHERE a.status = 'half-day')                   AS half_day,
         COUNT(*) FILTER (WHERE a.status = 'on-leave')                   AS on_leave,
         COALESCE(ROUND(SUM(a.total_hours), 2), 0)                       AS total_hours
       FROM attendance_records a
       JOIN staff s ON s.staff_id = a.staff_id AND s.status = 'active'
       WHERE a.work_date = $1`,
      [day]
    );

    const row = result.rows[0];
    const totalStaff = Number(row.total_staff) || 0;
    const present = Number(row.present) || 0;
    const late = Number(row.late) || 0;
    const halfDay = Number(row.half_day) || 0;
    const onLeave = Number(row.on_leave) || 0;

    // Anyone active with no attendance row for the day, and not on leave.
    const accountedFor = present + late + halfDay + onLeave;

    res.json({
      success: true,
      data: {
        date: day,
        total_staff: totalStaff,
        present,
        late,
        half_day: halfDay,
        on_leave: onLeave,
        absent: Math.max(totalStaff - accountedFor, 0),
        total_hours: Number(row.total_hours) || 0,
        attendance_rate: totalStaff > 0
          ? Math.round(((present + late + halfDay) / totalStaff) * 1000) / 10
          : 0,
      },
    });
  } catch (error) {
    console.error('[Attendance] Summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance summary' });
  }
});

/**
 * Per-staff totals over a period, for the attendance reports screen.
 */
router.get('/attendance/report', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const result = await db.query(
      `SELECT s.staff_id,
              (s.first_name || ' ' || s.last_name) AS staff_name,
              s.department,
              COUNT(a.id) FILTER (WHERE a.status = 'present')  AS days_present,
              COUNT(a.id) FILTER (WHERE a.status = 'late')     AS days_late,
              COUNT(a.id) FILTER (WHERE a.status = 'absent')   AS days_absent,
              COUNT(a.id) FILTER (WHERE a.status = 'on-leave') AS days_on_leave,
              COALESCE(ROUND(SUM(a.total_hours), 2), 0)        AS total_hours
         FROM staff s
         LEFT JOIN attendance_records a
                ON a.staff_id = s.staff_id
               AND a.work_date BETWEEN $1 AND $2
        WHERE s.status = 'active'
        GROUP BY s.staff_id, s.first_name, s.last_name, s.department
        ORDER BY s.staff_id`,
      [startDate, endDate]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Attendance] Report error:', error);
    res.status(500).json({ success: false, error: 'Failed to build attendance report' });
  }
});

// Record or correct a day's attendance
router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const { staff_id, work_date, clock_in, clock_out, break_minutes, status, notes } = req.body;

    if (!staff_id || !work_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: staff_id, work_date',
      });
    }

    const staff = await db.query('SELECT staff_id FROM staff WHERE staff_id = $1', [staff_id]);
    if (staff.rows.length === 0) {
      return res.status(404).json({ success: false, error: `No staff member with id ${staff_id}` });
    }

    // Upsert: re-recording a day corrects it rather than creating a duplicate,
    // which the unique index would reject anyway.
    const result = await db.query(
      `INSERT INTO attendance_records (
         staff_id, work_date, clock_in, clock_out, break_minutes, status, notes,
         created_at, last_modified
       ) VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, 'present'), $7, NOW(), NOW())
       ON CONFLICT (staff_id, work_date) DO UPDATE SET
         clock_in      = EXCLUDED.clock_in,
         clock_out     = EXCLUDED.clock_out,
         break_minutes = EXCLUDED.break_minutes,
         status        = EXCLUDED.status,
         notes         = EXCLUDED.notes,
         last_modified = NOW()
       RETURNING id`,
      [staff_id, work_date, clock_in || null, clock_out || null, break_minutes, status, notes || null]
    );

    const saved = await db.query(SELECT_ATTENDANCE + ' WHERE a.id = $1', [result.rows[0].id]);
    res.status(201).json({ success: true, data: saved.rows[0] });
  } catch (error: any) {
    console.error('[Attendance] Save error:', error);
    if (error?.constraint === 'attendance_clock_ordered') {
      return res.status(400).json({ success: false, error: 'Clock-out cannot be before clock-in' });
    }
    res.status(500).json({ success: false, error: 'Failed to save attendance' });
  }
});

router.delete('/attendance/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'DELETE FROM attendance_records WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Attendance record not found' });
    }
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    console.error('[Attendance] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete attendance record' });
  }
});

/* ───────────────────────────── Timesheets ───────────────────────────── */

const SELECT_TIMESHEET = `
  SELECT id,
         staff_id,
         staff_name,
         week_start::text AS week_start,
         week_end::text   AS week_end,
         total_hours,
         overtime_hours,
         status,
         submitted_at,
         approved_by,
         approved_at,
         COALESCE(review_notes, '') AS review_notes
    FROM timesheets
`;

router.get('/timesheets', async (req: Request, res: Response) => {
  try {
    const { status, staffId } = req.query;
    let query = SELECT_TIMESHEET + ' WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (staffId) {
      query += ` AND staff_id = $${params.length + 1}`;
      params.push(staffId);
    }

    query += ' ORDER BY week_start DESC, staff_id';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Timesheets] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch timesheets' });
  }
});

/**
 * Builds (or rebuilds) a week's timesheet from the attendance already recorded
 * for it, so the hours being approved are the hours that were actually clocked
 * rather than a separately typed number.
 *
 * Overtime is the excess over a 44-hour week — the Employment Act ceiling for
 * contractual hours. This is a default, not legal advice: confirm it matches
 * the contracts you actually issue.
 */
router.post('/timesheets/generate', async (req: Request, res: Response) => {
  try {
    const { week_start, staff_id } = req.body;
    if (!week_start) {
      return res.status(400).json({ success: false, error: 'week_start is required' });
    }

    const params: any[] = [week_start];
    let staffFilter = '';
    if (staff_id) {
      staffFilter = ' AND s.staff_id = $2';
      params.push(staff_id);
    }

    const result = await db.query(
      `INSERT INTO timesheets (
         staff_id, staff_name, week_start, week_end,
         total_hours, overtime_hours, status, submitted_at, created_at, last_modified
       )
       SELECT s.staff_id,
              (s.first_name || ' ' || s.last_name),
              $1::date,
              $1::date + 6,
              COALESCE(SUM(a.total_hours), 0),
              GREATEST(COALESCE(SUM(a.total_hours), 0) - 44, 0),
              'pending', NOW(), NOW(), NOW()
         FROM staff s
         LEFT JOIN attendance_records a
                ON a.staff_id = s.staff_id
               AND a.work_date BETWEEN $1::date AND $1::date + 6
        WHERE s.status = 'active'${staffFilter}
        GROUP BY s.staff_id, s.first_name, s.last_name
       ON CONFLICT (staff_id, week_start) DO UPDATE SET
         total_hours    = EXCLUDED.total_hours,
         overtime_hours = EXCLUDED.overtime_hours,
         last_modified  = NOW()
       -- An already-approved week is left alone: regenerating must not quietly
       -- reopen or restate hours a manager has signed off.
       WHERE timesheets.status <> 'approved'
       RETURNING id`,
      params
    );

    res.status(201).json({
      success: true,
      data: { generated: result.rows.length },
    });
  } catch (error) {
    console.error('[Timesheets] Generate error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate timesheets' });
  }
});

router.put('/timesheets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approved_by, review_notes } = req.body;

    if (!status || !['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: draft, pending, approved or rejected',
      });
    }

    const decided = status === 'approved' || status === 'rejected';

    const result = await db.query(
      `UPDATE timesheets SET
         status        = $1,
         approved_by   = CASE WHEN $2 THEN $3 ELSE approved_by END,
         approved_at   = CASE WHEN $2 THEN NOW() ELSE approved_at END,
         review_notes  = COALESCE($4, review_notes),
         last_modified = NOW()
       WHERE id = $5
       RETURNING id`,
      [status, decided, approved_by || 'Admin', review_notes ?? null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Timesheet not found' });
    }

    const updated = await db.query(SELECT_TIMESHEET + ' WHERE id = $1', [id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Timesheets] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update timesheet' });
  }
});

export default router;
