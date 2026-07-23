import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';

/**
 * Landing page for the return from Stripe Checkout after paying the card balance
 * on an over-budget ad campaign. Stripe redirects here with ?session_id=... and
 * this calls verify-session to finalize (deduct the credit portion + approve the
 * campaign). Idempotent on the backend, so a refresh is safe.
 *
 * companyId is a path param (kept out of the query so it can't collide with the
 * ?session_id Stripe appends), which verify-session re-checks against both the
 * caller's role and the session metadata.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type State = 'verifying' | 'success' | 'cancelled' | 'error';

export default function AdPaymentReturn() {
  const { companyId } = useParams<{ companyId: string }>();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const cancelled = params.get('checkout') === 'cancelled';

  const [state, setState] = useState<State>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (cancelled || !sessionId) {
      setState('cancelled');
      setMessage('Card payment was cancelled. Your campaign has not been charged or approved.');
      return;
    }
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/ad-payment/verify-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ session_id: sessionId, company_id: Number(companyId) }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setState('success');
          setMessage(
            data.data?.alreadyFinalized
              ? 'This campaign was already approved — nothing was charged twice.'
              : 'Payment confirmed and your campaign is approved. It will go live on schedule.'
          );
        } else {
          setState('error');
          setMessage(data.error || 'We could not confirm your payment. If your card was charged, contact support before retrying.');
        }
      } catch {
        setState('error');
        setMessage('We could not reach the server to confirm your payment. Please check the campaign status before retrying.');
      }
    })();
  }, [sessionId, cancelled, companyId]);

  const tone: Record<State, { bg: string; fg: string; icon: string; title: string }> = {
    verifying: { bg: '#FFF8F3', fg: '#B8420F', icon: '⏳', title: 'Confirming your payment…' },
    success: { bg: '#F0F7F2', fg: '#2E7D53', icon: '✅', title: 'Payment confirmed' },
    cancelled: { bg: '#FFF8E1', fg: '#8A6D00', icon: '↩️', title: 'Payment cancelled' },
    error: { bg: '#FDECEA', fg: '#C0392B', icon: '⚠️', title: 'Could not confirm payment' },
  };
  const t = tone[state];

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 460, width: '100%', background: t.bg, border: `1px solid ${t.fg}33`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{t.icon}</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: t.fg }}>{t.title}</h1>
        <p style={{ margin: '0 0 24px', color: '#5C4F45', fontSize: 14, lineHeight: 1.6 }}>
          {state === 'verifying' ? 'Please wait a moment.' : message}
        </p>
        {state !== 'verifying' && (
          <Link
            to="/company/dashboard"
            style={{ display: 'inline-block', padding: '12px 22px', background: '#FF6B35', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
          >
            Back to advertising
          </Link>
        )}
      </div>
    </div>
  );
}
