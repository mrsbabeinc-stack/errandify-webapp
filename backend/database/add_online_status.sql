-- Migration: Add online status tracking

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW();

-- Create index for querying online users
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at DESC);

-- Add comment
COMMENT ON COLUMN users.last_active_at IS 'Last time user was active; used to determine online/offline status';
