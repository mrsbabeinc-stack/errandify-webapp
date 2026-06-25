-- Update users with mock SingPass IDs and regenerate formatted IDs
UPDATE users
SET
  singpass_id = 'S' || LPAD(id::TEXT, 7, '0') || SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ', RANDOM() * 26 + 1, 1),
  formatted_user_id = 'SG' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0') || '-' || SUBSTRING('S' || LPAD(id::TEXT, 7, '0') || SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ', RANDOM() * 26 + 1, 1) FROM LENGTH('S' || LPAD(id::TEXT, 7, '0') || SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ', RANDOM() * 26 + 1, 1)) - 3)
WHERE formatted_user_id IS NOT NULL;

-- Verify the update
SELECT id, singpass_id, formatted_user_id FROM users LIMIT 10;
