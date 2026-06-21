-- Create news tables for MyKampung news system
-- Migration: create_news_tables
-- Date: 2026-06-21

-- Community News Table (hyperlocal neighborhood content)
CREATE TABLE IF NOT EXISTS community_news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100), -- announcement, event, alert, business, spotlight, lost_found
  image VARCHAR(2048),
  location VARCHAR(255),
  postal_code VARCHAR(20),
  posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'published', -- published, draft, archived
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Singapore News Table (national announcements & city-wide initiatives)
CREATE TABLE IF NOT EXISTS singapore_news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100), -- policy, housing, jobs, transport, healthcare, education
  source VARCHAR(255), -- HDB, LTA, NEA, etc.
  image VARCHAR(2048),
  external_url VARCHAR(2048),
  status VARCHAR(50) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Errandify News Table (platform updates, features, campaigns)
CREATE TABLE IF NOT EXISTS errandify_news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100), -- feature, bug_fix, campaign, spotlight, announcement, maintenance
  image VARCHAR(2048),
  source VARCHAR(255) DEFAULT 'Errandify Team',
  status VARCHAR(50) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Community News Comments
CREATE TABLE IF NOT EXISTS community_news_comments (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES community_news(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Community News Likes
CREATE TABLE IF NOT EXISTS community_news_likes (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES community_news(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(news_id, user_id)
);

-- Errandify News Likes
CREATE TABLE IF NOT EXISTS errandify_news_likes (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES errandify_news(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(news_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_community_news_status ON community_news(status);
CREATE INDEX idx_community_news_postal_code ON community_news(postal_code);
CREATE INDEX idx_community_news_created_at ON community_news(created_at DESC);
CREATE INDEX idx_errandify_news_status ON errandify_news(status);
CREATE INDEX idx_errandify_news_created_at ON errandify_news(created_at DESC);
CREATE INDEX idx_singapore_news_created_at ON singapore_news(created_at DESC);

-- Add comment describing tables
COMMENT ON TABLE community_news IS 'Hyperlocal neighborhood news: events, alerts, spotlights, lost & found';
COMMENT ON TABLE singapore_news IS 'Singapore-wide news: policy, housing, jobs, transport from official sources';
COMMENT ON TABLE errandify_news IS 'Platform updates: features, campaigns, spotlights, announcements';
COMMENT ON COLUMN community_news.postal_code IS 'Singapore postal code for geofencing community relevance';
COMMENT ON COLUMN errandify_news.category IS 'Type: feature, campaign, spotlight, announcement, maintenance, bug_fix';
