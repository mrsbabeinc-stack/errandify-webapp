-- Add certificates column to users table for storing user certificates
ALTER TABLE users ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_certificates ON users USING GIN (certificates);
