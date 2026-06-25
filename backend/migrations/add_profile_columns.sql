-- Add missing profile columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS criminal_conviction BOOLEAN DEFAULT false;

-- Rename mobile to phone if needed (use mobile if phone not set)
UPDATE users SET phone = mobile WHERE phone IS NULL AND mobile IS NOT NULL;
