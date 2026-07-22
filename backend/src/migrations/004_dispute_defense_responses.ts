import db from '../db.js';

export async function migrate() {
  try {
    console.log('[Migration] Starting: Dispute Defense Responses');

    // The defense response columns on `disputes` are added by migration 010.
    //
    // They used to be added here, but the statement was invalid SQL — Postgres
    // needs a separate ADD COLUMN per column, and this listed nine under one.
    // So this migration threw on its first statement and never reached the
    // table below, which is why dispute_defense_requests was missing while the
    // code queried it. Left as a no-op rather than duplicating 010.

    // Table: dispute_defense_requests
    // Track when and why defendant was asked to respond
    await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_defense_requests (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL UNIQUE REFERENCES disputes(id),
        defendant_user_id INTEGER NOT NULL REFERENCES users(id),

        -- Request details
        request_reason VARCHAR(100) NOT NULL, -- evidence_unclear, both_have_claims, asker_has_strong_evidence
        deadline TIMESTAMP NOT NULL,
        notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Response tracking
        response_received BOOLEAN DEFAULT false,
        response_received_at TIMESTAMP,
        response_forfeited_at TIMESTAMP,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_defense_requests_dispute ON dispute_defense_requests(dispute_id);
      CREATE INDEX idx_defense_requests_deadline ON dispute_defense_requests(deadline);
      CREATE INDEX idx_defense_requests_received ON dispute_defense_requests(response_received);
    `);

    // Table: dispute_tier_classification
    // AI classification logic for which tier a dispute belongs to
    await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_tier_classification (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL UNIQUE REFERENCES disputes(id),

        -- Tier classification
        assigned_tier VARCHAR(50) NOT NULL, -- auto, statement_only, full_investigation
        tier_reason TEXT,

        -- Evidence assessment
        claimant_evidence_score DECIMAL(3,2), -- 0-1.00
        defendant_evidence_score DECIMAL(3,2), -- 0-1.00
        evidence_clarity VARCHAR(50), -- clear, ambiguous, unclear

        -- Scoring details
        has_clear_gps BOOLEAN DEFAULT false,
        has_multiple_photos BOOLEAN DEFAULT false,
        has_substantial_description BOOLEAN DEFAULT false,
        has_chat_support BOOLEAN DEFAULT false,

        -- Auto-resolve criteria
        meets_auto_resolve_threshold BOOLEAN DEFAULT false,
        auto_resolve_reason TEXT,

        -- Decision
        can_skip_defendant_response BOOLEAN DEFAULT false,
        skip_reason TEXT,

        classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_tier_classification_dispute ON dispute_tier_classification(dispute_id);
      CREATE INDEX idx_tier_classification_tier ON dispute_tier_classification(assigned_tier);
    `);

    console.log('[Migration] Completed: Dispute Defense Responses');
  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  }
}
