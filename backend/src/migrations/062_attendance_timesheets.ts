import db from '../db.js';

/**
 * Attendance capture and weekly timesheets.
 *
 * AttendanceDashboard, TimesheetApprovalQueue and AttendanceReports were all
 * rendering hardcoded arrays — there was no attendance store of any kind, so
 * "approving" a timesheet changed nothing anywhere.
 *
 * Two tables rather than one: attendance_records is the raw daily clock
 * in/out, timesheets is the weekly roll-up that actually gets approved. Payroll
 * needs the approved weekly total; a dispute about a single day needs the raw
 * record. Collapsing them would lose one or the other.
 *
 * total_hours is a stored generated column on the daily record so it can never
 * disagree with the clock times it is derived from.
 */

export async function up(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id            SERIAL PRIMARY KEY,
      staff_id      VARCHAR(10) NOT NULL
                      REFERENCES staff(staff_id) ON DELETE CASCADE,
      work_date     DATE NOT NULL,
      clock_in      TIMESTAMP,
      clock_out     TIMESTAMP,
      break_minutes INTEGER NOT NULL DEFAULT 0,
      status        VARCHAR(20) NOT NULL DEFAULT 'present',
      notes         TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total_hours   NUMERIC(6,2) GENERATED ALWAYS AS (
                      CASE
                        WHEN clock_in IS NULL OR clock_out IS NULL THEN 0
                        ELSE GREATEST(
                          ROUND(
                            (EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0
                             - (break_minutes / 60.0))::numeric, 2
                          ), 0)
                      END
                    ) STORED,
      CONSTRAINT attendance_status_valid
        CHECK (status IN ('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday')),
      CONSTRAINT attendance_clock_ordered
        CHECK (clock_out IS NULL OR clock_in IS NULL OR clock_out >= clock_in)
    )
  `);

  // One attendance row per person per day.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_staff_date
      ON attendance_records (staff_id, work_date)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_attendance_work_date
      ON attendance_records (work_date)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS timesheets (
      id             SERIAL PRIMARY KEY,
      staff_id       VARCHAR(10) NOT NULL
                       REFERENCES staff(staff_id) ON DELETE CASCADE,
      staff_name     VARCHAR(255),
      week_start     DATE NOT NULL,
      week_end       DATE NOT NULL,
      total_hours    NUMERIC(6,2) NOT NULL DEFAULT 0,
      overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
      status         VARCHAR(20) NOT NULL DEFAULT 'pending',
      submitted_at   TIMESTAMP,
      approved_by    VARCHAR(255),
      approved_at    TIMESTAMP,
      review_notes   TEXT,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_modified  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT timesheet_status_valid
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      CONSTRAINT timesheet_week_ordered
        CHECK (week_end >= week_start)
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_timesheet_staff_week
      ON timesheets (staff_id, week_start)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_timesheets_status
      ON timesheets (status)
  `);

  console.log('[062] attendance_records + timesheets created');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS timesheets`);
  await db.query(`DROP TABLE IF EXISTS attendance_records`);
}
