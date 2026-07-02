import db from '../db.js';

export async function migrate() {
  try {
    console.log('[Migration] Starting: Dispute Audit Trail & Compliance');

    // Audit trail table for legal compliance
    await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_audit_trail (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL REFERENCES disputes(id),
        admin_id VARCHAR(255),

        -- Action tracking
        action VARCHAR(100) NOT NULL, -- verdict_created, verdict_validated, verdict_approved, etc
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Verdict data snapshot
        verdict_data JSONB,

        -- Validation results
        validation_results JSONB, -- {isValid, issues, safetyFlags, legalRisks, biasDetected}
        issues_count INTEGER DEFAULT 0,
        has_safety_flags BOOLEAN DEFAULT false,

        -- Compliance markers
        legal_reviewed BOOLEAN DEFAULT false,
        safety_team_notified BOOLEAN DEFAULT false,
        compliance_approved BOOLEAN DEFAULT false,

        -- Notes
        notes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_audit_dispute ON dispute_audit_trail(dispute_id);
      CREATE INDEX idx_audit_admin ON dispute_audit_trail(admin_id);
      CREATE INDEX idx_audit_action ON dispute_audit_trail(action);
      CREATE INDEX idx_audit_safety_flags ON dispute_audit_trail(has_safety_flags);
    `);

    // Compliance review queue
    await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_compliance_queue (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL UNIQUE REFERENCES disputes(id),

        -- Why it's in queue
        queue_reason VARCHAR(100) NOT NULL, -- safety_flag, bias_detected, legal_risk, high_value
        severity VARCHAR(20) NOT NULL, -- critical, high, medium
        description TEXT,

        -- Status
        status VARCHAR(50) DEFAULT 'pending', -- pending, reviewing, approved, rejected
        assigned_to VARCHAR(255), -- Legal/Safety team member
        assigned_at TIMESTAMP,

        -- Review
        reviewed_by VARCHAR(255),
        reviewed_at TIMESTAMP,
        review_notes TEXT,

        -- Outcome
        approved_for_execution BOOLEAN DEFAULT false,
        required_changes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_compliance_dispute ON dispute_compliance_queue(dispute_id);
      CREATE INDEX idx_compliance_status ON dispute_compliance_queue(status);
      CREATE INDEX idx_compliance_severity ON dispute_compliance_queue(severity);
      CREATE INDEX idx_compliance_assigned ON dispute_compliance_queue(assigned_to);
    `);

    // Admin actions log for accountability
    await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_admin_actions (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL REFERENCES disputes(id),
        admin_id VARCHAR(255) NOT NULL,

        -- Action details
        action_type VARCHAR(100) NOT NULL, -- created_verdict, reviewed, approved, rejected, escalated, modified
        action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Decision trail
        old_verdict JSONB,
        new_verdict JSONB,
        reason_for_change TEXT,

        -- Compliance
        required_review VARCHAR(50), -- safety, legal, bias, none
        compliance_approved BOOLEAN DEFAULT false,

        -- IP and context
        admin_ip_hash VARCHAR(255),
        notes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_admin_actions_dispute ON dispute_admin_actions(dispute_id);
      CREATE INDEX idx_admin_actions_admin ON dispute_admin_actions(admin_id);
      CREATE INDEX idx_admin_actions_type ON dispute_admin_actions(action_type);
      CREATE INDEX idx_admin_actions_timestamp ON dispute_admin_actions(action_timestamp);
    `);

    console.log('[Migration] Completed: Dispute Audit Trail & Compliance');
  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  }
}
