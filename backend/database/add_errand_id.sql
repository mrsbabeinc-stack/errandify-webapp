-- Migration: Add errand_id column for unique errand identification
-- Format: ERR-YYYY-XXXXXX (e.g., ERR-2026-K9M7X2)

ALTER TABLE errands
ADD COLUMN IF NOT EXISTS errand_id VARCHAR(20) UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_errands_errand_id ON errands(errand_id);
