-- Migration: Add task execution support (photos, status flow)
-- This enables doers to upload photos and track task progress

-- Create task_photos table for storing proof of work
CREATE TABLE IF NOT EXISTS task_photos (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  doer_id INTEGER NOT NULL REFERENCES users(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for quick photo lookups
CREATE INDEX idx_task_photos_errand_id ON task_photos(errand_id);
CREATE INDEX idx_task_photos_doer_id ON task_photos(doer_id);

-- Add columns to errands table for task completion tracking
ALTER TABLE errands ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE errands ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Update errand_assignments status enum to include more states
-- (This should already exist: 'accepted', 'declined', 'completed', 'cancelled', 'in_progress')
-- But we add it explicitly if not present

-- Create index on status for performance
CREATE INDEX idx_errands_completion ON errands(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_task_photos_created ON task_photos(created_at DESC);
