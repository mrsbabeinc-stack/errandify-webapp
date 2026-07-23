import { useEffect, useState } from 'react';

/**
 * The company's plan as LIVE numbers, not static per-tier text.
 *
 * The dashboard showed "Ad Credit: SGD 500/month" hardcoded per tier, and never
 * the actual remaining balance or milestone progress — the ad-credit and
 * milestone systems worked on the backend but nothing surfaced their real
 * values. This reads the three live endpoints and shows what the company
 * actually has right now.
 *
 * Self-contained: one fetch, its own loading/empty states, safe to drop
 * anywhere a company context exists.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Status {
  tier: string | null;
  commission_rate: number | null;
  ep_multiplier: number | null;
  max_team_members: number | null;
}
interface Credits {
  allocated: number; // cents
  used: number;
  available: number;
  monthly_allowance: number;
}
interface Progress {
  current_tasks: number;
  next_milestone: number | null;
  progress_percent: number;
}

const money = (cents: number) => `SGD $${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const tierLabel = (t: string | null) => (t ? t[0].toUpperCase() + t.slice(1) : '—');

export default function LiveSubscriptionBenefits() {
  const [status, setStatus] = useState<Status | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    (async () => {
      try {
        const [s, c, m] = await Promise.all([
          fetch(`${API_URL}/api/subscriptions/status`, { headers: auth }).then((r) => r.json()).catch(() => null),
          fetch(`${API_URL}/api/subscriptions/ad-credits/balance`, { headers: auth }).then((r) => r.json()).catch(() => null),
          fetch(`${API_URL}/api/subscriptions/milestones`, { headers: auth }).then((r) => r.json()).catch(() => null),
        ]);
        if (s?.success && s.tier) setStatus(s);
        if (c?.success) setCredits(c);
        if (m?.success && m.progress) setProgress(m.progress);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ padding: 16, color: '#999', fontSize: 14 }}>Loading your plan…</div>;
  }

  if (!status || !status.tier) {
    return (
      <div style={{ padding: 16, border: '1px dashed #E0E0E0', borderRadius: 10, color: '#666', fontSize: 14 }}>
        No active subscription. Choose a plan to unlock ad credits, higher EP multipliers and milestone rewards.
      </div>
    );
  }

  const usagePct = credits && credits.allocated > 0 ? Math.round((credits.used / credits.allocated) * 100) : 0;
  const milePct = progress?.progress_percent ?? 0;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#241C16' }}>{tierLabel(status.tier)}</span>
        <span style={{ fontSize: 13, color: '#8A7A6D' }}>
          {status.commission_rate != null && `${(status.commission_rate * 100).toFixed(0)}% commission`}
          {status.ep_multiplier != null && ` · ${status.ep_multiplier}× EP`}
          {status.max_team_members != null && ` · ${status.max_team_members >= 999999 ? 'Unlimited' : status.max_team_members} team`}
        </span>
      </div>

      {credits && (
        <div style={{ background: '#FFF8F3', border: '1px solid #FFD9B3', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5C4F45', marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Ad credits</span>
            <span><strong style={{ color: '#B8420F' }}>{money(credits.available)}</strong> of {money(credits.monthly_allowance)} left</span>
          </div>
          <div style={{ height: 8, background: '#FBE9E7', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${usagePct}%`, height: '100%', background: '#FF6B35' }} />
          </div>
        </div>
      )}

      {progress && (
        <div style={{ background: '#F0F7F2', border: '1px solid #CDE7D6', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5C4F45', marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Milestone progress</span>
            <span>
              {progress.next_milestone
                ? <><strong style={{ color: '#2E7D53' }}>{progress.current_tasks}</strong> / {progress.next_milestone} jobs</>
                : 'All milestones reached 🎉'}
            </span>
          </div>
          {progress.next_milestone != null && (
            <div style={{ height: 8, background: '#E6F3EC', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${milePct}%`, height: '100%', background: '#2E7D53' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
