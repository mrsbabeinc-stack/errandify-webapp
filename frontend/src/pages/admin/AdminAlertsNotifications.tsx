import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Operational alerts, running on live platform metrics.
 *
 * Everything here used to live in localStorage. The rules were things like
 * "API response time > 5s" and "Failed login attempts > 10/hour" — neither of
 * which this application measures — so no rule could have fired whatever was
 * stored, and nothing evaluated one anyway. There were also "On-call schedule"
 * and "Notification templates" tabs holding invented rosters and phone numbers.
 *
 * What replaced it:
 *  - Metrics come from a registry in services/alertMetrics.ts, and every entry
 *    is a query over the database — open disputes, unresolved safety flags,
 *    errands about to expire unfilled, staff who cannot be paid. The dropdown
 *    below is that registry, so a rule can only be written about something the
 *    platform genuinely observes about itself. The server rejects anything else.
 *  - Rules are evaluated by cron every 15 minutes. A breach notifies every
 *    active admin through the normal notification path and writes a row to
 *    alert_events, which is the History tab — real firings with the value
 *    observed at the time.
 *
 * On-call and templates are gone rather than reconnected: there is no paging
 * integration and no template engine behind them to connect to.
 */

interface Metric {
  key: string;
  label: string;
  description: string;
  unit: string;
  value: number | null;
}

interface Rule {
  id: number;
  name: string;
  metric_key: string;
  comparator: string;
  threshold: string;
  severity: string;
  enabled: boolean;
  cooldown_minutes: number;
  last_fired_at: string | null;
  last_value: string | null;
  fire_count: number;
  created_by_name: string | null;
}

interface AlertEvent {
  id: number;
  rule_name: string;
  metric_key: string;
  observed: string;
  threshold: string;
  comparator: string;
  severity: string;
  admins_notified: number;
  fired_at: string;
}

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-SG') : '—');

