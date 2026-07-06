-- Ensure formatted_id column exists in errands table
ALTER TABLE errands ADD COLUMN IF NOT EXISTS formatted_id VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_errands_formatted_id ON errands(formatted_id);
