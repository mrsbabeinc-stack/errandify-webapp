-- ============================================================================
-- ERRANDIFY DATABASE SCHEMA
-- Production-Ready for Alibaba Cloud (RDS + OSS)
-- ============================================================================

-- ============================================================================
-- 1. LEAVE MANAGEMENT SCHEMA
-- ============================================================================

-- Staff leave applications (core)
CREATE TABLE IF NOT EXISTS leave_applications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'Unique identifier',
  staff_id BIGINT NOT NULL COMMENT 'Reference to staff member',
  company_id BIGINT NOT NULL COMMENT 'Reference to company',
  start_date DATE NOT NULL COMMENT 'Leave start date',
  end_date DATE NOT NULL COMMENT 'Leave end date',
  period_type ENUM('full-day', 'morning', 'afternoon') DEFAULT 'full-day' COMMENT 'Type of leave period',
  reason VARCHAR(255) NOT NULL COMMENT 'Reason for leave',
  notes TEXT COMMENT 'Additional notes from staff',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'Application status',
  is_recurring BOOLEAN DEFAULT FALSE COMMENT 'Is this a recurring pattern',
  recurrence_pattern VARCHAR(100) COMMENT 'Pattern: weekly, bi-weekly, monthly, custom',
  recurrence_end_date DATE COMMENT 'When recurring pattern ends',
  max_occurrences INT COMMENT 'Max number of occurrences for recurring',
  occurrences_created INT DEFAULT 0 COMMENT 'Actual occurrences created',
  parent_application_id BIGINT COMMENT 'If recurring, link to parent application',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last updated timestamp',
  created_by BIGINT COMMENT 'User who created',

  INDEX idx_staff_id (staff_id),
  INDEX idx_company_id (company_id),
  INDEX idx_status (status),
  INDEX idx_date_range (start_date, end_date),
  INDEX idx_created_at (created_at),
  INDEX idx_parent_id (parent_application_id),
  CONSTRAINT fk_leave_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Staff leave applications with recurring support';

-- Approval history (audit trail)
CREATE TABLE IF NOT EXISTS leave_approval_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  application_id BIGINT NOT NULL,
  approved_by BIGINT NOT NULL COMMENT 'Manager/Owner who approved',
  action ENUM('pending', 'approved', 'rejected', 'overridden') COMMENT 'Action taken',
  reason TEXT COMMENT 'Reason for approval/rejection/override',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_application_id (application_id),
  INDEX idx_approved_by (approved_by),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_history_app FOREIGN KEY (application_id) REFERENCES leave_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for leave approvals';

-- Conflict detection log
CREATE TABLE IF NOT EXISTS leave_conflicts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  application_id BIGINT NOT NULL,
  conflicting_application_id BIGINT NOT NULL,
  conflict_type ENUM('same-staff', 'team-coverage', 'deadline') COMMENT 'Type of conflict',
  severity ENUM('warning', 'critical') DEFAULT 'warning',
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_application (application_id),
  INDEX idx_conflict (conflicting_application_id),
  INDEX idx_severity (severity),
  CONSTRAINT fk_conflict_app1 FOREIGN KEY (application_id) REFERENCES leave_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_conflict_app2 FOREIGN KEY (conflicting_application_id) REFERENCES leave_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Conflict detection and tracking';

