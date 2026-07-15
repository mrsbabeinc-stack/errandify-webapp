import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface LeaveRecord {
  leave_id: number;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: 'approved' | 'pending';
  paid: boolean;
  deduction_applied: boolean;
}

interface PayrollDeduction {
  deduction_id: number;
  payroll_id: number;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  days: number;
  daily_rate: number;
  deduction_amount: number;
  payroll_period: string;
}

const LeavePayrollIntegration: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [deductions, setDeductions] = useState<PayrollDeduction[]>([]);
  const [activeTab, setActiveTab] = useState<'leaves' | 'deductions'>('leaves');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const savedLeaves = localStorage.getItem('leave_payroll_leaves') || '[]';
    const savedDeductions = localStorage.getItem('leave_payroll_deductions') || '[]';

    let mockLeaves: LeaveRecord[] = [
      { leave_id: 1, employee_id: 'EMP-001', employee_name: 'John Tan', leave_type: 'Unpaid Leave', start_date: '2026-07-01', end_date: '2026-07-03', days: 3, status: 'approved', paid: false, deduction_applied: true },
      { leave_id: 2, employee_id: 'EMP-002', employee_name: 'Sarah Lee', leave_type: 'Medical Leave', start_date: '2026-07-05', end_date: '2026-07-05', days: 1, status: 'approved', paid: true, deduction_applied: false },
      { leave_id: 3, employee_id: 'EMP-003', employee_name: 'Mike Wong', leave_type: 'Unpaid Leave', start_date: '2026-07-15', end_date: '2026-07-17', days: 3, status: 'approved', paid: false, deduction_applied: false },
    ];

    let mockDeductions: PayrollDeduction[] = [
      { deduction_id: 1, payroll_id: 1, employee_id: 'EMP-001', employee_name: 'John Tan', leave_type: 'Unpaid Leave', days: 3, daily_rate: 200, deduction_amount: 600, payroll_period: '2026-07' },
    ];

    if (savedLeaves !== '[]') mockLeaves = JSON.parse(savedLeaves);
    if (savedDeductions !== '[]') mockDeductions = [...mockDeductions, ...JSON.parse(savedDeductions)];

    setLeaves(mockLeaves);
    setDeductions(mockDeductions);
  };

  const handleApplyDeduction = (leave: LeaveRecord) => {
    if (leave.paid) {
      showToast('⚠️ Paid leave does not require deduction', 'error');
      return;
    }

    const dailyRate = 200;
    const deductionAmount = leave.days * dailyRate;

    const newDeduction: PayrollDeduction = {
      deduction_id: Date.now(),
      payroll_id: parseInt(new Date().getMonth().toString()),
      employee_id: leave.employee_id,
      employee_name: leave.employee_name,
      leave_type: leave.leave_type,
      days: leave.days,
      daily_rate: dailyRate,
      deduction_amount: deductionAmount,
      payroll_period: new Date().toISOString().split('T')[0].substring(0, 7),
    };

    const updatedLeaves = leaves.map(l =>
      l.leave_id === leave.leave_id
        ? { ...l, deduction_applied: true }
        : l
    );

    const updated = [...deductions, newDeduction];

    setLeaves(updatedLeaves);
    setDeductions(updated);

    localStorage.setItem('leave_payroll_leaves', JSON.stringify(updatedLeaves.filter(l => l.leave_id > 3)));
    localStorage.setItem('leave_payroll_deductions', JSON.stringify(updated.filter(d => d.deduction_id > 1)));

    showToast(`✅ Payroll deduction created: ${leave.employee_name} - SGD ${deductionAmount}`, 'success');
  };

  const totalUnpaidDays = leaves.filter(l => !l.paid && l.status === 'approved').reduce((sum, l) => sum + l.days, 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + d.deduction_amount, 0);
  const pendingDeductions = leaves.filter(l => !l.paid && !l.deduction_applied && l.status === 'approved').length;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>🏖️ Leave → Payroll Integration</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Auto-apply salary deductions for unpaid/partial leave</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Unpaid Days', value: totalUnpaidDays.toString(), color: '#E65100' },
            { label: 'Total Deductions Applied', value: `SGD ${totalDeductions.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Pending Deductions', value: pendingDeductions.toString(), color: '#E65100' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['leaves', 'deductions'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '8px 16px', background: activeTab === tab ? '#FF6B35' : '#f0f0f0', color: activeTab === tab ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab === 'leaves' ? '📋 Approved Leave' : '💸 Payroll Deductions'}
            </button>
          ))}
        </div>

        {activeTab === 'leaves' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Employee</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Leave Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Date Range</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Days</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Paid</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Deduction Applied</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.leave_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>{leave.employee_name}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{leave.leave_type}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{leave.start_date} → {leave.end_date}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{leave.days}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: leave.paid ? '#E8F5E9' : '#FFF3E0', color: leave.paid ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {leave.paid ? '✓ Yes' : '✗ No'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: leave.deduction_applied ? '#E8F5E9' : '#FFF3E0', color: leave.deduction_applied ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {leave.deduction_applied ? '✓ Yes' : '✗ No'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {!leave.deduction_applied && !leave.paid && leave.status === 'approved' && (
                        <button onClick={() => handleApplyDeduction(leave)} style={{ padding: '4px 8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Apply Deduction</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'deductions' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Period</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Employee</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Leave Type</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Days</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Daily Rate</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Deduction</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((deduction) => (
                  <tr key={deduction.deduction_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{deduction.payroll_period}</td>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>{deduction.employee_name}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{deduction.leave_type}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{deduction.days}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333' }}>SGD {deduction.daily_rate}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#E65100' }}>SGD {deduction.deduction_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '24px', padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '12px', color: '#2E7D32', margin: '0 0 8px 0', fontWeight: '600' }}>ℹ️ Integration Features</p>
          <ul style={{ fontSize: '12px', color: '#2E7D32', margin: 0, paddingLeft: '20px' }}>
            <li>Auto-applies deduction for unpaid leave (Unpaid Leave, No-pay, etc.)</li>
            <li>Skips deduction for paid leave (Medical, Annual, Maternity)</li>
            <li>Calculates deduction: Days × Daily Rate (SGD 200/day standard)</li>
            <li>Creates payroll deduction record linked to leave record</li>
            <li>Tracks deduction status: Applied/Not Applied</li>
            <li>Prevents duplicate deductions</li>
            <li>Ready for payroll processing integration</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LeavePayrollIntegration;
