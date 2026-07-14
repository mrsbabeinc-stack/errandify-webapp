import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import AIAnalysisPanel from '../../../components/admin/reports/AIAnalysisPanel';

export const FinancialHealthReport: React.FC = () => {
  const [timeRange, setTimeRange] = useState('month');

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            💰 Financial Health
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Revenue, expenses, and profitability metrics
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['week', 'month', 'quarter', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '8px 16px',
                background: timeRange === range ? '#FF6B35' : '#f5f5f5',
                color: timeRange === range ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>SGD 45,320</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 12% from last {timeRange}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Expenses</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>SGD 18,500</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↓ 5% from last {timeRange}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Net Profit</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>SGD 26,820</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>59% profit margin</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Transactions</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>1,234</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 8% from last {timeRange}</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '350px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Revenue Trend (Last 12 Months)</h3>
          <svg width="100%" height="280" viewBox="0 0 800 280" style={{ marginTop: '12px' }}>
            {/* Grid */}
            <defs>
              <pattern id="grid" width="80" height="40" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="800" height="280" fill="url(#grid)" />

            {/* Axes */}
            <line x1="40" y1="260" x2="780" y2="260" stroke="#ddd" strokeWidth="2"/>
            <line x1="40" y1="20" x2="40" y2="260" stroke="#ddd" strokeWidth="2"/>

            {/* Y-axis labels */}
            <text x="30" y="265" fontSize="11" textAnchor="end" fill="#999">0K</text>
            <text x="30" y="195" fontSize="11" textAnchor="end" fill="#999">15K</text>
            <text x="30" y="125" fontSize="11" textAnchor="end" fill="#999">30K</text>
            <text x="30" y="55" fontSize="11" textAnchor="end" fill="#999">45K</text>

            {/* Data line (smooth curve) */}
            <polyline
              points="60,180 140,140 220,120 300,160 380,100 460,130 540,90 620,110 700,70 780,100"
              fill="none"
              stroke="#FF6B35"
              strokeWidth="3"
            />

            {/* Data points */}
            {[60, 140, 220, 300, 380, 460, 540, 620, 700, 780].map((x, i) => {
              const points = [180, 140, 120, 160, 100, 130, 90, 110, 70, 100];
              return (
                <circle key={i} cx={x} cy={points[i]} r="4" fill="#FF6B35" />
              );
            })}

            {/* X-axis labels */}
            <text x="60" y="275" fontSize="11" textAnchor="middle" fill="#999">Jan</text>
            <text x="140" y="275" fontSize="11" textAnchor="middle" fill="#999">Feb</text>
            <text x="220" y="275" fontSize="11" textAnchor="middle" fill="#999">Mar</text>
            <text x="300" y="275" fontSize="11" textAnchor="middle" fill="#999">Apr</text>
            <text x="380" y="275" fontSize="11" textAnchor="middle" fill="#999">May</text>
            <text x="460" y="275" fontSize="11" textAnchor="middle" fill="#999">Jun</text>
            <text x="540" y="275" fontSize="11" textAnchor="middle" fill="#999">Jul</text>
            <text x="620" y="275" fontSize="11" textAnchor="middle" fill="#999">Aug</text>
            <text x="700" y="275" fontSize="11" textAnchor="middle" fill="#999">Sep</text>
            <text x="780" y="275" fontSize="11" textAnchor="middle" fill="#999">Oct</text>
          </svg>
        </div>

        {/* AI Analysis Section */}
        <AIAnalysisPanel
          healthScore={92}
          healthLabel="Financial Health Score"
          healthSentiment="Revenue growth outpacing expenses. Profit margin of 59% indicates healthy unit economics. Sustainability high."
          riskLevel={{
            level: 'low',
            description: 'Consistent revenue trends. No volatility spikes. Expense growth controlled at 5% vs revenue 12%.'
          }}
          safety="All transactions compliant with payment regulations. No fraud detected in automated screening."
          legal="Revenue recognition aligned with IFRS 15. Expense categorization audit-compliant. No regulatory violations."
          bias="Revenue distribution neutral across customer segments. Pricing fair and transparent. No algorithmic bias detected."
          findings={[
            {
              title: 'Growth Acceleration',
              description: 'Revenue up 12% YoY; on track to exceed Q3 targets by 8%'
            },
            {
              title: 'Operational Efficiency',
              description: 'Expense control excellent; COGS decreased 5% through platform optimization'
            },
            {
              title: 'Profitability Trend',
              description: 'Net profit margin improving; suggests scalable business model'
            },
            {
              title: 'Transaction Volume',
              description: '1,234 active txns indicates stable customer base retention'
            }
          ]}
          relatedLinks={[
            {
              text: 'Industry Report: Gig Economy Growth +23% in SE Asia',
              url: '#'
            },
            {
              text: 'Marketplace Benchmark: Profitability at 45-60% margin',
              url: '#'
            },
            {
              text: 'Analysis: Payment Processing Efficiency Gains',
              url: '#'
            }
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default FinancialHealthReport;