-- Company operating hours
CREATE TABLE IF NOT EXISTS company_operating_hours (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  day_of_week INT COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
  is_active BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_company_day (company_id, day_of_week),
  INDEX idx_company_id (company_id),
  CONSTRAINT fk_hours_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Company operating hours configuration';

-- Special dates (holidays, D&D, team building)
CREATE TABLE IF NOT EXISTS special_dates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  date_type ENUM('custom', 'holiday', 'public_holiday') COMMENT 'Type of special date',
  is_blocked BOOLEAN DEFAULT FALSE COMMENT 'Should block staff on this date',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_company_id (company_id),
  INDEX idx_date (date),
  INDEX idx_date_type (date_type),
  UNIQUE KEY uq_company_date (company_id, date),
  CONSTRAINT fk_special_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Special dates and holidays';

-- ============================================================================
-- 2. PENALTY MANAGEMENT SCHEMA (Reference System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS penalties (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT 'Staff member penalized',
  company_id BIGINT NOT NULL COMMENT 'Company context',
  penalty_type ENUM('warning', 'suspension', 'ban') COMMENT 'Severity level',
  reason VARCHAR(500) NOT NULL COMMENT 'Reason for penalty',
  description TEXT COMMENT 'Detailed explanation',
  issued_by BIGINT NOT NULL COMMENT 'Admin/Manager who issued',
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL COMMENT 'When penalty expires',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Is penalty currently active',
  appeal_allowed BOOLEAN DEFAULT TRUE COMMENT 'Can user appeal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_company_id (company_id),
  INDEX idx_penalty_type (penalty_type),
  INDEX idx_is_active (is_active),
  INDEX idx_expires_at (expires_at),
  CONSTRAINT fk_penalty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_penalty_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_penalty_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User penalties and enforcement';

-- Penalty appeals
CREATE TABLE IF NOT EXISTS penalty_appeals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  penalty_id BIGINT NOT NULL,
  appealed_by BIGINT NOT NULL COMMENT 'User appealing (usually the penalized user)',
  appeal_reason TEXT NOT NULL COMMENT 'Why they appeal',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  decided_by BIGINT COMMENT 'Who reviewed appeal',
  decision_reason TEXT,
  decided_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_penalty_id (penalty_id),
  INDEX idx_appealed_by (appealed_by),
  INDEX idx_status (status),
  CONSTRAINT fk_appeal_penalty FOREIGN KEY (penalty_id) REFERENCES penalties(id) ON DELETE CASCADE,
  CONSTRAINT fk_appeal_user FOREIGN KEY (appealed_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_appeal_decided FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Appeals for penalties';

-- ============================================================================
-- 3. DISPUTE MANAGEMENT SCHEMA (Reference System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  errand_id BIGINT NOT NULL COMMENT 'Related errand',
  reporter_id BIGINT NOT NULL COMMENT 'Who reported dispute',
  respondent_id BIGINT NOT NULL COMMENT 'Other party',
  dispute_type ENUM('quality', 'payment', 'safety', 'conduct', 'other') COMMENT 'Type of dispute',
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'under-review', 'resolved', 'appealed', 'closed') DEFAULT 'open',
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  reviewed_by BIGINT COMMENT 'Admin who reviewed',
  resolution TEXT COMMENT 'How it was resolved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,

  INDEX idx_errand_id (errand_id),
  INDEX idx_reporter_id (reporter_id),
  INDEX idx_status (status),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_dispute_errand FOREIGN KEY (errand_id) REFERENCES errands(id) ON DELETE CASCADE,
  CONSTRAINT fk_dispute_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dispute_respondent FOREIGN KEY (respondent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dispute_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dispute management and resolution';

-- Dispute evidence (photos, messages, documents)
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dispute_id BIGINT NOT NULL,
  evidence_type ENUM('photo', 'message', 'document', 'other') COMMENT 'Type of evidence',
  file_path VARCHAR(500) COMMENT 'OSS path to file',
  description TEXT,
  submitted_by BIGINT NOT NULL COMMENT 'Who submitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_dispute_id (dispute_id),
  INDEX idx_submitted_by (submitted_by),
  CONSTRAINT fk_evidence_dispute FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
  CONSTRAINT fk_evidence_user FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Evidence attachments for disputes';

-- ============================================================================
-- 4. POINT EARNING RULES SCHEMA (Reference System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS point_earning_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_name VARCHAR(255) NOT NULL,
  rule_type ENUM('signup', 'task-complete', 'rating', 'referral', 'custom') COMMENT 'Type of earning rule',
  description TEXT,
  points_awarded INT NOT NULL COMMENT 'Points given',
  trigger_event VARCHAR(255) NOT NULL COMMENT 'What triggers this rule',
  conditions JSON COMMENT 'Additional conditions (stored as JSON)',
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0 COMMENT 'Higher priority runs first',
  version INT DEFAULT 1 COMMENT 'Rule version for tracking',
  max_daily_uses INT COMMENT 'Max times per day',
  max_monthly_uses INT COMMENT 'Max times per month',
  expires_at TIMESTAMP NULL COMMENT 'When rule expires',
  created_by BIGINT COMMENT 'Admin who created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_rule_type (rule_type),
  INDEX idx_is_active (is_active),
  INDEX idx_priority (priority),
  CONSTRAINT fk_rule_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Point earning rules configuration';

-- Point earning history (audit)
CREATE TABLE IF NOT EXISTS point_earnings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  rule_id BIGINT NOT NULL COMMENT 'Which rule triggered',
  points_earned INT NOT NULL,
  reference_id BIGINT COMMENT 'Related errand/task ID',
  reference_type VARCHAR(100) COMMENT 'Type of reference (errand, referral, etc)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_rule_id (rule_id),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_earning_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_earning_rule FOREIGN KEY (rule_id) REFERENCES point_earning_rules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Point earning transactions';

-- ============================================================================
-- 5. ADVERTISING MANAGEMENT SCHEMA (Reference System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS advertising_campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL COMMENT 'Company running ad',
  campaign_name VARCHAR(500) NOT NULL,
  description TEXT,
  campaign_type ENUM('promotion', 'recruitment', 'awareness', 'event') COMMENT 'Type of campaign',
  status ENUM('draft', 'pending-approval', 'approved', 'active', 'paused', 'ended') DEFAULT 'draft',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  budget DECIMAL(10, 2) COMMENT 'Total budget allocated',
  spent DECIMAL(10, 2) DEFAULT 0 COMMENT 'Amount spent so far',
  placements JSON COMMENT 'Ad placement locations (homepage, search, etc)',
  targeting JSON COMMENT 'Target audience settings',
  approved_by BIGINT COMMENT 'Admin who approved',
  approval_date TIMESTAMP NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_company_id (company_id),
  INDEX idx_status (status),
  INDEX idx_date_range (start_date, end_date),
  CONSTRAINT fk_campaign_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaign_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_campaign_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Advertising campaigns';

-- Ad performance tracking
CREATE TABLE IF NOT EXISTS ad_performance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT NOT NULL,
  date DATE NOT NULL COMMENT 'Performance date',
  impressions INT DEFAULT 0 COMMENT 'Number of times shown',
  clicks INT DEFAULT 0 COMMENT 'Number of clicks',
  conversions INT DEFAULT 0 COMMENT 'Number of conversions',
  spend DECIMAL(10, 2) DEFAULT 0,
  ctr DECIMAL(5, 2) COMMENT 'Click-through rate %',
  cpc DECIMAL(10, 2) COMMENT 'Cost per click',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_campaign_date (campaign_id, date),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_date (date),
  CONSTRAINT fk_perf_campaign FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ad performance metrics';

-- ============================================================================
-- 6. AUDIT & LOGGING SCHEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT COMMENT 'User who performed action',
  action_type VARCHAR(100) NOT NULL COMMENT 'Type of action (create, update, delete, approve, etc)',
  entity_type VARCHAR(100) NOT NULL COMMENT 'What was acted on (leave, penalty, dispute, etc)',
  entity_id BIGINT NOT NULL COMMENT 'ID of entity',
  old_values JSON COMMENT 'Previous values',
  new_values JSON COMMENT 'New values',
  ip_address VARCHAR(45) COMMENT 'IPv4 or IPv6',
  user_agent VARCHAR(500),
  status ENUM('success', 'failure') DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for all admin actions';

-- ============================================================================
-- 7. NOTIFICATIONS SCHEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT 'Recipient',
  notification_type ENUM('leave-approved', 'leave-rejected', 'penalty-issued', 'dispute-resolved', 'campaign-approved') COMMENT 'Type of notification',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_entity_id BIGINT COMMENT 'Related record (leave app, penalty, etc)',
  related_entity_type VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notifications';

-- ============================================================================
-- INDEXES FOR PERFORMANCE (Alibaba Cloud RDS Best Practices)
-- ============================================================================

-- Covering indexes for common queries
CREATE INDEX idx_leave_staff_status_date ON leave_applications(staff_id, status, start_date);
CREATE INDEX idx_leave_company_date_range ON leave_applications(company_id, start_date, end_date);
CREATE INDEX idx_penalty_user_active_expires ON penalties(user_id, is_active, expires_at);
CREATE INDEX idx_dispute_status_created ON disputes(status, created_at);
CREATE INDEX idx_points_user_date ON point_earnings(user_id, created_at);
CREATE INDEX idx_campaign_status_dates ON advertising_campaigns(status, start_date, end_date);

-- ============================================================================
-- PARTITION STRATEGY (for large tables at scale)
-- ============================================================================
-- These can be enabled when table grows beyond 10M rows

-- ALTER TABLE leave_applications PARTITION BY RANGE (YEAR(created_at)) (
--   PARTITION p2024 VALUES LESS THAN (2025),
--   PARTITION p2025 VALUES LESS THAN (2026),
--   PARTITION p2026 VALUES LESS THAN (2027),
--   PARTITION pmax VALUES LESS THAN MAXVALUE
-- );

-- ALTER TABLE audit_logs PARTITION BY RANGE (YEAR(created_at)) (
--   PARTITION p2024 VALUES LESS THAN (2025),
--   PARTITION p2025 VALUES LESS THAN (2026),
--   PARTITION p2026 VALUES LESS THAN (2027),
--   PARTITION pmax VALUES LESS THAN MAXVALUE
-- );
