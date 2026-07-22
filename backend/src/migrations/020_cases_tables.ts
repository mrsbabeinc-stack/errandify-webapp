import db from '../db.js';

/**
 * Migration 020 — the cases system.
 *
 * `cases` and `case_messages` are queried throughout routes/cases.ts and read
 * by MyCasesPage and CaseReportModal, but neither table existed anywhere: not
 * in the database, not in database/*.sql, not in any migration. So "Report an
 * issue" and "My Cases" both 500'd.
 *
 * Columns are derived from actual usage — every INSERT column list, UPDATE SET
 * target and aliased SELECT reference in the codebase.
 *
 * `case_id` is the human-facing reference (CASE-000123) that the API returns
 * alongside the numeric id; it is generated from the sequence so it is stable
 * and unique without a second round trip.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY,
      case_id VARCHAR(20) UNIQUE,

      case_type VARCHAR(40) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'medium',
      status VARCHAR(30) NOT NULL DEFAULT 'open',

      complainant_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      respondent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      errand_id INTEGER REFERENCES errands(id) ON DELETE SET NULL,

      subject VARCHAR(255),
      description TEXT,
      tags TEXT,

      -- advisory only: AI proposes, an admin decides
      ai_recommendation TEXT,
      ai_confidence DECIMAL(3,2),

      staff_assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      final_decision TEXT,
      refund_amount DECIMAL(10,2),

      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT cases_severity_check CHECK (severity IN ('low','medium','high','critical')),
      CONSTRAINT cases_status_check CHECK (status IN ('open','in_progress','escalated','resolved','closed'))
    )
  `);

  // Human-facing reference, filled automatically so callers never have to
  await db.query(`
    CREATE OR REPLACE FUNCTION set_case_id() RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.case_id IS NULL THEN
        NEW.case_id := 'CASE-' || LPAD(NEW.id::text, 6, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await db.query(`DROP TRIGGER IF EXISTS trg_set_case_id ON cases`);
  await db.query(`
    CREATE TRIGGER trg_set_case_id BEFORE INSERT ON cases
    FOR EACH ROW EXECUTE FUNCTION set_case_id();
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_cases_complainant ON cases(complainant_user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_cases_respondent ON cases(respondent_user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status, created_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_cases_errand ON cases(errand_id)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS case_messages (
      id SERIAL PRIMARY KEY,
      case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      -- 'user', 'admin', or 'system' for automated entries
      message_type VARCHAR(20) NOT NULL DEFAULT 'user',
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_case_messages_case ON case_messages(case_id, created_at DESC)`);

  console.log('[020] ✅ cases + case_messages created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS case_messages CASCADE');
  await db.query('DROP TRIGGER IF EXISTS trg_set_case_id ON cases');
  await db.query('DROP TABLE IF EXISTS cases CASCADE');
  await db.query('DROP FUNCTION IF EXISTS set_case_id()');
}

if (process.argv[1] && process.argv[1].includes('020_cases_tables')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
