-- Migration: Add formatted IDs for errands, bids, and users tables
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

-- Add formatted_user_id column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'formatted_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN formatted_user_id VARCHAR(20) UNIQUE;

    -- Backfill formatted_user_id using format: SG + 3 random hex chars + - + 4 random hex chars
    -- Format: SG364-073E where 364 is random, 073E is random
    UPDATE users
    SET formatted_user_id = 'SG' ||
                            UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 1, 3)) || '-' ||
                            UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 4, 4))
    WHERE formatted_user_id IS NULL;
  END IF;
END
$$;
