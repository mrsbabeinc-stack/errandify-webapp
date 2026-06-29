-- Migration: Add Safety & Vulnerable User Protection tables
-- Date: 2026-06-29
-- Description: Tables for trafficking detection, safety flags, vulnerability reports, and resources

-- Safety flags table - stores AI-detected trafficking/exploitation markers
CREATE TABLE IF NOT EXISTS safety_flags (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER REFERENCES errands(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type VARCHAR(50) NOT NULL, -- 'trafficking', 'abuse', 'exploitation', 'other'
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  ai_confidence DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0 confidence score
  description TEXT,
  markers JSONB NOT NULL DEFAULT '[]', -- Array of detected red flag markers
  reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_type VARCHAR(50), -- 'false_alarm', 'escalated_to_police', 'victim_protected'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_safety_flags_user_id ON safety_flags(user_id);
CREATE INDEX idx_safety_flags_errand_id ON safety_flags(errand_id);
CREATE INDEX idx_safety_flags_severity ON safety_flags(severity);
CREATE INDEX idx_safety_flags_reported_at ON safety_flags(reported_at DESC);

-- Vulnerability reports table - anonymous/identified reports from users
CREATE TABLE IF NOT EXISTS vulnerability_reports (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL, -- 'unsafe_job', 'abuse', 'trafficking', 'other'
  description TEXT NOT NULL,
  related_errand_id INTEGER REFERENCES errands(id) ON DELETE SET NULL,
  related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reported_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL if anonymous
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'under_review', 'resolved', 'escalated'
  assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Support staff assigned
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vulnerability_reports_status ON vulnerability_reports(status);
CREATE INDEX idx_vulnerability_reports_severity ON vulnerability_reports(severity);
CREATE INDEX idx_vulnerability_reports_created_at ON vulnerability_reports(created_at DESC);
CREATE INDEX idx_vulnerability_reports_assigned ON vulnerability_reports(assigned_to_user_id);

-- Safety resources table - hotlines, support services, resources
CREATE TABLE IF NOT EXISTS safety_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'trafficking', 'domestic_abuse', 'elderly', 'migrant', 'mental_health'
  phone VARCHAR(20),
  email VARCHAR(255),
  url VARCHAR(512),
  hours VARCHAR(100), -- '24/7', '9am-5pm', etc
  description TEXT,
  region VARCHAR(100), -- 'Singapore', 'International', 'Southeast Asia'
  languages JSONB NOT NULL DEFAULT '["English"]', -- Array of supported languages
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_safety_resources_category ON safety_resources(category);
CREATE INDEX idx_safety_resources_active ON safety_resources(active);

-- Add columns to users table if not already present
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_paused BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;

-- Insert default safety resources for Singapore
INSERT INTO safety_resources (title, category, phone, email, url, hours, description, region, languages, active)
VALUES
  ('Singapore Anti-Trafficking Hotline', 'trafficking', '+65 1800-838-8877', NULL, NULL, '24/7', 'Report trafficking, get emergency support', 'Singapore', '["English", "Mandarin", "Malay", "Tamil"]', true),
  ('Ministry of Social & Family Development', 'trafficking', '+65 6354-5303', NULL, 'https://www.msf.gov.sg/', '9am-5pm', 'Government support for trafficking victims', 'Singapore', '["English"]', true),
  ('HOME Singapore', 'migrant', '+65 6297-9059', 'contact@home.org.sg', 'https://www.home.org.sg/', '24/7', 'Support for migrant workers in distress', 'Singapore', '["English", "Mandarin", "Tagalog", "Burmese", "Bengali"]', true),
  ('Transient Workers Count Too (TWC2)', 'migrant', '+65 6883-6800', NULL, 'https://twc2.org.sg/', 'Business hours', 'Migrant worker advocacy and support', 'Singapore', '["English", "Mandarin", "Tagalog"]', true),
  ('Women''s Crisis Centre', 'domestic_abuse', '+65 6392-7650', NULL, 'https://www.wcc.org.sg/', '10am-6pm', 'Support for abuse survivors', 'Singapore', '["English"]', true),
  ('AWARE Singapore', 'domestic_abuse', '+65 6778-0220', NULL, 'https://www.aware.org.sg/', '10am-6pm', 'Gender equality and women''s rights', 'Singapore', '["English"]', true),
  ('Elders Support Services', 'elderly', '+65 6210-2888', NULL, 'https://www.healthhub.sg/', '8am-6pm', 'Support for elderly citizens', 'Singapore', '["English"]', true),
  ('Institute of Mental Health', 'mental_health', '+65 6389-2222', NULL, 'https://www.imh.com.sg/', '24/7', 'Mental health crisis support', 'Singapore', '["English"]', true),
  ('Singapore Suicide Prevention Hotline', 'mental_health', '+65 1800-221-4444', NULL, NULL, '24/7', 'Suicide prevention and mental health crisis', 'Singapore', '["English"]', true),
  ('YMCA Sexual Harassment Hotline', 'abuse', '+65 6338-3003', NULL, NULL, '24/7', 'Support for sexual harassment survivors', 'Singapore', '["English"]', true)
ON CONFLICT DO NOTHING;
