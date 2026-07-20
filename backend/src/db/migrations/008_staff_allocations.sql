-- Staff Allocation & Audit Tables
-- Tracks errand allocations to staff with vulnerability enforcement

CREATE TABLE IF NOT EXISTS errand_staff_allocations (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL,
  staff_user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  allocated_by_user_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'allocated', -- 'allocated', 'in_progress', 'completed', 'cancelled'
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT fk_errand FOREIGN KEY (errand_id) REFERENCES errands(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_user FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_allocated_by FOREIGN KEY (allocated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(errand_id, staff_user_id)
);

-- Audit trail for all allocation changes (for MOM compliance)
CREATE TABLE IF NOT EXISTS allocation_audit_log (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL,
  staff_user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  allocated_by_user_id INTEGER,
  action VARCHAR(50), -- 'allocated', 'unallocated', 'started', 'completed', 'rejected'
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_errand FOREIGN KEY (errand_id) REFERENCES errands(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_user FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_allocated_by FOREIGN KEY (allocated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_allocations_errand ON errand_staff_allocations(errand_id);
CREATE INDEX IF NOT EXISTS idx_allocations_staff ON errand_staff_allocations(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_company ON errand_staff_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON errand_staff_allocations(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_errand ON allocation_audit_log(errand_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_staff ON allocation_audit_log(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON allocation_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON allocation_audit_log(created_at);

-- Create view for compliance reporting
CREATE OR REPLACE VIEW allocation_compliance_view AS
SELECT
  esa.errand_id,
  esa.staff_user_id,
  u.display_name as staff_name,
  u.vulnerability_type,
  u.is_vulnerable_person,
  c.name as company_name,
  esa.allocated_at,
  esa.completed_at,
  e.title as errand_title,
  e.description,
  aal.action,
  aal.details
FROM errand_staff_allocations esa
JOIN users u ON esa.staff_user_id = u.id
JOIN companies c ON esa.company_id = c.id
JOIN errands e ON esa.errand_id = e.id
LEFT JOIN allocation_audit_log aal ON esa.id = aal.errand_id
WHERE u.is_vulnerable_person = true
ORDER BY esa.allocated_at DESC;
