import db from '../db.js';

/**
 * Probation periods for new hires.
 *
 * ProbationManagement.tsx kept its records in localStorage on top of two
 * hardcoded rows, so a probation "started" by one admin was invisible to every
 * other admin and vanished when the browser was cleared — for a record that
 * decides whether someone passes confirmation, that is not a store.
 *
 * days_remaining is deliberately NOT a column: it is derived from end_date at
 * read time, so it cannot go stale the way a stored countdown would.
 */

export async function up(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS probation_records (
      id                    SERIAL PRIMARY KEY,
      staff_id              VARCHAR(10) NOT NULL
                              REFERENCES staff(staff_id) ON DELETE CASCADE,
      staff_name            VARCHAR(255),
      start_date            DATE NOT NULL,
      end_date              DATE NOT NULL,
      probation_length_days INTEGER NOT NULL DEFAULT 90,
      status                VARCHAR(20) NOT NULL DEFAULT 'active',
      review_score          INTEGER,
      reviewer_notes        TEXT,
      reviewed_by           VARCHAR(255),
      reviewed_at           TIMESTAMP,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_modified         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT probation_status_valid
        CHECK (status IN ('active', 'passed', 'failed')),
      CONSTRAINT probation_score_range
        CHECK (review_score IS NULL OR (review_score >= 0 AND review_score <= 100)),
      CONSTRAINT probation_dates_ordered
        CHECK (end_date >= start_date)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_probation_staff_id
      ON probation_records (staff_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_probation_status
      ON probation_records (status)
  `);

  // One open probation per staff member: a second concurrent "active" period
  // for the same person is a data-entry mistake, not a real state.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_probation_per_staff
      ON probation_records (staff_id) WHERE status = 'active'
  `);

  console.log('[061] probation_records created');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS probation_records`);
}
