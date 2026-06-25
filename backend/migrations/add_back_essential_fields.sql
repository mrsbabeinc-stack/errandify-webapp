-- Add back essential fields needed for MyProfile
ALTER TABLE users
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS criminal_conviction BOOLEAN DEFAULT false;
