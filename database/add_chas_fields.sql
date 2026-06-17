-- Migration: Add CHAS Card Support to Users Table
-- Date: 2026-06-18
-- Purpose: Enable CHAS (Community Health Assist Scheme) card verification
-- Description: Adds fields to track CHAS card color, verification status, and metadata

-- Add CHAS columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS chas_card_color VARCHAR(10) DEFAULT 'none' CHECK (chas_card_color IN ('blue', 'green', 'none'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS chas_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chas_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chas_verification_method VARCHAR(50) DEFAULT 'manual' CHECK (chas_verification_method IN ('manual', 'moh_api', 'singpass'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS chas_expiry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chas_subsidy_percentage INTEGER;

-- Create index for CHAS status lookups
CREATE INDEX IF NOT EXISTS idx_users_chas_verified ON users(chas_verified);
CREATE INDEX IF NOT EXISTS idx_users_chas_card_color ON users(chas_card_color);

-- Add audit table for CHAS verification changes
CREATE TABLE IF NOT EXISTS chas_verification_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_status VARCHAR(10),
  new_status VARCHAR(10),
  verification_method VARCHAR(50),
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  admin_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit lookups
CREATE INDEX IF NOT EXISTS idx_chas_audit_user_id ON chas_verification_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_chas_audit_created_at ON chas_verification_audit(created_at);

-- Add triggers to log CHAS changes
CREATE OR REPLACE FUNCTION log_chas_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chas_card_color != OLD.chas_card_color OR NEW.chas_verified != OLD.chas_verified THEN
    INSERT INTO chas_verification_audit (user_id, old_status, new_status, verification_method, notes)
    VALUES (
      NEW.id,
      OLD.chas_card_color,
      NEW.chas_card_color,
      NEW.chas_verification_method,
      'CHAS status changed from ' || OLD.chas_card_color || ' to ' || NEW.chas_card_color
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for CHAS changes
DROP TRIGGER IF EXISTS chas_change_trigger ON users;
CREATE TRIGGER chas_change_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_chas_change();

-- Grant appropriate permissions (adjust to your user/role)
-- GRANT SELECT, INSERT, UPDATE ON chas_verification_audit TO app_user;
-- GRANT USAGE ON SEQUENCE chas_verification_audit_id_seq TO app_user;

-- Verify migration completed
SELECT COUNT(*) as total_users,
       COUNT(CASE WHEN chas_verified = true THEN 1 END) as chas_verified_users,
       COUNT(CASE WHEN chas_card_color = 'blue' THEN 1 END) as blue_cards,
       COUNT(CASE WHEN chas_card_color = 'green' THEN 1 END) as green_cards
FROM users;
