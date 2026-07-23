import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface WalletData {
  total: number;
  available: number;
  onHold: number;
  pending: number;
  subscription?: number;
}

interface WalletBreakdownProps {
  data?: WalletData;
}

/**
 * Fell back to a demo wallet — total 5000, available 2500, on hold 1500 — and
 * the dashboard renders it with no props, so every company saw those numbers
 * regardless of its actual balance. Now fetches /api/wallet/balance when the
 * parent doesn't supply data.
 */
export default function WalletBreakdown({ data }: WalletBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/wallet/balance`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (res.ok) {
          const b = await res.json();
          const doer = b.data?.doer || {};
          // completed earnings are drawable; work in progress is not yet
          const available = Number(doer.completedEarnings) || 0;
          const pending = Number(doer.pendingEarnings) || 0;
          setFetched({
            total: available + pending,
            available,
            onHold: 0,
            pending,
          });
        }
      } catch {
        // leave it at zeros rather than showing invented figures
      } finally {
        setLoading(false);
      }
    })();
  }, [data]);

  const walletData: WalletData = data || fetched || {
    total: 0, available: 0, onHold: 0, pending: 0,
  };

  // Guard the divide — an empty wallet rendered "NaN%" on every row
  const percentage = (amount: number) =>
    walletData.total > 0 ? ((amount / walletData.total) * 100).toFixed(1) : '0.0';

  if (loading) {
    return <div style={{ padding: 16, color: '#6B7280', fontSize: 14 }}>Loading wallet…</div>;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FF6B35 0%, #FFB88C 100%)',
      borderRadius: '16px',
      padding: '24px',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }} onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.9, fontWeight: '600' }}>Total Wallet Balance</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '700' }}>SGD ${walletData.total.toFixed(2)}</p>
        </div>
        <div style={{ fontSize: '32px' }}>💰</div>
      </div>

      {/* Quick Summary (collapsed) */}
      {!expanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '12px',
        }}>
          <div>
            <p style={{ margin: 0, opacity: 0.9, fontWeight: '600' }}>✅ Available Now</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '700' }}>SGD ${walletData.available.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ margin: 0, opacity: 0.9, fontWeight: '600' }}>⏳ On Hold</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '700' }}>SGD ${walletData.onHold.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Expanded Breakdown */}
      {expanded && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Available */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>✅ Available Balance</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>SGD ${walletData.available.toFixed(2)}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  background: 'white',
                  height: '100%',
                  width: `${percentage(walletData.available)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Ready for withdrawal • {percentage(walletData.available)}%</p>
          </div>

          {/* On Hold (48h) - Asker Budget + Stripe Fee */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>⏳ Stripe Hold (Budget + Fee, 48h)</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>SGD ${walletData.onHold.toFixed(2)}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  background: 'white',
                  height: '100%',
                  width: `${percentage(walletData.onHold)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Includes errand budget + Stripe fee • Doer gets (Budget - Platform Commission), Stripe fee → Stripe</p>
          </div>

          {/* Pending Admin - Advertising Fees + Dispute Holds */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>⚠️ Held by Stripe (Pending Admin Decision)</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>SGD ${walletData.pending.toFixed(2)}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  background: 'white',
                  height: '100%',
                  width: `${percentage(walletData.pending)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}><strong>Advertising:</strong> Fee + Stripe fee held until approval (deducts both) or rejection (releases both). <strong>Disputes:</strong> Held until admin decision</p>
          </div>

          {/* Subscription (if any) */}
          {walletData.subscription && walletData.subscription > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>📅 Monthly Subscription (Charged)</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>-SGD ${walletData.subscription.toFixed(2)}</p>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Gold Partner • Immediately charged on purchase, renewed on 10th of each month</p>
            </div>
          )}

          {/* Info Box */}
          <div style={{
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '8px',
            fontSize: '11px',
            lineHeight: '1.5',
          }}>
            💡 <strong>How it works:</strong> Post errand → Stripe holds (Budget + Stripe Fee). After 48h: Doer gets (Budget - Platform Commission), Stripe fee → Stripe, you see the fees upfront. Advertising: Stripe holds fee (deducted on approval, released on rejection).
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        fontSize: '11px',
        opacity: 0.9,
        textAlign: 'center',
      }}>
        {expanded ? 'Click to collapse' : 'Click to expand • Swipe for details'}
      </div>
    </div>
  );
}
