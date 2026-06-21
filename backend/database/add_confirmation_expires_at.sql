-- Migration: Add confirmation fields for bid acceptance workflow
-- Date: 2026-06-21
-- Purpose: Support 24-hour confirmation deadline after bid acceptance

ALTER TABLE errands
ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS confirmation_extended BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_errands_confirmation_expires_at
ON errands(confirmation_expires_at)
WHERE confirmation_expires_at IS NOT NULL;
