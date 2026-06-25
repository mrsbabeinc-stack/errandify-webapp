-- Add gender field from SingPass
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add index for gender
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
