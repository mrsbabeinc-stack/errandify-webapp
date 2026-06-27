-- Create user declarations audit log table
CREATE TABLE IF NOT EXISTS user_declarations_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  declaration_type VARCHAR(50) NOT NULL,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_type (declaration_type),
  INDEX idx_accepted (accepted)
);

-- Add declaration columns to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS declaration_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_active BOOLEAN DEFAULT false;
