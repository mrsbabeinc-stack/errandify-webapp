-- Create user_verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Verification steps
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMP,
  
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  
  -- Criminal records check
  criminal_records_checked BOOLEAN DEFAULT false,
  criminal_records_checked_at TIMESTAMP,
  
  -- Results
  status VARCHAR(50) DEFAULT 'pending', -- 'approved', 'restricted', 'rejected'
  restrictions TEXT[] DEFAULT '{}',
  
  -- Details (JSON for auditing)
  details JSONB,
  
  -- Tracking
  verified_by VARCHAR(50) DEFAULT 'system',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Extend users table with verification fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending';
-- Values: 'pending', 'verified', 'verified_restricted', 'rejected'

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_active BOOLEAN DEFAULT false;

ALTER TABLE users ADD COLUMN IF NOT EXISTS job_restrictions TEXT[] DEFAULT '{}';

-- Create indices
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
