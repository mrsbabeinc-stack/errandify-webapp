import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface AIFeature {
  id: number;
  name: string;
  status: 'active' | 'beta' | 'coming';
  accuracy: number;
  usage: number;
  icon: string;
  description: string;
}

const AIFeaturesHub: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'extraction' | 'categorization' | 'fraud' | 'insights'>('extraction');

  const aiFeatures: AIFeature[] = [
    { id: 1, name: 'Invoice Data Extraction', status: 'active', accuracy: 96.2, usage: 1234, icon: '📄', description: 'Auto-extract vendor, amount, date from invoice images' },
    { id: 2, name: 'Expense Categorization', status: 'active', accuracy: 94.8, usage: 5678, icon: '🏷️', description: 'Auto-categorize expenses into travel, supplies, meals, etc.' },
    { id: 3, name: 'Fraud Detection', status: 'beta', accuracy: 89.5, usage: 312, icon: '🚨', description: 'Identify suspicious transactions & duplicate invoices' },
    { id: 4, name: 'Document Classification', status: 'active', accuracy: 98.1, usage: 2045, icon: '📋', description: 'Auto-classify receipts, invoices, contracts' },
    { id: 5, name: 'Sentiment Analysis', status: 'coming', accuracy: 91.3, usage: 0, icon: '😊', description: 'Analyze customer satisfaction from reviews & feedback' },
    { id: 6, name: 'Predictive Analytics', status: 'coming', accuracy: 0, usage: 0, icon: '🔮', description: 'Forecast cash flow, attrition risk, budget needs' },
  ];

  const handleRunExtraction = () => {
    showToast('✅ AI extraction started - processing 5 invoices...', 'success');
  };

  const handleTrainModel = () => {
    showToast('✅ AI model retraining initiated (est. 2 hours)', 'success');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>🤖 AI Features Hub</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Invoice extraction, expense categorization, fraud detection, document classification</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        {/* AI Performance Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Avg Accuracy', value: '94.2%', color: '#4CAF50' },
            { label: 'Monthly Usage', value: '9.3K', color: '#F0A81E' },
            { label: 'Model Version', value: 'v2.1', color: '#FF6B35' },
            { label: 'Last Retrain', value: '3 days ago', color: '#E2736B' },
          ].map((metric, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${metric.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{metric.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: metric.color }}>{metric.value}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'extraction', label: '📄 Data Extraction', icon: '📄' },
            { id: 'categorization', label: '🏷️ Categorization', icon: '🏷️' },
            { id: 'fraud', label: '🚨 Fraud Detection', icon: '🚨' },
            { id: 'insights', label: '💡 Insights', icon: '💡' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '8px 16px', background: activeTab === tab.id ? '#FF6B35' : '#f0f0f0', color: activeTab === tab.id ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* AI Features Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {aiFeatures.map((feature) => (
            <div key={feature.id} style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ fontSize: '28px' }}>{feature.icon}</div>
                <div style={{ padding: '4px 8px', background: feature.status === 'active' ? '#E8F5E9' : feature.status === 'beta' ? '#FFF3E4' : '#FCEDE9', color: feature.status === 'active' ? '#2E7D32' : feature.status === 'beta' ? '#D98C0C' : '#6A1B9A', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                  {feature.status === 'active' ? '✓ Active' : feature.status === 'beta' ? '🧪 Beta' : '🔜 Coming'}
                </div>
              </div>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: '#333' }}>{feature.name}</h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#666', lineHeight: '1.4' }}>{feature.description}</p>

              {feature.status !== 'coming' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>Accuracy</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35' }}>{feature.accuracy}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${feature.accuracy}%`, height: '100%', background: '#4CAF50' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Usage: {feature.usage.toLocaleString()} times this month</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px' }}>
                {feature.status === 'active' && (
                  <>
                    <button onClick={handleRunExtraction} style={{ flex: 1, padding: '6px', background: '#F0A81E', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                      Run
                    </button>
                    <button onClick={handleTrainModel} style={{ flex: 1, padding: '6px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                      Train
                    </button>
                  </>
                )}
                {feature.status === 'beta' && (
                  <button style={{ flex: 1, padding: '6px', background: '#E2736B', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    Try Beta
                  </button>
                )}
                {feature.status === 'coming' && (
                  <button style={{ flex: 1, padding: '6px', background: '#ccc', color: '#999', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'not-allowed' }}>
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI Performance Details */}
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>🤖 AI Model Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Model Type</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>LLM Fine-tuned (Qwen)</div>
            </div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Training Data</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>50K documents, 8 categories</div>
            </div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Response Time</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>~250ms per document</div>
            </div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Monthly Cost</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>~SGD 450 (pay-per-use)</div>
            </div>
          </div>
          <button onClick={handleTrainModel} style={{ padding: '8px 16px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
            🔄 Retrain All Models
          </button>
        </div>

        {/* AI Features Info */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '12px', color: '#2E7D32', margin: '0 0 8px 0', fontWeight: '600' }}>🤖 AI Features Capabilities</p>
          <ul style={{ fontSize: '12px', color: '#2E7D32', margin: 0, paddingLeft: '20px' }}>
            <li>Invoice data extraction (vendor, amount, date, line items)</li>
            <li>Expense categorization (6+ categories with ML)</li>
            <li>Fraud detection (duplicate invoices, suspicious amounts)</li>
            <li>Document classification (receipt, invoice, contract, etc.)</li>
            <li>Batch processing (1000+ documents per run)</li>
            <li>Model accuracy tracking & retraining</li>
            <li>Confidence scores & manual review queue</li>
            <li>Integration with all AP/AR & Expense modules</li>
            <li>Ready for backend API integration & WebSocket real-time updates</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AIFeaturesHub;
