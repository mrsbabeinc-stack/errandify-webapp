-- Migration: Add user_id column for unique user identification
-- Format: SG-[4-RANDOM-CHARS]-[LAST-4-OF-NRIC]
-- Example: SG-K9M7-5A3B

ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_id VARCHAR(20) UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Add comment
COMMENT ON COLUMN users.user_id IS 'Unique user identifier: SG-[4-RANDOM]-[LAST-4-NRIC] (e.g., SG-K9M7-5A3B)';
