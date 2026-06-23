-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL,
  raised_by_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  reason TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (errand_id) REFERENCES errands(id) ON DELETE CASCADE,
  FOREIGN KEY (raised_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_disputes_errand_id ON disputes(errand_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_raised_by_id ON disputes(raised_by_id);
