import db from '../db.js';

/**
 * Migration 034 — record human moderation decisions in moderation_events.
 *
 * The table was built for the automated pipeline and its CHECK constraints say
 * so:
 *   layer    IN ('keyword','ai','combined')
 *   decision IN ('passed','flagged','blocked')
 * with review_outcome ('overturned','upheld') covering a human reviewing what
 * the machine decided.
 *
 * An admin removing a community post outright is a different event: no keyword
 * or AI layer ran, and there is no machine decision being upheld or overturned.
 * Writing it as layer='combined' would claim a keyword-plus-AI check that never
 * happened, and the audit log would be lying about how the decision was reached.
 *
 * So the vocabulary is widened rather than abused: layer gains 'admin' for a
 * decision a person made directly, and decision gains 'removed' for content
 * taken down after publication — which 'blocked' does not mean, since blocked
 * content never went live.
 */
export async function up() {
  await db.query('ALTER TABLE moderation_events DROP CONSTRAINT IF EXISTS moderation_events_layer_check');
  await db.query(`
    ALTER TABLE moderation_events ADD CONSTRAINT moderation_events_layer_check
      CHECK (layer IN ('keyword', 'ai', 'combined', 'admin'))
  `);

  await db.query('ALTER TABLE moderation_events DROP CONSTRAINT IF EXISTS moderation_events_decision_check');
  await db.query(`
    ALTER TABLE moderation_events ADD CONSTRAINT moderation_events_decision_check
      CHECK (decision IN ('passed', 'flagged', 'blocked', 'removed'))
  `);

  console.log('[034] ✅ moderation_events accepts admin removals');
}

export async function down() {
  await db.query('ALTER TABLE moderation_events DROP CONSTRAINT IF EXISTS moderation_events_layer_check');
  await db.query(`
    ALTER TABLE moderation_events ADD CONSTRAINT moderation_events_layer_check
      CHECK (layer IN ('keyword', 'ai', 'combined'))
  `);
  await db.query('ALTER TABLE moderation_events DROP CONSTRAINT IF EXISTS moderation_events_decision_check');
  await db.query(`
    ALTER TABLE moderation_events ADD CONSTRAINT moderation_events_decision_check
      CHECK (decision IN ('passed', 'flagged', 'blocked'))
  `);
}

if (process.argv[1] && process.argv[1].includes('034_moderation_admin_action')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
