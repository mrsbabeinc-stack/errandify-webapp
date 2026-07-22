import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * The queue behind "someone will look at this and come back to you".
 *
 * A declaration lands here when the applicant said they were not certain, left
 * the conviction date out, or came from an older client. Those people are
 * restricted from seven categories while they wait, and until this screen
 * existed nobody could see them — an honest "I'm not sure" became an indefinite
 * ban delivered as a reassurance.
 *
 * So the ageing indicator is the point of the screen, not decoration. Oldest
 * first, and past the SLA it turns red. A queue you cannot see the age of is
 * how people end up waiting months.
 */

const SLA_DAYS = 5;

interface Review {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  hasUnspentConviction: boolean;
  thirdScheduleOffence: boolean | null;
  exceededSentenceThreshold: boolean | null;
  convictedOn: string | null;
  applicantNote: string | null;
  declaredAt: string;
  restrictedCount: number;
}

const daysWaiting = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

const answer = (v: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : 'Not certain');

export default function ScreeningReviews() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/api/screening/reviews`, { headers: authHeaders() });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setReviews(result.data || []);
    } catch (err) {
      console.error('Failed to load review queue:', err);
      setReviews([]);
      showToast('Could not load the review queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (r: Review, action: 'clear' | 'bar') => {
    const note = (notes[r.id] || '').trim();
    if (!note) {
      showToast('Please record why you reached this decision', 'error');
      return;
    }
    if (action === 'bar' && !confirm(`Bar ${r.name} from these categories permanently?`)) return;

    setBusy(r.id);
    try {
      const res = await fetch(`${API_URL}/api/screening/reviews/${r.id}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ note }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(result.error || 'Could not record that decision', 'error');
        return;
      }
      showToast(action === 'clear' ? `${r.name} cleared` : `${r.name} barred`, 'success');
      setNotes((n) => ({ ...n, [r.id]: '' }));
      load();
    } catch (err) {
      console.error('Decision failed:', err);
      showToast('Could not record that decision', 'error');
    } finally {
      setBusy(null);
    }
  };

  const overdue = reviews.filter((r) => daysWaiting(r.declaredAt) >= SLA_DAYS).length;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
              ⚖️ Screening Reviews
            </h2>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer',
                color: '#FF6B35', fontWeight: '700', padding: '0 8px',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Declarations we could not decide automatically. These people are restricted from seven
            categories while they wait, so the oldest are shown first.
          </p>
        </div>

        {overdue > 0 && (
          <div style={{
            padding: '12px 14px', marginBottom: '16px', borderRadius: '8px',
            background: '#FEE', border: '2px solid #E53935', color: '#B71C1C',
            fontSize: '14px', fontWeight: '600',
          }}>
            {overdue} {overdue === 1 ? 'person has' : 'people have'} been waiting longer than {SLA_DAYS} days.
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: '14px', color: '#666' }}>Loading…</p>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', border: '2px dashed #E0E0E0', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Nothing waiting. Declarations only appear here when they cannot be decided
              automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {reviews.map((r) => {
              const days = daysWaiting(r.declaredAt);
              const late = days >= SLA_DAYS;
              return (
                <div
                  key={r.id}
                  style={{
                    padding: '16px', background: 'white', borderRadius: '8px',
                    border: `2px solid ${late ? '#E53935' : '#FFD9B3'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333' }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{r.email || 'no email on file'}</div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                      background: late ? '#E53935' : '#F0F0F0',
                      color: late ? 'white' : '#666',
                      whiteSpace: 'nowrap',
                    }}>
                      {days === 0 ? 'today' : `${days}d waiting`}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '8px', fontSize: '12px', color: '#555',
                    background: '#FAFAFA', padding: '10px', borderRadius: '6px', marginBottom: '10px',
                  }}>
                    <div>Serious offence: <strong>{answer(r.thirdScheduleOffence)}</strong></div>
                    <div>Over 3mth / $2,000: <strong>{answer(r.exceededSentenceThreshold)}</strong></div>
                    <div>Convicted: <strong>{r.convictedOn || 'not given'}</strong></div>
                    <div>Categories closed: <strong>{r.restrictedCount}</strong></div>
                  </div>

                  {/* The only part of the declaration written by the applicant.
                      Shown prominently because it is the only thing here that
                      can widen the picture rather than narrow it. */}
                  {r.applicantNote && (
                    <div style={{
                      fontSize: '13px', color: '#333', background: '#FFF8F3',
                      borderLeft: '3px solid #FF6B35', padding: '10px 12px',
                      borderRadius: '4px', marginBottom: '10px', fontStyle: 'italic',
                    }}>
                      “{r.applicantNote}”
                    </div>
                  )}

                  <textarea
                    value={notes[r.id] || ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Why are you deciding this? Required, and kept with the decision."
                    rows={2}
                    style={{
                      width: '100%', padding: '8px 10px', border: '2px solid #E0E0E0',
                      borderRadius: '6px', fontSize: '13px', marginBottom: '10px',
                    }}
                  />

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      disabled={busy === r.id}
                      onClick={() => decide(r, 'clear')}
                      style={{
                        padding: '8px 16px', background: '#2E7D32', color: 'white',
                        border: 'none', borderRadius: '6px', fontSize: '13px',
                        fontWeight: '600', cursor: 'pointer', opacity: busy === r.id ? 0.5 : 1,
                      }}
                    >
                      Clear — lift restrictions
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => decide(r, 'bar')}
                      style={{
                        padding: '8px 16px', background: 'white', color: '#E53935',
                        border: '2px solid #E53935', borderRadius: '6px', fontSize: '13px',
                        fontWeight: '600', cursor: 'pointer', opacity: busy === r.id ? 0.5 : 1,
                      }}
                    >
                      Bar — keep permanently
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
