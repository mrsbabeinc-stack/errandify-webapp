-- Email notification tables and columns

-- Add columns to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{}';

-- Email digest queue
CREATE TABLE IF NOT EXISTS email_digest_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  queued_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  UNIQUE(user_id, notification_id)
);

-- Email logs for tracking
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type VARCHAR NOT NULL, -- 'immediate', 'digest', 'reminder'
  subject TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced BOOLEAN DEFAULT false,
  errand_id INTEGER REFERENCES errands(id) ON DELETE SET NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_user_id ON email_digest_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_sent_at ON email_digest_queue(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
