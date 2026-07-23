import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI from '../../services/financeAPI';

interface ProfitLossReport {
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

interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    cash: number;
    accountsReceivable: number;
    equipment: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    salaryAccrual: number;
    taxesOwed: number;
    cpfPayable: number;
    totalLiabilities: number;
  };
  equity: {
    capitalContributed: number;
    retainedEarnings: number;
    totalEquity: number;
  };
}

interface CashFlowReport {
  period: string;
  openingBalance: number;
  inflows: {
    revenueReceived: number;
    otherInflows: number;
    totalInflows: number;
  };
  outflows: {
    salariesPaid: number;
    cpfRemittance: number;
    taxesPaid: number;
    operatingExpenses: number;
    capitalExpenditure: number;
    totalOutflows: number;
  };
  closingBalance: number;
  runway30Day: number | null;
  runway60Day: number | null;
  runway90Day: number | null;
}

/**
 * Runway reads in MONTHS of cash at the observed burn rate. The server used to
 * return a dollar figure here while the screen appended "months", which is how
 * this once displayed "12429.0 months".
 */
const formatRunway = (months: number | null): string =>
  months == null ? '—' : `${months.toFixed(1)} months`;

const runwayColour = (months: number | null): string =>
  months == null ? '#666' : months >= 6 ? '#4CAF50' : months >= 3 ? '#FF9800' : '#F44336';

const FinancialReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'pl' | 'balance' | 'cashflow'>('pl');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-07');

  // Demo P&L data
  const [plReports, setPlReports] = useState<ProfitLossReport[]>([]);
  const [currentPL, setCurrentPL] = useState<ProfitLossReport | null>(null);

  // Demo Balance Sheet data
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);

  // Demo Cash Flow data
  const [cashFlows, setCashFlows] = useState<CashFlowReport[]>([]);
  const [currentCashFlow, setCurrentCashFlow] = useState<CashFlowReport | null>(null);

  const [loading, setLoading] = useState(true);

  /** "2026-07" -> "July 2026" */
  const monthLabel = (period: string): string => {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  };

  /** Last day of the month, as a local calendar date. */
  const endOfPeriod = (period: string): string => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /**
   * Real statements. All three reports were hardcoded objects — the P&L showed
   * a $2,600 profit and the balance sheet $50,000 of contributed capital that
   * existed nowhere. They are now derived from the income, expense, claim and
   * payroll rows for the period, so they move when the books move.
   */
  const loadReports = async (period: string) => {
    try {
      setLoading(true);
      const [pl, bs, cf] = await Promise.all([
        financeAPI.profitLoss(period),
        financeAPI.balanceSheet(endOfPeriod(period)),
        financeAPI.cashFlow(period),
      ]);
      const labelled = { ...pl, period: monthLabel(pl.period) };
      const cfLabelled = { ...cf, period: monthLabel(cf.period) };
      setPlReports([labelled]);
      setCurrentPL(labelled);
      setBalanceSheet(bs);
      setCashFlows([cfLabelled]);
      setCurrentCashFlow(cfLabelled);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to build reports'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(selectedPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const handleGenerateReports = async () => {
    await loadReports(selectedPeriod);
    showToast(`📊 Reports rebuilt for ${monthLabel(selectedPeriod)}`, 'success');
  };

  /** A real file, not a toast — the old handlers only claimed to export. */
  const downloadCSV = (filename: string, rows: (string | number)[][]) => {
    const escape = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = rows.map(r => r.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const rows: (string | number)[][] = [['Report', 'Line', 'Amount (SGD)']];
    if (currentPL) {
      rows.push(['Profit & Loss', 'Period', currentPL.period]);
      rows.push(['Profit & Loss', 'Service revenue', currentPL.revenue.serviceRevenue]);
      rows.push(['Profit & Loss', 'Product sales', currentPL.revenue.productSales]);
      rows.push(['Profit & Loss', 'Other revenue', currentPL.revenue.otherRevenue]);
      rows.push(['Profit & Loss', 'Total revenue', currentPL.revenue.totalRevenue]);
      rows.push(['Profit & Loss', 'Salaries', currentPL.expenses.salaries]);
      rows.push(['Profit & Loss', 'CPF employer', currentPL.expenses.cpfEmployer]);
      rows.push(['Profit & Loss', 'Office supplies', currentPL.expenses.officeSupplies]);
      rows.push(['Profit & Loss', 'Utilities', currentPL.expenses.utilities]);
      rows.push(['Profit & Loss', 'Travel', currentPL.expenses.travel]);
      rows.push(['Profit & Loss', 'Marketing', currentPL.expenses.marketing]);
      rows.push(['Profit & Loss', 'Other', currentPL.expenses.other]);
      rows.push(['Profit & Loss', 'Total expenses', currentPL.expenses.totalExpenses]);
      rows.push(['Profit & Loss', 'Net profit / (loss)', currentPL.netProfitLoss]);
    }
    if (balanceSheet) {
      rows.push(['Balance Sheet', 'As of', balanceSheet.asOfDate]);
      rows.push(['Balance Sheet', 'Cash', balanceSheet.assets.cash]);
      rows.push(['Balance Sheet', 'Accounts receivable', balanceSheet.assets.accountsReceivable]);
      rows.push(['Balance Sheet', 'Total assets', balanceSheet.assets.totalAssets]);
      rows.push(['Balance Sheet', 'Accounts payable', balanceSheet.liabilities.accountsPayable]);
      rows.push(['Balance Sheet', 'Salary accrual', balanceSheet.liabilities.salaryAccrual]);
      rows.push(['Balance Sheet', 'CPF payable', balanceSheet.liabilities.cpfPayable]);
      rows.push(['Balance Sheet', 'Taxes owed', balanceSheet.liabilities.taxesOwed]);
      rows.push(['Balance Sheet', 'Total liabilities', balanceSheet.liabilities.totalLiabilities]);
      rows.push(['Balance Sheet', 'Retained earnings', balanceSheet.equity.retainedEarnings]);
      rows.push(['Balance Sheet', 'Total equity', balanceSheet.equity.totalEquity]);
    }
    if (currentCashFlow) {
      rows.push(['Cash Flow', 'Opening balance', currentCashFlow.openingBalance]);
      rows.push(['Cash Flow', 'Revenue received', currentCashFlow.inflows.revenueReceived]);
      rows.push(['Cash Flow', 'Other inflows', currentCashFlow.inflows.otherInflows]);
      rows.push(['Cash Flow', 'Total inflows', currentCashFlow.inflows.totalInflows]);
      rows.push(['Cash Flow', 'Salaries paid', currentCashFlow.outflows.salariesPaid]);
      rows.push(['Cash Flow', 'CPF remittance', currentCashFlow.outflows.cpfRemittance]);
      rows.push(['Cash Flow', 'Taxes paid', currentCashFlow.outflows.taxesPaid]);
      rows.push(['Cash Flow', 'Operating expenses', currentCashFlow.outflows.operatingExpenses]);
      rows.push(['Cash Flow', 'Total outflows', currentCashFlow.outflows.totalOutflows]);
      rows.push(['Cash Flow', 'Closing balance', currentCashFlow.closingBalance]);
    }
    downloadCSV(`financial-reports-${selectedPeriod}.csv`, rows);
    showToast('📥 Downloaded financial-reports CSV', 'success');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              📊 Financial Reports
            </h1>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FF6B35',
                fontWeight: '700',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            P&L, Balance Sheet, Cash Flow Statements
          </p>
        </div>

        {/* Compliance Banner */}
        <div style={{ padding: '12px 16px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0D47A1' }}>
          <strong>⚠️ Management accounts, not statutory financial statements.</strong> These are derived from the transactions recorded here and are for running the business. They are <strong>not</strong> ready for ACRA filing: statutory accounts must be prepared under SFRS with accounting policies, notes, prior-year comparatives, a statement of changes in equity and a directors' statement — none of which this produces. Fixed assets and share capital are not tracked at all. Give these to your accountant as a starting point, not as the filing.
        </div>

        {/* Period Selection & Export */}
        <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                Select Period
              </label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleGenerateReports}
              style={{
                padding: '10px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Generate
            </button>
            <button
              onClick={() => window.print()}
              style={{
                padding: '10px 16px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🖨️ Print / PDF
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '10px 16px',
                background: '#00796B',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              📊 CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['pl', 'balance', 'cashflow'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'pl' && '💰 Profit & Loss'}
              {tab === 'balance' && '⚖️ Balance Sheet'}
              {tab === 'cashflow' && '💵 Cash Flow'}
            </button>
          ))}
        </div>

        {/* P&L TAB */}
        {activeTab === 'pl' && currentPL && (
          <div>
            <div style={{ padding: '24px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
                PROFIT & LOSS STATEMENT
              </h2>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '24px' }}>
                Period: {currentPL.period}
              </div>

              {/* Revenue Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>REVENUE</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Service Revenue</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.revenue.serviceRevenue.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Product Sales</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.revenue.productSales.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Other Revenue</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.revenue.otherRevenue.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FFD9B3', fontWeight: '700', fontSize: '14px' }}>
                    <span>TOTAL REVENUE</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.revenue.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>EXPENSES</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Salaries (Staff)</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.salaries.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>CPF Employer Contribution</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.cpfEmployer.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Office Supplies</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.officeSupplies.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Utilities</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.utilities.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Travel & Transport</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.travel.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Marketing</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.marketing.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Other Expenses</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.other.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FFD9B3', fontWeight: '700', fontSize: '14px' }}>
                    <span>TOTAL EXPENSES</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${currentPL.expenses.totalExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net Profit/Loss */}
              <div style={{ padding: '16px', background: currentPL.netProfitLoss >= 0 ? '#E8F5E9' : '#FFEBEE', borderRadius: '8px', border: `2px solid ${currentPL.netProfitLoss >= 0 ? '#4CAF50' : '#F44336'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '700' }}>
                  <span>NET {currentPL.netProfitLoss >= 0 ? 'PROFIT' : 'LOSS'}</span>
                  <span style={{ fontSize: '18px', fontFamily: 'monospace', color: currentPL.netProfitLoss >= 0 ? '#2E7D32' : '#C62828' }}>
                    SGD ${currentPL.netProfitLoss.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div style={{ marginTop: '24px', padding: '16px', background: '#FFF8F5', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#333' }}>KEY METRICS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: '#666', marginBottom: '2px' }}>Gross Profit Margin</div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                      {(((currentPL.revenue.totalRevenue - currentPL.expenses.totalExpenses) / currentPL.revenue.totalRevenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#666', marginBottom: '2px' }}>Expense Ratio</div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                      {((currentPL.expenses.totalExpenses / currentPL.revenue.totalRevenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BALANCE SHEET TAB */}
        {activeTab === 'balance' && balanceSheet && (
          <div>
            <div style={{ padding: '24px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
                BALANCE SHEET
              </h2>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '24px' }}>
                As of: {new Date(balanceSheet.asOfDate).toLocaleDateString('en-SG', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left Column: Assets & Liabilities */}
                <div>
                  {/* Assets */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>ASSETS</h3>
                    <div style={{ display: 'grid', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span>Cash</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.assets.cash.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span>Accounts Receivable</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.assets.accountsReceivable.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span>Equipment & Assets</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.assets.equipment.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FFD9B3', fontWeight: '700', fontSize: '14px' }}>
                        <span>TOTAL ASSETS</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.assets.totalAssets.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities */}
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>LIABILITIES</h3>
                    <div style={{ display: 'grid', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span>Accounts Payable</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.liabilities.accountsPayable.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span>Salary Accrual</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.liabilities.salaryAccrual.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span>Taxes Owed</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.liabilities.taxesOwed.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span>CPF Payable</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.liabilities.cpfPayable.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FFD9B3', fontWeight: '700', fontSize: '14px' }}>
                        <span>TOTAL LIABILITIES</span>
                        <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.liabilities.totalLiabilities.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Equity */}
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>EQUITY (SHAREHOLDERS' FUNDS)</h3>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Capital Contributed</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.equity.capitalContributed.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Retained Earnings</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.equity.retainedEarnings.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FFD9B3', fontWeight: '700', fontSize: '14px' }}>
                      <span>TOTAL EQUITY</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${balanceSheet.equity.totalEquity.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Verification */}
                  <div style={{ marginTop: '24px', padding: '16px', background: balanceSheet.assets.totalAssets === (balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity) ? '#E8F5E9' : '#FFEBEE', borderRadius: '8px', border: `2px solid ${balanceSheet.assets.totalAssets === (balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity) ? '#4CAF50' : '#F44336'}` }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                      {balanceSheet.assets.totalAssets === (balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity) ? '✓ BALANCED' : '✗ UNBALANCED'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Assets (${balanceSheet.assets.totalAssets.toLocaleString()}) = Liabilities (${balanceSheet.liabilities.totalLiabilities.toLocaleString()}) + Equity (${balanceSheet.equity.totalEquity.toLocaleString()})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CASH FLOW TAB */}
        {activeTab === 'cashflow' && currentCashFlow && (
          <div>
            <div style={{ padding: '24px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
                CASH FLOW STATEMENT
              </h2>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '24px' }}>
                Period: {currentCashFlow.period}
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Opening Balance */}
                <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ fontWeight: '600' }}>Opening Cash Balance</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>SGD ${currentCashFlow.openingBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Inflows */}
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>CASH INFLOWS</h3>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Revenue Received</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.inflows.revenueReceived.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Other Inflows</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.inflows.otherInflows.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FFD9B3', fontWeight: '700', fontSize: '14px', color: '#4CAF50' }}>
                      <span>TOTAL INFLOWS</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.inflows.totalInflows.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Outflows */}
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>CASH OUTFLOWS</h3>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Salaries Paid</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.outflows.salariesPaid.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>CPF Remittance</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.outflows.cpfRemittance.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Taxes Paid</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.outflows.taxesPaid.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Operating Expenses</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.outflows.operatingExpenses.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span>Capital Expenditure</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.outflows.capitalExpenditure.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FFD9B3', fontWeight: '700', fontSize: '14px', color: '#F44336' }}>
                      <span>TOTAL OUTFLOWS</span>
                      <span style={{ fontFamily: 'monospace' }}>SGD ${currentCashFlow.outflows.totalOutflows.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Closing Balance */}
                <div style={{ padding: '12px', background: currentCashFlow.closingBalance >= 0 ? '#E8F5E9' : '#FFEBEE', borderRadius: '6px', border: `2px solid ${currentCashFlow.closingBalance >= 0 ? '#4CAF50' : '#F44336'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '700' }}>
                    <span>Closing Cash Balance</span>
                    <span style={{ fontFamily: 'monospace', color: currentCashFlow.closingBalance >= 0 ? '#2E7D32' : '#C62828' }}>
                      SGD ${currentCashFlow.closingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Runway Forecast */}
                <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700', color: '#333' }}>CASH RUNWAY</h3>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px' }}>
                    How many months the closing cash balance lasts at the rate money actually went out. Not a forecast — no future commitments are modelled.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: '#666', marginBottom: '4px' }}>Runway (1-month burn)</div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: runwayColour(currentCashFlow.runway30Day) }}>
                        {formatRunway(currentCashFlow.runway30Day)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Cash ÷ last month's paid expenses</div>
                    </div>
                    <div>
                      <div style={{ color: '#666', marginBottom: '4px' }}>Runway (2-month burn)</div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: runwayColour(currentCashFlow.runway60Day) }}>
                        {formatRunway(currentCashFlow.runway60Day)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Averaged over 2 months</div>
                    </div>
                    <div>
                      <div style={{ color: '#666', marginBottom: '4px' }}>Runway (3-month burn)</div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: runwayColour(currentCashFlow.runway90Day) }}>
                        {formatRunway(currentCashFlow.runway90Day)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Averaged over 3 months</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default FinancialReportsDashboard;
