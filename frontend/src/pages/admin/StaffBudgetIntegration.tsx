import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI, { n } from '../../services/financeAPI';

interface StaffCost {
  staff_id: string;
  staff_name: string;
  designation: string;
  salary: number;
  cpf_employer: number;
  total_cost: number;
  department: string;
}

interface BudgetAllocation {
  allocation_id: number;
  department: string;
  cost_center: string;
  headcount: number;
  avg_salary: number;
  total_labor_budget: number;
  has_staff_line: boolean;
  actual_cost: number;
  variance: number;
  variance_percent: number;
}

const StaffBudgetIntegration: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [staff, setStaff] = useState<StaffCost[]>([]);
  const [budgets, setBudgets] = useState<BudgetAllocation[]>([]);
  const [activeTab, setActiveTab] = useState<'staff' | 'budgets'>('staff');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  /**
   * Real staff cost against real budget. The five employees and two department
   * allocations here were fabricated, down to a 5.6% variance that was simply
   * typed in. Cost is now salary + allowances + employer CPF per active staff
   * member, and the allocation is the approved budget for the same period.
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await financeAPI.staffCosts(period);
      setStaff(data.staff.map(s => ({
        staff_id: s.staff_id,
        staff_name: s.staff_name,
        designation: s.position || '—',
        salary: n(s.base_salary) + n(s.allowances),
        cpf_employer: n(s.cpf_employer),
        total_cost: n(s.monthly_cost),
        department: s.department || 'Unassigned',
      })));

      const headcount = new Map<string, number>();
      for (const row of data.staff) {
        const dept = row.department || 'Unassigned';
        headcount.set(dept, (headcount.get(dept) || 0) + 1);
      }

      setBudgets(data.allocations.map((a, idx) => {
        const heads = headcount.get(a.department) || 0;
        return {
          allocation_id: idx + 1,
          department: a.department,
          cost_center: '—',
          headcount: heads,
          avg_salary: heads > 0 ? Math.round(a.actual / heads) : 0,
          total_labor_budget: a.allocated,
          has_staff_line: a.has_staff_line,
          actual_cost: a.actual,
          variance: a.variance,
          variance_percent: a.allocated > 0 ? Math.round((a.variance / a.allocated) * 1000) / 10 : 0,
        };
      }));
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load staff costs'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalStaffCost = staff.reduce((sum, s) => sum + s.total_cost, 0);
  const totalHeadcount = staff.length;
  const totalBudgetAllocated = budgets.reduce((sum, b) => sum + b.total_labor_budget, 0);
  const totalVariance = budgets.reduce((sum, b) => sum + b.variance, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>👥 Staff → Budget Integration</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Staff cost (salary + allowances + employer CPF) against the approved budget{loading ? ' · loading…' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              title="Budget period to compare against"
              style={{ padding: '8px 10px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px' }}
            />
            <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Headcount', value: totalHeadcount.toString(), color: '#F0A81E' },
            { label: 'Total Staff Cost', value: `SGD ${totalStaffCost.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Budget Allocated', value: `SGD ${totalBudgetAllocated.toLocaleString()}`, color: '#4CAF50' },
            { label: 'Total Variance', value: `SGD ${totalVariance.toLocaleString()}`, color: totalVariance > 0 ? '#4CAF50' : '#E65100' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['staff', 'budgets'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '8px 16px', background: activeTab === tab ? '#FF6B35' : '#f0f0f0', color: activeTab === tab ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab === 'staff' ? '👥 Staff Costs' : '📊 Labor Budget'}
            </button>
          ))}
        </div>

        {activeTab === 'staff' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Staff ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Name / Designation</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Department</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Monthly Salary</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>CPF (Employer)</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Total Monthly Cost</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.staff_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{s.staff_id}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}><div style={{ fontWeight: '600', color: '#333' }}>{s.staff_name}</div><div style={{ fontSize: '11px', color: '#666' }}>{s.designation}</div></td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{s.department}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {s.salary.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#E65100' }}>SGD {s.cpf_employer.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>SGD {s.total_cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Department / Cost Center</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Headcount</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Avg Salary</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Budget (Annual)</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Actual Cost</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Variance</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>% Variance</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr key={budget.allocation_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px' }}><div style={{ fontWeight: '600', color: '#333' }}>{budget.department}</div><div style={{ fontSize: '11px', color: '#666' }}>{budget.cost_center}</div></td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{budget.headcount}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333' }}>SGD {budget.avg_salary.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: budget.has_staff_line ? '#333' : '#E65100' }}>
                      {budget.has_staff_line ? `SGD ${budget.total_labor_budget.toLocaleString()}` : '—'}
                      {!budget.has_staff_line && (
                        <div style={{ fontSize: '10px', fontWeight: 400, color: '#E65100' }}>no staff line in budget</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>SGD {budget.actual_cost.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: budget.variance >= 0 ? '#4CAF50' : '#E65100' }}>
                      {budget.has_staff_line ? `SGD ${budget.variance.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: budget.variance_percent >= 0 ? '#4CAF50' : '#E65100', background: budget.has_staff_line ? (budget.variance_percent >= 0 ? '#E8F5E9' : '#FFF3E0') : 'transparent', borderRadius: '4px' }}>
                      {budget.has_staff_line ? `${budget.variance_percent > 0 ? '+' : ''}${budget.variance_percent.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '24px', padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '12px', color: '#2E7D32', margin: '0 0 8px 0', fontWeight: '600' }}>ℹ️ Integration Features</p>
          <ul style={{ fontSize: '12px', color: '#2E7D32', margin: 0, paddingLeft: '20px' }}>
            <li>Calculates labour cost per staff member: salary + allowances + employer CPF</li>
            <li>Compares against the budget's staff/salary allocation only — a department with no staff line shows “—”, not a false surplus drawn from rent and utilities</li>
            <li>Groups by department & cost center</li>
            <li>Tracks headcount per department</li>
            <li>Calculates average salary & total annual budget</li>
            <li>Compares actual vs. budgeted labor costs</li>
            <li>Shows variance analysis: Over/Under budget</li>
            <li>Ready for budget variance reporting</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StaffBudgetIntegration;
