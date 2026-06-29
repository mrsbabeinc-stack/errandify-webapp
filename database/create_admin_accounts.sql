-- Create admin and support accounts for testing
-- These are test accounts with dummy NRIC hashes

-- Admin Account
INSERT INTO users (
  nric_hash,
  display_name,
  mobile,
  email,
  role,
  kyc_status,
  font_size_pref,
  language_pref,
  created_at
) VALUES (
  'admin_test_hash_9999999999999999999999999999999999999999',
  'Admin User',
  '+6581234567',
  'admin@errandify.test',
  'admin',
  'verified',
  16,
  'en',
  CURRENT_TIMESTAMP
) ON CONFLICT (nric_hash) DO NOTHING;

-- Support L2 Agent Account
INSERT INTO users (
  nric_hash,
  display_name,
  mobile,
  email,
  role,
  kyc_status,
  font_size_pref,
  language_pref,
  created_at
) VALUES (
  'support_l2_test_hash_88888888888888888888888888888888888888',
  'Support L2 Agent',
  '+6582234567',
  'support-l2@errandify.test',
  'support_l2',
  'verified',
  16,
  'en',
  CURRENT_TIMESTAMP
) ON CONFLICT (nric_hash) DO NOTHING;

-- Support L3 Senior Account
INSERT INTO users (
  nric_hash,
  display_name,
  mobile,
  email,
  role,
  kyc_status,
  font_size_pref,
  language_pref,
  created_at
) VALUES (
  'support_l3_test_hash_77777777777777777777777777777777777777',
  'Support L3 Senior',
  '+6583234567',
  'support-l3@errandify.test',
  'support_l3',
  'verified',
  16,
  'en',
  CURRENT_TIMESTAMP
) ON CONFLICT (nric_hash) DO NOTHING;

-- Show created accounts
SELECT id, display_name, email, role, created_at
FROM users
WHERE role IN ('admin', 'support_l2', 'support_l3')
ORDER BY id DESC LIMIT 10;
