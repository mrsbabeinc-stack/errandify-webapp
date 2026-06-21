-- Migration: Create task_messages table for chat

CREATE TABLE IF NOT EXISTS task_messages (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_sender_id ON task_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_created_at ON task_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_messages_flagged ON task_messages(flagged);

-- Add comment
COMMENT ON TABLE task_messages IS 'Chat messages for task coordination';
COMMENT ON COLUMN task_messages.task_id IS 'Reference to the errand/task';
COMMENT ON COLUMN task_messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN task_messages.flagged IS 'Whether message was flagged by AI moderation';
