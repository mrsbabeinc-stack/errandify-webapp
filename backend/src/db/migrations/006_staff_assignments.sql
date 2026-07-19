-- Staff Assignments & Invitations Tables
-- Tracks company staff relationships and invitations

-- Company Staff Assignments (who works for which company)
CREATE TABLE IF NOT EXISTS company_staff_assignments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role VARCHAR(50) DEFAULT 'staff', -- staff, manager, supervisor
  status VARCHAR(20) DEFAULT 'active', -- active, removed, suspended
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP,
  notes TEXT,

  -- Foreign keys
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Unique constraint: one assignment per user per company (allows reactivation)
  UNIQUE(company_id, user_id) WHERE status = 'active'
);

-- Staff Invitations (pending invites)
CREATE TABLE IF NOT EXISTS staff_invitations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  user_id INTEGER,
  email VARCHAR(255) NOT NULL,
  invite_code VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
  invited_by_user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),

  -- Foreign keys
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_company_staff_company_id ON company_staff_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_company_staff_user_id ON company_staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_company_staff_status ON company_staff_assignments(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_company ON staff_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_user ON staff_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_code ON staff_invitations(invite_code);
