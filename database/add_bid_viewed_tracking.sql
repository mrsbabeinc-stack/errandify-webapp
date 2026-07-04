-- Add bid view tracking
-- Tracks when asker views each offer/bid

ALTER TABLE bids ADD COLUMN viewed_at TIMESTAMP NULL;
ALTER TABLE bids ADD COLUMN viewed_by_asker BOOLEAN DEFAULT FALSE;

-- Index for quick lookup of unviewed bids per errand
CREATE INDEX idx_bids_unviewed_per_errand
ON bids(errand_id)
WHERE viewed_at IS NULL;

-- Index for finding all unviewed bids by an asker through their errands
CREATE INDEX idx_bids_viewed_status
ON bids(errand_id, viewed_at);

-- Add comment
COMMENT ON COLUMN bids.viewed_at IS 'Timestamp when asker first viewed this offer';
COMMENT ON COLUMN bids.viewed_by_asker IS 'Flag indicating asker has viewed this offer';
