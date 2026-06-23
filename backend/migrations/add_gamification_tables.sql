-- User gamification stats
CREATE TABLE IF NOT EXISTS user_gamification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  total_ep INTEGER DEFAULT 0,
  current_month_ep INTEGER DEFAULT 0,
  tier VARCHAR(20) DEFAULT 'bronze',
  login_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- EP transaction log
CREATE TABLE IF NOT EXISTS ep_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  related_errand_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_errand_id) REFERENCES errands(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_ep_transactions_user_id ON ep_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ep_transactions_created ON ep_transactions(created_at);

-- Initialize gamification for existing users
INSERT INTO user_gamification (user_id, total_ep, current_month_ep, tier)
SELECT id, 0, 0, 'bronze' FROM users
ON CONFLICT (user_id) DO NOTHING;
