-- Subscription Ad Credits Table
-- Monthly ad credit allocation and usage tracking

CREATE TABLE IF NOT EXISTS subscription_ad_credits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'Unique ID',
  company_id BIGINT NOT NULL COMMENT 'Reference to company',
  month VARCHAR(20) NOT NULL COMMENT 'Month key: June-2026',
  allocated_amount INT NOT NULL COMMENT 'Amount allocated in cents',
  used_amount INT NOT NULL DEFAULT 0 COMMENT 'Amount used in cents',
  expires_at DATE NOT NULL COMMENT 'Expiration date (end of month)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When allocated',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last updated',

  INDEX idx_company_id (company_id),
  INDEX idx_month (month),
  INDEX idx_expires_at (expires_at),
  UNIQUE KEY uq_company_month (company_id, month),
  CONSTRAINT fk_ad_credit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Monthly ad credit allocation and tracking';
