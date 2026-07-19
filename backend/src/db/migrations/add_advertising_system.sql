-- Advertising System Schema
-- Complete campaign management with Stripe integration

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  budget DECIMAL(10, 2) NOT NULL,
  spent DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected, live, expired
  placement_types TEXT[], -- array of placement types
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER,
  stripe_charge_id VARCHAR(255),
  admin_notes TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Ad Placements table (tracks where ads appear)
CREATE TABLE IF NOT EXISTS ad_placements (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  placement_type VARCHAR(100) NOT NULL, -- homepage_banner, browse_sidebar, email_newsletter, company_profile
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Campaign Performance table (daily tracking)
CREATE TABLE IF NOT EXISTS campaign_performance (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  performance_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10, 2) DEFAULT 0,
  ctr DECIMAL(5, 2) DEFAULT 0, -- click-through rate
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, performance_date)
);

-- Ad Schedule table (for background job processing)
CREATE TABLE IF NOT EXISTS ad_schedules (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  action VARCHAR(50) NOT NULL, -- start, end, reminder
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX IF NOT EXISTS idx_ad_placements_campaign_id ON ad_placements(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign_id ON campaign_performance(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_date ON campaign_performance(performance_date);
CREATE INDEX IF NOT EXISTS idx_ad_schedules_campaign_id ON ad_schedules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_schedules_scheduled_date ON ad_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ad_schedules_executed_at ON ad_schedules(executed_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_stripe_charge_id ON campaigns(stripe_charge_id);
