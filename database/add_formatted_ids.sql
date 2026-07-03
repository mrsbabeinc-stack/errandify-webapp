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
  END IF;
END
$$;

-- Backfill formatted_id using proper format with category codes
-- Format: ER[YEAR][CATEGORY_CODE]-[4_RANDOM_CHARS]
-- Example: ER26FD-K9M7 (Food & Beverage in 2026)
DO $$
DECLARE
  v_year VARCHAR(2);
  v_cat_code VARCHAR(2);
  v_suffix VARCHAR(4);
  v_errand RECORD;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YY');

  FOR v_errand IN SELECT id, category FROM errands WHERE formatted_id IS NULL LOOP
    -- Map category to code
    v_cat_code := CASE LOWER(v_errand.category)
      WHEN 'home-maintenance' THEN 'HM'
      WHEN 'cleaning-household' THEN 'CL'
      WHEN 'food-beverage' THEN 'FD'
      WHEN 'furniture-assembly' THEN 'FR'
      WHEN 'shopping-errands' THEN 'SH'
      WHEN 'delivery-moving' THEN 'DV'
      WHEN 'travel-mobility' THEN 'TR'
      WHEN 'event-planning' THEN 'EV'
      WHEN 'childcare-education' THEN 'CH'
      WHEN 'eldercare-healthcare' THEN 'EL'
      WHEN 'pet-care' THEN 'PC'
      WHEN 'personal-care' THEN 'PS'
      WHEN 'tech-support' THEN 'TC'
      WHEN 'creative-arts' THEN 'AR'
      WHEN 'admin-business' THEN 'AD'
      WHEN 'charity-community' THEN 'CC'
      ELSE 'XX'
    END;

    -- Generate random 4-char suffix from alphanumeric
    v_suffix := UPPER(SUBSTRING(MD5(v_errand.id::text || RANDOM()::text), 1, 4));

    -- Update with formatted ID
    UPDATE errands
    SET formatted_id = 'ER' || v_year || v_cat_code || '-' || v_suffix
    WHERE id = v_errand.id;
  END LOOP;
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
  END IF;
END
$$;

-- Backfill offer_id with proper format
-- Format: OF[YEAR][3_HEX]-[4_HEX]
-- Example: OF26A3K-7M9N
DO $$
DECLARE
  v_year VARCHAR(2);
  v_offer_id VARCHAR(20);
  v_bid RECORD;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YY');

  FOR v_bid IN SELECT id FROM bids WHERE offer_id IS NULL LOOP
    v_offer_id := 'OF' || v_year ||
                  UPPER(SUBSTRING(MD5(v_bid.id::text || RANDOM()::text), 1, 3)) || '-' ||
                  UPPER(SUBSTRING(MD5(v_bid.id::text || RANDOM()::text), 4, 4));

    UPDATE bids
    SET offer_id = v_offer_id
    WHERE id = v_bid.id;
  END LOOP;
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
  END IF;
END
$$;

-- Backfill formatted_user_id with proper format
-- Format: SG[3_HEX]-[4_HEX]
-- Example: SG364-073E
DO $$
DECLARE
  v_user_id VARCHAR(20);
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT id FROM users WHERE formatted_user_id IS NULL LOOP
    v_user_id := 'SG' ||
                 UPPER(SUBSTRING(MD5(v_user.id::text || RANDOM()::text), 1, 3)) || '-' ||
                 UPPER(SUBSTRING(MD5(v_user.id::text || RANDOM()::text), 4, 4));

    UPDATE users
    SET formatted_user_id = v_user_id
    WHERE id = v_user.id;
  END LOOP;
END
$$;
