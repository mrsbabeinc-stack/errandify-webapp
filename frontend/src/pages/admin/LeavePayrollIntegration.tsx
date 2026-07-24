import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI, { n } from '../../services/financeAPI';

interface LeaveRecord {
  leave_id: number;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  calendar_days: number;
  daily_rate: number;
  suggested_deduction: number;
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
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  /**
   * Real approved leave and the deductions raised against it. The old screen
   * invented three employees and priced every deduction at a hardcoded SGD 200
   * a day regardless of who it was — the rate now comes from the staff member's
   * own base salary over 22 working days, computed server-side.
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const [candidates, existing] = await Promise.all([
        financeAPI.leaveDeductionCandidates(period),
        financeAPI.listDeductions(),
      ]);
      setLeaves(candidates.map(l => ({
        leave_id: l.id,
        employee_id: l.staff_id,
        employee_name: l.staff_name,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date,
        days: l.days,
        calendar_days: l.calendar_days,
        daily_rate: l.daily_rate,
        suggested_deduction: l.suggested_deduction,
        status: 'approved',
        paid: !l.is_unpaid,
        deduction_applied: !!l.deduction_id,
      })));
      setDeductions(existing.map(d => ({
        deduction_id: d.id,
        payroll_id: 0,
        employee_id: d.staff_id,
        employee_name: d.staff_name,
        leave_type: d.leave_type,
        days: n(d.unpaid_days),
        daily_rate: n(d.daily_rate),
        deduction_amount: n(d.amount),
        payroll_period: d.period,
      })));
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load leave data'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDeduction = async (leave: LeaveRecord) => {
    if (leave.paid) {
      showToast('⚠️ Paid leave does not require deduction', 'error');
      return;
    }
    try {
      const deduction = await financeAPI.createLeaveDeduction(leave.leave_id);
      showToast(
        `✅ Deduction created: ${leave.employee_name} — SGD ${n(deduction.amount).toLocaleString()}`,
        'success'
      );
      await loadData();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to create deduction'}`, 'error');
    }
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
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Price unpaid leave against the staff member's own daily rate and carry it into payroll{loading ? ' · loading…' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              title="Leave starting in this month"
              style={{ padding: '8px 10px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px' }}
            />
            <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
          </div>
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
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Working days</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Daily rate</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Deduction</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Paid</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Applied</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.leave_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>{leave.employee_name}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{leave.leave_type}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{leave.start_date} → {leave.end_date}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>
                      {leave.days}
                      {leave.calendar_days !== leave.days && (
                        <div style={{ fontSize: '10px', fontWeight: 400, color: '#999' }}>
                          of {leave.calendar_days} calendar
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#666' }}>
                      SGD {leave.daily_rate.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: leave.paid ? '#999' : '#E65100' }}>
                      {leave.paid ? '—' : `SGD ${leave.suggested_deduction.toLocaleString('en-SG', { minimumFractionDigits: 2 })}`}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: leave.paid ? '#E8F5E9' : '#FFF3E0', color: leave.paid ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {leave.paid ? '✓ Yes' : '✗ No'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: leave.deduction_applied ? '#E8F5E9' : '#FFF3E0', color: leave.deduction_applied ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {leave.deduction_applied ? '✓ Yes' : '✗ No'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {!leave.deduction_applied && !leave.paid && leave.status === 'approved' && (
                        <button onClick={() => handleApplyDeduction(leave)} style={{ padding: '4px 8px', background: '#F0A81E', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Apply Deduction</button>
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
            <li>Raises a deduction for approved unpaid leave, when you click Apply</li>
            <li>Skips paid leave (medical, annual, maternity) — that pay is already in the salary</li>
            <li>Counts working days only: weekends and gazetted holidays inside the leave are not deducted</li>
            <li>Travelling, food and housing allowances are excluded from the gross rate, as the Act requires</li>
            <li>Deduction = working days × the staff member's daily gross rate of pay, i.e. 12 × monthly gross ÷ (52 × 5) per the Employment Act</li>
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
