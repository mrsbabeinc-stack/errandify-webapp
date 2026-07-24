import React from 'react';

interface Finding {
  title: string;
  description: string;
}

interface RiskLevel {
  level: 'low' | 'medium' | 'high';
  description: string;
}

interface AIAnalysisPanelProps {
  healthScore?: number;
  healthLabel?: string;
  healthSentiment: string;
  riskLevel: RiskLevel;
  findings: Finding[];
  relatedLinks?: Array<{ text: string; url: string }>;
  safety?: string;
  legal?: string;
  bias?: string;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  healthScore = 85,
  healthLabel = 'Status',
  healthSentiment,
  riskLevel,
  findings,
  relatedLinks = [],
  safety,
  legal,
  bias
}) => {
  return (
    <div style={{ background: '#fff5f0', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', marginTop: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px' }}>🤖</span>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>AI Analysis & Insights</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '4px' }}>📊 {healthLabel}</div>
          <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
            <strong>{healthScore > 80 ? '✅ Excellent' : healthScore > 60 ? '⚠️ Good' : '❌ Poor'} ({healthScore}/100)</strong> — {healthSentiment}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '4px' }}>⚠️ Risk Assessment</div>
          <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
            <strong>{riskLevel.level === 'high' ? '🔴 High' : riskLevel.level === 'medium' ? '🟡 Medium' : '🟢 Low'} Risk</strong> — {riskLevel.description}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {safety && (
          <div style={{ background: '#FFF3E4', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#B5651D', marginBottom: '4px' }}>🔒 Safety</div>
            <div style={{ fontSize: '12px', color: '#B5651D', lineHeight: '1.4' }}>{safety}</div>
          </div>
        )}
        {legal && (
          <div style={{ background: '#FFF3E0', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#E65100', marginBottom: '4px' }}>⚖️ Legal</div>
            <div style={{ fontSize: '12px', color: '#BF360C', lineHeight: '1.4' }}>{legal}</div>
          </div>
        )}
        {bias && (
          <div style={{ background: '#FCEDE9', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#6A1B9A', marginBottom: '4px' }}>⚖️ Bias Check</div>
            <div style={{ fontSize: '12px', color: '#4A148C', lineHeight: '1.4' }}>{bias}</div>
          </div>
        )}
      </div>

      <div style={{ paddingTop: '12px', borderTop: '1px solid #ffb88c' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '4px' }}>✅ Key Findings</div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#333', lineHeight: '1.6' }}>
          {findings.map((finding, idx) => (
            <li key={idx}>
              <strong>{finding.title}:</strong> {finding.description}
            </li>
          ))}
        </ul>
      </div>

      {relatedLinks.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ffb88c' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '4px' }}>📰 Related News & Benchmarks</div>
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
            {relatedLinks.map((link, idx) => (
              <div key={idx}>
                • <a href={link.url} style={{ color: '#FF6B35', textDecoration: 'none' }}>{link.text}</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;
