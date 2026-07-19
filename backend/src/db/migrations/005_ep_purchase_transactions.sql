-- Create EP Purchase Transactions table
CREATE TABLE IF NOT EXISTS ep_purchase_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  company_id INTEGER,
  ep_amount INTEGER NOT NULL,
  sgd_price DECIMAL(10, 2) NOT NULL,
  stripe_fee DECIMAL(10, 2) NOT NULL,
  total_paid DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- completed, failed, refunded
  stripe_transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys (optional if tables exist)
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ep_purchase_user ON ep_purchase_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ep_purchase_company ON ep_purchase_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_ep_purchase_date ON ep_purchase_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ep_purchase_status ON ep_purchase_transactions(status);
