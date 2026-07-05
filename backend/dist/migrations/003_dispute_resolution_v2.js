import db from '../db.js';
export async function migrate() {
    try {
        console.log('[Migration] Starting: Dispute Resolution V2');
        // Table: dispute_ai_analysis
        // Stores AI analysis results for each dispute
        await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_ai_analysis (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL UNIQUE REFERENCES disputes(id),

        -- Safety analysis
        safety_concern BOOLEAN DEFAULT false,
        safety_severity VARCHAR(20), -- low, medium, high, critical
        safety_concern_type VARCHAR(50), -- coercion, abuse, threats, exploitation
        flagged_phrases TEXT[],
        safety_recommendation VARCHAR(50), -- escalate_immediately, monitor, proceed_normally

        -- Evidence scoring
        has_gps_data BOOLEAN DEFAULT false,
        has_photos BOOLEAN DEFAULT false,
        photo_count INTEGER DEFAULT 0,
        has_chat_history BOOLEAN DEFAULT false,
        has_wait_time_documentation BOOLEAN DEFAULT false,
        description_word_count INTEGER DEFAULT 0,
        evidence_score DECIMAL(3,2), -- 0-1.00

        -- Dispute classification
        dispute_classification VARCHAR(50), -- CLEAR, AMBIGUOUS, UNCLEAR
        dispute_subtype VARCHAR(100), -- specific claim type
        is_plausible BOOLEAN DEFAULT true,

        -- Pattern detection
        doer_dispute_count INTEGER DEFAULT 0,
        doer_is_repeat_complainer BOOLEAN DEFAULT false,
        asker_defense_count INTEGER DEFAULT 0,
        both_new_users BOOLEAN DEFAULT false,
        doer_rating_average DECIMAL(3,2),
        asker_rating_average DECIMAL(3,2),
        pattern_flag VARCHAR(20), -- RED, YELLOW, GREEN

        -- AI recommendation
        ai_recommended_decision VARCHAR(50), -- full_payment, partial_payment, refund, escalate
        ai_confidence_score DECIMAL(3,2), -- 0-1.00
        can_auto_resolve BOOLEAN DEFAULT false,
        human_review_needed BOOLEAN DEFAULT true,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_dispute_ai_analysis_dispute ON dispute_ai_analysis(dispute_id);
      CREATE INDEX idx_dispute_ai_analysis_confidence ON dispute_ai_analysis(ai_confidence_score);
      CREATE INDEX idx_dispute_ai_analysis_safety ON dispute_ai_analysis(safety_severity);
    `);
        // Table: dispute_decisions
        // Stores final decision (AI or human)
        await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_decisions (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL UNIQUE REFERENCES disputes(id),

        -- Decision info
        decision_type VARCHAR(50), -- auto_resolved, human_reviewed, escalated
        decided_by VARCHAR(50), -- ai, admin_name
        decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Decision outcome
        final_decision VARCHAR(50), -- full_payment, partial_payment, refund, escalate
        payment_to_doer DECIMAL(10,2),
        payment_to_asker DECIMAL(10,2),

        -- Reasoning
        decision_reasoning TEXT,
        admin_notes TEXT,

        -- Messages
        message_to_doer TEXT,
        message_to_asker TEXT,

        -- Payment execution
        payment_executed BOOLEAN DEFAULT false,
        executed_at TIMESTAMP,
        stripe_transaction_id VARCHAR(255),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_dispute_decisions_dispute ON dispute_decisions(dispute_id);
      CREATE INDEX idx_dispute_decisions_decision_type ON dispute_decisions(decision_type);
      CREATE INDEX idx_dispute_decisions_executed ON dispute_decisions(payment_executed);
    `);
        // Table: dispute_appeals
        // Stores appeals of dispute decisions
        await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_appeals (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL REFERENCES disputes(id),
        original_decision_id INTEGER NOT NULL REFERENCES dispute_decisions(id),

        -- Appeal info
        appealed_by_user_id INTEGER NOT NULL REFERENCES users(id),
        appealed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Appeal content
        appeal_reason TEXT NOT NULL,
        new_evidence_description TEXT,
        new_evidence_photos TEXT[],

        -- Appeal status
        appeal_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, modified

        -- Appeal decision
        appeal_decision_id INTEGER REFERENCES dispute_decisions(id),
        appeal_reviewed_by VARCHAR(255),
        appeal_reviewed_at TIMESTAMP,
        appeal_reasoning TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_dispute_appeals_dispute ON dispute_appeals(dispute_id);
      CREATE INDEX idx_dispute_appeals_status ON dispute_appeals(appeal_status);
      CREATE INDEX idx_dispute_appeals_user ON dispute_appeals(appealed_by_user_id);
    `);
        // Table: dispute_evidence
        // Stores dispute evidence (GPS, photos, chat)
        await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_evidence (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL REFERENCES disputes(id),

        -- Evidence type
        evidence_type VARCHAR(50) NOT NULL, -- gps, photo, chat, description, wait_time

        -- GPS evidence
        gps_latitude DECIMAL(10,8),
        gps_longitude DECIMAL(11,8),
        gps_timestamp TIMESTAMP,
        gps_accuracy_meters DECIMAL(6,2),

        -- Photo evidence
        photo_url VARCHAR(255),
        photo_timestamp TIMESTAMP,
        photo_description TEXT,

        -- Chat evidence
        chat_message_count INTEGER,
        chat_timestamps_range JSONB, -- {start, end}
        chat_transcript JSONB, -- array of {sender, message, timestamp}

        -- Wait time
        wait_time_minutes INTEGER,
        wait_time_documented_by VARCHAR(50), -- gps, chat, timestamp

        -- Description
        description_text TEXT,

        -- Submission
        submitted_by_user_id INTEGER NOT NULL REFERENCES users(id),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_dispute_evidence_dispute ON dispute_evidence(dispute_id);
      CREATE INDEX idx_dispute_evidence_type ON dispute_evidence(evidence_type);
      CREATE INDEX idx_dispute_evidence_submitted_by ON dispute_evidence(submitted_by_user_id);
    `);
        // Table: dispute_notifications
        // Track all notifications sent related to disputes
        await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_notifications (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL REFERENCES disputes(id),

        -- Notification details
        notification_type VARCHAR(50) NOT NULL, -- dispute_created, decision_made, appeal_submitted, etc
        recipient_user_id INTEGER NOT NULL REFERENCES users(id),

        -- Message
        notification_title VARCHAR(255),
        notification_body TEXT,
        notification_channel VARCHAR(50), -- in_app, email, sms, push

        -- Status
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_dispute_notifications_dispute ON dispute_notifications(dispute_id);
      CREATE INDEX idx_dispute_notifications_user ON dispute_notifications(recipient_user_id);
      CREATE INDEX idx_dispute_notifications_type ON dispute_notifications(notification_type);
    `);
        // Add columns to disputes table if not exists
        await db.query(`
      ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS dispute_version VARCHAR(20) DEFAULT 'v2',
      ADD COLUMN IF NOT EXISTS cannot_complete_reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS dispute_start_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS dispute_end_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS appeal_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS has_appeal BOOLEAN DEFAULT false;
    `);
        console.log('[Migration] ✅ Dispute Resolution V2 tables created successfully');
    }
    catch (error) {
        console.error('[Migration] ❌ Error creating dispute resolution V2 tables:', error);
        throw error;
    }
}
export async function rollback() {
    try {
        console.log('[Migration] Rolling back: Dispute Resolution V2');
        await db.query('DROP TABLE IF EXISTS dispute_notifications CASCADE;');
        await db.query('DROP TABLE IF EXISTS dispute_evidence CASCADE;');
        await db.query('DROP TABLE IF EXISTS dispute_appeals CASCADE;');
        await db.query('DROP TABLE IF EXISTS dispute_decisions CASCADE;');
        await db.query('DROP TABLE IF EXISTS dispute_ai_analysis CASCADE;');
        console.log('[Migration] ✅ Rollback successful');
    }
    catch (error) {
        console.error('[Migration] ❌ Rollback error:', error);
        throw error;
    }
}
