/**
 * Accounts & Finance API client.
 *
 * Every finance screen previously rendered a hardcoded demo array and mutated
 * React state on save, so nothing survived a refresh. These call the real
 * /api/admin/finance endpoints, which are admin-guarded — the token has to go
 * with the request or they answer 401.
 */

const API_BASE = '/api/admin/finance';

function authHeaders(json = false): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Surfaces the server's own message so the UI can say what actually failed. */
async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(hasBody), ...(init?.headers || {}) },
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response (an HTML error page, say) — fall through to the status.
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.error ||
      (response.status === 401
        ? 'Your session has expired — please sign in again'
        : response.status === 403
        ? 'Admin access required'
        : `Request failed (${response.status})`);
    throw new Error(message);
  }
  return payload as T;
}

const get = <T = any>(path: string) => request<T>(path);
const post = <T = any>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
const patch = <T = any>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
const del = <T = any>(path: string) => request<T>(path, { method: 'DELETE' });

// ---------------------------------------------------------------- types

export interface IncomeEntry {
  id: number;
  entry_date: string;
  amount: string | number;
  source: string;
  reference?: string | null;
  invoice_no?: string | null;
  description?: string | null;
  notes?: string | null;
  tags: string[];
  gst_applicable: boolean;
  gst_amount: string | number;
  payment_status: 'pending' | 'received' | 'overdue';
  created_at: string;
}

export interface ExpenseEntry {
  id: number;
  entry_date: string;
  amount: string | number;
  category: string;
  vendor?: string | null;
  description?: string | null;
  department?: string | null;
  tags: string[];
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by_name?: string | null;
  approval_date?: string | null;
  gst_amount: string | number;
  receipt_no?: string | null;
  paid: boolean;
  source: 'manual' | 'recurring' | 'claim' | 'payroll';
  created_at: string;
}

export interface RecurringExpense {
  id: number;
  name: string;
  amount: string | number;
  category: string;
  vendor?: string | null;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  start_date: string;
  end_date?: string | null;
  department?: string | null;
  description?: string | null;
  next_due_date: string;
  last_processed_date?: string | null;
  is_active: boolean;
  approval_status: 'pending' | 'approved';
  auto_approve: boolean;
}

export interface LedgerRow {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  category: string;
  reference: string;
}

export interface FinanceSummary {
  period: string;
  totalIncome: number;
  incomeReceived: number;
  receivables: number;
  totalExpenses: number;
  netProfit: number;
  pendingExpenseValue: number;
  pendingExpenseCount: number;
  outputGst: number;
  inputGst: number;
  netGst: number;
  activeRecurring: number;
  monthlyRecurringValue: number;
}

export interface Reconciliation {
  id: number;
  recon_date: string;
  account_type: string;
  expected_balance: string | number;
  actual_balance: string | number;
  variance: string | number;
  status: 'reconciled' | 'pending' | 'variance';
  notes?: string | null;
}

export interface FinanceTag {
  id: number;
  name: string;
  tag_type: 'category' | 'location' | 'purpose' | 'staff';
  value?: string | null;
}

export interface BudgetAllocation {
  id?: number;
  category: string;
  allocated: number;
  actual: number;
  variance: number;
  status: 'on_track' | 'warning' | 'over_budget';
}

export interface Budget {
  id: number;
  budget_number: string;
  department: string;
  cost_center?: string | null;
  manager_name?: string | null;
  manager_id?: string | null;
  period: string;
  fiscal_year: number;
  total_budget: number;
  total_spent: number;
  status: 'active' | 'archived' | 'pending_approval' | 'rejected';
  approval_status: 'approved' | 'pending' | 'rejected';
  approved_by_name?: string | null;
  approval_date?: string | null;
  created_at: string;
  allocations: BudgetAllocation[];
}

export interface ExpenseClaim {
  id: number;
  claim_number: string;
  staff_id: string;
  staff_name: string;
  claim_date: string;
  category: string;
  amount: string | number;
  purpose?: string | null;
  department?: string | null;
  notes?: string | null;
  receipt_file_name?: string | null;
  receipt_extracted_amount?: string | number | null;
  receipt_extracted_vendor?: string | null;
  receipt_extracted_date?: string | null;
  status: 'draft' | 'submitted' | 'manager-approved' | 'accounts-reviewed' | 'reimbursed' | 'rejected';
  manager_approved_by_name?: string | null;
  manager_approved_at?: string | null;
  accounts_reviewed_by_name?: string | null;
  accounts_reviewed_at?: string | null;
  reimbursed_at?: string | null;
  reimbursement_method?: string | null;
  rejection_reason?: string | null;
}

