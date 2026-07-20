-- Leave Management, Operation Hours, and Approvals System
-- Complete schema for staff scheduling, availability, and request workflows

-- ============================================================================
-- LEAVE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  staff_name VARCHAR(255),
  leave_type VARCHAR(50) NOT NULL, -- 'annual', 'sick', 'personal', 'unpaid', 'maternity'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period VARCHAR(20) DEFAULT 'full-day', -- 'full-day', 'morning', 'afternoon'
  reason VARCHAR(255),
  notes TEXT,
  days_count DECIMAL(4, 1), -- 1.0 for full day, 0.5 for half day
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB, -- { type: 'weekly'/'monthly', daysOfWeek: [1,3,5], effectiveFrom: date, effectiveUntil: date }
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  approved_by INTEGER, -- user_id of approver
  approval_notes TEXT,
  rejected_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Leave entitlements (annual, sick days per year)
CREATE TABLE IF NOT EXISTS leave_entitlements (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  leave_type VARCHAR(50) NOT NULL, -- 'annual', 'sick', 'personal'
  entitlement_days DECIMAL(5, 1), -- e.g., 14 days/year
  year INTEGER, -- e.g., 2026
  used_days DECIMAL(5, 1) DEFAULT 0,
  remaining_days DECIMAL(5, 1),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(company_id, staff_id, leave_type, year)
);

-- ============================================================================
-- OPERATION HOURS
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_operation_hours (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL UNIQUE,
  monday_open TIME,
  monday_close TIME,
  monday_active BOOLEAN DEFAULT true,
  tuesday_open TIME,
  tuesday_close TIME,
  tuesday_active BOOLEAN DEFAULT true,
  wednesday_open TIME,
  wednesday_close TIME,
  wednesday_active BOOLEAN DEFAULT true,
  thursday_open TIME,
  thursday_close TIME,
  thursday_active BOOLEAN DEFAULT true,
  friday_open TIME,
  friday_close TIME,
  friday_active BOOLEAN DEFAULT true,
  saturday_open TIME,
  saturday_close TIME,
  saturday_active BOOLEAN DEFAULT false,
  sunday_open TIME,
  sunday_close TIME,
  sunday_active BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'Asia/Singapore',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Staff availability overrides (beyond leave)
CREATE TABLE IF NOT EXISTS staff_availability (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  availability_date DATE NOT NULL,
  status VARCHAR(20), -- 'available', 'unavailable', 'on_leave', 'sick', 'off'
  reason VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(company_id, staff_id, availability_date)
);

-- ============================================================================
-- APPROVAL WORKFLOWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_requests (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  request_number VARCHAR(50) UNIQUE, -- APR-2026-001
  module VARCHAR(50) NOT NULL, -- 'expense', 'payroll', 'purchase', 'leave'
  request_type VARCHAR(100), -- 'Travel Claim', 'Bonus', 'Equipment Purchase'
  requester_id INTEGER NOT NULL,
  requester_name VARCHAR(255),
  amount DECIMAL(10, 2),
  description TEXT,
  justification TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  current_level INTEGER DEFAULT 1, -- which approval step we're on
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  final_decision_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Approval steps/chain
CREATE TABLE IF NOT EXISTS approval_steps (
  id SERIAL PRIMARY KEY,
  approval_request_id INTEGER NOT NULL,
  step_level INTEGER, -- 1, 2, 3... (order in approval chain)
  approver_role VARCHAR(50), -- 'Manager', 'Finance Head', 'CEO'
  amount_limit DECIMAL(10, 2), -- max amount this role can approve
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approver_id INTEGER, -- who actually approved it
  approver_notes TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_request FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leave_requests_staff ON leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_entitlements_staff ON leave_entitlements(staff_id, year);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff ON staff_availability(staff_id, availability_date);
CREATE INDEX IF NOT EXISTS idx_approval_requests_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_request ON approval_steps(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver ON approval_steps(approver_id);

-- ============================================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================================

-- View: Active leaves for a date range
CREATE OR REPLACE VIEW active_leaves AS
SELECT
  lr.id,
  lr.company_id,
  lr.staff_id,
  lr.staff_name,
  lr.leave_type,
  lr.start_date,
  lr.end_date,
  lr.status,
  lr.period,
  c.name as company_name
FROM leave_requests lr
JOIN companies c ON lr.company_id = c.id
WHERE lr.status = 'approved'
AND lr.start_date <= CURRENT_DATE
AND lr.end_date >= CURRENT_DATE;

-- View: Pending approvals by module
CREATE OR REPLACE VIEW pending_approvals AS
SELECT
  ar.id,
  ar.request_number,
  ar.module,
  ar.request_type,
  ar.requester_name,
  ar.amount,
  ar.current_level,
  ast.approver_role,
  ar.submission_date,
  c.name as company_name
FROM approval_requests ar
LEFT JOIN approval_steps ast ON ar.id = ast.approval_request_id AND ast.step_level = ar.current_level
JOIN companies c ON ar.company_id = c.id
WHERE ar.status = 'pending'
ORDER BY ar.submission_date DESC;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default leave types if not exists
INSERT INTO leave_entitlements (company_id, staff_id, leave_type, entitlement_days, year)
SELECT c.id, u.id, 'annual', 14, EXTRACT(YEAR FROM CURRENT_DATE)
FROM companies c
CROSS JOIN users u
WHERE u.id IN (SELECT user_id FROM company_staff_assignments WHERE status = 'active')
ON CONFLICT DO NOTHING;

-- Set default operation hours (9 AM - 6 PM, Mon-Fri) for new companies
INSERT INTO company_operation_hours (
  company_id,
  monday_open, monday_close, monday_active,
  tuesday_open, tuesday_close, tuesday_active,
  wednesday_open, wednesday_close, wednesday_active,
  thursday_open, thursday_close, thursday_active,
  friday_open, friday_close, friday_active,
  saturday_active, sunday_active
)
SELECT
  id,
  '09:00'::TIME, '18:00'::TIME, true,
  '09:00'::TIME, '18:00'::TIME, true,
  '09:00'::TIME, '18:00'::TIME, true,
  '09:00'::TIME, '18:00'::TIME, true,
  '09:00'::TIME, '18:00'::TIME, true,
  false, false
FROM companies
WHERE id NOT IN (SELECT company_id FROM company_operation_hours)
ON CONFLICT DO NOTHING;
