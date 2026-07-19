-- Subscription Tiers Configuration Table
-- Defines tier settings (commission rates, credits, limits, pricing)

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'Unique tier ID',
  name VARCHAR(20) NOT NULL UNIQUE COMMENT 'Tier name: silver, gold, platinum',
  commission_rate DECIMAL(4,2) NOT NULL COMMENT 'Commission rate: 0.18, 0.17, 0.16',
  ad_credit_monthly INT NOT NULL COMMENT 'Monthly ad credit in cents (SGD $50 = 5000)',
  ep_multiplier INT NOT NULL DEFAULT 1 COMMENT 'EP multiplier for posted tasks: 2, 3, 5',
  max_team_members INT NOT NULL COMMENT 'Max team members: 5, 15, 999999',
  price_monthly INT NOT NULL COMMENT 'Monthly price in cents (SGD $28 = 2800)',
  price_annual INT NOT NULL COMMENT 'Annual price in cents (SGD $268 = 26800)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last updated',

  INDEX idx_name (name),
  CONSTRAINT uq_tier_name UNIQUE KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Subscription tier configurations';

-- Insert tier data
INSERT INTO subscription_tiers (name, commission_rate, ad_credit_monthly, ep_multiplier, max_team_members, price_monthly, price_annual) VALUES
('silver', 0.18, 5000, 2, 5, 2800, 26800),
('gold', 0.17, 20000, 3, 15, 7800, 74800),
('platinum', 0.16, 50000, 5, 999999, 14800, 142000)
ON DUPLICATE KEY UPDATE
  commission_rate = VALUES(commission_rate),
  ad_credit_monthly = VALUES(ad_credit_monthly),
  ep_multiplier = VALUES(ep_multiplier),
  max_team_members = VALUES(max_team_members),
  price_monthly = VALUES(price_monthly),
  price_annual = VALUES(price_annual);
