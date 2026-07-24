import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Admin access, backed by `users.role`.
 *
 * This screen used to keep its own list in localStorage under 'adminUsers',
 * seeded with a demo row. Create, Deactivate, Delete and the 2FA toggle only
 * edited that blob: they granted nobody access and revoked nobody's, while
 * looking exactly as though they had. The backend they would have called wrote
 * to an `admin_users` table that does not exist in this database.
 *
 * Only one thing actually decides who is an admin — `users.role`, which
 * requireAdmin() reads on every guarded route — so this screen reads and writes
 * that, and nothing else. A second store would have been a second answer to
 * "who is an admin" that granted nobody anything.
 *
 * Two things the old screen offered are gone rather than reimplemented:
 *  - Creating an admin from an email and a temporary password. Accounts are
 *    created by signing up through Singpass; there is no password to set. You
 *    grant access to someone who already has an account.
 *  - The 2FA toggle and the "Security Settings" checkboxes. Nothing backed any
 *    of them — they were `defaultChecked` with no handler — and a security
 *    control that reports "enabled" while enforcing nothing is worse than one
 *    that is absent.
 */

const ROLE_LABELS: Record<string, { name: string; description: string }> = {
  admin: {
    name: 'Admin',
    description: 'Full back-office access, including granting and revoking admin access',
  },
  support_l2: {
    name: 'Support L2',
    description: 'Front-line support: cases and user help',
  },
  support_l3: {
    name: 'Support L3',
    description: 'Senior support: escalations, disputes, moderation',
  },
};

interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  last_active_at: string | null;
  created_at: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
}

