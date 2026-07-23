import db from '../db.js';

/**
 * Extends job_openings to carry what RecruitmentDashboard actually shows, and
 * adds the screening questions it offers.
 *
 * A job_openings table already existed and is load-bearing:
 *   - job_applications.job_id has a FK onto job_openings(job_id)
 *   - routes/recruitment.ts refuses an application unless status = 'open'
 *   - routes/finance.ts counts open roles with status = 'open'
 * so this migration only ADDS columns. It deliberately does not rename
 * job_title, repurpose job_id, or change the status vocabulary — doing any of
 * those would break application intake, which is the one part of recruitment
 * that already worked.
 *
 * The dashboard's "published" state maps onto the existing 'open'; the extra
 * states it wants ('draft', 'closed') sit alongside it.
 *
 * salary_range already existed as free text ("$3,000 - $4,200"), which cannot
 * be filtered or compared. Numeric min/max are added beside it rather than
 * replacing it, so nothing that reads the old column breaks.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE job_openings
      ADD COLUMN IF NOT EXISTS reporting_to     VARCHAR(255),
      ADD COLUMN IF NOT EXISTS team_size        INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS responsibilities TEXT,
      ADD COLUMN IF NOT EXISTS salary_min       NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS salary_max       NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS work_arrangement VARCHAR(20) DEFAULT 'onsite',
      ADD COLUMN IF NOT EXISTS published_at     TIMESTAMP,
      ADD COLUMN IF NOT EXISTS closed_at        TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_modified    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  // A max below the min would be advertised to candidates as the range.
  await db.query(`
    ALTER TABLE job_openings
      DROP CONSTRAINT IF EXISTS job_opening_salary_ordered
  `);
  await db.query(`
    ALTER TABLE job_openings
      ADD CONSTRAINT job_opening_salary_ordered
      CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS job_screening_questions (
      id              SERIAL PRIMARY KEY,
      job_opening_id  INTEGER NOT NULL
                        REFERENCES job_openings(id) ON DELETE CASCADE,
      category        VARCHAR(20) NOT NULL DEFAULT 'experience',
      question        TEXT NOT NULL,
      question_type   VARCHAR(20) NOT NULL DEFAULT 'text',
      options         JSONB,
      weightage       INTEGER NOT NULL DEFAULT 3,
      expected_answer TEXT,
      sort_order      INTEGER DEFAULT 0,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT screening_category_valid
        CHECK (category IN ('technical', 'experience', 'behavioral', 'motivation', 'availability', 'red-flag')),
      CONSTRAINT screening_type_valid
        CHECK (question_type IN ('text', 'multiple-choice', 'scale', 'ranking')),
      CONSTRAINT screening_weightage_range
        CHECK (weightage BETWEEN 1 AND 5)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_screening_questions_opening
      ON job_screening_questions (job_opening_id)
  `);

  console.log('[063] job_openings extended + job_screening_questions created');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS job_screening_questions`);
  await db.query(`
    ALTER TABLE job_openings
      DROP CONSTRAINT IF EXISTS job_opening_salary_ordered,
      DROP COLUMN IF EXISTS reporting_to,
      DROP COLUMN IF EXISTS team_size,
      DROP COLUMN IF EXISTS responsibilities,
      DROP COLUMN IF EXISTS salary_min,
      DROP COLUMN IF EXISTS salary_max,
      DROP COLUMN IF EXISTS work_arrangement,
      DROP COLUMN IF EXISTS published_at,
      DROP COLUMN IF EXISTS closed_at,
      DROP COLUMN IF EXISTS last_modified
  `);
}
