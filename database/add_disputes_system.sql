-- Migration: Add disputes and resolution system

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  filed_by INTEGER NOT NULL REFERENCES users(id),
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  evidence TEXT,
  status VARCHAR(50) DEFAULT 'open',
  admin_notes TEXT,
  resolution VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, filed_by, status)
);

-- Add indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_disputes_task_id ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- Add payment_status column to errands if not exists
ALTER TABLE errands ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

-- Create view for dispute stats
CREATE OR REPLACE VIEW dispute_stats AS
SELECT
  COUNT(*) as total_disputes,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_disputes,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_disputes,
  COUNT(CASE WHEN status = 'appeal_pending' THEN 1 END) as appealed_disputes,
  ROUND(AVG(CASE WHEN status = 'resolved' THEN EXTRACT(EPOCH FROM (updated_at - created_at))/86400 END)::numeric, 2) as avg_resolution_days
FROM disputes;

-- Create dispute resolution reasons enum
CREATE TYPE dispute_resolution AS ENUM (
  'refund_issued',
  'payment_released',
  'partial_refund',
  'no_action',
  'dismissed'
);
