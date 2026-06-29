-- Migration: Add Real-Time Messaging Status Tracking
-- Date: 2026-06-29
-- Description: Add message status and delivery tracking for real-time messaging

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_errand_status ON chat_messages(errand_id, status);
