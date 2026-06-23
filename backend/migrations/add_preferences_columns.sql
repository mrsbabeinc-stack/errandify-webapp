-- Add doer_preferences and asker_needs columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS doer_preferences JSONB DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS asker_needs JSONB DEFAULT NULL;