export interface ClaimSummary {
  total_claims: string | number;
  total_amount: string | number;
  draft_claims: string | number;
  pending_approval: string | number;
  approved_claims: string | number;
  reimbursed_amount: string | number;
  pending_reimbursement: string | number;
}

export interface PayrollStaff {
  id: number;
  staff_id: string;
  first_name: string;
  last_name: string;
  employment_type?: string | null;
  status: string;
  cpf_membership_no?: string | null;
  department?: string | null;
  position?: string | null;
  base_salary: string | number;
  transport_allowance: string | number;
  housing_allowance: string | number;
  other_allowances: string | number;
}

export interface PayrollRun {
  id: number;
  period: string;
  status: 'generated' | 'posted';
  payment_date?: string | null;
  total_gross: string | number;
  total_cpf_employee: string | number;
  total_cpf_employer: string | number;
  total_tax: string | number;
  total_deductions: string | number;
  total_net: string | number;
  generated_at: string;
  posted_at?: string | null;
}

export interface PayrollItem {
  id: number;
  payroll_run_id: number;
  staff_id: string;
  staff_name: string;
  base_salary: string | number;
  transport_allowance: string | number;
  housing_allowance: string | number;
  other_allowances: string | number;
  gross_salary: string | number;
  cpf_employee: string | number;
  cpf_employer: string | number;
  income_tax: string | number;
  leave_deduction: string | number;
  total_deductions: string | number;
  net_salary: string | number;
  cpf_breakdown: any;
  tax_breakdown: any;
  status: string;
  period?: string;
  payment_date?: string | null;
}

export interface GLEntry {
  id: number;
  entry_date: string;
  account_code: string;
  account_name: string;
  debit: string | number;
  credit: string | number;
  description?: string | null;
  source_type: string;
  source_id?: number | null;
}

export interface APInvoice {
  id: number;
  invoice_number: string;
  vendor: string;
  amount: string | number;
  invoice_date: string;
  due_date: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  claim_id?: number | null;
  claim_number?: string | null;
  description?: string | null;
}

export interface LeaveDeductionCandidate {
  id: number;
  staff_id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  /** Working days in the range: weekdays less gazetted holidays. */
  days: number;
  calendar_days: number;
  base_salary: string | number;
  /** Daily gross rate of pay per the Employment Act. */
  daily_rate: number;
  is_unpaid: boolean;
  suggested_deduction: number;
  deduction_id?: number | null;
  deduction_amount?: string | number | null;
  deduction_status?: string | null;
}

export interface PayrollDeduction {
  id: number;
  staff_id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  period: string;
  unpaid_days: string | number;
  daily_rate: string | number;
  amount: string | number;
  status: 'pending' | 'applied';
}

export interface StaffCost {
  staff_id: string;
  staff_name: string;
  department?: string | null;
  position?: string | null;
  status: string;
  base_salary: number;
  allowances: number;
  cpf_employer: number;
  monthly_cost: number;
}

export interface DepartmentAllocation {
  department: string;
  /** The budget's staff/salary allocation — 0 if the budget has no staff line. */
  allocated: number;
  actual: number;
  variance: number;
  utilisation: number;
  has_staff_line: boolean;
  total_budget: number;
}

export interface ProfitLossReport {
  period: string;
  revenue: {
    serviceRevenue: number;
    productSales: number;
    otherRevenue: number;
    totalRevenue: number;
  };
  expenses: {
    salaries: number;
    cpfEmployer: number;
    officeSupplies: number;
    utilities: number;
    travel: number;
    marketing: number;
    other: number;
    totalExpenses: number;
  };
  netProfitLoss: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: { cash: number; accountsReceivable: number; equipment: number; totalAssets: number };
  liabilities: {
    accountsPayable: number;
    salaryAccrual: number;
    taxesOwed: number;
    cpfPayable: number;
    totalLiabilities: number;
  };
  equity: { capitalContributed: number; retainedEarnings: number; totalEquity: number };
}

