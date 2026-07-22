-- Add full_address column to errands table if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'errands' AND column_name = 'full_address'
  ) THEN
    ALTER TABLE errands ADD COLUMN full_address VARCHAR(500);
  END IF;
END $$;
