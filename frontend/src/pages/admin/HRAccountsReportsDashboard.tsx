import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI, { ModuleStatus } from '../../services/financeAPI';

interface ReportMetric {
  category: string;
  title: string;
  value: string;
  color: string;
  icon: string;
  link: string;
  description: string;
}

const HRAccountsReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'hr' | 'accounts' | 'integrations'>('overview');
  const [dateRange, setDateRange] = useState('month');

  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Real KPIs. Every tile here was a literal — "94.2% attendance", "SGD 1.2M of
   * fixed assets", "-2.1% labour variance" — and the loader read ten
   * localStorage keys that nothing ever wrote to. The tiles now come from the
   * finance and HR tables, and tiles we genuinely cannot source (fixed assets,
   * tax filings, vendors — there is no register for them) are simply not shown
   * rather than invented.
   */
  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [m, summary, staffCosts, modules] = await Promise.all([
        financeAPI.integrationMetrics(),
        financeAPI.summary(dateRange),
        financeAPI.staffCosts().catch(() => null),
        financeAPI.moduleStatus().catch(() => [] as ModuleStatus[]),
      ]);
      setTotalRecords(modules.reduce((sum, mod) => sum + mod.records, 0));

      const sgd = (v: number) =>
        `SGD ${v.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`;
      const labourVariance = staffCosts?.allocations?.length
        ? staffCosts.allocations.reduce((sum, a) => sum + a.variance, 0)
        : null;

      setMetrics([
        // HR
        { category: 'HR', title: 'Active Staff', value: String(m.activeStaff), color: '#4CAF50', icon: '👥', link: '/admin/staff', description: `${m.totalStaff} on record` },
        { category: 'HR', title: 'Leave Awaiting Approval', value: String(m.pendingLeave), color: '#2196F3', icon: '🏖️', link: '/admin/leave-management', description: `${m.leaveThisMonth} approved for this month` },
        { category: 'HR', title: 'Open Roles', value: String(m.openRoles), color: '#FF9800', icon: '📋', link: '/admin/recruitment', description: 'Currently advertised' },
        { category: 'HR', title: 'Monthly Payroll', value: sgd(m.monthlyPayroll), color: '#9C27B0', icon: '💼', link: '/admin/payroll', description: 'Base salaries of active staff' },

        // Accounts
        { category: 'Accounts', title: 'Net This Period', value: sgd(summary.netProfit), color: summary.netProfit >= 0 ? '#4CAF50' : '#F44336', icon: '📈', link: '/admin/financial-reports', description: `${sgd(summary.totalIncome)} in, ${sgd(summary.totalExpenses)} out` },
        { category: 'Accounts', title: 'Outstanding Receivables', value: sgd(summary.receivables), color: '#4CAF50', icon: '📥', link: '/admin/accounts', description: 'Invoiced, not yet received' },
        { category: 'Accounts', title: 'Expenses Awaiting Approval', value: String(m.expensesPending), color: '#E65100', icon: '📤', link: '/admin/accounts', description: sgd(summary.pendingExpenseValue) },
        { category: 'Accounts', title: 'Net GST This Period', value: sgd(summary.netGst), color: '#2196F3', icon: '📊', link: '/admin/accounts', description: `Output ${sgd(summary.outputGst)} − input ${sgd(summary.inputGst)}` },
        { category: 'Accounts', title: 'Budgets Awaiting Approval', value: String(m.budgetsPending), color: '#FF6B35', icon: '💰', link: '/admin/budget', description: 'Submitted, not yet decided' },
        { category: 'Accounts', title: 'Recurring Commitments', value: sgd(summary.monthlyRecurringValue), color: '#9C27B0', icon: '🔁', link: '/admin/accounts', description: `${summary.activeRecurring} active monthly rules` },

        // Integrations
        { category: 'Integrations', title: 'Payroll → GL', value: m.payrollUnposted > 0 ? `${m.payrollUnposted} unposted` : 'All posted', color: m.payrollUnposted > 0 ? '#FF9800' : '#4CAF50', icon: '💼', link: '/admin/payroll-gl', description: m.latestPayrollPeriod ? `Latest run: ${m.latestPayrollPeriod}` : 'No payroll run yet' },
        { category: 'Integrations', title: 'Expense Claims → AP', value: String(m.claimsPending), color: '#4CAF50', icon: '📝', link: '/admin/expense-ap', description: `${sgd(m.claimsPendingValue)} in flight` },
        { category: 'Integrations', title: 'Leave → Payroll', value: String(m.leaveThisMonth), color: '#FF6B35', icon: '🏖️', link: '/admin/leave-payroll', description: 'Approved leave starting this month' },
        ...(labourVariance != null
          ? [{ category: 'Integrations', title: 'Staff → Budget', value: sgd(labourVariance), color: labourVariance >= 0 ? '#4CAF50' : '#F44336', icon: '👥', link: '/admin/staff-budget', description: labourVariance >= 0 ? 'Under the labour budget' : 'Over the labour budget' } as ReportMetric]
          : []),
      ]);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load metrics'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const hrMetrics = metrics.filter(m => m.category === 'HR');
  const accountsMetrics = metrics.filter(m => m.category === 'Accounts');
  const integrationMetrics = metrics.filter(m => m.category === 'Integrations');

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>📊 HR & Accounts Reports</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Live figures from the HR and finance tables{loading ? ' · loading…' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'hr', label: '👥 HR Metrics', icon: '👥' },
            { id: 'accounts', label: '💰 Accounts Metrics', icon: '💰' },
            { id: 'integrations', label: '🔗 Integrations', icon: '🔗' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '8px 16px', background: activeTab === tab.id ? '#FF6B35' : '#f0f0f0', color: activeTab === tab.id ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'white', border: '2px solid #4CAF50', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>HR Metrics</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>{hrMetrics.length}</div>
              </div>
              <div style={{ padding: '16px', background: 'white', border: '2px solid #FF6B35', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Accounts Metrics</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>{accountsMetrics.length}</div>
              </div>
              <div style={{ padding: '16px', background: 'white', border: '2px solid #2196F3', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Integrations</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>{integrationMetrics.length}</div>
              </div>
              <div style={{ padding: '16px', background: 'white', border: '2px solid #9C27B0', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Records</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#9C27B0' }}>
                  {totalRecords == null ? '—' : totalRecords.toLocaleString()}
                </div>
              </div>
            </div>

            {/* All Metrics Overview */}
            <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '16px', background: '#F5F5F5', borderBottom: '1px solid #ddd' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>All Metrics Summary</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0', borderCollapse: 'collapse' }}>
                {metrics.map((metric, idx) => (
                  <div key={idx} style={{ padding: '16px', borderRight: idx % 4 !== 3 ? '1px solid #eee' : 'none', borderBottom: idx < metrics.length - 4 ? '1px solid #eee' : 'none', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => navigate(metric.link)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>{metric.title}</div>
                      <span style={{ fontSize: '16px' }}>{metric.icon}</span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: metric.color, marginBottom: '4px' }}>{metric.value}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{metric.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HR Tab */}
        {activeTab === 'hr' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', padding: '16px' }}>
              {hrMetrics.map((metric, idx) => (
                <div key={idx} style={{ padding: '16px', background: '#f9f9f9', border: `2px solid ${metric.color}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate(metric.link)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#333' }}>{metric.title}</h3>
                    <span style={{ fontSize: '20px' }}>{metric.icon}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: metric.color, marginBottom: '8px' }}>{metric.value}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>{metric.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', padding: '16px' }}>
              {accountsMetrics.map((metric, idx) => (
                <div key={idx} style={{ padding: '16px', background: '#f9f9f9', border: `2px solid ${metric.color}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate(metric.link)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#333' }}>{metric.title}</h3>
                    <span style={{ fontSize: '20px' }}>{metric.icon}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: metric.color, marginBottom: '8px' }}>{metric.value}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>{metric.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', padding: '16px' }}>
              {integrationMetrics.map((metric, idx) => (
                <div key={idx} style={{ padding: '16px', background: '#f9f9f9', border: `2px solid ${metric.color}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate(metric.link)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#333' }}>{metric.title}</h3>
                    <span style={{ fontSize: '20px' }}>{metric.icon}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: metric.color, marginBottom: '8px' }}>{metric.value}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>{metric.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Info */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '12px', color: '#2E7D32', margin: '0 0 8px 0', fontWeight: '600' }}>ℹ️ Reports Integration Features</p>
          <ul style={{ fontSize: '12px', color: '#2E7D32', margin: 0, paddingLeft: '20px' }}>
            <li>Every figure is read from the database when this page loads</li>
            <li>Click any metric card to open the module it came from</li>
            <li>Date range filtering (Week/Month/Quarter/Year)</li>
            <li>Period-on-period trends are not shown — no historical snapshots are kept to compare against</li>
            <li>All data links back to CRUD components for detail investigation</li>
            <li>Ready for backend database integration</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HRAccountsReportsDashboard;
