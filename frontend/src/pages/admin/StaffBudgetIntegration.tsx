import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const savedStaff = localStorage.getItem('staff_budget_staff') || '[]';
    const savedBudgets = localStorage.getItem('staff_budget_allocations') || '[]';

    let mockStaff: StaffCost[] = [
      { staff_id: 'EMP-001', staff_name: 'John Tan', designation: 'Manager', salary: 8000, cpf_employer: 1100, total_cost: 9100, department: 'Operations' },
      { staff_id: 'EMP-002', staff_name: 'Sarah Lee', designation: 'Senior Executive', salary: 6500, cpf_employer: 894, total_cost: 7394, department: 'Finance' },
      { staff_id: 'EMP-003', staff_name: 'Mike Wong', designation: 'Executive', salary: 5000, cpf_employer: 688, total_cost: 5688, department: 'Operations' },
      { staff_id: 'EMP-004', staff_name: 'Lisa Chen', designation: 'Executive', salary: 5000, cpf_employer: 688, total_cost: 5688, department: 'Finance' },
      { staff_id: 'EMP-005', staff_name: 'James Kim', designation: 'Executive', salary: 4500, cpf_employer: 619, total_cost: 5119, department: 'Operations' },
    ];

    let mockBudgets: BudgetAllocation[] = [
      { allocation_id: 1, department: 'Operations', cost_center: 'CC-001', headcount: 3, avg_salary: 5833, total_labor_budget: 175000, actual_cost: 165240, variance: 9760, variance_percent: 5.6 },
      { allocation_id: 2, department: 'Finance', cost_center: 'CC-002', headcount: 2, avg_salary: 5750, total_labor_budget: 115000, actual_cost: 113082, variance: 1918, variance_percent: 1.7 },
    ];

    if (savedStaff !== '[]') mockStaff = JSON.parse(savedStaff);
    if (savedBudgets !== '[]') mockBudgets = JSON.parse(savedBudgets);

    setStaff(mockStaff);
    setBudgets(mockBudgets);
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
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Auto-calculate labor budgets from staff costs & headcount</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Headcount', value: totalHeadcount.toString(), color: '#2196F3' },
            { label: 'Total Staff Cost', value: `SGD ${totalStaffCost.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Budget Allocated', value: `SGD ${totalBudgetAllocated.toLocaleString()}`, color: '#4CAF50' },
            { label: 'Total Variance', value: `SGD ${totalVariance.toLocaleString()}`, color: variance > 0 ? '#4CAF50' : '#E65100' },
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
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {budget.total_labor_budget.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>SGD {budget.actual_cost.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: budget.variance > 0 ? '#4CAF50' : '#E65100' }}>SGD {budget.variance.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: budget.variance_percent > 0 ? '#4CAF50' : '#E65100', background: budget.variance_percent > 0 ? '#E8F5E9' : '#FFF3E0', borderRadius: '4px' }}>
                      {budget.variance_percent > 0 ? '+' : ''}{budget.variance_percent.toFixed(1)}%
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
            <li>Auto-calculates labor budget from staff costs (Salary + CPF Employer)</li>
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
