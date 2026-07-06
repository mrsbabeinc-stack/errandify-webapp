-- Add full_address column to errands table
ALTER TABLE errands ADD COLUMN IF NOT EXISTS full_address VARCHAR(500);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_errands_full_address ON errands(full_address);
