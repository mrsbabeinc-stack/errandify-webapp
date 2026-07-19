import React, { useState } from 'react';

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

export default function WalletBreakdown({ data }: WalletBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  // Default data for demo
  const walletData: WalletData = data || {
    total: 5000,
    available: 2500,
    onHold: 1500,
    pending: 900,
    subscription: 100,
  };

  const percentage = (amount: number) => ((amount / walletData.total) * 100).toFixed(1);

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

          {/* On Hold (48h) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>⏳ On Hold (48h Auto-Release)</p>
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
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Errand holds • Auto-releases after 48hrs if no dispute</p>
          </div>

          {/* Pending Admin */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>⚠️ Pending Admin Review</p>
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
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Disputes & pending approvals • Awaiting admin decision</p>
          </div>

          {/* Subscription (if any) */}
          {walletData.subscription && walletData.subscription > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>📅 Monthly Subscription</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>-SGD ${walletData.subscription.toFixed(2)}</p>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Gold Partner • Charged on 10th of each month</p>
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
            💡 <strong>How it works:</strong> Errand payments hold for 48 hours. Advertis ing charges immediately upon approval. If you dispute an errand, admin will decide. Your available balance can be withdrawn anytime.
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
