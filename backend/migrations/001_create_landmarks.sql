-- Create landmarks table for fast postal code lookup
CREATE TABLE IF NOT EXISTS landmarks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  postal_code CHAR(6) NOT NULL,
  address TEXT,
  category VARCHAR(50),
  alternate_names TEXT[] DEFAULT '{}',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_landmarks_name ON landmarks(name);
CREATE INDEX IF NOT EXISTS idx_landmarks_postal ON landmarks(postal_code);
CREATE INDEX IF NOT EXISTS idx_landmarks_category ON landmarks(category);

-- Add comments
COMMENT ON TABLE landmarks IS 'Singapore landmarks, schools, POIs with postal codes for fast address resolution';
COMMENT ON COLUMN landmarks.alternate_names IS 'Array of alternate names (e.g., "nan hua", "nanhua primary" for "Nan Hua Primary School")';
