-- Migration: Add rating reminder tracking columns
-- For tracking if rating reminders have been sent to asker and doer

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'errands' AND column_name = 'doer_rating_reminder_sent'
  ) THEN
    ALTER TABLE errands ADD COLUMN doer_rating_reminder_sent BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'errands' AND column_name = 'asker_rating_reminder_sent'
  ) THEN
    ALTER TABLE errands ADD COLUMN asker_rating_reminder_sent BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;
