-- Admin Role System Migration
-- Created: 2026-06-29

-- Add roles column to users table
ALTER TABLE users ADD COLUMN roles TEXT[] DEFAULT '{"asker"}';
ALTER TABLE users ADD COLUMN current_role VARCHAR(50) DEFAULT 'asker';
ALTER TABLE users ADD COLUMN admin_access_level VARCHAR(50) DEFAULT NULL;

-- Create Cases table for dispute management
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  case_type VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  complainant_user_id INT NOT NULL REFERENCES users(id),
  respondent_user_id INT NOT NULL REFERENCES users(id),
  errand_id INT REFERENCES errands(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  ai_recommendation JSONB,
  ai_confidence DECIMAL(3,2),
  final_decision VARCHAR(50),
  refund_amount DECIMAL(10,2),
  staff_assigned_to INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'awaiting_user', 'awaiting_respondent', 'closed', 'escalated')),
  CONSTRAINT valid_decision CHECK (final_decision IS NULL OR final_decision IN ('partial_refund', 'full_refund', 'no_action', 'warning', 'suspension', 'escalated'))
);

-- Create Case Messages table
CREATE TABLE IF NOT EXISTS case_messages (
  id SERIAL PRIMARY KEY,
  case_id INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id INT NOT NULL REFERENCES users(id),
  message_type VARCHAR(50) DEFAULT 'comment',
  content TEXT NOT NULL,
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Case Tags table
CREATE TABLE IF NOT EXISTS case_tags (
  id SERIAL PRIMARY KEY,
  case_id INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tag_key VARCHAR(50) NOT NULL,
  tag_value VARCHAR(255) NOT NULL,
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_cases_complainant ON cases(complainant_user_id);
CREATE INDEX idx_cases_respondent ON cases(respondent_user_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_severity ON cases(severity);
CREATE INDEX idx_cases_errand ON cases(errand_id);
CREATE INDEX idx_case_messages_case ON case_messages(case_id);
CREATE INDEX idx_case_tags_case ON case_tags(case_id);
CREATE INDEX idx_users_roles ON users USING GIN (roles);

-- Update existing users to have asker role (if not already set)
UPDATE users SET roles = '{"asker"}' WHERE roles IS NULL OR array_length(roles, 1) = 0;

-- Add any existing admin users (update this with actual admin emails)
-- Example: UPDATE users SET roles = '{"admin", "asker"}', admin_access_level = 'full' WHERE email = 'admin@errandify.ai';

COMMIT;
