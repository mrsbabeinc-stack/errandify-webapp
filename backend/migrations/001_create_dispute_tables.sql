-- Migration: Create Dispute Resolution Tables
-- Version: 1.0
-- Date: 2026-07-20
-- Description: Create core dispute resolution system with 3-day timeline

BEGIN;

-- ============================================================================
-- Table 1: DISPUTES
-- Core dispute tracking with 3-day timeline
-- ============================================================================
CREATE TABLE IF NOT EXISTS disputes (
  id BIGSERIAL PRIMARY KEY,
  errand_id BIGINT NOT NULL,

  -- Who raised the dispute
  raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('doer', 'company')),
  raised_by_user_id BIGINT NOT NULL,
  raised_by_company_id BIGINT,

  -- Who is the defendant
  defendant_user_id BIGINT,
  defendant_company_id BIGINT,

  -- Dispute details
  reason TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (
    status IN (
      'OPEN',
      'PENDING_RESPONSE',
      'EVIDENCE_RECEIVED',
      'UNDER_REVIEW',
      'VERDICT_ISSUED',
      'APPEALED',
      'CLOSED'
    )
  ),

  -- Timeline (3-DAY MAX)
  response_deadline TIMESTAMP NOT NULL,
  first_reminder_sent_at TIMESTAMP,
  second_reminder_sent_at TIMESTAMP,
  auto_resolve_at TIMESTAMP NOT NULL,

  -- Extension (1 only, 12h max)
  extension_requested BOOLEAN DEFAULT FALSE,
  extension_request_reason TEXT,
  extension_approved_at TIMESTAMP,
  extension_approved_by BIGINT,
  new_deadline TIMESTAMP,
  extension_denied_at TIMESTAMP,

  -- Evidence tracking
  doer_evidence_submitted_at TIMESTAMP,
  company_evidence_submitted_at TIMESTAMP,
  doer_evidence_count INT DEFAULT 0,
  company_evidence_count INT DEFAULT 0,

  -- Verdict (issued by T+48h)
  verdict_issued_at TIMESTAMP,
  verdict_issued_by VARCHAR(50),
  verdict_decision VARCHAR(50) CHECK (
    verdict_decision IS NULL OR
    verdict_decision IN ('APPROVE_DOER', 'APPROVE_COMPANY', 'PARTIAL_SPLIT')
  ),
  verdict_confidence INT CHECK (verdict_confidence IS NULL OR (verdict_confidence >= 0 AND verdict_confidence <= 100)),
  verdict_reasoning TEXT,
  verdict_doer_amount DECIMAL(10, 2),
  verdict_company_amount DECIMAL(10, 2),

  -- Appeal (12-hour window only: T+48h to T+60h)
  appealed BOOLEAN DEFAULT FALSE,
  appeal_submitted_at TIMESTAMP,
  appeal_reason TEXT,
  appeal_evidence_count INT DEFAULT 0,
  appeal_reviewed_at TIMESTAMP,
  appeal_final_decision VARCHAR(50) CHECK (
    appeal_final_decision IS NULL OR
    appeal_final_decision IN ('UPHELD', 'OVERTURNED', 'MODIFIED')
  ),
  appeal_final_reasoning TEXT,

  -- Payment status
  payment_status VARCHAR(50) DEFAULT 'HELD' CHECK (payment_status IN ('HELD', 'RELEASED', 'REFUNDED')),
  doer_payment_released_at TIMESTAMP,
  company_refund_processed_at TIMESTAMP,

  -- Archive
  closed_at TIMESTAMP,
  archived_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_errand_id ON disputes(errand_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_disputes_response_deadline ON disputes(response_deadline);
CREATE INDEX IF NOT EXISTS idx_disputes_auto_resolve_at ON disputes(auto_resolve_at);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by_user ON disputes(raised_by_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_defendant_user ON disputes(defendant_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_verdict_issued ON disputes(verdict_issued_at);

-- ============================================================================
-- Table 2: DISPUTE_EVIDENCE
-- Evidence files (photos, videos, text) with AI analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id BIGSERIAL PRIMARY KEY,
  dispute_id BIGINT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

  -- Who submitted this evidence
  submitted_by VARCHAR(20) NOT NULL CHECK (submitted_by IN ('doer', 'company')),
  submitted_by_user_id BIGINT NOT NULL,
  submitted_by_company_id BIGINT,

  -- Evidence metadata
  type VARCHAR(20) NOT NULL CHECK (type IN ('photo', 'video', 'text')),
  original_size BIGINT NOT NULL,
  compressed_size BIGINT,
  is_compressed BOOLEAN DEFAULT FALSE,
  mime_type VARCHAR(100),

  -- Photo/Video storage
  original_url TEXT,
  compressed_url TEXT,
  file_name VARCHAR(500),
  duration INT,
  resolution VARCHAR(50),

  -- Text evidence
  text_content TEXT,

  -- AI Analysis
  ai_analysis_status VARCHAR(50) DEFAULT 'PENDING' CHECK (
    ai_analysis_status IN ('PENDING', 'COMPLETED', 'FAILED')
  ),
  ai_analysis_result JSONB,
  ai_confidence INT CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 100)),
  ai_key_points JSONB,
  ai_verdict_hint VARCHAR(50) CHECK (
    ai_verdict_hint IS NULL OR
    ai_verdict_hint IN ('SUPPORTS_DOER', 'SUPPORTS_COMPANY', 'NEUTRAL')
  ),

  -- Submission phase tracking
  submission_phase VARCHAR(50) DEFAULT 'INITIAL' CHECK (
    submission_phase IN ('INITIAL', 'INVESTIGATION', 'APPEAL')
  ),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by_user_id BIGINT,

  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submitted_by ON dispute_evidence(submitted_by);
CREATE INDEX IF NOT EXISTS idx_evidence_ai_status ON dispute_evidence(ai_analysis_status);
CREATE INDEX IF NOT EXISTS idx_evidence_submission_phase ON dispute_evidence(submission_phase);
CREATE INDEX IF NOT EXISTS idx_evidence_is_deleted ON dispute_evidence(is_deleted);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_at ON dispute_evidence(uploaded_at);

-- ============================================================================
-- Table 3: DISPUTE_CHAT
-- Monitored communication between parties
-- ============================================================================
CREATE TABLE IF NOT EXISTS dispute_chat (
  id BIGSERIAL PRIMARY KEY,
  dispute_id BIGINT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL,
  sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('doer', 'company_staff', 'admin')),
  sender_company_id BIGINT,

  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'EVIDENCE_LINK', 'SYSTEM')),

  -- Admin monitoring
  admin_viewed_at TIMESTAMP,
  admin_reviewed_at TIMESTAMP,
  admin_review_notes TEXT,

  -- System flags
  is_system BOOLEAN DEFAULT FALSE,
  system_event_type VARCHAR(100),

  -- Message status
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  edit_reason VARCHAR(255),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_dispute_id ON dispute_chat(dispute_id);
CREATE INDEX IF NOT EXISTS idx_chat_sender_type ON dispute_chat(sender_type);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON dispute_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_is_system ON dispute_chat(is_system);
CREATE INDEX IF NOT EXISTS idx_chat_admin_viewed ON dispute_chat(admin_viewed_at);

