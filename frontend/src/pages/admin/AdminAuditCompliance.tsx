import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Audit & Compliance — real records only.
 *
 * All three tabs used to come from localStorage. The audit log listed invented
 * entries ("admin.login" from "192.168.1.1"), the GDPR tab listed invented
 * requests, and a "Compliance Reports" tab graded the platform
 * compliant / at-risk / non-compliant with a findings count. Nothing scanned
 * anything — the grades were literals in the source. A compliance screen that
 * invents its own assurance is worse than having none, so that tab is gone
 * rather than reconnected; there is no scanner behind it to connect it to.
 *
 * What replaced them:
 *  - Data requests: `GET /api/admin/data-requests`. PDPA s21 exports and s25
 *    erasures are now recorded by the endpoints that perform them, so this is a
 *    record of what actually happened rather than a list someone maintained.
 *  - Activity: `GET /api/admin/activity-log`, reading `errand_activity_log` —
 *    the trail the app genuinely writes as errands are posted, offered on,
 *    accepted and completed.
 *
 * Note a completed erasure shows no name. That is correct: the account has been
 * anonymised, and the record deliberately kept no copy of the identity it
 * removed. The id remains so the obligation can be shown to have been met.
 */

interface DataRequest {
  id: number;
  user_id: number;
  request_type: 'access' | 'erasure';
  status: string;
  requested_at: string;
  completed_at: string | null;
  outcome: string | null;
  notes: string | null;
  user_name: string | null;
}

interface ActivityRow {
  id: number;
  errand_id: number;
  activity_type: string;
  actor_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  details: any;
  created_at: string;
  errand_ref: string | null;
}

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-SG') : '—');

const TYPE_COLOUR: Record<string, string> = {
  access: '#F0A81E',
  erasure: '#F44336',
};

export default function AdminAuditCompliance() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [tab, setTab] = useState<'requests' | 'activity'>('requests');
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [types, setTypes] = useState<{ activity_type: string; n: number }[]>([]);
  const [activityType, setActivityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // useToast() returns a new showToast each render; a ref keeps `load` stable.
  const toast = useRef(showToast);
  toast.current = showToast;

  const load = useCallback(async (which: 'requests' | 'activity', filterType: string) => {
    setLoading(true);
    try {
      if (which === 'requests') {
        const res = await fetch('/api/admin/data-requests', { headers: auth() });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
        setRequests(body.data || []);
      } else {
        const qs = filterType ? `?type=${encodeURIComponent(filterType)}` : '';
        const res = await fetch(`/api/admin/activity-log${qs}`, { headers: auth() });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
        setActivity(body.data || []);
        setTypes(body.types || []);
      }
    } catch (err) {
      toast.current(`⚠️ ${(err as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab, activityType); }, [tab, activityType, load]);

  const addNote = async (r: DataRequest) => {
    const note = window.prompt(`Handling note for request #${r.id}:`, r.notes || '');
    if (note === null) return;
    if (!note.trim()) {
      showToast('❌ Note cannot be empty', 'error');
      return;
    }
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/data-requests/${r.id}/note`, {
        method: 'PATCH',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
      showToast('✅ Note saved', 'success');
      await load('requests', activityType);
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    access: requests.filter(r => r.request_type === 'access').length,
    erasure: requests.filter(r => r.request_type === 'erasure').length,
  };

  const card: React.CSSProperties = {
    padding: '16px', background: '#fff', border: '2px solid #FFD9B3', borderRadius: '8px',
  };
  const th: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 700,
    color: '#FF6B35', textTransform: 'uppercase',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333', margin: 0 }}>📋 Audit &amp; Compliance</h2>
            <button onClick={() => navigate(-1)} title="Go back"
              style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: 700, padding: '0 8px' }}>
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            PDPA data-subject requests and the platform activity trail.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #FFD9B3' }}>
          {([['requests', '🔐 Data requests'], ['activity', '📜 Activity']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: tab === k ? '#FFD9B3' : 'transparent',
                color: tab === k ? '#333' : '#888',
                borderRadius: '6px 6px 0 0',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'requests' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ ...card, borderColor: TYPE_COLOUR.access }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Access requests (s21)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: TYPE_COLOUR.access }}>{counts.access}</div>
              </div>
              <div style={{ ...card, borderColor: TYPE_COLOUR.erasure }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Erasure requests (s25)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: TYPE_COLOUR.erasure }}>{counts.erasure}</div>
              </div>
            </div>

            {loading ? (
              <div style={card}>Loading…</div>
            ) : requests.length === 0 ? (
              <div style={card}>
                No data-subject requests recorded yet. Exports and account erasures are recorded here
                automatically as they happen.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FFF8F5', borderBottom: '2px solid #FFD9B3' }}>
                      {['Type', 'User', 'Status', 'Requested', 'Completed', 'Outcome', ''].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #FFE6D9', background: i % 2 === 0 ? '#fff' : '#FFF8F5' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 700,
                            background: TYPE_COLOUR[r.request_type], color: '#fff',
                          }}>
                            {r.request_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {r.user_name || <em style={{ color: '#999' }}>anonymised</em>}
                          <span style={{ color: '#bbb' }}> #{r.user_id}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{r.status}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{fmt(r.requested_at)}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{fmt(r.completed_at)}</td>
                        <td style={{ padding: '10px 12px', color: '#555', maxWidth: '260px' }}>
                          {r.outcome || '—'}
                          {r.notes && (
                            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>📝 {r.notes}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            disabled={busyId === r.id}
                            onClick={() => addNote(r)}
                            style={{ padding: '5px 10px', background: '#FFF8F5', color: '#FF6B35', border: '1px solid #FFD9B3', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {busyId === r.id ? '…' : 'Note'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'activity' && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <select
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
                style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
              >
                <option value="">All activity</option>
                {types.map(t => (
                  <option key={t.activity_type} value={t.activity_type}>
                    {t.activity_type} ({t.n})
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div style={card}>Loading…</div>
            ) : activity.length === 0 ? (
              <div style={card}>No activity recorded.</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FFF8F5', borderBottom: '2px solid #FFD9B3' }}>
                      {['When', 'Activity', 'Actor', 'Errand', 'Details'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #FFE6D9', background: i % 2 === 0 ? '#fff' : '#FFF8F5' }}>
                        <td style={{ padding: '10px 12px', color: '#666', whiteSpace: 'nowrap' }}>{fmt(a.created_at)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#333' }}>{a.activity_type}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {a.actor_name || '—'}
                          {a.actor_role && <span style={{ color: '#999' }}> ({a.actor_role})</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#FF6B35', fontWeight: 600 }}>
                          {a.errand_ref || (a.errand_id ? `#${a.errand_id}` : '—')}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#777', fontSize: '11px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.details ? JSON.stringify(a.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
