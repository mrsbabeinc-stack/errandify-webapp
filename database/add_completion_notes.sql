-- Add completion_notes field to errands table
ALTER TABLE errands ADD COLUMN completion_notes TEXT;

-- Add task_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_photos (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id),
  photo_url TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_uploaded_at ON task_photos(uploaded_at);
