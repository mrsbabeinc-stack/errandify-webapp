-- Subscription Milestone Bonuses Table
-- Tracks milestone achievements and bonus ad credit awards

CREATE TABLE IF NOT EXISTS subscription_milestones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'Unique ID',
  company_id BIGINT NOT NULL COMMENT 'Reference to company',
  milestone_type VARCHAR(50) NOT NULL COMMENT 'Milestone type: tasks_posted_50, tasks_posted_100, tasks_posted_200',
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When milestone was achieved',
  bonus_amount INT NOT NULL COMMENT 'Bonus in cents (SGD $20 = 2000)',
  bonus_applied BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Has bonus been added to credits?',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When recorded',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last updated',

  INDEX idx_company_id (company_id),
  INDEX idx_milestone_type (milestone_type),
  INDEX idx_completed_at (completed_at),
  INDEX idx_bonus_applied (bonus_applied),
  UNIQUE KEY uq_company_milestone (company_id, milestone_type),
  CONSTRAINT fk_milestone_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Milestone bonus tracking';
