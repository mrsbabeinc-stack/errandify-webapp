-- Advertising System Tables

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  budget DECIMAL(10, 2) NOT NULL,
  spent DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'live', 'expired', 'paused')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  duration_days INTEGER,
  admin_notes TEXT,
  rejection_reason TEXT,
  created_by INTEGER REFERENCES users(id),
  stripe_charge_id VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_starts_at ON campaigns(starts_at);
CREATE INDEX idx_campaigns_ends_at ON campaigns(ends_at);

-- Ad Placements table
CREATE TABLE IF NOT EXISTS ad_placements (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  placement_type VARCHAR(100) NOT NULL CHECK (placement_type IN ('homepage_banner', 'browse_sidebar', 'email_newsletter', 'company_profile')),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_placements_campaign_id ON ad_placements(campaign_id);
CREATE INDEX idx_ad_placements_type ON ad_placements(placement_type);

-- Campaign Performance table
CREATE TABLE IF NOT EXISTS campaign_performance (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10, 2) DEFAULT 0,
  ctr DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, date)
);

CREATE INDEX idx_campaign_performance_campaign_id ON campaign_performance(campaign_id);
CREATE INDEX idx_campaign_performance_date ON campaign_performance(date);

-- Ad Schedules table
CREATE TABLE IF NOT EXISTS ad_schedules (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('start', 'end')),
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_schedules_campaign_id ON ad_schedules(campaign_id);
CREATE INDEX idx_ad_schedules_scheduled_date ON ad_schedules(scheduled_date);
CREATE INDEX idx_ad_schedules_action ON ad_schedules(action);
CREATE INDEX idx_ad_schedules_executed_at ON ad_schedules(executed_at);
