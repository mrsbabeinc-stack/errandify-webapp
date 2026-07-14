-- Add resolution columns to cases table if they don't exist

ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS compensation_amount DECIMAL(10, 2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fee_assignment VARCHAR(20);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
