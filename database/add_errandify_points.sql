-- Add errandify_points column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS errandify_points BIGINT DEFAULT 0;

-- Create point_transactions table for tracking point changes
CREATE TABLE IF NOT EXISTS point_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
