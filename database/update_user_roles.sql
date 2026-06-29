-- Update users table to support admin roles
-- Add constraint to allow support_l2, support_l3, admin roles in addition to asker/doer

-- First, update the constraint on the role column
ALTER TABLE users DROP CONSTRAINT users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('asker', 'doer', 'support_l2', 'support_l3', 'admin'));

-- Create an admin user for testing (you can modify these values)
-- Note: Make sure to use a real NRIC hash in production
INSERT INTO users (
  nric_hash,
  display_name,
  mobile,
  role,
  kyc_status,
  declaration_status,
  font_size_pref,
  language_pref,
  created_at
) VALUES (
  '9999999999999999999999999999999999999999999999999999999999999999', -- Dummy hash for testing
  'Support Admin',
  '+6512345678',
  'admin',
  'verified',
  'clean',
  16,
  'en',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Create support L2 agent
INSERT INTO users (
  nric_hash,
  display_name,
  mobile,
  role,
  kyc_status,
  declaration_status,
  font_size_pref,
  language_pref,
  created_at
) VALUES (
  '8888888888888888888888888888888888888888888888888888888888888888', -- Dummy hash for testing
  'Support L2 Agent',
  '+6587654321',
  'support_l2',
  'verified',
  'clean',
  16,
  'en',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Create support L3 agent (senior)
INSERT INTO users (
  nric_hash,
  display_name,
  mobile,
  role,
  kyc_status,
  declaration_status,
  font_size_pref,
  language_pref,
  created_at
) VALUES (
  '7777777777777777777777777777777777777777777777777777777777777777', -- Dummy hash for testing
  'Support L3 Senior',
  '+6598765432',
  'support_l3',
  'verified',
  'clean',
  16,
  'en',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Verify the insert worked
SELECT id, display_name, role, created_at FROM users WHERE role IN ('admin', 'support_l2', 'support_l3') ORDER BY id DESC LIMIT 3;
