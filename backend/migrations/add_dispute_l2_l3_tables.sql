-- Migration: Add Dispute L2+L3 Resolution Tables
-- Date: 2026-06-29
-- Description: Support for Level 2 (AI+Human) and Level 3 (Complex) dispute resolution

-- Dispute escalations table (L2 level resolution)
CREATE TABLE IF NOT EXISTS dispute_escalations (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)), -- Escalation level
  escalated_by_user_id INTEGER REFERENCES users(id),
  escalated_at TIMESTAMP DEFAULT NOW(),
  assigned_to_user_id INTEGER REFERENCES users(id), -- Support staff
  ai_confidence DECIMAL(3,2), -- 0.60-0.99
  ai_recommendation VARCHAR(20) CHECK (ai_recommendation IN ('refund', 'split', 'release')),
  ai_reasoning TEXT,
  human_decision VARCHAR(20) CHECK (human_decision IN ('refund', 'split', 'release')), -- L2 human decision
  human_reasoning TEXT,
  decided_by_user_id INTEGER REFERENCES users(id), -- Support staff who made decision
  decided_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'appealed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Appeals table (L3 level resolution)
CREATE TABLE IF NOT EXISTS dispute_appeals (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  appeal_reason TEXT NOT NULL,
  new_evidence_url VARCHAR(500),
  appealed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  appealed_at TIMESTAMP DEFAULT NOW(),
  assigned_to_user_id INTEGER REFERENCES users(id), -- Senior support staff
  l3_decision VARCHAR(20) CHECK (l3_decision IN ('refund', 'split', 'release', 'upheld')), -- L3 final decision
  l3_reasoning TEXT,
  decided_by_user_id INTEGER REFERENCES users(id), -- L3 decision maker
  decided_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'final')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Support queue table (for task assignment)
CREATE TABLE IF NOT EXISTS support_queue (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5), -- 1=low, 5=high
  category VARCHAR(50), -- 'low_quality', 'non_completion', 'overcharge', 'other'
  assigned_to_user_id INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_dispute_escalations_dispute_id ON dispute_escalations(dispute_id);
CREATE INDEX idx_dispute_escalations_assigned_to ON dispute_escalations(assigned_to_user_id);
CREATE INDEX idx_dispute_escalations_level ON dispute_escalations(level);
CREATE INDEX idx_dispute_escalations_status ON dispute_escalations(status);
CREATE INDEX idx_dispute_escalations_created_at ON dispute_escalations(created_at DESC);

CREATE INDEX idx_dispute_appeals_dispute_id ON dispute_appeals(dispute_id);
CREATE INDEX idx_dispute_appeals_assigned_to ON dispute_appeals(assigned_to_user_id);
CREATE INDEX idx_dispute_appeals_status ON dispute_appeals(status);
CREATE INDEX idx_dispute_appeals_created_at ON dispute_appeals(created_at DESC);

CREATE INDEX idx_support_queue_assigned_to ON support_queue(assigned_to_user_id);
CREATE INDEX idx_support_queue_status ON support_queue(status);
CREATE INDEX idx_support_queue_priority ON support_queue(priority DESC);
CREATE INDEX idx_support_queue_created_at ON support_queue(created_at DESC);

-- Add role column to users table if not exists (for support staff designation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50); -- 'user', 'support_l1', 'support_l2', 'support_l3', 'admin'

CREATE INDEX idx_users_role ON users(role) WHERE role IS NOT NULL;
