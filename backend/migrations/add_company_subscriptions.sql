-- Company Subscriptions Table
-- Tracks each company's active subscription (monthly or annual)

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'Unique subscription ID',
  company_id BIGINT NOT NULL UNIQUE COMMENT 'Reference to company',
  current_tier VARCHAR(20) NOT NULL COMMENT 'Current tier: silver, gold, platinum',
  billing_type VARCHAR(10) NOT NULL COMMENT 'Billing type: monthly, annual',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'Status: active, canceled, downgrade_pending',
  billing_date DATE NOT NULL COMMENT 'Day of month subscription started (for monthly)',
  renewal_date DATE NOT NULL COMMENT 'Next renewal date',
  pending_tier VARCHAR(20) COMMENT 'If downgrading, the scheduled tier',
  pending_effective_date DATE COMMENT 'When downgrade/cancel takes effect',
  stripe_subscription_id VARCHAR(255) COMMENT 'Stripe subscription ID',
  stripe_customer_id VARCHAR(255) COMMENT 'Stripe customer ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Subscription start date',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last updated',

  INDEX idx_company_id (company_id),
  INDEX idx_current_tier (current_tier),
  INDEX idx_billing_type (billing_type),
  INDEX idx_status (status),
  INDEX idx_renewal_date (renewal_date),
  INDEX idx_pending_effective_date (pending_effective_date),
  INDEX idx_stripe_subscription_id (stripe_subscription_id),
  CONSTRAINT fk_subscription_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Company subscription tracking';
