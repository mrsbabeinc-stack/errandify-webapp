import db from '../db.js';

/**
 * Migration 078 — the two tables OperationHoursService already queries.
 *
 * `services/operationHoursService.ts` reads and writes `company_operation_hours`
 * and `staff_availability`, and `routes/leaveApprovals.ts` exposes both through
 * GET/PUT /api/{leave,operations}/hours/:company_id. Neither table was ever
 * created. The service swallows its own errors and returns null, so the route
 * answered a flat 404 "Operation hours not found" for every company — which
 * reads like "not configured yet" rather than "this feature has no storage",
 * and is why CompanyOperatingHours.tsx was built against local state instead.
 *
 * Column names here are dictated by the existing service queries (monday_open,
 * monday_close, monday_active, … timezone), not chosen fresh — the point is to
 * make the code that already exists work, not to give it a new shape to learn.
 *
 * Defaults are Singapore small-business norms: 9-6 weekdays, 9-1 Saturday,
 * closed Sunday. A company that never touches this screen still gets sensible
 * hours rather than a blank week that reads as "closed always".
 *
 * Retention: company_operation_hours holds no personal data — it describes the
 * business. staff_availability names an identified staff member and its
 * `reason` is free text that may carry health information, so it follows the
 * same schedule as company_leave in docs/DATA_RETENTION.md and must be purged
 * or anonymised with the staff record (PDPA s25).
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_operation_hours (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER NOT NULL UNIQUE
                        REFERENCES companies(id) ON DELETE CASCADE,

      monday_open     VARCHAR(5)  DEFAULT '09:00',
      monday_close    VARCHAR(5)  DEFAULT '18:00',
      monday_active   BOOLEAN     DEFAULT TRUE,

      tuesday_open    VARCHAR(5)  DEFAULT '09:00',
      tuesday_close   VARCHAR(5)  DEFAULT '18:00',
      tuesday_active  BOOLEAN     DEFAULT TRUE,

      wednesday_open  VARCHAR(5)  DEFAULT '09:00',
      wednesday_close VARCHAR(5)  DEFAULT '18:00',
      wednesday_active BOOLEAN    DEFAULT TRUE,

      thursday_open   VARCHAR(5)  DEFAULT '09:00',
      thursday_close  VARCHAR(5)  DEFAULT '18:00',
      thursday_active BOOLEAN     DEFAULT TRUE,

      friday_open     VARCHAR(5)  DEFAULT '09:00',
      friday_close    VARCHAR(5)  DEFAULT '18:00',
      friday_active   BOOLEAN     DEFAULT TRUE,

      saturday_open   VARCHAR(5)  DEFAULT '09:00',
      saturday_close  VARCHAR(5)  DEFAULT '13:00',
      saturday_active BOOLEAN     DEFAULT TRUE,

      sunday_open     VARCHAR(5)  DEFAULT '09:00',
      sunday_close    VARCHAR(5)  DEFAULT '18:00',
      sunday_active   BOOLEAN     DEFAULT FALSE,

      timezone        VARCHAR(64) NOT NULL DEFAULT 'Asia/Singapore',
      created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_availability (
      id                SERIAL PRIMARY KEY,
      company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      staff_id          INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
      availability_date DATE    NOT NULL,
      status            VARCHAR(30) NOT NULL DEFAULT 'available',
      reason            TEXT,
      notes             TEXT,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      -- setStaffAvailability() relies on exactly this conflict target
      CONSTRAINT staff_availability_unique UNIQUE (company_id, staff_id, availability_date)
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_staff_availability_lookup
      ON staff_availability (company_id, availability_date);
  `);

  // Give every existing company a default week so the screen opens on something
  // real rather than a 404 the UI has to interpret.
  const seeded = await db.query(`
    INSERT INTO company_operation_hours (company_id)
    SELECT id FROM companies
    ON CONFLICT (company_id) DO NOTHING
    RETURNING company_id;
  `);

  console.log(`✅ Migration 078: operation hours + staff availability created (${seeded.rowCount} companies seeded)`);
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_staff_availability_lookup;`);
  await db.query(`DROP TABLE IF EXISTS staff_availability;`);
  await db.query(`DROP TABLE IF EXISTS company_operation_hours;`);
  console.log('⏪ Migration 078 reverted');
}
