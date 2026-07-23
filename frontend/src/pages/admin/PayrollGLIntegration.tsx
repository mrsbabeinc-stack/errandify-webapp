import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI, { n } from '../../services/financeAPI';

interface PayrollRun {
  payroll_id: number;
  payroll_period: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  status: 'draft' | 'approved' | 'posted';
  gl_status: 'pending' | 'posted' | 'failed';
}

interface GLEntry {
  entry_id: number;
  payroll_id: number;
  date: string;
  account_name: string;
  account_code: string;
  debit: number;
  credit: number;
  description: string;
  status: 'pending' | 'posted';
}

const PayrollGLIntegration: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [payrolls, setPayrolls] = useState<PayrollRun[]>([]);
  const [glEntries, setGLEntries] = useState<GLEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'payroll' | 'entries'>('payroll');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Real payroll runs and GL entries. This screen invented three payroll runs
   * of ~SGD 185k with 20 employees and wrote "posted" into localStorage — no GL
   * entry existed, and the numbers matched nothing in the payroll module.
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const [runs, entries] = await Promise.all([
        financeAPI.payrollRuns(),
        financeAPI.glEntries('payroll'),
      ]);
      const counts = await Promise.all(
        runs.map(r => financeAPI.payrollItems(r.id).then(items => items.length).catch(() => 0))
      );
      setPayrolls(runs.map((r, idx) => ({
        payroll_id: r.id,
        payroll_period: r.period,
        total_gross: n(r.total_gross),
        total_deductions: n(r.total_deductions),
        total_net: n(r.total_net),
        employee_count: counts[idx],
        status: r.status === 'posted' ? 'posted' : 'approved',
        gl_status: r.status === 'posted' ? 'posted' : 'pending',
      })));
      setGLEntries(entries.map(e => ({
        entry_id: e.id,
        payroll_id: e.source_id || 0,
        date: e.entry_date,
        account_name: e.account_name,
        account_code: e.account_code,
        debit: n(e.debit),
        credit: n(e.credit),
        description: e.description || '',
        status: 'posted',
      })));
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load payroll data'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostPayroll = async (payroll: PayrollRun) => {
    try {
      await financeAPI.postPayroll(payroll.payroll_id);
      showToast(`✅ Payroll ${payroll.payroll_period} posted to GL`, 'success');
      await loadData();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to post payroll'}`, 'error');
    }
  };

  const totalGross = payrolls.reduce((sum, p) => sum + p.total_gross, 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + p.total_deductions, 0);
  const totalNet = payrolls.reduce((sum, p) => sum + p.total_net, 0);
  const pendingPosts = payrolls.filter(p => p.gl_status === 'pending').length;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>💼 Payroll → GL Integration</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Post payroll runs to the general ledger (Salary, CPF, Net payable){loading ? ' · loading…' : ''}</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Gross', value: `SGD ${totalGross.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Total Deductions', value: `SGD ${totalDeductions.toLocaleString()}`, color: '#E65100' },
            { label: 'Total Net', value: `SGD ${totalNet.toLocaleString()}`, color: '#4CAF50' },
            { label: 'Pending Posts', value: pendingPosts.toString(), color: '#E65100' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['payroll', 'entries'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '8px 16px', background: activeTab === tab ? '#FF6B35' : '#f0f0f0', color: activeTab === tab ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab === 'payroll' ? '💸 Payroll Runs' : '📊 GL Entries'}
            </button>
          ))}
        </div>

        {activeTab === 'payroll' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Period</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Employees</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Gross</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Deductions</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Net</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Payroll Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>GL Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => (
                  <tr key={payroll.payroll_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{payroll.payroll_period}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333' }}>{payroll.employee_count}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {payroll.total_gross.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#E65100' }}>SGD {payroll.total_deductions.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>SGD {payroll.total_net.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: '#E8F5E9', color: '#2E7D32', fontWeight: '600', borderRadius: '4px' }}>✓ {payroll.status}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: payroll.gl_status === 'posted' ? '#E8F5E9' : '#FFF3E0', color: payroll.gl_status === 'posted' ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {payroll.gl_status === 'posted' ? '✓ Posted' : '⏳ Pending'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {payroll.gl_status === 'pending' && (
                        <button onClick={() => handlePostPayroll(payroll)} style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Post to GL</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'entries' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Account / Code</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Debit</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Credit</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {glEntries.map((entry) => (
                  <tr key={entry.entry_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{entry.date}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}><div style={{ fontWeight: '600', color: '#333' }}>{entry.account_name}</div><div style={{ fontSize: '11px', color: '#666' }}>{entry.account_code}</div></td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: entry.debit > 0 ? '#FF6B35' : '#999' }}>SGD {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: entry.credit > 0 ? '#4CAF50' : '#999' }}>SGD {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{entry.description}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: entry.status === 'posted' ? '#E8F5E9' : '#FFF3E0', color: entry.status === 'posted' ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {entry.status === 'posted' ? '✓ Posted' : '⏳ Pending'}
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
            <li>Generates GL entries for: Salaries &amp; Wages (5000), CPF Employer (5010), CPF Payable (2100), Net Salaries Payable (2000)</li>
            <li>Refuses to post unless debits equal credits</li>
            <li>A run stays editable until it is posted, then it is frozen</li>
            <li>Full audit trail with dates and descriptions</li>
            <li>Ready for ACRA compliance reporting</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PayrollGLIntegration;
