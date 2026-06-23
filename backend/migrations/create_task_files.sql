-- Create task_files table to store completion evidence files
CREATE TABLE IF NOT EXISTS task_files (
  id SERIAL PRIMARY KEY,
  errand_id INT NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  submission_number INT NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INT,
  file_type VARCHAR(50),
  uploaded_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT task_files_unique_per_submission UNIQUE(errand_id, submission_number, file_url)
);

-- Create index for faster lookups
CREATE INDEX idx_task_files_errand_id ON task_files(errand_id);
CREATE INDEX idx_task_files_uploaded_by ON task_files(uploaded_by);
CREATE INDEX idx_task_files_submission ON task_files(errand_id, submission_number);

-- Create completion_submissions table to track resubmissions
CREATE TABLE IF NOT EXISTS completion_submissions (
  id SERIAL PRIMARY KEY,
  errand_id INT NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  submission_number INT NOT NULL,
  completion_notes TEXT,
  submitted_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, resubmitted
  asker_feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT completion_submissions_unique UNIQUE(errand_id, submission_number)
);

-- Create index for submissions
CREATE INDEX idx_completion_submissions_errand ON completion_submissions(errand_id);
CREATE INDEX idx_completion_submissions_status ON completion_submissions(errand_id, status);
