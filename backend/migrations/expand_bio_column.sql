-- Expand bio column from VARCHAR(500) to TEXT for longer biographies
ALTER TABLE users
ALTER COLUMN bio TYPE TEXT;
