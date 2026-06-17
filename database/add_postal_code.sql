-- Add postal_code column to errands table if it doesn't exist
ALTER TABLE errands ADD COLUMN IF NOT EXISTS postal_code VARCHAR(6);
