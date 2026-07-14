-- ============================================================================
-- ERRANDIFY LOCAL DATABASE INITIALIZATION
-- Ready for Alibaba Cloud RDS Migration
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS errandify_local
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE errandify_local;

-- ============================================================================
-- CORE TABLES (Existing - ensure they exist)
-- ============================================================================

-- Users table (must exist first)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  role ENUM('asker', 'doer', 'staff', 'admin', 'manager', 'owner') DEFAULT 'doer',
  company_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_company_id (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Companies table (must exist first)
CREATE TABLE IF NOT EXISTS companies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subscription_tier ENUM('silver', 'gold', 'platinum') DEFAULT 'silver',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Errands table
CREATE TABLE IF NOT EXISTS errands (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  asker_id BIGINT NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_asker_id (asker_id),
  INDEX idx_status (status),
  CONSTRAINT fk_errand_asker FOREIGN KEY (asker_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT TO USERS
-- ============================================================================
ALTER TABLE users ADD CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- ============================================================================
-- NOW LOAD THE MAIN SCHEMA (Tables 1-6)
-- ============================================================================

-- Import the full schema
SOURCE /Users/celestia/Claude\ code/260616\ Errandify\ WebApp/backend/database/schema.sql;

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Local Development Only)
-- ============================================================================

-- Insert test company
INSERT IGNORE INTO companies (id, name, subscription_tier) VALUES
(1, 'Rumah Emas Demo Company', 'gold');

-- Insert test users
INSERT IGNORE INTO users (id, email, display_name, role, company_id) VALUES
(1, 'staff1@test.com', 'Jordan Smith', 'staff', 1),
(2, 'staff2@test.com', 'Ava Johnson', 'staff', 1),
(3, 'staff3@test.com', 'Liam Brown', 'staff', 1),
(4, 'manager@test.com', 'Sarah Davis', 'manager', 1),
(5, 'owner@test.com', 'Emily Lee', 'owner', 1);

-- Insert operating hours
INSERT IGNORE INTO company_operating_hours (company_id, day_of_week, is_active, open_time, close_time) VALUES
(1, 1, TRUE, '09:00:00', '18:00:00'),  -- Monday
(1, 2, TRUE, '09:00:00', '18:00:00'),  -- Tuesday
(1, 3, TRUE, '09:00:00', '18:00:00'),  -- Wednesday
(1, 4, TRUE, '09:00:00', '18:00:00'),  -- Thursday
(1, 5, TRUE, '09:00:00', '18:00:00'),  -- Friday
(1, 6, TRUE, '09:00:00', '14:00:00'),  -- Saturday
(1, 0, FALSE, '00:00:00', '00:00:00'); -- Sunday closed

-- Insert special dates
INSERT IGNORE INTO special_dates (company_id, date, name, date_type, is_blocked) VALUES
(1, '2026-02-10', 'Chinese New Year', 'public_holiday', TRUE),
(1, '2026-02-11', 'Chinese New Year Day 2', 'public_holiday', TRUE),
(1, '2026-12-25', 'Christmas Day', 'public_holiday', TRUE),
(1, '2026-07-20', 'Annual D&D', 'custom', TRUE),
(1, '2026-08-15', 'Team Building Day', 'custom', TRUE);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Staff availability summary
CREATE OR REPLACE VIEW v_staff_availability AS
SELECT
  u.id,
  u.display_name,
  u.company_id,
  COUNT(CASE WHEN la.status = 'pending' THEN 1 END) as pending_leave,
  COUNT(CASE WHEN la.status = 'approved' THEN 1 END) as approved_leave,
  COUNT(CASE WHEN la.status = 'rejected' THEN 1 END) as rejected_leave,
  MAX(CASE WHEN la.status = 'approved' THEN la.end_date END) as latest_leave_end
FROM users u
LEFT JOIN leave_applications la ON u.id = la.staff_id
WHERE u.role = 'staff'
GROUP BY u.id, u.display_name, u.company_id;

-- View: Leave conflicts summary
CREATE OR REPLACE VIEW v_leave_conflicts_summary AS
SELECT
  lc.severity,
  COUNT(*) as conflict_count,
  COUNT(CASE WHEN lc.is_resolved THEN 1 END) as resolved
FROM leave_conflicts lc
GROUP BY lc.severity;

-- View: Active penalties
CREATE OR REPLACE VIEW v_active_penalties AS
SELECT
  p.id,
  u.display_name,
  p.penalty_type,
  p.reason,
  p.issued_at,
  p.expires_at,
  DATEDIFF(p.expires_at, NOW()) as days_remaining
FROM penalties p
JOIN users u ON p.user_id = u.id
WHERE p.is_active = TRUE AND (p.expires_at IS NULL OR p.expires_at > NOW());

-- ============================================================================
-- PROCEDURES FOR COMMON OPERATIONS
-- ============================================================================

-- Procedure: Create recurring leave instances
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_create_recurring_leave_instances()
BEGIN
  DECLARE v_app_id BIGINT;
  DECLARE v_parent_id BIGINT;
  DECLARE v_start_date DATE;
  DECLARE v_end_date DATE;
  DECLARE v_pattern VARCHAR(100);
  DECLARE v_recurrence_end DATE;
  DECLARE v_max_occ INT;
  DECLARE v_created INT;
  DECLARE v_next_date DATE;
  DECLARE done INT DEFAULT FALSE;

  DECLARE cur CURSOR FOR
  SELECT id, start_date, end_date, recurrence_pattern, recurrence_end_date, max_occurrences
  FROM leave_applications
  WHERE is_recurring = TRUE AND occurrences_created = 0;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO v_app_id, v_start_date, v_end_date, v_pattern, v_recurrence_end, v_max_occ;
    IF done THEN
      LEAVE read_loop;
    END IF;

    -- Generate instances based on pattern
    SET v_next_date = v_start_date;
    SET v_created = 0;

    WHILE (v_recurrence_end IS NULL OR v_next_date <= v_recurrence_end)
      AND (v_max_occ IS NULL OR v_created < v_max_occ) DO

      INSERT INTO leave_applications
      (staff_id, company_id, start_date, end_date, period_type, reason, status, is_recurring, parent_application_id, created_at)
      SELECT staff_id, company_id, v_next_date, DATE_ADD(v_next_date, INTERVAL DATEDIFF(v_end_date, v_start_date) DAY),
             period_type, reason, 'pending', FALSE, v_app_id, NOW()
      FROM leave_applications WHERE id = v_app_id;

      -- Calculate next date based on pattern
      IF v_pattern = 'weekly' THEN
        SET v_next_date = DATE_ADD(v_next_date, INTERVAL 7 DAY);
      ELSEIF v_pattern = 'bi-weekly' THEN
        SET v_next_date = DATE_ADD(v_next_date, INTERVAL 14 DAY);
      ELSEIF v_pattern = 'monthly' THEN
        SET v_next_date = DATE_ADD(v_next_date, INTERVAL 1 MONTH);
      END IF;

      SET v_created = v_created + 1;
    END WHILE;

    UPDATE leave_applications SET occurrences_created = v_created WHERE id = v_app_id;
  END LOOP;

  CLOSE cur;
END//
DELIMITER ;

-- Procedure: Detect leave conflicts
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_detect_leave_conflicts()
BEGIN
  INSERT INTO leave_conflicts (application_id, conflicting_application_id, conflict_type, severity)
  SELECT
    la1.id,
    la2.id,
    'same-staff',
    'critical'
  FROM leave_applications la1
  JOIN leave_applications la2 ON
    la1.staff_id = la2.staff_id
    AND la1.id != la2.id
    AND ((la1.start_date <= la2.end_date AND la1.end_date >= la2.start_date))
  WHERE la1.status = 'pending' AND la2.status = 'approved'
  ON DUPLICATE KEY UPDATE conflict_type='same-staff';
END//
DELIMITER ;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Covering indexes
CREATE INDEX idx_leave_staff_status_date ON leave_applications(staff_id, status, start_date);
CREATE INDEX idx_leave_company_date_range ON leave_applications(company_id, start_date, end_date);
CREATE INDEX idx_approval_history_app_date ON leave_approval_history(application_id, created_at);
CREATE INDEX idx_conflict_resolution ON leave_conflicts(is_resolved, severity);
CREATE INDEX idx_special_dates_company_date ON special_dates(company_id, date, is_blocked);

-- ============================================================================
-- SETTINGS FOR ALIBABA CLOUD RDS
-- ============================================================================

-- Set appropriate connection timeout
SET SESSION max_connections = 1000;
SET SESSION wait_timeout = 28800;
SET SESSION interactive_timeout = 28800;

-- Enable strict mode (recommended for data integrity)
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ============================================================================
-- BACKUP & MONITORING (Alibaba Cloud RDS)
-- ============================================================================

-- Enable binary logging for replication (handled by Alibaba)
-- Enable slow query log (configured in Alibaba console)
-- Automated backups (configured in Alibaba console - 7-day retention)

-- ============================================================================
-- INITIALIZATION COMPLETE
-- ============================================================================

-- Test query: Check if schema is ready
SELECT
  'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Leave Applications', COUNT(*) FROM leave_applications
UNION ALL
SELECT 'Companies', COUNT(*) FROM companies;
