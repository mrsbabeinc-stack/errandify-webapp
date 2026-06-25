-- Add missing fields needed for MyProfile functionality
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS formatted_user_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS chas_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS chas_verification_method VARCHAR(50);

-- Create unique index on formatted_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_formatted_user_id ON users(formatted_user_id);