-- ============================================================================
-- Table 4: DISPUTE_AUDIT_LOG
-- Audit trail for all dispute actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS dispute_audit_log (
  id BIGSERIAL PRIMARY KEY,
  dispute_id BIGINT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

  action VARCHAR(100) NOT NULL,
  actor_id BIGINT NOT NULL,
  actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('doer', 'company_staff', 'admin')),

  old_values JSONB,
  new_values JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_dispute_id ON dispute_audit_log(dispute_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON dispute_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON dispute_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON dispute_audit_log(actor_id);

-- ============================================================================
-- Create materialized view for admin dashboard
-- ============================================================================
CREATE OR REPLACE VIEW dispute_summary AS
SELECT
  d.id,
  d.errand_id,
  d.status,
  d.amount,
  d.raised_by,
  d.created_at,
  d.response_deadline,
  d.auto_resolve_at,
  d.doer_evidence_count,
  d.company_evidence_count,
  d.verdict_decision,
  d.verdict_confidence,
  EXTRACT(HOUR FROM (d.response_deadline - NOW())) as hours_until_response_deadline,
  EXTRACT(HOUR FROM (d.auto_resolve_at - NOW())) as hours_until_auto_resolve,
  CASE
    WHEN d.status = 'CLOSED' THEN 'Resolved'
    WHEN NOW() > d.auto_resolve_at THEN 'Overdue for Auto-Resolve'
    WHEN NOW() > d.response_deadline THEN 'Overdue for Response'
    ELSE 'Active'
  END as urgency
FROM disputes d
WHERE d.archived_at IS NULL;

COMMIT;
