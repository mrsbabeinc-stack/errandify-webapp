-- Add chas_card_color column to users table for testing
ALTER TABLE users ADD COLUMN IF NOT EXISTS chas_card_color VARCHAR(50) DEFAULT 'blue';
