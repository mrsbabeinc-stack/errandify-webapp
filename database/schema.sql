-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nric_hash VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  dob DATE,
  address TEXT,
  profile_image_url VARCHAR(500),
  singpass_id VARCHAR(255) UNIQUE,
  font_size_pref INTEGER DEFAULT 16,
  language_pref VARCHAR(5) DEFAULT 'en',
  role VARCHAR(50) NOT NULL DEFAULT 'asker' CHECK (role IN ('asker', 'doer')),
  kyc_status VARCHAR(50) DEFAULT 'verified' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  referral_code VARCHAR(20) UNIQUE,
  category_preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Errands table
CREATE TABLE errands (
  id SERIAL PRIMARY KEY,
  asker_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  budget DECIMAL(10, 2),
  deadline TIMESTAMP,
  location VARCHAR(500),
  postal_code VARCHAR(6),
  certifications JSONB,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Errand Sessions table (for recurring errands)
CREATE TABLE errand_sessions (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  start_date TIMESTAMP NOT NULL,
  deadline TIMESTAMP,
  budget DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Errand Assignments table
CREATE TABLE errand_assignments (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL REFERENCES errands(id),
  doer_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'declined', 'completed', 'cancelled')),
  completed_at TIMESTAMP,
  rating_score DECIMAL(3, 2),
  rating_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  participant_ids INTEGER[] NOT NULL,
  errand_id INTEGER REFERENCES errands(id),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages table
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT,
  audio_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_nric_hash ON users(nric_hash);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_errands_asker_id ON errands(asker_id);
CREATE INDEX idx_errands_status ON errands(status);
CREATE INDEX idx_errands_is_recurring ON errands(is_recurring);
CREATE INDEX idx_sessions_errand_id ON errand_sessions(errand_id);
CREATE INDEX idx_sessions_status ON errand_sessions(status);
CREATE INDEX idx_assignments_errand_id ON errand_assignments(errand_id);
CREATE INDEX idx_assignments_doer_id ON errand_assignments(doer_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
