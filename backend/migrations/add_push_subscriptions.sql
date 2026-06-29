-- Migration: Add Push Notifications Subscriptions Table
-- Date: 2026-06-29
-- Description: Store push notification subscriptions for each user

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(512) NOT NULL UNIQUE,
  auth_key VARCHAR(255),
  p256dh_key VARCHAR(255),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Indexes for quick lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_created_at ON push_subscriptions(created_at DESC);

-- Table for tracking sent push notifications (audit trail)
CREATE TABLE IF NOT EXISTS push_notification_logs (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  body VARCHAR(1000),
  notification_type VARCHAR(50),
  related_errand_id INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'expired'
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit trail
CREATE INDEX idx_push_notification_logs_user_id ON push_notification_logs(user_id);
CREATE INDEX idx_push_notification_logs_status ON push_notification_logs(status);
CREATE INDEX idx_push_notification_logs_sent_at ON push_notification_logs(sent_at DESC);
CREATE INDEX idx_push_notification_logs_type ON push_notification_logs(notification_type);