const api = async (path: string, init: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-SG') : '—');

export default function AdminAuthManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<string[]>(Object.keys(ROLE_LABELS));
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showGrant, setShowGrant] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [grantRole, setGrantRole] = useState('support_l2');

  // useToast() builds a new showToast on every render, so depending on it here
  // would give useCallback a new identity each time, the mount effect would
  // re-fire on every render, and the screen would load forever. Reach it
  // through a ref so `load` can be created once.
  const toast = useRef(showToast);
  toast.current = showToast;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await api('/api/admin/admin-users');
      setAdmins(body.data || []);
      if (body.roles?.length) setRoles(body.roles);
    } catch (err) {
      toast.current(`⚠️ ${(err as Error).message}`, 'error');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const searchCandidates = async () => {
    if (candidateSearch.trim().length < 2) {
      showToast('Type at least 2 characters to search', 'warning');
      return;
    }
    setSearching(true);
    try {
      const body = await api(`/api/admin/users?search=${encodeURIComponent(candidateSearch.trim())}`);
      // Anyone who already holds an admin role is managed in the table below.
      setCandidates((body.data || []).filter((u: Candidate) => !roles.includes(u.role)));
      setSearched(true);
    } catch (err) {
      showToast(`⚠️ ${(err as Error).message}`, 'error');
    } finally {
      setSearching(false);
    }
  };

  const setRole = async (userId: string, role: string, name: string) => {
    setBusyId(userId);
    try {
      await api(`/api/admin/admin-users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      showToast(`✅ ${name} is now ${ROLE_LABELS[role]?.name || role}`, 'success');
      setShowGrant(false);
      setCandidates([]);
      setCandidateSearch('');
      setSearched(false);
      await load();
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`, 'error');
      await load(); // the select is now out of step with the server
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (admin: AdminUser) => {
    // Describes what actually happens: the account is kept, only access goes.
    if (!window.confirm(
      `Remove admin access from ${admin.name}?\n\n` +
      `Their account stays, along with their errands and history. ` +
      `They lose all back-office access.`
    )) return;
    setBusyId(admin.id);
    try {
      await api(`/api/admin/admin-users/${admin.id}/role`, { method: 'DELETE' });
      showToast(`✅ Admin access removed from ${admin.name}`, 'success');
      await load();
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const card: React.CSSProperties = {
    padding: '16px', background: '#fff', border: '2px solid #FFD9B3',
    borderRadius: '8px', marginBottom: '16px',
  };
  const btn = (bg: string): React.CSSProperties => ({
    padding: '9px 15px', background: bg, color: '#fff', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  });

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333', margin: 0 }}>🔐 Admin Access</h2>
            <button onClick={() => navigate(-1)} title="Go back"
              style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: 700, padding: '0 8px' }}>
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Who can reach the back office. Changes here take effect on that person's next request.
          </p>
        </div>

        <div style={{ ...card, background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', color: '#666' }}>
              <strong style={{ color: '#333', fontSize: '15px' }}>{admins.length}</strong>
              {' '}account{admins.length === 1 ? '' : 's'} with back-office access
            </div>
            <button style={btn('#FF6B35')} onClick={() => setShowGrant(v => !v)}>
              {showGrant ? 'Cancel' : '+ Grant admin access'}
            </button>
          </div>

          {showGrant && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #FFD9B3' }}>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0' }}>
                Find an existing account. Accounts are created through Singpass sign-up — here you grant access to
                someone who already has one.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <input
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchCandidates(); }}
                  placeholder="Search by name or email"
                  style={{ flex: '1 1 240px', padding: '9px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px' }}
                />
                <select value={grantRole} onChange={e => setGrantRole(e.target.value)}
                  style={{ padding: '9px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]?.name || r}</option>)}
                </select>
                <button style={btn('#F0A81E')} onClick={searchCandidates} disabled={searching}>
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px 0' }}>
                {ROLE_LABELS[grantRole]?.description}
              </p>

              {candidates.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #FFE4C4', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px' }}>
                    <strong>{c.name}</strong>
                    <span style={{ color: '#888' }}> · {c.email || 'no email'} · currently {c.role}</span>
                    {c.status !== 'active' && (
                      <span style={{ color: '#f44336', fontWeight: 600 }}> · {c.status}</span>
                    )}
                  </div>
                  <button
                    style={{ ...btn('#4CAF50'), opacity: c.status === 'active' ? 1 : 0.5 }}
                    disabled={busyId === c.id || c.status !== 'active'}
                    title={c.status !== 'active' ? `Cannot grant access to a ${c.status} account` : undefined}
                    onClick={() => setRole(c.id, grantRole, c.name)}
                  >
                    {busyId === c.id ? 'Working…' : `Grant ${ROLE_LABELS[grantRole]?.name || grantRole}`}
                  </button>
                </div>
              ))}
              {searched && !searching && candidates.length === 0 && (
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  No matching accounts without back-office access.
                </p>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div style={card}>Loading…</div>
        ) : admins.length === 0 ? (
          <div style={card}>No accounts have back-office access.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FFD9B3', borderBottom: '2px solid #FF6B35' }}>
                  {['Name', 'Email', 'Role', 'Status', 'Last active', ''].map(h => (
                    <th key={h} style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#333' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #FFD9B3', background: i % 2 === 0 ? '#fff' : '#FFF8F5' }}>
                    <td style={{ padding: '10px' }}>{a.name}</td>
                    <td style={{ padding: '10px', color: '#666' }}>{a.email || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <select
                        value={a.role}
                        disabled={busyId === a.id}
                        onChange={e => setRole(a.id, e.target.value, a.name)}
                        style={{ padding: '5px 8px', border: '1px solid #FFD9B3', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#FF6B35', cursor: 'pointer' }}
                      >
                        {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]?.name || r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 600,
                        background: a.status === 'active' ? '#E8F5E9' : '#F5F5F5',
                        color: a.status === 'active' ? '#2E7D32' : '#999',
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#666' }}>{fmt(a.last_active_at)}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button style={{ ...btn('#f44336'), padding: '6px 11px' }} disabled={busyId === a.id} onClick={() => revoke(a)}>
                        {busyId === a.id ? 'Working…' : 'Remove access'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ ...card, marginTop: '20px', background: '#FFF8F5' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#333', margin: '0 0 10px 0' }}>What each role reaches</h3>
          {roles.map(r => (
            <p key={r} style={{ fontSize: '13px', color: '#666', margin: '0 0 6px 0' }}>
              <strong style={{ color: '#FF6B35' }}>{ROLE_LABELS[r]?.name || r}</strong>
              {' — '}{ROLE_LABELS[r]?.description || 'Back-office access'}
            </p>
          ))}
          <p style={{ fontSize: '12px', color: '#888', margin: '12px 0 0 0' }}>
            You cannot change your own role, and the last active Admin cannot have access removed. Both are
            enforced by the server, not just hidden in this page.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
