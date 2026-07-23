import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * An employee's own payslips.
 *
 * Payslips were admin-only, so getting one meant asking someone in HR to look
 * it up and send it. MOM requires an itemised payslip within three working days
 * of payment; this is where an employee gets theirs.
 *
 * Only settled runs appear — a draft run can still be regenerated, and showing
 * someone a pay figure that later moves is worse than showing nothing.
 */

interface PayslipRow {
  id: number;
  period: string;
  payment_date: string | null;
  gross_salary: string | number;
  cpf_employee: string | number;
  leave_deduction: string | number;
  total_deductions: string | number;
  net_salary: string | number;
  paid: boolean;
}

const ORANGE = '#FF6B35';
const n = (v: unknown) => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = (v: unknown) =>
  n(v).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthLabel = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
};

export const MyPayslipsPage: React.FC = () => {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [staffName, setStaffName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/staff-payslips/me/payslips', { headers: authHeaders() });
        const body = await res.json().catch(() => null);
        if (!res.ok || body?.success === false) {
          setError(body?.error || 'Could not load your payslips.');
          return;
        }
        setPayslips(body.payslips || []);
        setStaffName(body.staff_name || '');
      } catch {
        setError('We could not reach the server. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const download = async (row: PayslipRow) => {
    try {
      const res = await fetch(`/api/staff-payslips/me/payslips/${row.id}/download`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || 'Could not download that payslip.');
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${row.period}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('We could not reach the server. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F5', padding: '20px 16px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', fontSize: '20px', color: ORANGE, cursor: 'pointer', fontWeight: 700 }}
            aria-label="Go back"
          >
            ←
          </button>
          <h1 style={{ fontSize: '22px', color: '#333', margin: 0 }}>My payslips</h1>
        </div>
        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 40px' }}>
          {staffName ? `${staffName} · ` : ''}Every month you've been paid.
        </p>

        {error && (
          <div style={{
            padding: '14px', background: '#FFEBEE', border: '1px solid #C62828',
            borderRadius: '8px', fontSize: '13px', color: '#C62828', marginBottom: '16px', lineHeight: 1.6,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>Loading…</div>
        ) : payslips.length === 0 && !error ? (
          <div style={{
            padding: '32px', textAlign: 'center', background: '#fff',
            border: '2px dashed #FFD9B3', borderRadius: '12px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
            <div style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>No payslips yet</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '6px', lineHeight: 1.6 }}>
              They'll appear here once your first salary has been paid.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {payslips.map(p => {
              const open = expanded === p.id;
              return (
                <div key={p.id} style={{ background: '#fff', border: '1px solid #FFD9B3', borderRadius: '12px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpanded(open ? null : p.id)}
                    style={{
                      width: '100%', padding: '16px', background: 'none', border: 'none',
                      textAlign: 'left', cursor: 'pointer', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#333' }}>
                        {monthLabel(p.period)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        Paid {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-SG') : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: '#4CAF50' }}>
                        ${money(p.net_salary)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{open ? 'Hide' : 'Details'}</div>
                    </div>
                  </button>

                  {open && (
                    <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #FFE8D6' }}>
                      <div style={{ display: 'grid', gap: '6px', fontSize: '13px', margin: '14px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Gross pay</span>
                          <span style={{ color: '#333' }}>${money(p.gross_salary)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Your CPF contribution</span>
                          <span style={{ color: '#E65100' }}>−${money(p.cpf_employee)}</span>
                        </div>
                        {n(p.leave_deduction) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666' }}>Unpaid leave</span>
                            <span style={{ color: '#E65100' }}>−${money(p.leave_deduction)}</span>
                          </div>
                        )}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '4px', fontWeight: 700,
                        }}>
                          <span style={{ color: '#333' }}>Net pay</span>
                          <span style={{ color: '#4CAF50' }}>${money(p.net_salary)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => download(p)}
                        style={{
                          width: '100%', padding: '12px', background: ORANGE, color: '#fff',
                          border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                        }}
                      >
                        📥 Download payslip
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#999', marginTop: '20px', lineHeight: 1.6, textAlign: 'center' }}>
          Something look wrong? Tell HR — they can check it against the payroll record.
        </p>
      </div>
    </div>
  );
};

export default MyPayslipsPage;
