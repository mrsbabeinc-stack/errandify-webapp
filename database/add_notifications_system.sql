-- Add Notifications System Tables
-- Includes: user_notifications and notification_preferences

-- User Notifications Table
-- Stores all notifications sent to users
CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'bid_placed', 'bid_accepted', 'job_started', 'job_completed', 'rating_submitted', 'dispute_raised', etc.
  tier VARCHAR(20) NOT NULL DEFAULT 'important', -- 'critical', 'important', 'informational'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  icon VARCHAR(50), -- emoji or icon name for display
  related_errand_id INTEGER REFERENCES errands(id) ON DELETE SET NULL,
  related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- who triggered this notification
  action_url VARCHAR(500), -- URL to navigate when clicked
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- for cleanup of old notifications
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_errand_id ON user_notifications(related_errand_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_type ON user_notifications(type);
CREATE INDEX idx_user_notifications_tier ON user_notifications(tier);

-- Notification Preferences Table
-- Stores user preferences for different notification types and channels
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Email format settings
  email_format VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'digest', 'weekly', 'disabled'
  digest_time TIME DEFAULT '08:00:00', -- When to send daily digest (8 AM)

  -- CRITICAL ALERTS (Always ON, can't be disabled)
  critical_in_app BOOLEAN DEFAULT true,
  critical_bell BOOLEAN DEFAULT true,
  critical_email BOOLEAN DEFAULT true,

  -- IMPORTANT ALERTS (Default ON, can be disabled)
  important_in_app BOOLEAN DEFAULT true,
  important_bell BOOLEAN DEFAULT true,
  important_email BOOLEAN DEFAULT true,

  -- INFORMATIONAL ALERTS (Default OFF, can be enabled)
  informational_in_app BOOLEAN DEFAULT false,
  informational_bell BOOLEAN DEFAULT false,
  informational_email BOOLEAN DEFAULT false,

  -- Specific notification types that users can customize
  bid_received BOOLEAN DEFAULT true,
  bid_accepted BOOLEAN DEFAULT true,
  bid_rejected BOOLEAN DEFAULT true,
  job_started BOOLEAN DEFAULT true,
  job_completed BOOLEAN DEFAULT true,
  rating_received BOOLEAN DEFAULT true,
  dispute_raised BOOLEAN DEFAULT true,
  changes_requested BOOLEAN DEFAULT true,
  payment_released BOOLEAN DEFAULT true,
  profile_viewed BOOLEAN DEFAULT false,
  similar_jobs BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create or replace function to auto-create notification preferences
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create preferences for new users
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;
CREATE TRIGGER trigger_create_notification_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_notification_preferences();

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE id = notification_id AND is_read = false;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = user_id_param AND is_read = false;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM user_notifications
  WHERE user_id = user_id_param AND is_read = false;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old notifications (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  DELETE FROM user_notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW()
  OR (created_at < NOW() - INTERVAL '90 days' AND is_read = true);

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (if needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_notifications TO errandify_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO errandify_app;
-- GRANT EXECUTE ON FUNCTION mark_notification_read TO errandify_app;
-- GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO errandify_app;
-- GRANT EXECUTE ON FUNCTION get_unread_notification_count TO errandify_app;
-- GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO errandify_app;
