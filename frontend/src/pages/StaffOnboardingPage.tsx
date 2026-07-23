import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Staff onboarding — the employee fills in their own details.
 *
 * Public by necessity: someone who has just been hired has no login yet. The
 * link is unguessable and expiring, and they still confirm who they are before
 * the form opens. See routes/staffOnboarding.ts.
 *
 * The tone matters. Someone is typing their bank account number into a form on
 * their first week at a new job — the page should be plain, unhurried, and
 * upfront about what happens to what they give us.
 */

interface Notice {
  purpose: string[];
  retention: string;
  rights: string;
}

const BANKS = [
  { code: '7171', name: 'DBS / POSB' },
  { code: '7339', name: 'OCBC' },
  { code: '7375', name: 'UOB' },
  { code: '7302', name: 'Maybank' },
  { code: '9496', name: 'Standard Chartered' },
  { code: '7214', name: 'Citibank' },
  { code: '7232', name: 'HSBC' },
  { code: '7144', name: 'Bank of China' },
  { code: '8712', name: 'CIMB' },
  { code: '7454', name: 'RHB' },
  { code: '9548', name: 'Trust Bank' },
  { code: '9666', name: 'GXS Bank' },
];

const ORANGE = '#FF6B35';

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#FFF8F5',
  padding: '24px 16px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};
const card: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  background: '#fff',
  borderRadius: '12px',
  border: '1px solid #FFD9B3',
  padding: '24px',
};
const label: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#333',
  marginBottom: '6px',
};
const input: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  border: '2px solid #FFD9B3',
  borderRadius: '8px',
  fontSize: '15px',
  boxSizing: 'border-box',
};
const field: React.CSSProperties = { marginBottom: '16px' };
const hint: React.CSSProperties = { fontSize: '12px', color: '#888', marginTop: '4px' };
const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: ORANGE,
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
};

