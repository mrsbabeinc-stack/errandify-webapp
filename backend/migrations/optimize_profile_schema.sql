-- Remove unnecessary fields from users table
ALTER TABLE users
DROP COLUMN IF EXISTS monthly_household_income,
DROP COLUMN IF EXISTS chas_subsidy_percentage,
DROP COLUMN IF EXISTS chas_verified,
DROP COLUMN IF EXISTS chas_verified_at,
DROP COLUMN IF EXISTS chas_verification_method,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS average_rating,
DROP COLUMN IF EXISTS total_ratings,
DROP COLUMN IF EXISTS criminal_conviction;

-- Keep only: chas_card_color, profile_image_url, bio, certificates (up to 10)
