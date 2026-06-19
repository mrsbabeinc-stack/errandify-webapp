-- Add session-level tracking to errand_assignments
-- This allows doers to accept/decline specific sessions of recurring errands

ALTER TABLE errand_assignments
ADD COLUMN session_id INTEGER REFERENCES errand_sessions(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_assignments_session_id ON errand_assignments(session_id);
CREATE INDEX idx_assignments_errand_session ON errand_assignments(errand_id, session_id);

-- Add columns to track partial recurring errand acceptance
ALTER TABLE errand_assignments
ADD COLUMN is_partial_recurring BOOLEAN DEFAULT FALSE;

-- Add index for filtering recurring errands
CREATE INDEX idx_assignments_partial_recurring ON errand_assignments(is_partial_recurring);