export interface CashFlowReport {
  period: string;
  openingBalance: number;
  inflows: { revenueReceived: number; otherInflows: number; totalInflows: number };
  outflows: {
    salariesPaid: number;
    cpfRemittance: number;
    taxesPaid: number;
    operatingExpenses: number;
    capitalExpenditure: number;
    totalOutflows: number;
  };
  closingBalance: number;
  /** Months of cash at the burn rate over the trailing 1 / 2 / 3 months.
   *  null when there has been no spend to derive a burn rate from. */
  runway30Day: number | null;
  runway60Day: number | null;
  runway90Day: number | null;
}

export interface IntegrationMetrics {
  activeStaff: number;
  totalStaff: number;
  pendingLeave: number;
  leaveThisMonth: number;
  openRoles: number;
  monthlyPayroll: number;
  claimsPending: number;
  claimsPendingValue: number;
  expensesPending: number;
  budgetsPending: number;
  payrollUnposted: number;
  latestPayrollPeriod: string | null;
}

export interface PaymentBatch {
  id: number;
  payroll_run_id: number;
  period?: string;
  reference: string;
  value_date: string;
  status: 'awaiting_approval' | 'approved' | 'exported' | 'settled' | 'cancelled';
  item_count: number;
  total_amount: string | number;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  exported_at?: string | null;
  settled_at?: string | null;
  bank_reference?: string | null;
  notes?: string | null;
}

export interface PaymentBatchItem {
  id: number;
  staff_id: string;
  staff_name: string;
  bank_code?: string | null;
  bank_branch_code?: string | null;
  /** Masked everywhere except the audited bank-file export. */
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  amount: string | number;
  status: 'pending' | 'paid' | 'failed';
  failure_reason?: string | null;
}

export interface BankReadinessRow {
  staff_id: string;
  staff_name: string;
  status: string;
  bank_account_name?: string | null;
  bank_code?: string | null;
  bank_branch_code?: string | null;
  bank_name?: string | null;
  account_masked?: string | null;
  ready: boolean;
}

export interface OnboardingStatusRow {
  staff_id: string;
  staff_name: string;
  email?: string | null;
  outstanding: string[];
  complete: boolean;
  can_be_invited: boolean;
  invite_id?: number | null;
  invite_status?: string | null;
  expires_at?: string | null;
  invited_at?: string | null;
  onboarding_completed_at?: string | null;
}

export interface OnboardingInvite {
  id: number;
  staff_id: string;
  staff_name: string;
  email?: string | null;
  expires_at: string;
  /** Shown once — the server keeps only a hash. */
  invite_path: string;
}

