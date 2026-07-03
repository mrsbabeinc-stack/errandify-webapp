-- Migration: Add formatted_id to errands table and offer_id to bids table
-- This adds human-readable formatted IDs for display purposes

-- Add formatted_id column to errands table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'errands' AND column_name = 'formatted_id'
  ) THEN
    ALTER TABLE errands ADD COLUMN formatted_id VARCHAR(20) UNIQUE;

    -- Backfill formatted_id using format: ER + 2-digit year + random 4-char suffix
    -- Format: ER26XX-XXXX where 26 is year, XXXX is random
    UPDATE errands
    SET formatted_id = 'ER' || TO_CHAR(CURRENT_DATE, 'YY') ||
                       UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 1, 2)) || '-' ||
                       UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 3, 4))
    WHERE formatted_id IS NULL;
  END IF;
END
$$;

-- Add offer_id column to bids table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'offer_id'
  ) THEN
    ALTER TABLE bids ADD COLUMN offer_id VARCHAR(20) UNIQUE;

    -- Backfill offer_id using format: OF + 2-digit year + random 4-char suffix
    -- Format: OF26XX-XXXX where 26 is year, XXXX is random
    UPDATE bids
    SET offer_id = 'OF' || TO_CHAR(CURRENT_DATE, 'YY') ||
                   UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 1, 2)) || '-' ||
                   UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 3, 4))
    WHERE offer_id IS NULL;
  END IF;
END
$$;
