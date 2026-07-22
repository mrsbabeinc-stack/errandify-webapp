import db from '../db.js';

/**
 * Migration 010 — two things:
 *
 * 1. REPAIR the `disputes` table.
 *    Migrations 003 and 004 were never applied to this database (004's ALTER is
 *    invalid SQL — it lists many columns under a single ADD COLUMN), so the live
 *    table only has the original 10 columns while the services write to ~35.
 *    `createDispute()` has therefore been failing on every call:
 *      ERROR: column "filed_by_user_id" of relation "disputes" does not exist
 *    Everything below is additive and idempotent; `raised_by_id` is kept and
 *    backfilled into `filed_by_user_id` so nothing existing breaks.
 *
 * 2. ADD `company_dispute_requests`.
 *    Staff cannot file a dispute directly — they raise a request that the owner
 *    or manager approves. Deliberately a SEPARATE table, not a `pending_company`
 *    row in `disputes`: a pending request must not hold payment, must not appear
 *    in the admin dispute queue, must not disable chat, and must not count
 *    against either party's dispute history. Only on approval does a real
 *    dispute get created and linked back via `dispute_id`.
 */
export async function up() {
  console.log('[010] Repairing disputes schema…');

  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS filed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS dispute_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS evidence TEXT,
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
      ADD COLUMN IF NOT EXISTS resolution VARCHAR(50),
      ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
      ADD COLUMN IF NOT EXISTS dispute_version VARCHAR(20) DEFAULT 'v2',
      ADD COLUMN IF NOT EXISTS cannot_complete_reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS dispute_start_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS dispute_end_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS defendant_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS defendant_response TEXT,
      ADD COLUMN IF NOT EXISTS defendant_response_evidence JSONB,
      ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS response_submitted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS response_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS requires_defense BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS defense_tier VARCHAR(50) DEFAULT 'auto',
      ADD COLUMN IF NOT EXISTS first_reminder_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS second_reminder_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS extension_requested BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS extension_reason TEXT,
      ADD COLUMN IF NOT EXISTS extension_approved BOOLEAN,
      ADD COLUMN IF NOT EXISTS extension_approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS extension_denied_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS verdict_decision VARCHAR(50),
      ADD COLUMN IF NOT EXISTS verdict_reasoning TEXT,
      ADD COLUMN IF NOT EXISTS verdict_confidence DECIMAL(3,2),
      ADD COLUMN IF NOT EXISTS verdict_doer_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS verdict_company_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS verdict_issued_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS verdict_issued_by VARCHAR(50),
      ADD COLUMN IF NOT EXISTS has_appeal BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS appeal_reason TEXT,
      ADD COLUMN IF NOT EXISTS appeal_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS appeal_submitted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS appeal_reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS appeal_final_decision VARCHAR(50),
      ADD COLUMN IF NOT EXISTS appeal_final_reasoning TEXT
  `);

  // A dispute filed on the company's behalf — so admins and the other party see
  // the business, not the individual staff member who happened to raise it.
  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS raised_by_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);

  // raised_by_id is NOT NULL and pre-dates filed_by_user_id — keep both in step
  await db.query(`
    UPDATE disputes SET filed_by_user_id = raised_by_id
     WHERE filed_by_user_id IS NULL AND raised_by_id IS NOT NULL
  `);
  await db.query(`ALTER TABLE disputes ALTER COLUMN raised_by_id DROP NOT NULL`);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes(filed_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_company ON disputes(company_id);
  `);

  console.log('[010] Creating company_dispute_requests…');

  await db.query(`
    CREATE TABLE IF NOT EXISTS company_dispute_requests (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      errand_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
      raised_by_staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      dispute_type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT,

      status VARCHAR(30) NOT NULL DEFAULT 'pending_company',
      reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      review_note TEXT,

      -- set only when approved and a real dispute was filed
      dispute_id INTEGER REFERENCES disputes(id) ON DELETE SET NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT company_dispute_requests_status_check
        CHECK (status IN ('pending_company', 'approved', 'rejected', 'withdrawn'))
    )
  `);

  // One live request per staff member per errand — stops a staff member spamming
  // the owner with the same complaint. Rejected/withdrawn rows are excluded so
  // they can raise it again if circumstances genuinely change.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cdr_one_open_per_staff_errand
      ON company_dispute_requests (errand_id, raised_by_staff_id)
      WHERE status = 'pending_company'
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_cdr_company_status
      ON company_dispute_requests (company_id, status);
  `);

  console.log('[010] ✅ done');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS company_dispute_requests CASCADE');
  console.log('[010] ✅ rolled back (disputes columns left in place — additive only)');
}

// Run directly:  npx tsx src/migrations/010_dispute_schema_repair_and_staff_requests.ts
if (process.argv[1] && process.argv[1].includes('010_dispute_schema_repair')) {
  up()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