export interface TrendPoint {
  period: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface ModuleStatus {
  name: string;
  records: number;
  pending: number;
}

export interface ActivityRow {
  module: string;
  action: string;
  at: string;
  records: number;
  status: 'success' | 'pending' | 'error';
}

// --------------------------------------------------------------- helpers

/** Postgres NUMERIC arrives as a string; every screen needs it as a number. */
export const n = (v: unknown): number => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const money = (v: unknown): string =>
  n(v).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ------------------------------------------------------------------ API

export const financeAPI = {
  // Income
  listIncome: (params?: { from?: string; to?: string; status?: string }) =>
    get<{ income: IncomeEntry[] }>(`/income${qs(params)}`).then(r => r.income),
  createIncome: (data: Record<string, unknown>) =>
    post<{ income: IncomeEntry }>('/income', data).then(r => r.income),
  setIncomeStatus: (id: number, status: string) =>
    patch<{ income: IncomeEntry }>(`/income/${id}/status`, { status }).then(r => r.income),

  // Expenses
  listExpenses: (params?: { from?: string; to?: string; status?: string; department?: string }) =>
    get<{ expenses: ExpenseEntry[] }>(`/expenses${qs(params)}`).then(r => r.expenses),
  createExpense: (data: Record<string, unknown>) =>
    post<{ expense: ExpenseEntry }>('/expenses', data).then(r => r.expense),
  approveExpense: (id: number) =>
    patch<{ expense: ExpenseEntry }>(`/expenses/${id}/approve`).then(r => r.expense),
  rejectExpense: (id: number, reason?: string) =>
    patch<{ expense: ExpenseEntry }>(`/expenses/${id}/reject`, { reason }).then(r => r.expense),
  markExpensePaid: (id: number) =>
    patch<{ expense: ExpenseEntry }>(`/expenses/${id}/paid`).then(r => r.expense),

  // Recurring
  listRecurring: () => get<{ recurring: RecurringExpense[] }>('/recurring').then(r => r.recurring),
  createRecurring: (data: Record<string, unknown>) =>
    post<{ recurring: RecurringExpense }>('/recurring', data).then(r => r.recurring),
  approveRecurring: (id: number) =>
    patch<{ recurring: RecurringExpense }>(`/recurring/${id}/approve`).then(r => r.recurring),
  setRecurringActive: (id: number, isActive: boolean) =>
    patch<{ recurring: RecurringExpense }>(`/recurring/${id}/active`, { is_active: isActive }).then(r => r.recurring),
  runRecurring: () => post<{ created: number }>('/recurring/run').then(r => r.created),

  // Tags
  listTags: () => get<{ tags: FinanceTag[] }>('/tags').then(r => r.tags),
  createTag: (data: Record<string, unknown>) => post<{ tag: FinanceTag }>('/tags', data).then(r => r.tag),
  deleteTag: (id: number) => del(`/tags/${id}`),

  // Ledger / reconciliation / summary
  ledger: (params?: { from?: string; to?: string }) =>
    get<{ ledger: LedgerRow[] }>(`/ledger${qs(params)}`).then(r => r.ledger),
  listReconciliations: () =>
    get<{ reconciliations: Reconciliation[] }>('/reconciliations').then(r => r.reconciliations),
  createReconciliation: (data: Record<string, unknown>) =>
    post<{ reconciliation: Reconciliation }>('/reconciliations', data).then(r => r.reconciliation),
  summary: (period?: string) =>
    get<{ summary: FinanceSummary }>(`/summary${qs({ period })}`).then(r => r.summary),

  // Budgets
  listBudgets: (params?: { period?: string; department?: string }) =>
    get<{ budgets: Budget[] }>(`/budgets${qs(params)}`).then(r => r.budgets),
  createBudget: (data: Record<string, unknown>) =>
    post<{ budget: Budget }>('/budgets', data).then(r => r.budget),
  decideBudget: (id: number, approve: boolean) =>
    patch<{ budget: Budget }>(`/budgets/${id}/approve`, { approve }).then(r => r.budget),

  // Claims
  listClaims: () => get<{ claims: ExpenseClaim[]; summary: ClaimSummary }>('/claims'),
  createClaim: (data: Record<string, unknown>) =>
    post<{ claim: ExpenseClaim }>('/claims', data).then(r => r.claim),
  managerApproveClaim: (id: number) =>
    patch<{ claim: ExpenseClaim }>(`/claims/${id}/manager-approve`).then(r => r.claim),
  accountsReviewClaim: (id: number) =>
    patch<{ claim: ExpenseClaim }>(`/claims/${id}/accounts-review`).then(r => r.claim),
  reimburseClaim: (id: number, method?: string) =>
    patch<{ claim: ExpenseClaim }>(`/claims/${id}/reimburse`, { method }).then(r => r.claim),
  rejectClaim: (id: number, reason?: string) =>
    patch<{ claim: ExpenseClaim }>(`/claims/${id}/reject`, { reason }).then(r => r.claim),

  // Payroll
  payrollStaff: () => get<{ staff: PayrollStaff[] }>('/payroll/staff').then(r => r.staff),
  setAllowances: (staffId: string, data: { transport_allowance: number; housing_allowance: number; other_allowances: number }) =>
    request(`/payroll/staff/${encodeURIComponent(staffId)}/allowances`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  payrollRuns: () => get<{ runs: PayrollRun[] }>('/payroll/runs').then(r => r.runs),
  payrollItems: (runId: number) =>
    get<{ items: PayrollItem[] }>(`/payroll/runs/${runId}/items`).then(r => r.items),
  payslips: () => get<{ payslips: PayrollItem[] }>('/payroll/payslips').then(r => r.payslips),
  generatePayroll: (period: string) =>
    post<{ run: PayrollRun; items: PayrollItem[] }>('/payroll/runs', { period }),
  postPayroll: (runId: number) =>
    post<{ run: PayrollRun }>(`/payroll/runs/${runId}/post`).then(r => r.run),
  glEntries: (sourceType?: string) =>
    get<{ entries: GLEntry[] }>(`/gl-entries${qs({ source_type: sourceType })}`).then(r => r.entries),

  // Leave → payroll
  leaveDeductionCandidates: (period?: string) =>
    get<{ leaves: LeaveDeductionCandidate[] }>(`/leave-deductions${qs({ period })}`).then(r => r.leaves),
  createLeaveDeduction: (leaveRequestId: number) =>
    post<{ deduction: PayrollDeduction }>('/leave-deductions', { leave_request_id: leaveRequestId }).then(r => r.deduction),
  listDeductions: () =>
    get<{ deductions: PayrollDeduction[] }>('/payroll-deductions').then(r => r.deductions),

  // AP
  listAPInvoices: () => get<{ invoices: APInvoice[] }>('/ap-invoices').then(r => r.invoices),
  createAPInvoice: (data: Record<string, unknown>) =>
    post<{ invoice: APInvoice }>('/ap-invoices', data).then(r => r.invoice),

  // Staff cost vs budget
  staffCosts: (period?: string) =>
    get<{ staff: StaffCost[]; allocations: DepartmentAllocation[]; period: string }>(`/staff-costs${qs({ period })}`),

  // Reports
  profitLoss: (period: string) =>
    get<{ report: ProfitLossReport }>(`/reports/profit-loss${qs({ period })}`).then(r => r.report),
  balanceSheet: (asOf?: string) =>
    get<{ report: BalanceSheetReport }>(`/reports/balance-sheet${qs({ as_of: asOf })}`).then(r => r.report),
  cashFlow: (period: string) =>
    get<{ report: CashFlowReport }>(`/reports/cash-flow${qs({ period })}`).then(r => r.report),
  integrationMetrics: () =>
    get<{ metrics: IntegrationMetrics }>('/integration-metrics').then(r => r.metrics),
  trend: (months = 12) => get<{ trend: TrendPoint[] }>(`/reports/trend${qs({ months: String(months) })}`).then(r => r.trend),
  // Paying staff
  bankReadiness: () =>
    get<{ staff: BankReadinessRow[]; ready_count: number; blocked_count: number }>('/payroll/bank-readiness'),
  paymentBatches: () => get<{ batches: PaymentBatch[] }>('/payment-batches').then(r => r.batches),
  paymentBatch: (id: number) =>
    get<{ batch: PaymentBatch; items: PaymentBatchItem[] }>(`/payment-batches/${id}`),
  createPaymentBatch: (runId: number, body: Record<string, unknown> = {}) =>
    post<{ batch: PaymentBatch }>(`/payroll/runs/${runId}/payment-batch`, body).then(r => r.batch),
  approvePaymentBatch: (id: number) =>
    patch<{ batch: PaymentBatch }>(`/payment-batches/${id}/approve`).then(r => r.batch),
  cancelPaymentBatch: (id: number, reason?: string) =>
    patch<{ batch: PaymentBatch }>(`/payment-batches/${id}/cancel`, { reason }).then(r => r.batch),
  settlePaymentBatch: (id: number, bankReference: string) =>
    patch<{ batch: PaymentBatch; paid_count: number; paid_total: number }>(
      `/payment-batches/${id}/settle`, { bank_reference: bankReference }),

  /**
   * Downloads the bank file. Not routed through `request` because the response
   * is CSV, not JSON — and because this is the one call that hands over full
   * account numbers, so the server logs it.
   */
  async exportPaymentBatch(id: number, reference: string): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/payment-batches/${id}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      let message = `Export failed (${response.status})`;
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch { /* CSV or empty body */ }
      throw new Error(message);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reference}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // Staff onboarding — mounted at /api/admin, not /api/admin/finance
  onboardingStatus: async () => {
    const token = localStorage.getItem('token');
    const r = await fetch('/api/admin/staff/onboarding-status', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await r.json().catch(() => null);
    if (!r.ok || body?.success === false) throw new Error(body?.error || 'Failed to load onboarding status');
    return body as { staff: OnboardingStatusRow[]; complete_count: number; outstanding_count: number };
  },
  createOnboardingInvite: async (staffId: string) => {
    const token = localStorage.getItem('token');
    const r = await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}/onboarding-invite`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await r.json().catch(() => null);
    if (!r.ok || body?.success === false) throw new Error(body?.error || 'Failed to create invite');
    return body.invite as OnboardingInvite;
  },

  moduleStatus: () => get<{ modules: ModuleStatus[] }>('/module-status').then(r => r.modules),
  activity: (limit = 20) =>
    get<{ activity: ActivityRow[] }>(`/activity${qs({ limit: String(limit) })}`).then(r => r.activity),
};

function qs(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export default financeAPI;
