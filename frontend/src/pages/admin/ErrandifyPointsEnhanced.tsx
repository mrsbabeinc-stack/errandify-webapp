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
    redemptionRate: 43.5,
    // Financial metrics (1 EP = SGD $0.05)
    epToSgd: 0.05,
    costTodayIssued: 340 * 0.05, // $17
    costWeekIssued: 2150 * 0.05, // $107.50
    costMonthIssued: 8950 * 0.05, // $447.50
    costTotalIssued: 12450 * 0.05, // $622.50
    spentTodayRedeemed: 1240 * 0.05, // $62
    spentWeekRedeemed: 8450 * 0.05, // $422.50
    spentMonthRedeemed: 28950 * 0.05, // $1,447.50
    spentTotalRedeemed: 108450 * 0.05, // $5,422.50
    netSpendToday: -45, // $45 net spending today
    netSpendMonth: -1000 // $1000 net spending this month
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

        {/* Financial KPI Cards - Top Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: '#FFF3E0', padding: '10px', borderRadius: '6px', border: '2px solid #FF6B35' }}>
            <div style={{ fontSize: '10px', color: '#E65100', fontWeight: '600', marginBottom: '2px' }}>💸 Cost Issued Today</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF6B35' }}>SGD ${stats.costTodayIssued.toFixed(2)}</div>
            <div style={{ fontSize: '9px', color: '#E65100', marginTop: '2px' }}>({stats.pointsIssuedToday} EP @ ${stats.epToSgd}/EP)</div>
          </div>
          <div style={{ background: '#FFF3E0', padding: '10px', borderRadius: '6px', border: '2px solid #FF6B35' }}>
            <div style={{ fontSize: '10px', color: '#E65100', fontWeight: '600', marginBottom: '2px' }}>💳 Spent/Redeemed Today</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#2196F3' }}>SGD ${stats.spentTodayRedeemed.toFixed(2)}</div>
            <div style={{ fontSize: '9px', color: '#0D47A1', marginTop: '2px' }}>User redemptions</div>
          </div>
          <div style={{ background: '#E8F5E9', padding: '10px', borderRadius: '6px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '10px', color: '#2E7D32', fontWeight: '600', marginBottom: '2px' }}>📊 Net Spend Today</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4CAF50' }}>SGD -${Math.abs(stats.netSpendToday).toFixed(2)}</div>
            <div style={{ fontSize: '9px', color: '#2E7D32', marginTop: '2px' }}>Profit (more spent than issued)</div>
          </div>
        </div>

        {/* Volume KPI Cards - Middle Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>This Week Issued</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>{stats.pointsIssuedThisWeek} EP</div>
            <div style={{ fontSize: '9px', color: '#999' }}>SGD ${stats.costWeekIssued.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>This Month Issued</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>{stats.pointsIssuedThisMonth} EP</div>
            <div style={{ fontSize: '9px', color: '#999' }}>SGD ${stats.costMonthIssued.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Total Issued (All Time)</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>{stats.totalPoints.toLocaleString()} EP</div>
            <div style={{ fontSize: '9px', color: '#999' }}>SGD ${stats.costTotalIssued.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Redemption Rate</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#4CAF50' }}>{stats.redemptionRate}%</div>
            <div style={{ fontSize: '9px', color: '#999' }}>${stats.spentTotalRedeemed.toFixed(2)} redeemed</div>
          </div>
        </div>

        {/* Financial Breakdown Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>📈 Issuance Cost Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>Today</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35' }}>SGD ${stats.costTodayIssued.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>This Week</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35' }}>SGD ${stats.costWeekIssued.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>This Month</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35' }}>SGD ${stats.costMonthIssued.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '2px solid #FF6B35' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>All Time Total</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#FF6B35' }}>SGD ${stats.costTotalIssued.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>💰 Redemption Spending Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>Today</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#2196F3' }}>SGD ${stats.spentTodayRedeemed.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>This Week</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#2196F3' }}>SGD ${stats.spentWeekRedeemed.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>This Month</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#2196F3' }}>SGD ${stats.spentMonthRedeemed.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '2px solid #2196F3' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>All Time Total</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#2196F3' }}>SGD ${stats.spentTotalRedeemed.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Issuance & Spending Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1, minHeight: 0 }}>
          {/* Daily Issuance Chart */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>📈 Daily Points Issued (7-day)</h3>
            <Chart3DBar
              data={dailyData.map((d, idx) => ({
                label: d.day,
                value: d.issued,
                color: ['#FF6B35', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4'][idx]
              }))}
              height={180}
            />
            <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
              SGD ${dailyData.reduce((sum, d) => sum + d.issued, 0) * 0.05} total this week
            </div>
          </div>

          {/* Daily Spending Chart */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>💳 Daily Points Redeemed (7-day)</h3>
            <Chart3DBar
              data={dailyData.map((d, idx) => ({
                label: d.day,
                value: d.redeemed,
                color: ['#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF6B35'][idx]
              }))}
              height={180}
            />
            <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
              SGD ${dailyData.reduce((sum, d) => sum + d.redeemed, 0) * 0.05} total this week
            </div>
          </div>
        </div>

        {/* Charts Row 2: Issuance by Type & Peak Hours */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1, minHeight: 0 }}>
          {/* Issuance by Type */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>🎯 Issuance by Type</h3>
            {issuanceByType.map(item => (
              <div key={item.type} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', color: '#333', fontWeight: '500' }}>{item.type}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35' }}>{item.points} EP (${(item.points * 0.05).toFixed(2)})</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#FF6B35', width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Peak Engagement Hours */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>⏰ Peak Issuance Hours</h3>
            {peakHours.map(item => (
              <div key={item.hour} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', color: '#666', minWidth: '30px', fontWeight: '500' }}>{item.hour}</span>
                <div style={{ flex: 1, height: '6px', background: '#f5f5f5', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#2196F3', width: `${(item.points / 420) * 100}%` }} />
                </div>
                <span style={{ fontSize: '10px', color: '#666', minWidth: '35px', textAlign: 'right', fontWeight: '500' }}>{item.points} EP</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Row */}
        <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ffb88c', overflowY: 'auto', minHeight: '120px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>📋 Recent Transactions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} style={{ background: '#f9f9f9', padding: '8px 12px', borderRadius: '4px', border: '1px solid #f0f0f0', flex: '1 1 180px', minWidth: '150px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>{t.user}</span>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: t.points > 0 ? '#4CAF50' : '#F44336' }}>
                    {t.points > 0 ? '+' : ''}{t.points}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#666', marginBottom: '3px' }}>{t.action}</div>
                <div style={{ fontSize: '9px', color: '#2196F3', fontWeight: '600', borderTop: '1px solid #e0e0e0', paddingTop: '4px' }}>
                  Balance: {t.balance} EP
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
                  title: 'Financial Health: Profitable Rewards Program',
                  description: 'SGD $622.50 issued vs SGD $5,422.50 redeemed = 8.7x return. Points drive user engagement while maintaining profitability.'
                },
                {
                  title: 'Peak Engagement & Spending Window',
                  description: '6pm shows highest issuance (420 EP/hour = SGD $21/hour). This peak correlates with highest user activity and redemptions.'
                },
                {
                  title: 'Task Completion ROI',
                  description: 'Task completion is primary driver (58% of issuance, SGD $311.25 cost). Generates highest user engagement and retention.'
                },
                {
                  title: 'Strong Redemption Economics',
                  description: '43.5% redemption rate (SGD $2,359.71 redeemed this month) exceeds industry average. Users value rewards, improving stickiness.'
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
