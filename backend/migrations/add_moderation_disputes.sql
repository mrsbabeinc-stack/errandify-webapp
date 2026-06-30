-- Migration: Add Content Moderation & Dispute Resolution tables
-- Date: 2026-07-01

-- Flagged content table for admin review
CREATE TABLE IF NOT EXISTS flagged_content (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL, -- 'task_description', 'chat_message', 'review'
  content TEXT NOT NULL,
  flagged_by_user_id INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  errand_id INT REFERENCES errands(id) ON DELETE SET NULL,
  conversation_id INT REFERENCES conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'removed', 'user_warned'
  reviewed_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_flagged_content_status ON flagged_content(status);
CREATE INDEX idx_flagged_content_severity ON flagged_content(severity);
CREATE INDEX idx_flagged_content_created_at ON flagged_content(created_at DESC);

-- Disputes table for 3-level resolution
CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  errand_id INT NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  filed_by_user_id INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  dispute_type VARCHAR(50) NOT NULL, -- 'payment_not_released', 'work_not_completed', 'low_quality', 'safety_concern', 'other'
  description TEXT NOT NULL,
  evidence TEXT, -- JSON with file URLs, photos, etc
  status VARCHAR(50) NOT NULL DEFAULT 'level_1', -- 'level_1' (auto), 'level_2' (AI), 'escalated' (Level 3)
  priority VARCHAR(20) DEFAULT 'normal', -- 'normal', 'high'
  resolution VARCHAR(50), -- 'approved', 'rejected', 'partial', 'refunded', 'escalated'
  resolution_notes TEXT,
  escalation_notes TEXT,
  payment_held BOOLEAN DEFAULT false,
  payment_held_reason TEXT,
  payment_held_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  escalated_at TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_disputes_errand_id ON disputes(errand_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_priority ON disputes(priority);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

-- Add payment hold columns to errands if not present
ALTER TABLE errands ADD COLUMN IF NOT EXISTS payment_held BOOLEAN DEFAULT false;
ALTER TABLE errands ADD COLUMN IF NOT EXISTS payment_held_reason TEXT;
ALTER TABLE errands ADD COLUMN IF NOT EXISTS payment_held_at TIMESTAMP;
ALTER TABLE errands ADD COLUMN IF NOT EXISTS payment_released_at TIMESTAMP;
ALTER TABLE errands ADD COLUMN IF NOT EXISTS dispute_resolution VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_errands_payment_held ON errands(payment_held);
CREATE INDEX IF NOT EXISTS idx_errands_payment_released_at ON errands(payment_released_at);
