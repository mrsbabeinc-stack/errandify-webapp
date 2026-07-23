import db from '../db.js';

/**
 * Accounts & Finance — the tables the module always assumed existed.
 *
 * Every one of the eleven /admin finance screens (Accounts, Payroll, Budget,
 * Expense Claims, Financial Reports and the five integration views) rendered
 * hardcoded demo arrays. Nothing was ever persisted: recording income, approving
 * an expense, generating payslips and posting payroll to the GL all mutated
 * React state and vanished on refresh. There was no finance table in the
 * database at all.
 *
 * Design notes:
 *  - Single-tenant, like the rest of the /admin HR module (`staff` has no
 *    company_id either). These are Errandify's own books, not a tenant's.
 *  - Money is NUMERIC(14,2). Never float.
 *  - The ledger, the P&L, the balance sheet and the cash flow statement are
 *    derived at read time from these rows rather than stored, so they cannot
 *    drift away from the transactions they summarise.
 *  - Staff references use staff.staff_id (varchar) to match staff_salary and
 *    leave_requests, which already key on it.
 */

export async function up(): Promise<void> {
  // ---------------------------------------------------------------- income
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_income (
      id             SERIAL PRIMARY KEY,
      entry_date     DATE NOT NULL,
      amount         NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      source         VARCHAR(255) NOT NULL,
      reference      VARCHAR(255),
      invoice_no     VARCHAR(100),
      description    TEXT,
      notes          TEXT,
      tags           TEXT[] NOT NULL DEFAULT '{}',
      gst_applicable BOOLEAN NOT NULL DEFAULT false,
      gst_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
      payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (payment_status IN ('pending','received','overdue')),
      received_date  DATE,
      created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_finance_income_date ON finance_income (entry_date)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_finance_income_status ON finance_income (payment_status)`);

  // ------------------------------------------------------- recurring rules
  // Created before finance_expenses because expenses reference it.
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_recurring_expenses (
      id                  SERIAL PRIMARY KEY,
      name                VARCHAR(255) NOT NULL,
      amount              NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      category            VARCHAR(100) NOT NULL,
      vendor              VARCHAR(255),
      frequency           VARCHAR(20) NOT NULL
                          CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','annual')),
      start_date          DATE NOT NULL,
      end_date            DATE,
      department          VARCHAR(100),
      description         TEXT,
      next_due_date       DATE NOT NULL,
      last_processed_date DATE,
      is_active           BOOLEAN NOT NULL DEFAULT true,
      approval_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (approval_status IN ('pending','approved')),
      auto_approve        BOOLEAN NOT NULL DEFAULT false,
      approved_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at         TIMESTAMP,
      created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_finance_recurring_due
      ON finance_recurring_expenses (next_due_date) WHERE is_active
  `);

  // -------------------------------------------------------------- expenses
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_expenses (
      id              SERIAL PRIMARY KEY,
      entry_date      DATE NOT NULL,
      amount          NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      category        VARCHAR(100) NOT NULL,
      vendor          VARCHAR(255),
      description     TEXT,
      department      VARCHAR(100),
      tags            TEXT[] NOT NULL DEFAULT '{}',
      approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (approval_status IN ('pending','approved','rejected')),
      approved_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approval_date   TIMESTAMP,
      rejection_reason TEXT,
      gst_applicable  BOOLEAN NOT NULL DEFAULT false,
      gst_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
      receipt_no      VARCHAR(100),
      paid            BOOLEAN NOT NULL DEFAULT false,
      paid_date       DATE,
      source          VARCHAR(30) NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual','recurring','claim','payroll')),
      recurring_id    INTEGER REFERENCES finance_recurring_expenses(id) ON DELETE SET NULL,
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON finance_expenses (entry_date)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_finance_expenses_status ON finance_expenses (approval_status)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_finance_expenses_dept ON finance_expenses (department)`);

  // ------------------------------------------------------------------ tags
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_tags (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      tag_type   VARCHAR(20) NOT NULL DEFAULT 'category'
                 CHECK (tag_type IN ('category','location','purpose','staff')),
      value      VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_finance_tag_name_type
      ON finance_tags (lower(name), tag_type)
  `);

  // -------------------------------------------------------- reconciliation
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_reconciliations (
      id               SERIAL PRIMARY KEY,
      recon_date       DATE NOT NULL,
      account_type     VARCHAR(100) NOT NULL,
      expected_balance NUMERIC(14,2) NOT NULL,
      actual_balance   NUMERIC(14,2) NOT NULL,
      variance         NUMERIC(14,2) GENERATED ALWAYS AS (actual_balance - expected_balance) STORED,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('reconciled','pending','variance')),
      notes            TEXT,
      created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // --------------------------------------------------------------- budgets
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_budgets (
      id              SERIAL PRIMARY KEY,
      budget_number   VARCHAR(50) NOT NULL UNIQUE,
      department      VARCHAR(100) NOT NULL,
      cost_center     VARCHAR(100),
      manager_name    VARCHAR(255),
      manager_id      VARCHAR(50),
      period          VARCHAR(7) NOT NULL,
      fiscal_year     INTEGER NOT NULL,
      total_budget    NUMERIC(14,2) NOT NULL CHECK (total_budget >= 0),
      status          VARCHAR(20) NOT NULL DEFAULT 'pending_approval'
                      CHECK (status IN ('active','archived','pending_approval','rejected')),
      approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (approval_status IN ('approved','pending','rejected')),
      approved_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approval_date   TIMESTAMP,
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_finance_budgets_period ON finance_budgets (period)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_budget_allocations (
      id        SERIAL PRIMARY KEY,
      budget_id INTEGER NOT NULL REFERENCES finance_budgets(id) ON DELETE CASCADE,
      category  VARCHAR(100) NOT NULL,
      allocated NUMERIC(14,2) NOT NULL DEFAULT 0
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_finance_budget_alloc_budget
      ON finance_budget_allocations (budget_id)
  `);

  // -------------------------------------------------------- expense claims
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_expense_claims (
      id                     SERIAL PRIMARY KEY,
      claim_number           VARCHAR(50) NOT NULL UNIQUE,
      staff_id               VARCHAR(10) NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
      claim_date             DATE NOT NULL,
      category               VARCHAR(100) NOT NULL,
      amount                 NUMERIC(14,2) NOT NULL CHECK (amount > 0),
      purpose                TEXT,
      department             VARCHAR(100),
      notes                  TEXT,
      receipt_file_name      VARCHAR(255),
      receipt_uploaded_at    TIMESTAMP,
      receipt_extracted_amount NUMERIC(14,2),
      receipt_extracted_vendor VARCHAR(255),
      receipt_extracted_date   DATE,
      status                 VARCHAR(30) NOT NULL DEFAULT 'submitted'
                             CHECK (status IN ('draft','submitted','manager-approved','accounts-reviewed','reimbursed','rejected')),
      manager_approved_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      manager_approved_at    TIMESTAMP,
      accounts_reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      accounts_reviewed_at   TIMESTAMP,
      reimbursed_at          TIMESTAMP,
      reimbursement_method   VARCHAR(50),
      rejected_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rejection_reason       TEXT,
      expense_id             INTEGER REFERENCES finance_expenses(id) ON DELETE SET NULL,
      created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_claims_status ON finance_expense_claims (status)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_claims_staff ON finance_expense_claims (staff_id)`);

  // --------------------------------------------------------------- payroll
  await db.query(`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id                  SERIAL PRIMARY KEY,
      period              VARCHAR(7) NOT NULL UNIQUE,
      status              VARCHAR(20) NOT NULL DEFAULT 'generated'
                          CHECK (status IN ('generated','posted')),
      payment_date        DATE,
      total_gross         NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_cpf_employee  NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_cpf_employer  NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_tax           NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_deductions    NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_net           NUMERIC(14,2) NOT NULL DEFAULT 0,
      generated_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      generated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
      posted_by           INTEGER REFERENCES users(id) ON DELETE SET NULL,
      posted_at           TIMESTAMP,
      expense_id          INTEGER REFERENCES finance_expenses(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id                  SERIAL PRIMARY KEY,
      payroll_run_id      INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
      staff_id            VARCHAR(10) NOT NULL,
      staff_name          VARCHAR(255),
      base_salary         NUMERIC(14,2) NOT NULL DEFAULT 0,
      transport_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
      housing_allowance   NUMERIC(14,2) NOT NULL DEFAULT 0,
      other_allowances    NUMERIC(14,2) NOT NULL DEFAULT 0,
      gross_salary        NUMERIC(14,2) NOT NULL DEFAULT 0,
      cpf_employee        NUMERIC(14,2) NOT NULL DEFAULT 0,
      cpf_employer        NUMERIC(14,2) NOT NULL DEFAULT 0,
      income_tax          NUMERIC(14,2) NOT NULL DEFAULT 0,
      leave_deduction     NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_deductions    NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_salary          NUMERIC(14,2) NOT NULL DEFAULT 0,
      cpf_breakdown       JSONB,
      tax_breakdown       JSONB,
      status              VARCHAR(20) NOT NULL DEFAULT 'generated'
                          CHECK (status IN ('generated','sent','paid'))
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_payroll_item_run_staff
      ON payroll_items (payroll_run_id, staff_id)
  `);

  // -------------------------------------------------- leave → payroll link
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_payroll_deductions (
      id               SERIAL PRIMARY KEY,
      leave_request_id INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
      staff_id         VARCHAR(10) NOT NULL,
      period           VARCHAR(7) NOT NULL,
      unpaid_days      NUMERIC(6,2) NOT NULL,
      daily_rate       NUMERIC(14,2) NOT NULL,
      amount           NUMERIC(14,2) NOT NULL,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','applied')),
      applied_run_id   INTEGER REFERENCES payroll_runs(id) ON DELETE SET NULL,
      created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_deduction_per_leave
      ON finance_payroll_deductions (leave_request_id)
  `);

  // ------------------------------------------------------------ GL entries
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_gl_entries (
      id             SERIAL PRIMARY KEY,
      entry_date     DATE NOT NULL,
      account_code   VARCHAR(20) NOT NULL,
      account_name   VARCHAR(255) NOT NULL,
      debit          NUMERIC(14,2) NOT NULL DEFAULT 0,
      credit         NUMERIC(14,2) NOT NULL DEFAULT 0,
      description    TEXT,
      source_type    VARCHAR(30) NOT NULL DEFAULT 'payroll'
                     CHECK (source_type IN ('payroll','expense','income','manual')),
      source_id      INTEGER,
      created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_gl_source ON finance_gl_entries (source_type, source_id)
  `);

  // ----------------------------------------------------------- AP invoices
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_ap_invoices (
      id             SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      vendor         VARCHAR(255) NOT NULL,
      amount         NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      invoice_date   DATE NOT NULL,
      due_date       DATE NOT NULL,
      status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','paid','cancelled')),
      claim_id       INTEGER REFERENCES finance_expense_claims(id) ON DELETE SET NULL,
      expense_id     INTEGER REFERENCES finance_expenses(id) ON DELETE SET NULL,
      description    TEXT,
      paid_date      DATE,
      created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_ap_invoice_per_claim
      ON finance_ap_invoices (claim_id) WHERE claim_id IS NOT NULL
  `);

  console.log('[057] finance module tables created');
}

export async function down(): Promise<void> {
  // Reverse dependency order.
  for (const t of [
    'finance_ap_invoices',
    'finance_gl_entries',
    'finance_payroll_deductions',
    'payroll_items',
    'payroll_runs',
    'finance_expense_claims',
    'finance_budget_allocations',
    'finance_budgets',
    'finance_reconciliations',
    'finance_tags',
    'finance_expenses',
    'finance_recurring_expenses',
    'finance_income',
  ]) {
    await db.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
  console.log('[057] finance module tables dropped');
}
