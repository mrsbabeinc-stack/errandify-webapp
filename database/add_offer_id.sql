-- Add offer_id column to bids table
ALTER TABLE bids ADD COLUMN IF NOT EXISTS offer_id VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bids_offer_id ON bids(offer_id);
