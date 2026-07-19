-- Subscription Billing History
-- Tracks all Stripe invoices and payments for subscriptions

CREATE TABLE IF NOT EXISTS subscription_billing_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company_id (company_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
