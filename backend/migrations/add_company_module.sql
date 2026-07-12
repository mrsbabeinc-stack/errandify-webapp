-- Company Module Schema
-- Created: 2026-07-11
-- For deployment to Supabase

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  uen VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  postal_code VARCHAR(10),
  area VARCHAR(100),
  subscription_tier VARCHAR(20) DEFAULT 'silver',
  company_status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'employee',
  skills TEXT,
  status VARCHAR(20) DEFAULT 'active',
  hire_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Internal errands (jobs posted to employees)
CREATE TABLE IF NOT EXISTS internal_errands (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(10, 2),
  location TEXT,
  postal_code VARCHAR(10),
  area VARCHAR(100),
  full_address TEXT,
  deadline TIMESTAMP,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee offers on errands
CREATE TABLE IF NOT EXISTS internal_offers (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL REFERENCES internal_errands(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  proposed_amount DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task allocations (manager assigns to employee)
CREATE TABLE IF NOT EXISTS internal_task_allocations (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL REFERENCES internal_errands(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  allocated_amount DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee leave requests
CREATE TABLE IF NOT EXISTS employee_leaves (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(20),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approval_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Company wallet
CREATE TABLE IF NOT EXISTS company_wallets (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id),
  balance DECIMAL(15, 2) DEFAULT 0,
  total_earned DECIMAL(15, 2) DEFAULT 0,
  total_withdrawn DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Company payouts
CREATE TABLE IF NOT EXISTS company_payouts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee EP allocations
CREATE TABLE IF NOT EXISTS employee_ep_allocations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Company referrals
CREATE TABLE IF NOT EXISTS company_referrals (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  referral_code VARCHAR(50) UNIQUE,
  referred_company_id INTEGER REFERENCES companies(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Company events registrations
CREATE TABLE IF NOT EXISTS company_events_registrations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_name VARCHAR(255),
  event_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'registered',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Company ads
CREATE TABLE IF NOT EXISTS company_ads (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  ad_type VARCHAR(50),
  content TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending_approval',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Company subscriptions
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id),
  tier VARCHAR(20) DEFAULT 'silver',
  monthly_fee DECIMAL(10, 2),
  start_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Company notifications
CREATE TABLE IF NOT EXISTS company_notifications (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  notification_type VARCHAR(50),
  message TEXT,
  status VARCHAR(20) DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  notification_type VARCHAR(50),
  channel VARCHAR(20),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_uen ON companies(uen);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_errands_company ON internal_errands(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_offers_errand ON internal_offers(errand_id);
CREATE INDEX IF NOT EXISTS idx_internal_offers_user ON internal_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_errand ON internal_task_allocations(errand_id);
CREATE INDEX IF NOT EXISTS idx_allocations_user ON internal_task_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_company ON employee_leaves(company_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON employee_leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_company ON company_wallets(company_id);

-- Seed demo company owner and company
INSERT INTO users (nric_hash, display_name, email, mobile, user_type, email_verified, phone_verified)
VALUES ('demo_company_owner_hash', 'John Lim', 'john.lim@rumahemas.sg', '+6584234567', 'user', true, true)
ON CONFLICT DO NOTHING;

-- Get the owner ID and insert company
DO $$
DECLARE
  owner_id INTEGER;
BEGIN
  SELECT id INTO owner_id FROM users WHERE email = 'john.lim@rumahemas.sg' LIMIT 1;

  INSERT INTO companies (uen, name, description, owner_id, email, phone, address, postal_code, area, subscription_tier, company_status)
  VALUES (
    'UEN202401001',
    'Rumah Emas Demo Company',
    'Demo company for testing the Errandify company module',
    owner_id,
    'contact@rumahemas.sg',
    '+6565123456',
    '101 Tanjong Pagar Road, Singapore 088518',
    '088518',
    'Tanjong Pagar',
    'silver',
    'active'
  )
  ON CONFLICT DO NOTHING;

  -- Create demo employees
  INSERT INTO users (nric_hash, display_name, email, mobile, user_type, email_verified, phone_verified)
  VALUES
    ('demo_emp1_hash', 'Sarah Wong', 'sarah.wong@rumahemas.sg', '+6587654321', 'user', true, true),
    ('demo_emp2_hash', 'Priya Kumar', 'priya.kumar@rumahemas.sg', '+6581112222', 'user', true, true),
    ('demo_emp3_hash', 'Ahmad Hassan', 'ahmad.hassan@rumahemas.sg', '+6583334444', 'user', true, true)
  ON CONFLICT DO NOTHING;

  -- Tag employees to company
  INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
  SELECT c.id, u.id, 'manager', 'Cleaning, Customer Service, Coordination', 'active', NOW()
  FROM companies c, users u
  WHERE c.uen = 'UEN202401001' AND u.email = 'sarah.wong@rumahemas.sg'
  ON CONFLICT DO NOTHING;

  INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
  SELECT c.id, u.id, 'employee', 'Delivery, Packing, Inventory', 'active', NOW()
  FROM companies c, users u
  WHERE c.uen = 'UEN202401001' AND u.email = 'priya.kumar@rumahemas.sg'
  ON CONFLICT DO NOTHING;

  INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
  SELECT c.id, u.id, 'employee', 'Customer Support, Troubleshooting', 'active', NOW()
  FROM companies c, users u
  WHERE c.uen = 'UEN202401001' AND u.email = 'ahmad.hassan@rumahemas.sg'
  ON CONFLICT DO NOTHING;

  -- Create wallet and subscription
  INSERT INTO company_wallets (company_id, balance, total_earned, total_withdrawn)
  SELECT id, 500.00, 1250.00, 750.00 FROM companies WHERE uen = 'UEN202401001'
  ON CONFLICT DO NOTHING;

  INSERT INTO company_subscriptions (company_id, tier, monthly_fee, status)
  SELECT id, 'silver', 99.00, 'active' FROM companies WHERE uen = 'UEN202401001'
  ON CONFLICT DO NOTHING;
END $$;

-- Verify
SELECT 'Companies created:' as status, COUNT(*) FROM companies;
SELECT 'Employees created:' as status, COUNT(*) FROM employees;
SELECT 'Wallets created:' as status, COUNT(*) FROM company_wallets;
