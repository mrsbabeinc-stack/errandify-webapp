import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface CashFlowForecast {
  forecast_id: number;
  period: string;
  expected_inflow: number;
  expected_outflow: number;
  net_forecast: number;
}

interface CashFlowActual {
  actual_id: number;
  date: string;
  actual_inflow: number;
  actual_outflow: number;
  balance: number;
}

interface CashFlowVariance {
  variance_id: number;
  period: string;
  forecast_amount: number;
  actual_amount: number;
  variance: number;
  variance_percent: number;
}

const CashFlowForecasting: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'forecast' | 'actuals' | 'variance'>('forecast');
  const [forecasts, setForecasts] = useState<CashFlowForecast[]>([]);
  const [actuals, setActuals] = useState<CashFlowActual[]>([]);
  const [variances, setVariances] = useState<CashFlowVariance[]>([]);
  const [showForecastForm, setShowForecastForm] = useState(false);
  const [forecastForm, setForecastForm] = useState({ period: '', expected_inflow: 0, expected_outflow: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const saved = localStorage.getItem('cash_flow_forecasts') || '[]';
    const savedActuals = localStorage.getItem('cash_flow_actuals') || '[]';
    const savedVariances = localStorage.getItem('cash_flow_variances') || '[]';

    let mockForecasts: CashFlowForecast[] = [
      { forecast_id: 1, period: '2026-07', expected_inflow: 150000, expected_outflow: 95000, net_forecast: 55000 },
      { forecast_id: 2, period: '2026-08', expected_inflow: 160000, expected_outflow: 100000, net_forecast: 60000 },
      { forecast_id: 3, period: '2026-09', expected_inflow: 170000, expected_outflow: 105000, net_forecast: 65000 },
    ];
    let mockActuals: CashFlowActual[] = [
      { actual_id: 1, date: '2026-07-10', actual_inflow: 50000, actual_outflow: 32000, balance: 18000 },
      { actual_id: 2, date: '2026-07-15', actual_inflow: 45000, actual_outflow: 28000, balance: 17000 },
      { actual_id: 3, date: '2026-07-20', actual_inflow: 55000, actual_outflow: 35000, balance: 20000 },
    ];
    let mockVariances: CashFlowVariance[] = [
      { variance_id: 1, period: '2026-06', forecast_amount: 48000, actual_amount: 52000, variance: 4000, variance_percent: 8.3 },
      { variance_id: 2, period: '2026-05', forecast_amount: 42000, actual_amount: 39500, variance: -2500, variance_percent: -6.0 },
    ];

    if (saved !== '[]') mockForecasts = JSON.parse(saved);
    if (savedActuals !== '[]') mockActuals = [...mockActuals, ...JSON.parse(savedActuals)];
    if (savedVariances !== '[]') mockVariances = [...mockVariances, ...JSON.parse(savedVariances)];

    setForecasts(mockForecasts);
    setActuals(mockActuals);
    setVariances(mockVariances);
  };

  const handleAddForecast = () => {
    if (!forecastForm.period || forecastForm.expected_inflow === 0 || forecastForm.expected_outflow === 0) {
      showToast('❌ Please fill all fields', 'error');
      return;
    }

    const newForecast: CashFlowForecast = {
      forecast_id: Date.now(),
      period: forecastForm.period,
      expected_inflow: forecastForm.expected_inflow,
      expected_outflow: forecastForm.expected_outflow,
      net_forecast: forecastForm.expected_inflow - forecastForm.expected_outflow,
    };

    const saved = localStorage.getItem('cash_flow_forecasts') || '[]';
    const updated = [...JSON.parse(saved), newForecast];
    localStorage.setItem('cash_flow_forecasts', JSON.stringify(updated));

    showToast(`✅ Forecast for ${forecastForm.period} added`, 'success');
    setShowForecastForm(false);
    setForecastForm({ period: '', expected_inflow: 0, expected_outflow: 0 });
    loadData();
  };

  const totalInflow = actuals.reduce((sum, a) => sum + a.actual_inflow, 0);
  const totalOutflow = actuals.reduce((sum, a) => sum + a.actual_outflow, 0);
  const currentBalance = actuals.length > 0 ? actuals[actuals.length - 1].balance : 0;
  const projectedInflow = forecasts.reduce((sum, f) => sum + f.expected_inflow, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>📈 Cash Flow Forecasting</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>30/60/90-day projections & variance analysis</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Actual Inflow (YTD)', value: `SGD ${totalInflow.toLocaleString()}`, color: '#4CAF50' },
            { label: 'Actual Outflow (YTD)', value: `SGD ${totalOutflow.toLocaleString()}`, color: '#E65100' },
            { label: 'Current Balance', value: `SGD ${currentBalance.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Projected Inflow (Next 3M)', value: `SGD ${projectedInflow.toLocaleString()}`, color: '#F0A81E' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['forecast', 'actuals', 'variance'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '8px 16px', background: activeTab === tab ? '#FF6B35' : '#f0f0f0', color: activeTab === tab ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab === 'forecast' ? '🔮 Forecast' : tab === 'actuals' ? '📊 Actuals' : '📉 Variance'}
            </button>
          ))}
        </div>

        {activeTab === 'forecast' && (
          <div>
            <button onClick={() => setShowForecastForm(!showForecastForm)} style={{ marginBottom: '24px', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>➕ Add Forecast</button>

            {showForecastForm && (
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Period (YYYY-MM) *</label>
                  <input type="text" placeholder="2026-08" value={forecastForm.period} onChange={(e) => setForecastForm({ ...forecastForm, period: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Expected Inflow (SGD) *</label>
                  <input type="number" min="0" step="1000" value={forecastForm.expected_inflow} onChange={(e) => setForecastForm({ ...forecastForm, expected_inflow: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Expected Outflow (SGD) *</label>
                  <input type="number" min="0" step="1000" value={forecastForm.expected_outflow} onChange={(e) => setForecastForm({ ...forecastForm, expected_outflow: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => setShowForecastForm(false)} style={{ padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button onClick={handleAddForecast} style={{ padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✓ Add Forecast</button>
                </div>
              </div>
            )}

            <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Period</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Expected Inflow</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Expected Outflow</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Net Forecast</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((forecast) => (
                    <tr key={forecast.forecast_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{forecast.period}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#4CAF50', fontWeight: '600' }}>SGD {forecast.expected_inflow.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#E65100', fontWeight: '600' }}>SGD {forecast.expected_outflow.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: forecast.net_forecast > 0 ? '#4CAF50' : '#E65100' }}>SGD {forecast.net_forecast.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'actuals' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Actual Inflow</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Actual Outflow</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Daily Balance</th>
                </tr>
              </thead>
              <tbody>
                {actuals.map((actual) => (
                  <tr key={actual.actual_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{actual.date}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#4CAF50', fontWeight: '600' }}>SGD {actual.actual_inflow.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#E65100', fontWeight: '600' }}>SGD {actual.actual_outflow.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>SGD {actual.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'variance' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Period</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Forecast</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Actual</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Variance</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>% Variance</th>
                </tr>
              </thead>
              <tbody>
                {variances.map((variance) => (
                  <tr key={variance.variance_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{variance.period}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#666' }}>SGD {variance.forecast_amount.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333', fontWeight: '600' }}>SGD {variance.actual_amount.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: variance.variance > 0 ? '#4CAF50' : '#E65100' }}>SGD {variance.variance.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: variance.variance_percent > 0 ? '#4CAF50' : '#E65100' }}>{variance.variance_percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CashFlowForecasting;
