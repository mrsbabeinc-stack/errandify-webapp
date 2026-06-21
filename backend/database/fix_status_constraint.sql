-- Fix: Update status constraint to include 'confirmed' status
-- When a bid is accepted, status should change to 'confirmed' instead of 'open'

-- Remove old constraint
ALTER TABLE errands DROP CONSTRAINT errands_status_check;

-- Add new constraint with 'confirmed' status
ALTER TABLE errands ADD CONSTRAINT errands_status_check
CHECK (status IN ('open', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- Backfill: Set 'confirmed' status for errands with accepted bids
UPDATE errands
SET status = 'confirmed'
WHERE id IN (SELECT errand_id FROM bids WHERE status = 'accepted');
