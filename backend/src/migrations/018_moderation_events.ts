import db from '../db.js';

/**
 * Migration 018 — a record of every moderation decision.
 *
 * AI could block an errand or an offer note outright, and nothing was written
 * anywhere. There was no way to know how often it fired, whether it was right,
 * or what a neighbour had actually been stopped from saying — and no way for
 * them to ask a human to look again.
 *
 * Every decision is recorded now, including the ones that passed, so the block
 * rate is measurable rather than guessed at.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS moderation_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      errand_id INTEGER REFERENCES errands(id) ON DELETE SET NULL,

      surface VARCHAR(40) NOT NULL,
      -- which layer made the call: deterministic rules, or the model
      layer VARCHAR(20) NOT NULL,
      decision VARCHAR(20) NOT NULL,

      category VARCHAR(80),
      reason TEXT,
      flags TEXT[],
      confidence DECIMAL(3,2),
      -- kept short: enough to judge a false positive, not a copy of everything
      content_excerpt VARCHAR(300),

      -- the way back for someone wrongly stopped
      review_requested_at TIMESTAMP,
      review_note TEXT,
      reviewed_at TIMESTAMP,
      reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_outcome VARCHAR(20),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT moderation_events_layer_check CHECK (layer IN ('keyword', 'ai', 'combined')),
      CONSTRAINT moderation_events_decision_check CHECK (decision IN ('passed', 'flagged', 'blocked')),
      CONSTRAINT moderation_events_outcome_check
        CHECK (review_outcome IS NULL OR review_outcome IN ('overturned', 'upheld'))
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_moderation_events_user ON moderation_events(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_moderation_events_decision ON moderation_events(decision, created_at DESC)`);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_moderation_events_pending_review
      ON moderation_events(review_requested_at) WHERE review_requested_at IS NOT NULL AND reviewed_at IS NULL
  `);

  console.log('[018] ✅ moderation_events created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS moderation_events CASCADE');
}

if (process.argv[1] && process.argv[1].includes('018_moderation_events')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
