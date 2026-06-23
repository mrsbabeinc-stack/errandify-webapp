-- Add formatted user ID column for easier identification
ALTER TABLE users ADD COLUMN IF NOT EXISTS formatted_user_id VARCHAR(50) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_formatted_user_id ON users(formatted_user_id);