const SEV: Record<string, string> = { info: '#2196F3', warning: '#FF9800', critical: '#F44336' };

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...auth() },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export default function AdminAlertsNotifications() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [tab, setTab] = useState<'metrics' | 'rules' | 'history'>('metrics');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', metric_key: '', comparator: '>', threshold: '0',
    severity: 'warning', cooldown_minutes: '60',
  });

  // useToast() returns a new showToast each render; a ref keeps `load` stable.
  const toast = useRef(showToast);
  toast.current = showToast;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r, e] = await Promise.all([
        api('/api/admin/alert-metrics'),
        api('/api/admin/alert-rules'),
        api('/api/admin/alert-events'),
      ]);
      setMetrics(m.data || []);
      setRules(r.data || []);
      setEvents(e.data || []);
      setForm(f => (f.metric_key ? f : { ...f, metric_key: m.data?.[0]?.key || '' }));
    } catch (err) {
      toast.current(`⚠️ ${(err as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createRule = async () => {
    if (!form.name.trim()) { showToast('❌ Give the rule a name', 'error'); return; }
    setBusy(true);
    try {
      await api('/api/admin/alert-rules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          metric_key: form.metric_key,
          comparator: form.comparator,
          threshold: Number(form.threshold),
          severity: form.severity,
          cooldown_minutes: Number(form.cooldown_minutes),
        }),
      });
      showToast('✅ Rule created — it will be evaluated within 15 minutes', 'success');
      setShowForm(false);
      setForm({ ...form, name: '', threshold: '0' });
      await load();
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`, 'error');
    } finally { setBusy(false); }
  };

  const toggle = async (r: Rule) => {
    setBusy(true);
    try {
      await api(`/api/admin/alert-rules/${r.id}`, {
        method: 'PATCH', body: JSON.stringify({ enabled: !r.enabled }),
      });
      await load();
    } catch (err) { showToast(`❌ ${(err as Error).message}`, 'error'); }
    finally { setBusy(false); }
  };

  const testRule = async (r: Rule) => {
    setBusy(true);
    try {
      const body = await api(`/api/admin/alert-rules/${r.id}/test`, { method: 'POST' });
      const d = body.data;
      if (d.error) showToast(`⚠️ ${d.error}`, 'warning');
      else if (d.breached) showToast(`🔔 Would fire now — observed ${d.observed}, threshold ${d.threshold}`, 'warning');
      else showToast(`✅ Not breached — observed ${d.observed}, threshold ${d.threshold}`, 'success');
    } catch (err) { showToast(`❌ ${(err as Error).message}`, 'error'); }
    finally { setBusy(false); }
  };

  const removeRule = async (r: Rule) => {
    if (!window.confirm(`Delete "${r.name}"? Its firing history is deleted with it.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/alert-rules/${r.id}`, { method: 'DELETE' });
      showToast('✅ Rule deleted', 'success');
      await load();
    } catch (err) { showToast(`❌ ${(err as Error).message}`, 'error'); }
    finally { setBusy(false); }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const body = await api('/api/admin/alert-rules/evaluate', { method: 'POST' });
      const d = body.data;
      showToast(`Checked ${d.checked} · fired ${d.fired} · in cooldown ${d.skippedCooldown}`, 'info');
      await load();
    } catch (err) { showToast(`❌ ${(err as Error).message}`, 'error'); }
    finally { setBusy(false); }
  };

  const card: React.CSSProperties = {
    padding: '14px', background: '#fff', border: '2px solid #FFD9B3', borderRadius: '8px',
  };
  const th: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 700,
    color: '#FF6B35', textTransform: 'uppercase',
  };
  const input: React.CSSProperties = {
    padding: '8px 10px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px',
  };
  const metricOf = (k: string) => metrics.find(m => m.key === k);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333', margin: 0 }}>🔔 Operational Alerts</h2>
            <button onClick={() => navigate(-1)} title="Go back"
              style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: 700 }}>
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Rules run against live platform data every 15 minutes. A breach notifies every active admin.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', borderBottom: '2px solid #FFD9B3' }}>
          {([['metrics', '📊 Live metrics'], ['rules', '⚙️ Rules'], ['history', '📜 History']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: tab === k ? '#FFD9B3' : 'transparent', color: tab === k ? '#333' : '#888',
                borderRadius: '6px 6px 0 0',
              }}>
              {label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', paddingBottom: '6px' }}>
            <button onClick={runNow} disabled={busy}
              style={{ padding: '8px 14px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              {busy ? 'Working…' : 'Evaluate now'}
            </button>
          </div>
        </div>

        {loading && <div style={card}>Loading…</div>}

        {!loading && tab === 'metrics' && (
          <>
            <p style={{ fontSize: '13px', color: '#666', marginTop: 0 }}>
              These are the only things a rule can be written about — each one is a query over the database.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {metrics.map(m => (
                <div key={m.key} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{m.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: m.value === null ? '#999' : '#FF6B35' }}>
                      {m.value === null ? 'n/a' : m.value}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>{m.description}</div>
                  <code style={{ fontSize: '10px', color: '#bbb' }}>{m.key}</code>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && tab === 'rules' && (
          <>
            <div style={{ marginBottom: '14px' }}>
              <button onClick={() => setShowForm(v => !v)}
                style={{ padding: '9px 15px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {showForm ? 'Cancel' : '+ New rule'}
              </button>
            </div>

            {showForm && (
              <div style={{ ...card, marginBottom: '16px', background: '#FFF8F5' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <input style={input} placeholder="Rule name" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                  <select style={input} value={form.metric_key}
                    onChange={e => setForm({ ...form, metric_key: e.target.value })}>
                    {metrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                  <select style={input} value={form.comparator}
                    onChange={e => setForm({ ...form, comparator: e.target.value })}>
                    {['>', '>=', '<', '<=', '='].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input style={input} type="number" placeholder="Threshold" value={form.threshold}
                    onChange={e => setForm({ ...form, threshold: e.target.value })} />
                  <select style={input} value={form.severity}
                    onChange={e => setForm({ ...form, severity: e.target.value })}>
                    {['info', 'warning', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input style={input} type="number" placeholder="Cooldown (min)" value={form.cooldown_minutes}
                    onChange={e => setForm({ ...form, cooldown_minutes: e.target.value })} />
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  Currently <strong>{metricOf(form.metric_key)?.value ?? 'n/a'}</strong>
                  {' — '}alerts when {form.comparator} {form.threshold}.
                  {' '}Re-alerts at most once every {form.cooldown_minutes} minutes.
                </div>
                <button onClick={createRule} disabled={busy}
                  style={{ padding: '9px 15px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  {busy ? 'Working…' : 'Create rule'}
                </button>
              </div>
            )}

            {rules.length === 0 ? (
              <div style={card}>No alert rules yet. Add one from a metric on the Live metrics tab.</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FFF8F5', borderBottom: '2px solid #FFD9B3' }}>
                      {['Rule', 'Condition', 'Now', 'Severity', 'Last fired', 'Fires', ''].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #FFE6D9', background: i % 2 ? '#FFF8F5' : '#fff', opacity: r.enabled ? 1 : 0.55 }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          {r.name}
                          {!r.enabled && <span style={{ color: '#999', fontWeight: 400 }}> (disabled)</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>
                          {metricOf(r.metric_key)?.label || r.metric_key} {r.comparator} {Number(r.threshold)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#FF6B35' }}>
                          {metricOf(r.metric_key)?.value ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 700, background: SEV[r.severity], color: '#fff' }}>
                            {r.severity}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{fmt(r.last_fired_at)}</td>
                        <td style={{ padding: '10px 12px' }}>{r.fire_count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => testRule(r)} disabled={busy}
                            style={{ padding: '5px 9px', marginRight: '5px', background: '#FFF8F5', color: '#FF6B35', border: '1px solid #FFD9B3', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            Test
                          </button>
                          <button onClick={() => toggle(r)} disabled={busy}
                            style={{ padding: '5px 9px', marginRight: '5px', background: r.enabled ? '#FFF3E0' : '#E8F5E9', color: r.enabled ? '#E65100' : '#2E7D32', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            {r.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => removeRule(r)} disabled={busy}
                            style={{ padding: '5px 9px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            Delete
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

        {!loading && tab === 'history' && (
          events.length === 0 ? (
            <div style={card}>Nothing has fired yet. Firings are recorded here with the value observed at the time.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FFF8F5', borderBottom: '2px solid #FFD9B3' }}>
                    {['Fired at', 'Rule', 'Observed', 'Condition', 'Severity', 'Admins notified'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #FFE6D9', background: i % 2 ? '#FFF8F5' : '#fff' }}>
                      <td style={{ padding: '10px 12px', color: '#666', whiteSpace: 'nowrap' }}>{fmt(e.fired_at)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{e.rule_name}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#F44336' }}>{Number(e.observed)}</td>
                      <td style={{ padding: '10px 12px', color: '#666' }}>{e.comparator} {Number(e.threshold)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 700, background: SEV[e.severity], color: '#fff' }}>
                          {e.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{e.admins_notified}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}
