-- Add referral system columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by VARCHAR(50);

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
