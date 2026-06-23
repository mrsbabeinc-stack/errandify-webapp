-- Add postal_code and notes columns to errands table if they don't exist
ALTER TABLE errands ADD COLUMN postal_code VARCHAR(20);
ALTER TABLE errands ADD COLUMN notes TEXT;
