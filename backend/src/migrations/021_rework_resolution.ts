import db from '../db.js';

/**
 * Migration 021 — resolution kinds, including rework-by-agreement.
 *
 * A dispute can now end three ways:
 *
 *   monetary      settle now; the hold releases when the money moves
 *   rework          both sides agree the work is reworked by a date. The payment
 *                 hold STAYS — it is both the leverage that gets the job done
 *                 and the fallback if it isn't. Not a settlement, so no appeal
 *                 window opens yet.
 *   non_monetary  warning, apology, nothing needed. The hold releases and
 *                 payment proceeds as originally agreed.
 *
 * A rework is a PROPOSAL, not an instruction: nobody can be made to rework work,
 * and nobody can be made to accept a rework instead of their money. Both parties
 * accept or it falls back to the admin deciding compensation.
 */
export async function up() {
  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS resolution_kind VARCHAR(20),
      ADD COLUMN IF NOT EXISTS non_monetary_outcome VARCHAR(40),

      ADD COLUMN IF NOT EXISTS rework_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rework_proposed_at TIMESTAMP,
      -- consent must be explicit; silence counts as a decline after 24h
      ADD COLUMN IF NOT EXISTS rework_asker_response VARCHAR(15),
      ADD COLUMN IF NOT EXISTS rework_doer_response VARCHAR(15),
      ADD COLUMN IF NOT EXISTS rework_consent_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rework_declined_by VARCHAR(15),
      ADD COLUMN IF NOT EXISTS rework_decline_reason TEXT,
      ADD COLUMN IF NOT EXISTS rework_completed_at TIMESTAMP,
      -- one rework only: a failed rework goes to compensation, never another rework
      ADD COLUMN IF NOT EXISTS rework_round INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rework_outcome VARCHAR(25)
  `);

  await db.query(`
    ALTER TABLE disputes
      DROP CONSTRAINT IF EXISTS disputes_resolution_kind_check
  `);
  await db.query(`
    ALTER TABLE disputes
      ADD CONSTRAINT disputes_resolution_kind_check
      CHECK (resolution_kind IS NULL OR resolution_kind IN ('monetary', 'rework', 'non_monetary'))
  `);

  // rework_outcome: agreed | completed | declined | expired | not_completed
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_rework_pending
      ON disputes (rework_deadline)
      WHERE resolution_kind = 'rework' AND rework_outcome = 'agreed'
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_rework_consent
      ON disputes (rework_consent_deadline)
      WHERE resolution_kind = 'rework' AND rework_outcome IS NULL
  `);

  console.log('[021] ✅ resolution kinds + rework columns added');
}

export async function down() {
  await db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_resolution_kind_check`);
  await db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS resolution_kind,
      DROP COLUMN IF EXISTS non_monetary_outcome,
      DROP COLUMN IF EXISTS rework_deadline,
      DROP COLUMN IF EXISTS rework_proposed_at,
      DROP COLUMN IF EXISTS rework_asker_response,
      DROP COLUMN IF EXISTS rework_doer_response,
      DROP COLUMN IF EXISTS rework_consent_deadline,
      DROP COLUMN IF EXISTS rework_declined_by,
      DROP COLUMN IF EXISTS rework_decline_reason,
      DROP COLUMN IF EXISTS rework_completed_at,
      DROP COLUMN IF EXISTS rework_round,
      DROP COLUMN IF EXISTS rework_outcome
  `);
}

if (process.argv[1] && process.argv[1].includes('021_rework_resolution')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
