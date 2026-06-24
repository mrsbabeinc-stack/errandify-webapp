-- Create errand activity log table to track all events
CREATE TABLE IF NOT EXISTS errand_activity_log (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  -- Types: 'posted', 'bid_placed', 'bid_accepted', 'bid_rejected', 'confirmed', 'started', 'completed', 'review_submitted', 'rating_submitted', 'changes_requested', 'dispute_raised', 'dispute_resolved'
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  actor_role VARCHAR(50), -- 'asker' or 'doer'
  details JSONB, -- Additional context like bid amount, change requests, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errand_activity_log_errand_id ON errand_activity_log(errand_id);
CREATE INDEX IF NOT EXISTS idx_errand_activity_log_created_at ON errand_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_errand_activity_log_activity_type ON errand_activity_log(activity_type);

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_errand_activity(
  p_errand_id INTEGER,
  p_activity_type VARCHAR,
  p_actor_id INTEGER,
  p_actor_name VARCHAR,
  p_actor_role VARCHAR,
  p_details JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO errand_activity_log (errand_id, activity_type, actor_id, actor_name, actor_role, details)
  VALUES (p_errand_id, p_activity_type, p_actor_id, p_actor_name, p_actor_role, p_details);
END;
$$ LANGUAGE plpgsql;
