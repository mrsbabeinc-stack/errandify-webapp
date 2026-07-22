import db from '../db.js';

/**
 * Migration 012 — Hana proposes, admin decides.
 *
 * The dispute code was built around a three-tier support model (L1 auto-rules,
 * L2 AI + support agent, L3 senior agent). That is not the product model: Hana
 * reviews every dispute and PROPOSES a resolution, and an admin makes every
 * decision. Hana never closes a dispute and never moves money.
 *
 * This adds the proposal columns and normalises the status vocabulary, which
 * had drifted into two conventions (level_1/level_2/escalated alongside
 * VERDICT_ISSUED/CLOSED).
 */
export async function up() {
  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS hana_proposal TEXT,
      ADD COLUMN IF NOT EXISTS hana_recommended_action VARCHAR(40),
      ADD COLUMN IF NOT EXISTS hana_confidence DECIMAL(3,2),
      ADD COLUMN IF NOT EXISTS hana_reasoning TEXT,
      ADD COLUMN IF NOT EXISTS hana_proposed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS hana_failed_reason TEXT
  `);

  // Single tier: Hana looks at it, then an admin decides. Old tier values are
  // mapped onto the new flow so existing rows stay meaningful.
  await db.query(`
    UPDATE disputes SET status = CASE
      WHEN status IN ('level_1', 'level_2') THEN 'hana_reviewing'
      WHEN status IN ('level_3', 'escalated') THEN 'admin_review'
      WHEN status = 'VERDICT_ISSUED' THEN 'resolved'
      WHEN status = 'CLOSED' THEN 'closed'
      ELSE status
    END
    WHERE status IN ('level_1','level_2','level_3','escalated','VERDICT_ISSUED','CLOSED')
  `);

  console.log('[012] ✅ Hana proposal columns added, statuses normalised');
}

export async function down() {
  await db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS hana_proposal,
      DROP COLUMN IF EXISTS hana_recommended_action,
      DROP COLUMN IF EXISTS hana_confidence,
      DROP COLUMN IF EXISTS hana_reasoning,
      DROP COLUMN IF EXISTS hana_proposed_at,
      DROP COLUMN IF EXISTS hana_failed_reason
  `);
}

if (process.argv[1] && process.argv[1].includes('012_hana_proposal')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
