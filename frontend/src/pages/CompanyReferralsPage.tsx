import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ShareQRCode from '../components/ShareQRCode';

/**
 * Company invite codes.
 *
 * Deliberately separate from /referral, which is a person's own code. A staff
 * member holds two: their personal REF- code, which pays them, and the BIZ-
 * code below, which pays the company. That distinction is the single thing
 * most likely to confuse someone here, so the page states it rather than
 * leaving it to be discovered when the points land somewhere unexpected.
 *
 * Everything comes from GET /api/referrals/company, which resolves the company
 * from the session — no companyId is sent from here, so this page cannot be
 * pointed at someone else's figures.
 */

const ORANGE = '#FF6B35';

interface StaffRow {
  userId: number | null;
  name: string;
  code: string;
  link: string;
  referred: number;
  completed: number;
  earnedEP: number;
  /** False once the holder is no longer active staff — the code has stopped paying. */
  active: boolean;
}

interface CompanyReferralData {
  companyCode: string;
  companyLink: string;
  myCode: string;
  myLink: string;
  role: 'owner' | 'manager' | 'staff';
  totalReferred: number;
  firstErrandCompleted: number;
  totalEarnedEP: number;
  joinBonusEP: number;
  firstErrandBonusEP: number;
  staff: StaffRow[];
}

export default function CompanyReferralsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CompanyReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/referrals/company', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.message || 'Could not load your company invite codes');
        }
        setData(payload.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareWhatsApp = (link: string) => {
    const text = `Join Errandify — get help with errands, or earn money helping neighbours. ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Loading your codes…</div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: 14,
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          {error}
        </div>
        <button
          onClick={() => navigate('/company/dashboard')}
          style={{ ...ghost, marginTop: 16 }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const canSeeTeam = data.role === 'owner' || data.role === 'manager';

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: '0 auto', paddingBottom: 60 }}>
      <button onClick={() => navigate('/company/dashboard')} style={backLink}>
        ← Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 4px', color: '#3D2914' }}>
        🏢 Company Invites
      </h1>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px' }}>
        Every invite below earns <strong>Errandify Points for the company</strong> — {data.joinBonusEP} EP
        when someone joins, and another {data.firstErrandBonusEP} EP once they complete their first
        errand.
      </p>

      {/* The one thing people get wrong. Said plainly, up front. */}
      <div
        style={{
          background: '#FFF3E0',
          borderLeft: `4px solid ${ORANGE}`,
          borderRadius: 8,
          padding: '12px 14px',
          fontSize: 13,
          color: '#5B4636',
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        <strong>You have two different codes.</strong> The one on this page starts with{' '}
        <code style={code}>BIZ-</code> and earns points for the company. Your{' '}
        <a href="/referral" style={{ color: ORANGE, fontWeight: 700 }}>
          personal code
        </a>{' '}
        starts with <code style={code}>REF-</code> and earns points for you. Share whichever fits —
        just know which one you sent.
      </div>

      {/* ------------------------------------------------------- totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'People joined', value: data.totalReferred },
          { label: 'Completed first errand', value: data.firstErrandCompleted },
          { label: 'EP earned for company', value: data.totalEarnedEP, accent: true },
        ].map((t) => (
          <div
            key={t.label}
            style={{
              background: t.accent ? ORANGE : '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, color: t.accent ? '#FFE9DC' : '#6B7280', marginBottom: 4 }}>
              {t.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.accent ? '#fff' : '#111827' }}>
              {t.value}
            </div>
          </div>
        ))}
      </div>

      {/* --------------------------------------------------- my own code */}
      <section style={card}>
        <h2 style={h2}>Your invite code</h2>
        <p style={sub}>
          Yours to share. The company earns the points; we record that it came from you.
        </p>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <ShareQRCode
            value={data.myLink}
            size={150}
            downloadable
            downloadName={`errandify-${data.myCode}`}
          />

          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={codeBox}>{data.myCode}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={() => copy(data.myLink, 'my')} style={primary}>
                {copied === 'my' ? '✓ Copied' : 'Copy link'}
              </button>
              <button onClick={() => shareWhatsApp(data.myLink)} style={whatsapp}>
                WhatsApp
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10, wordBreak: 'break-all' }}>
              {data.myLink}
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- company code */}
      <section style={card}>
        <h2 style={h2}>The company's code</h2>
        <p style={sub}>
          Not tied to any one person — use it on posters, vans, name cards and your profile.
        </p>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <ShareQRCode
            value={data.companyLink}
            size={150}
            downloadable
            downloadName={`errandify-${data.companyCode}`}
          />
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={codeBox}>{data.companyCode}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={() => copy(data.companyLink, 'co')} style={primary}>
                {copied === 'co' ? '✓ Copied' : 'Copy link'}
              </button>
              <button onClick={() => shareWhatsApp(data.companyLink)} style={whatsapp}>
                WhatsApp
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10, wordBreak: 'break-all' }}>
              {data.companyLink}
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- team table */}
      {canSeeTeam && data.staff.length > 0 && (
        <section style={card}>
          <h2 style={h2}>Who's bringing people in</h2>
          <p style={sub}>
            Each staff member has their own code. All of them earn for the company — this shows
            whose sharing is actually working.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Who</th>
                  <th style={th}>Code</th>
                  <th style={th}>Joined</th>
                  <th style={th}>Completed</th>
                  <th style={th}>EP earned</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr key={s.code}>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {s.userId === null ? (
                        <span style={{ color: '#6B7280', fontWeight: 500 }}>
                          Company code (no one person)
                        </span>
                      ) : (
                        <>
                          {s.name}
                          {!s.active && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#6B7280',
                                background: '#F3F4F6',
                                padding: '1px 6px',
                                borderRadius: 999,
                              }}
                              title="No longer active staff — this code has stopped earning"
                            >
                              former
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{s.code}</td>
                    <td style={td}>{s.referred}</td>
                    <td style={td}>{s.completed}</td>
                    <td style={{ ...td, fontWeight: 700, color: s.earnedEP > 0 ? ORANGE : '#9CA3AF' }}>
                      {s.earnedEP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalReferred === 0 && (
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 12 }}>
              Nobody has joined on a company code yet. The codes are live — they just need sharing.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ styles

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 12,
  padding: 18,
  marginBottom: 18,
};

const h2: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  margin: '0 0 4px',
  color: '#3D2914',
};

const sub: React.CSSProperties = {
  fontSize: 13,
  color: '#6B7280',
  margin: '0 0 16px',
};

const codeBox: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: 1,
  color: ORANGE,
  background: '#FFF3E0',
  border: `2px dashed ${ORANGE}`,
  borderRadius: 10,
  padding: '12px 14px',
  textAlign: 'center',
};

const primary: React.CSSProperties = {
  background: ORANGE,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

const whatsapp: React.CSSProperties = {
  ...primary,
  background: '#25D366',
};

const ghost: React.CSSProperties = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #D1D5DB',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 14,
  cursor: 'pointer',
};

const backLink: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: ORANGE,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  padding: 0,
};

const code: React.CSSProperties = {
  fontFamily: 'monospace',
  background: '#fff',
  padding: '1px 5px',
  borderRadius: 4,
  fontSize: 12,
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '9px 10px',
  fontSize: 11,
  fontWeight: 700,
  color: '#6B7280',
  textTransform: 'uppercase',
  borderBottom: '1px solid #E5E7EB',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '10px',
  fontSize: 14,
  borderBottom: '1px solid #F3F4F6',
};
