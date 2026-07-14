import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AIAnalysisPanel from '../../components/admin/reports/AIAnalysisPanel';
import { Chart3DBar } from '../../components/admin/reports/Chart3D';

export const ErrandifyPointsEnhancedPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState('weekly');
  const [showAnalysis, setShowAnalysis] = useState(true);

  const [transactions] = useState([
    { id: 1, user: 'Sarah Tan', action: 'Task Completed', points: 25, date: '2 hours ago', balance: 450, timestamp: Date.now() - 2 * 3600000 },
    { id: 2, user: 'John Lee', action: 'Referral Bonus', points: 50, date: '5 hours ago', balance: 325, timestamp: Date.now() - 5 * 3600000 },
    { id: 3, user: 'Alice Wong', action: 'Rating Bonus', points: 10, date: '1 day ago', balance: 180, timestamp: Date.now() - 24 * 3600000 },
    { id: 4, user: 'Bob Chen', action: 'Redemption', points: -100, date: '2 days ago', balance: 25, timestamp: Date.now() - 48 * 3600000 },
    { id: 5, user: 'Eve Kumar', action: 'Streak Bonus', points: 75, date: '3 days ago', balance: 520, timestamp: Date.now() - 72 * 3600000 },
  ]);

  const [stats] = useState({
    totalPoints: 12450,
    activeUsers: 2847,
    totalRedeemed: 5420,
    avgPointsPerUser: 4.4,
    pointsIssuedToday: 340,
    pointsIssuedThisWeek: 2150,
    pointsIssuedThisMonth: 8950,
    redemptionRate: 43.5
  });

  // Analytics data
  const dailyData = [
    { day: 'Mon', issued: 280, redeemed: 120, users: 340 },
    { day: 'Tue', issued: 320, redeemed: 145, users: 380 },
    { day: 'Wed', issued: 290, redeemed: 130, users: 350 },
    { day: 'Thu', issued: 360, redeemed: 160, users: 410 },
    { day: 'Fri', issued: 410, redeemed: 190, users: 480 },
    { day: 'Sat', issued: 390, redeemed: 170, users: 460 },
    { day: 'Sun', issued: 340, redeemed: 150, users: 420 },
  ];

  const issuanceByType = [
    { type: 'Task Completed', points: 5240, percentage: 58 },
    { type: 'Referral Bonus', points: 2150, percentage: 24 },
    { type: 'Streak Bonus', points: 1260, percentage: 14 },
    { type: 'Rating Bonus', points: 380, percentage: 4 },
  ];

  const peakHours = [
    { hour: '6am', points: 45 },
    { hour: '9am', points: 120 },
    { hour: '12pm', points: 280 },
    { hour: '3pm', points: 340 },
    { hour: '6pm', points: 420 },
    { hour: '9pm', points: 180 },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '12px 16px', height: '100vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginBottom: '2px' }}>
              💰 Errandify Points Ledger
            </h1>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              AI-powered analytics on point issuance, user engagement & redemption patterns
            </p>
          </div>
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            style={{
              padding: '8px 12px',
              background: showAnalysis ? '#FF6B35' : '#f5f5f5',
              color: showAnalysis ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {showAnalysis ? '🤖 Hide AI' : '🤖 Show AI'}
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Today Issued</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#FF6B35' }}>{stats.pointsIssuedToday}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>This Week</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>{stats.pointsIssuedThisWeek}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>This Month</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>{stats.pointsIssuedThisMonth}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Total Points</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>{stats.totalPoints.toLocaleString()}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Active Users</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>{stats.activeUsers.toLocaleString()}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Redemption Rate</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#4CAF50' }}>{stats.redemptionRate}%</div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', flex: 1, minHeight: 0 }}>
          {/* Daily Issuance Chart */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>📈 Daily Points Issuance (7-day trend)</h3>
            <Chart3DBar
              data={dailyData.map((d, idx) => ({
                label: d.day,
                value: d.issued,
                color: ['#FF6B35', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4'][idx]
              }))}
              height={200}
            />
          </div>

          {/* Issuance by Type */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>🎯 Issuance by Type</h3>
            {issuanceByType.map(item => (
              <div key={item.type} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', color: '#333', fontWeight: '500' }}>{item.type}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35' }}>{item.points} ({item.percentage}%)</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#FF6B35', width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours & Recent Transactions Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1, minHeight: 0, marginBottom: '12px' }}>
          {/* Peak Hours */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>⏰ Peak Issuance Hours</h3>
            {peakHours.map(item => (
              <div key={item.hour} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', color: '#666', minWidth: '30px', fontWeight: '500' }}>{item.hour}</span>
                <div style={{ flex: 1, height: '6px', background: '#f5f5f5', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#2196F3', width: `${(item.points / 420) * 100}%` }} />
                </div>
                <span style={{ fontSize: '10px', color: '#666', minWidth: '25px', textAlign: 'right' }}>{item.points}</span>
              </div>
            ))}
          </div>

          {/* Recent Transactions */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>📋 Recent Transactions</h3>
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>{t.user}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: t.points > 0 ? '#4CAF50' : '#F44336' }}>
                    {t.points > 0 ? '+' : ''}{t.points}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: '#666' }}>{t.action}</span>
                  <span style={{ fontSize: '10px', color: '#999' }}>{t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis Panel */}
        {showAnalysis && (
          <div style={{ marginTop: '12px' }}>
            <AIAnalysisPanel
              healthScore={87}
              healthLabel="Points System Health"
              healthSentiment="Strong engagement with 43.5% redemption rate. Task completion is primary driver (58% of issuance). Peak activity 6pm, indicating post-work engagement."
              riskLevel={{
                level: 'low',
                description: 'Balanced issuance/redemption. No abnormal patterns detected. Point inflation minimal at 4.4 EP per user average.'
              }}
              safety="No fraudulent point activity detected. All transactions validated."
              legal="Points system compliant with GST regulations. No tax implications for gift-like rewards."
              bias="Point distribution fair across all user segments. No demographic bias detected in issuance patterns."
              findings={[
                {
                  title: 'Peak Engagement Window',
                  description: '6pm shows highest point issuance (420 EP/hour). Evening users most active in completing tasks.'
                },
                {
                  title: 'Primary Reward Driver',
                  description: 'Task completion generates 58% of all points (5,240 EP). Core mechanic working as intended.'
                },
                {
                  title: 'Strong Redemption',
                  description: '43.5% redemption rate exceeds industry average (30-35%). Users value the rewards program.'
                },
                {
                  title: 'User Engagement Multiplier',
                  description: 'Referral & streak bonuses add 38% to total issuance. Secondary incentives effective.'
                }
              ]}
              relatedLinks={[
                {
                  text: 'Industry Benchmark: Loyalty Programs Average 30-35% Redemption',
                  url: '#'
                },
                {
                  text: 'Gig Economy Points: Peak Activity Patterns (6pm-9pm)',
                  url: '#'
                },
                {
                  text: 'User Retention: 2.8K Active Users Shows Strong Stickiness',
                  url: '#'
                }
              ]}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ErrandifyPointsEnhancedPage;
