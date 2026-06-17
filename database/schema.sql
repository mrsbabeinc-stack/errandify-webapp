-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nric_hash VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  dob DATE,
  address TEXT,
  profile_image_url VARCHAR(500),
  avatar_url VARCHAR(500),
  singpass_id VARCHAR(255) UNIQUE,
  font_size_pref INTEGER DEFAULT 16,
  language_pref VARCHAR(5) DEFAULT 'en',
  role VARCHAR(50) NOT NULL DEFAULT 'asker' CHECK (role IN ('asker', 'doer')),
  kyc_status VARCHAR(50) DEFAULT 'verified' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  declaration_status VARCHAR(50) DEFAULT 'pending' CHECK (declaration_status IN ('pending', 'clean', 'flagged')),
  referral_code VARCHAR(20) UNIQUE,
  category_preferences JSONB,
  trust_score DECIMAL(3, 2) DEFAULT 5.0,
  penalty_owed DECIMAL(10, 2) DEFAULT 0,
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
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'confirmed', 'cancelled_by_asker', 'cancelled_by_doer', 'in_progress', 'completed_unconfirmed', 'completed_confirmed')),
  budget DECIMAL(10, 2),
  deadline TIMESTAMP,
  location VARCHAR(500),
  postal_code VARCHAR(6),
  certifications JSONB,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_config JSONB,
  accepted_bid_id INTEGER,
  stripe_payment_intent_id VARCHAR(255),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  payment_release_at TIMESTAMP,
  payment_released_at TIMESTAMP,
  dispute_status VARCHAR(50) CHECK (dispute_status IN ('open', 'resolved', 'settled')),
  dispute_reason TEXT,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_47h_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bids table
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id),
  doer_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  note TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'rejected_resubmitted')),
  resubmit_count INTEGER DEFAULT 0,
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

-- Task execution photos table (for proof of work)
CREATE TABLE task_photos (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id),
  photo_url VARCHAR(500) NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment releases table (audit trail)
CREATE TABLE payment_releases (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id),
  bid_amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  doer_payout DECIMAL(10, 2) NOT NULL,
  stripe_transfer_id VARCHAR(255),
  released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  release_reason VARCHAR(50) CHECK (release_reason IN ('early_confirm', 'auto_release', 'manual_override'))
);

-- Disputes table
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id),
  opened_by INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'settled')),
  resolution TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_nric_hash ON users(nric_hash);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_errands_asker_id ON errands(asker_id);
CREATE INDEX idx_errands_status ON errands(status);
CREATE INDEX idx_errands_is_recurring ON errands(is_recurring);
CREATE INDEX idx_errands_payment_release_at ON errands(payment_release_at);
CREATE INDEX idx_errands_dispute_status ON errands(dispute_status);
CREATE INDEX idx_bids_task_id ON bids(task_id);
CREATE INDEX idx_bids_doer_id ON bids(doer_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_sessions_errand_id ON errand_sessions(errand_id);
CREATE INDEX idx_sessions_status ON errand_sessions(status);
CREATE INDEX idx_assignments_errand_id ON errand_assignments(errand_id);
CREATE INDEX idx_assignments_doer_id ON errand_assignments(doer_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_task_photos_task_id ON task_photos(task_id);
CREATE INDEX idx_payment_releases_task_id ON payment_releases(task_id);
CREATE INDEX idx_disputes_task_id ON disputes(task_id);
CREATE INDEX idx_disputes_status ON disputes(status);
