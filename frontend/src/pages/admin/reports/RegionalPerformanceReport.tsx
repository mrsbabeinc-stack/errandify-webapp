import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import AIAnalysisPanel from '../../../components/admin/reports/AIAnalysisPanel';
import { Chart3DBar } from '../../../components/admin/reports/Chart3D';

export const RegionalPerformanceReport: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState('central');

  const regions = [
    { id: 'central', name: 'Central', revenue: 18500, users: 12340, growth: 15 },
    { id: 'east', name: 'East', revenue: 14200, users: 9870, growth: 12 },
    { id: 'west', name: 'West', revenue: 11800, users: 7650, growth: 8 },
    { id: 'north', name: 'North', revenue: 8900, users: 5430, growth: 6 },
    { id: 'northeast', name: 'Northeast', revenue: 5120, users: 3210, growth: 4 },
  ];

  const selected = regions.find(r => r.id === selectedRegion);

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            🌍 Regional Performance
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Monitor regional metrics and geographic performance
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {regions.map(region => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              style={{
                padding: '8px 16px',
                background: selectedRegion === region.id ? '#FF6B35' : '#f5f5f5',
                color: selectedRegion === region.id ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {region.name}
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Regional Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>SGD {selected.revenue.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ {selected.growth}% YoY</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Users</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>{selected.users.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>User base</div>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Revenue Distribution by Region (3D Bar Chart)</h3>
          <Chart3DBar
            data={regions.map((r, idx) => ({
              label: r.name,
              value: r.revenue,
              color: ['#FF6B35', '#F0A81E', '#4CAF50', '#FFC107', '#E2736B'][idx]
            }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Top Regions by Growth</h3>
            {regions.sort((a, b) => b.growth - a.growth).slice(0, 3).map((r, idx) => (
              <div key={r.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>{idx + 1}. {r.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>↑ {r.growth}%</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#4CAF50', width: `${r.growth * 2}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Regional Market Share</h3>
            {regions.map(r => {
              const totalRevenue = regions.reduce((sum, reg) => sum + reg.revenue, 0);
              const share = ((r.revenue / totalRevenue) * 100).toFixed(1);
              return (
                <div key={r.id} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#333' }}>{r.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{share}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#f5f5f5', borderRadius: '3px' }}>
                    <div style={{ height: '100%', background: '#FF6B35', width: `${parseFloat(share)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Analysis Section */}
        <AIAnalysisPanel
          healthScore={88}
          healthLabel="Regional Performance Score"
          healthSentiment="Central region performing exceptionally well. Balanced growth across all regions. Market penetration strong."
          riskLevel={{
            level: 'low',
            description: 'Geographic concentration manageable. Revenue diversified. No single region dependency exceeds 40%.'
          }}
          safety="All regions comply with local safety regulations. No regional safety incidents reported."
          legal="Regional operations compliant with local regulations in all 5 regions. Tax filings up-to-date."
          bias="Regional services equitably distributed. No geographic bias in pricing or service availability."
          findings={[
            {
              title: 'Central Dominance',
              description: 'Central region drives 37% of platform revenue; strong urban concentration'
            },
            {
              title: 'East Growth',
              description: 'East region showing highest YoY growth at 12%; emerging market opportunity'
            },
            {
              title: 'Geographic Expansion',
              description: 'All regions showing positive growth; expansion strategy working well'
            },
            {
              title: 'User Penetration',
              description: '38,500 total active users across regions; balanced geographic spread'
            }
          ]}
          relatedLinks={[
            {
              text: 'Southeast Asia Market Growth Report 2026',
              url: '#'
            },
            {
              text: 'Urban vs Suburban Market Trends',
              url: '#'
            },
            {
              text: 'Regional Economic Outlook Q3 2026',
              url: '#'
            }
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default RegionalPerformanceReport;