export const StaffOnboardingPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();

  const [phase, setPhase] = useState<'loading' | 'verify' | 'form' | 'done' | 'dead'>('loading');
  const [firstName, setFirstName] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nricLast4, setNricLast4] = useState('');
  const [session, setSession] = useState('');

  const [form, setForm] = useState({
    bank_account_name: '',
    bank_code: '',
    bank_branch_code: '',
    bank_account_number: '',
    bank_account_number_confirm: '',
    home_address: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
  });
  const [noticeAccepted, setNoticeAccepted] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onboarding/${encodeURIComponent(token)}`);
        const body = await res.json().catch(() => null);
        if (!res.ok || body?.success === false) {
          setError(body?.error || 'This link is not valid. Ask HR for a new one.');
          setPhase('dead');
          return;
        }
        setFirstName(body.first_name || '');
        setNotice(body.notice || null);
        setPhase(body.state === 'completed' ? 'done' : 'verify');
      } catch {
        setError('We could not reach the server. Please check your connection and try again.');
        setPhase('dead');
      }
    })();
  }, [token]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(token)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nric_last4: nricLast4 }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) {
        setError(body?.error || 'That did not work. Please try again.');
        return;
      }
      setSession(body.session);
      setNotice(body.notice || notice);
      setForm(prev => ({
        ...prev,
        bank_account_name: `${body.first_name || ''} ${body.last_name || ''}`.trim(),
      }));
      setPhase('form');
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session}` },
        body: JSON.stringify({ ...form, notice_accepted: noticeAccepted }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) {
        setError(body?.error || 'We could not save that. Please check the form and try again.');
        return;
      }
      setPhase('done');
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error && (
    <div style={{
      padding: '12px 14px', background: '#FFEBEE', border: '1px solid #C62828',
      borderRadius: '8px', fontSize: '13px', color: '#C62828', marginBottom: '16px',
    }}>
      {error}
    </div>
  );

  if (phase === 'loading') {
    return <div style={page}><div style={{ ...card, textAlign: 'center', color: '#888' }}>Loading…</div></div>;
  }

  if (phase === 'dead') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={{ fontSize: '20px', margin: '0 0 12px 0', color: '#333' }}>This link isn't working</h1>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{error}</p>
          <p style={{ fontSize: '13px', color: '#888' }}>
            Onboarding links expire after two weeks. Ask HR to send you a new one — it only takes a moment.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
          <h1 style={{ fontSize: '20px', margin: '0 0 12px 0', color: '#333' }}>
            All done{firstName ? `, ${firstName}` : ''}
          </h1>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
            We have everything we need. Your salary will go to the account you gave us.
          </p>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '16px' }}>
            If anything changes — a new bank, a new address — tell HR and they will send a fresh link.
            This one has now been used and won't open again.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'verify') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#333' }}>
            Welcome{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '20px' }}>
            There are a few details we need so we can pay you and reach someone if there's an emergency.
            It takes about two minutes.
          </p>
          <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, marginBottom: '20px' }}>
            First, just so we know it's really you — because this form decides where your salary goes.
          </p>
          {errorBox}
          <form onSubmit={handleVerify}>
            <div style={field}>
              <label style={label} htmlFor="nric">Last 4 characters of your NRIC or FIN</label>
              <input
                id="nric"
                style={{ ...input, letterSpacing: '4px', fontSize: '18px', textAlign: 'center' }}
                value={nricLast4}
                onChange={(e) => setNricLast4(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="567A"
                autoComplete="off"
                maxLength={4}
              />
              <div style={hint}>
                For example, if your NRIC is S1234567A, enter <strong>567A</strong>.
              </div>
            </div>
            <button type="submit" style={{ ...primaryBtn, opacity: busy || nricLast4.length !== 4 ? 0.6 : 1 }}
                    disabled={busy || nricLast4.length !== 4}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <form style={card} onSubmit={handleSubmit}>
        <h1 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#333' }}>Your details</h1>
        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '20px' }}>
          Please check these carefully — the account number in particular. It's the one thing that,
          if it's wrong, means your pay goes somewhere else.
        </p>
        {errorBox}

        <h2 style={{ fontSize: '15px', color: ORANGE, margin: '24px 0 12px 0' }}>Where your salary goes</h2>

        <div style={field}>
          <label style={label} htmlFor="acctName">Name on the account</label>
          <input id="acctName" style={input} value={form.bank_account_name} onChange={set('bank_account_name')} />
          <div style={hint}>Exactly as your bank has it, or the transfer may bounce.</div>
        </div>

        <div style={field}>
          <label style={label} htmlFor="bank">Your bank</label>
          <select id="bank" style={input} value={form.bank_code} onChange={set('bank_code')}>
            <option value="">Choose your bank…</option>
            {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>

        <div style={field}>
          <label style={label} htmlFor="acct">Account number</label>
          <input id="acct" style={input} value={form.bank_account_number} onChange={set('bank_account_number')}
                 inputMode="numeric" autoComplete="off" />
          <div style={hint}>Digits only — spaces and dashes are fine, we'll tidy them up.</div>
        </div>

        <div style={field}>
          <label style={label} htmlFor="acct2">Account number again</label>
          <input id="acct2" style={input} value={form.bank_account_number_confirm}
                 onChange={set('bank_account_number_confirm')} inputMode="numeric" autoComplete="off"
                 onPaste={(e) => e.preventDefault()} />
          <div style={hint}>Please type it rather than pasting — that's the point of asking twice.</div>
        </div>

        <div style={field}>
          <label style={label} htmlFor="branch">Branch code <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span></label>
          <input id="branch" style={input} value={form.bank_branch_code} onChange={set('bank_branch_code')} />
          <div style={hint}>On your statement or in your banking app. Leave blank if you're not sure.</div>
        </div>

        <h2 style={{ fontSize: '15px', color: ORANGE, margin: '28px 0 12px 0' }}>Where you live</h2>

        <div style={field}>
          <label style={label} htmlFor="addr">Home address</label>
          <input id="addr" style={input} value={form.home_address} onChange={set('home_address')}
                 placeholder="Block, street, unit" />
        </div>

        <div style={field}>
          <label style={label} htmlFor="postal">Postal code</label>
          <input id="postal" style={{ ...input, maxWidth: '160px' }} value={form.postal_code}
                 onChange={set('postal_code')} inputMode="numeric" maxLength={6} />
        </div>

        <h2 style={{ fontSize: '15px', color: ORANGE, margin: '28px 0 12px 0' }}>Who we should call</h2>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '-6px', marginBottom: '14px' }}>
          Only if something happens to you at work. We won't contact them for anything else.
        </p>

        <div style={field}>
          <label style={label} htmlFor="ecName">Their name</label>
          <input id="ecName" style={input} value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
        </div>

        <div style={field}>
          <label style={label} htmlFor="ecRel">How you know them <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span></label>
          <input id="ecRel" style={input} value={form.emergency_contact_relationship}
                 onChange={set('emergency_contact_relationship')} placeholder="Spouse, parent, friend…" />
        </div>

        <div style={field}>
          <label style={label} htmlFor="ecPhone">Their phone number</label>
          <input id="ecPhone" style={input} value={form.emergency_contact_phone}
                 onChange={set('emergency_contact_phone')} inputMode="tel" />
        </div>

        {notice && (
          <div style={{
            marginTop: '24px', padding: '14px', background: '#FFF8F5',
            border: '1px solid #FFD9B3', borderRadius: '8px', fontSize: '12px', color: '#666', lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: '8px' }}>What we do with this</div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: '18px' }}>
              {notice.purpose.map((p, i) => <li key={i} style={{ marginBottom: '4px' }}>{p}</li>)}
            </ul>
            <div style={{ marginBottom: '4px' }}>{notice.retention}</div>
            <div>{notice.rights}</div>
          </div>
        )}

        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', margin: '16px 0 20px 0', fontSize: '13px', color: '#333', cursor: 'pointer' }}>
          <input type="checkbox" checked={noticeAccepted} onChange={(e) => setNoticeAccepted(e.target.checked)}
                 style={{ marginTop: '3px', width: '16px', height: '16px' }} />
          <span>I've read how my details will be used.</span>
        </label>

        <button type="submit" style={{ ...primaryBtn, opacity: busy || !noticeAccepted ? 0.6 : 1 }}
                disabled={busy || !noticeAccepted}>
          {busy ? 'Saving…' : 'Submit my details'}
        </button>
        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '12px' }}>
          You can only submit this once. If you spot a mistake afterwards, tell HR and they'll sort it out.
        </p>
      </form>
    </div>
  );
};

export default StaffOnboardingPage;
