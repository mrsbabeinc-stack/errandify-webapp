-- Migration: Create admin_notifications table for moderation tracking

CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'flagged_message', 'user_suspended', etc
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  details JSONB, -- Store flexible data like messageId, taskId, content, etc
  created_at TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_resolved ON admin_notifications(resolved);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- Add comment
COMMENT ON TABLE admin_notifications IS 'Track all moderation violations: flagged messages, suspended users, etc';
COMMENT ON COLUMN admin_notifications.type IS 'Type of violation: flagged_message, user_suspended, etc';
COMMENT ON COLUMN admin_notifications.severity IS 'Severity level: low, medium, high';
COMMENT ON COLUMN admin_notifications.details IS 'Flexible JSONB field storing type-specific details';
