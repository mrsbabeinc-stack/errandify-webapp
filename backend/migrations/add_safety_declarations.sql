-- Migration: Add Safety Declarations (Before You Get Started)
-- Date: 2026-07-01
-- Description: Mandatory safety declaration gates access to platform features

-- User capability declarations - optional self-declared restrictions
CREATE TABLE IF NOT EXISTS user_capabilities (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  physical_limitations TEXT,
  health_conditions TEXT,
  employment_status VARCHAR(50),
  job_restrictions TEXT,
  vulnerable_support_needs TEXT,
  declared_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_capabilities_user_id ON user_capabilities(user_id);

-- Before You Get Started - Mandatory 5-point safety declaration
CREATE TABLE IF NOT EXISTS safety_declarations (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The 5 mandatory checkboxes
  declares_no_convictions BOOLEAN DEFAULT false,
  accepts_vulnerable_care_standards BOOLEAN DEFAULT false,
  understands_emergency_protocols BOOLEAN DEFAULT false,
  respects_privacy BOOLEAN DEFAULT false,
  understands_honesty_consequences BOOLEAN DEFAULT false,
  -- Acceptance status
  fully_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_safety_declarations_user_id ON safety_declarations(user_id);
CREATE INDEX idx_safety_declarations_fully_accepted ON safety_declarations(fully_accepted);
CREATE INDEX idx_safety_declarations_accepted_at ON safety_declarations(accepted_at DESC);

-- Add columns to users table if not already present
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_access_vulnerable_categories BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS safety_declaration_accepted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS safety_declaration_accepted_at TIMESTAMP;

-- Create index for safety declaration enforcement
CREATE INDEX IF NOT EXISTS idx_users_safety_declaration_accepted ON users(safety_declaration_accepted);

-- Ensure all existing users have a safety declaration entry (with all false values for now)
INSERT INTO safety_declarations (
  user_id,
  declares_no_convictions,
  accepts_vulnerable_care_standards,
  understands_emergency_protocols,
  respects_privacy,
  understands_honesty_consequences,
  fully_accepted,
  accepted_at,
  created_at
)
SELECT
  id,
  false,
  false,
  false,
  false,
  false,
  false,
  NULL,
  NOW()
FROM users
WHERE id NOT IN (SELECT user_id FROM safety_declarations)
ON CONFLICT DO NOTHING;
