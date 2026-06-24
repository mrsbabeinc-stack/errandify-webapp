-- Create referral tracking table
CREATE TABLE IF NOT EXISTS referral_tracking (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'joined',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  first_job_completed_at TIMESTAMP,
  bonus_awarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_id, referred_user_id),
  INDEX idx_referrer (referrer_id),
  INDEX idx_referred (referred_user_id),
  INDEX idx_status (status)
);

-- Create referral rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type VARCHAR(50) NOT NULL,
  points_amount INTEGER NOT NULL DEFAULT 0,
  awarded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_referrer (referrer_id),
  INDEX idx_type (reward_type)
);

-- Add referral_code column to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;

-- Create index on referral_code for lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
