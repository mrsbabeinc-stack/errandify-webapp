import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Safety monitoring, from `GET /api/safety/flags` and `GET /api/admin/users`.
 *
 * Both endpoints already existed and were admin-guarded. This screen called
 * neither: it rendered five invented users ("Sarah Tan", "Bob Chen") and three
 * invented alerts ("1 user flagged for harassment"), with Review/Investigate
 * buttons that did nothing. An admin reading it would believe the platform had
 * incidents it did not have — and would never see the ones it did, because the
 * real queue was never fetched.
 *
 * Resolving a flag posts to `/api/safety/flags/:id/resolve`, the same endpoint
 * the support tooling uses, so a resolution here is the real one.
 *
 * "Export Users" is gone. There is no export endpoint, and a bulk export of
 * personal data needs a decided lawful basis and a retention answer before it
 * should exist at all — not a button wired to nothing.
 */

interface SafetyFlag {
  id: number;
  user_id: number;
  errand_id: number | null;
  flag_type: string;
  severity: string;
  ai_confidence: number;
  description: string | null;
  reported_at: string;
  resolved_at: string | null;
  resolution_type: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  reputation: number | null;
  last_active_at: string | null;
}

const SEVERITY: Record<string, { bg: string; border: string; label: string }> = {
  critical: { bg: '#FEE2E2', border: '#F44336', label: '🚨 Critical' },
  high: { bg: '#FFF8F5', border: '#FF6B35', label: '⚠️ High' },
  medium: { bg: '#FFF9F5', border: '#FFD9B3', label: '🔍 Medium' },
  low: { bg: '#F5F5F5', border: '#BDBDBD', label: 'Low' },
};

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-SG') : '—');

export const UsersSafetyPage: React.FC = () => {
  const { toasts, showToast, removeToast } = useToast();
  const [flags, setFlags] = useState<SafetyFlag[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  // useToast() returns a new showToast each render; a ref keeps `load` stable
  // so the mount effect does not re-fire on every render.
  const toast = useRef(showToast);
  toast.current = showToast;

  const load = useCallback(async (resolved: boolean) => {
    setLoading(true);
    try {
      const [fRes, uRes] = await Promise.all([
        fetch(`/api/safety/flags?status=${resolved ? 'resolved' : 'unresolved'}`, { headers: auth() }),
        fetch('/api/admin/users', { headers: auth() }),
      ]);
      const fBody = await fRes.json();
      const uBody = await uRes.json();
      if (!fRes.ok) throw new Error(fBody?.error || `Flags failed (${fRes.status})`);
      if (!uRes.ok) throw new Error(uBody?.error || `Users failed (${uRes.status})`);
      setFlags(fBody.data?.flags || []);
      setUsers(uBody.data || []);
    } catch (err) {
      toast.current(`⚠️ ${(err as Error).message}`, 'error');
      setFlags([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(showResolved); }, [showResolved, load]);

  const resolve = async (flag: SafetyFlag, resolutionType: string) => {
    const notes = window.prompt(
      `Resolving flag #${flag.id} as "${resolutionType.replace(/_/g, ' ')}".\n\nNote — what was decided and why:`
    );
    if (notes === null) return; // cancelled
    if (!notes.trim()) {
      showToast('❌ A note is required — it is the record of the decision', 'error');
      return;
    }
    setBusyId(flag.id);
    try {
      const res = await fetch(`/api/safety/flags/${flag.id}/resolve`, {
        method: 'POST',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionType, notes: notes.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
      showToast(`✅ Flag #${flag.id} resolved`, 'success');
      await load(showResolved);
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const restricted = users.filter(u => u.status !== 'active');
  const counts = {
    critical: flags.filter(f => f.severity === 'critical').length,
    high: flags.filter(f => f.severity === 'high').length,
    other: flags.filter(f => !['critical', 'high'].includes(f.severity)).length,
  };

  const card: React.CSSProperties = {
    padding: '16px', background: '#fff', border: '2px solid #FFD9B3', borderRadius: '8px',
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: '#333' }}>
            🛡️ Safety Monitoring
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Flags raised against users and errands, and accounts currently restricted.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {([
            ['Critical', counts.critical, '#F44336'],
            ['High', counts.high, '#FF6B35'],
            ['Other', counts.other, '#FFB74D'],
            ['Restricted accounts', restricted.length, '#E2736B'],
          ] as [string, number, string][]).map(([label, n, colour]) => (
            <div key={label} style={{ ...card, borderColor: colour }}>
              <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: colour }}>{n}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FF6B35' }}>
            {showResolved ? 'Resolved flags' : 'Open flags'}
          </h2>
          <button
            onClick={() => setShowResolved(v => !v)}
            style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Show {showResolved ? 'open' : 'resolved'}
          </button>
        </div>

        {loading ? (
          <div style={card}>Loading…</div>
        ) : flags.length === 0 ? (
          <div style={card}>
            {showResolved ? 'No flags have been resolved yet.' : '✅ No open safety flags.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {flags.map(f => {
              const sev = SEVERITY[f.severity] || SEVERITY.low;
              return (
                <div key={f.id} style={{ ...card, background: sev.bg, borderColor: sev.border }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#333' }}>{sev.label} · {f.flag_type}</strong>
                    <span style={{ fontSize: '11px', color: '#888' }}>#{f.id}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#555', margin: '8px 0', lineHeight: 1.4 }}>
                    {f.description || 'No description recorded.'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    user {f.user_id}
                    {f.errand_id ? ` · errand ${f.errand_id}` : ''}
                    {' · '}confidence {Math.round(Number(f.ai_confidence) * 100)}%
                    {' · '}{fmt(f.reported_at)}
                  </div>
                  {f.resolved_at ? (
                    <div style={{ fontSize: '12px', color: '#2E7D32', marginTop: '10px', fontWeight: 600 }}>
                      ✓ {f.resolution_type} · {fmt(f.resolved_at)}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {['action_taken', 'no_action', 'false_positive'].map(t => (
                        <button
                          key={t}
                          disabled={busyId === f.id}
                          onClick={() => resolve(f, t)}
                          style={{ padding: '6px 10px', background: sev.border, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {busyId === f.id ? '…' : t.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#FF6B35' }}>
            Restricted accounts ({restricted.length})
          </h2>
          {loading ? (
            <div style={card}>Loading…</div>
          ) : restricted.length === 0 ? (
            <div style={card}>No accounts are suspended or banned.</div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '2px solid #FFD9B3', background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FFF8F5', borderBottom: '2px solid #FFD9B3' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Reputation', 'Last active'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#FF6B35', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {restricted.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #FFE6D9', background: i % 2 === 0 ? '#fff' : '#FFF8F5' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#333' }}>{u.name}</td>
                      <td style={{ padding: '12px 14px', color: '#666' }}>{u.email || '—'}</td>
                      <td style={{ padding: '12px 14px', color: '#666' }}>{u.role}</td>
                      <td style={{ padding: '12px 14px', color: '#c62828', fontWeight: 600 }}>{u.status}</td>
                      <td style={{ padding: '12px 14px' }}>{u.reputation ?? '—'}</td>
                      <td style={{ padding: '12px 14px', color: '#666' }}>{fmt(u.last_active_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default UsersSafetyPage;
