-- Migration: Add ratings/reviews system for trust & reputation

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  rater_id INTEGER NOT NULL REFERENCES users(id),
  rated_user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, rater_id)  -- One rating per rater per task
);

-- Add rating columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user_id ON ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_ratings_task_id ON ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_average_rating ON users(average_rating DESC NULLS LAST);

-- Create view for rating statistics
CREATE OR REPLACE VIEW user_rating_stats AS
SELECT
  r.rated_user_id,
  COUNT(*) as total_ratings,
  AVG(r.rating) as average_rating,
  MIN(r.rating) as min_rating,
  MAX(r.rating) as max_rating,
  COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_star_count
FROM ratings r
GROUP BY r.rated_user_id;
