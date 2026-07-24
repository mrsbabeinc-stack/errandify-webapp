import React from 'react';

interface SOSAlertData {
  case_id: string;
  sos_type: string;
  user_id: number;
  user_name: string;
  errand_id?: number;
  severity: 'critical' | 'high';
  case_type: string;

  // Location data
  location?: {
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    timestamp: string;
    maps_url: string;
  };

  // Device info
  device_info?: {
    screen_width: number;
    screen_height: number;
    orientation: string;
    time_zone: string;
    language: string;
  };

  browser_info?: {
    user_agent: string;
    device_type: string;
    browser: string;
    timestamp: string;
  };

  // Timestamps
  submitted_at: string;
  response_required_by: string;
}

interface SOSAlertDisplayProps {
  alert: SOSAlertData;
  onDismiss?: () => void;
}

const SOS_TYPE_LABELS = {
  safety: { icon: '🚨', label: 'Safety Issue', color: '#ef4444' },
  medical: { icon: '🏥', label: 'Medical Emergency', color: '#dc2626' },
  police: { icon: '👮', label: 'Police Needed', color: '#b91c1c' },
  lost: { icon: '📍', label: 'Lost/Location Share', color: '#f97316' },
  call: { icon: '📞', label: 'Call Support Requested', color: '#ea580c' },
};

export const SOSAlertDisplay: React.FC<SOSAlertDisplayProps> = ({ alert, onDismiss }) => {
  const sosType = SOS_TYPE_LABELS[alert.sos_type as keyof typeof SOS_TYPE_LABELS];
  const isUrgent = ['safety', 'medical', 'police'].includes(alert.sos_type);

  return (
    <div style={{
      background: '#fff',
      border: `3px solid ${sosType.color}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: isUrgent ? `0 0 20px ${sosType.color}40` : '0 4px 12px rgba(0,0,0,0.1)',
      animation: isUrgent ? 'pulse-sos 2s infinite' : 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'start', flex: 1 }}>
          <div style={{ fontSize: '28px' }}>{sosType.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '2px' }}>
              {sosType.label}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Case #{alert.case_id}
            </div>
          </div>
        </div>
        {isUrgent && (
          <div style={{
            background: sosType.color,
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '700',
            whiteSpace: 'nowrap',
          }}>
            🚨 CRITICAL
          </div>
        )}
      </div>

      {/* User Info */}
      <div style={{
        background: '#f9f9f9',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '12px',
      }}>
        <div style={{ marginBottom: '6px' }}>
          <strong>User:</strong> {alert.user_name} (ID: #{alert.user_id})
        </div>
        {alert.errand_id && (
          <div>
            <strong>Errand:</strong> #{alert.errand_id}
          </div>
        )}
      </div>

      {/* Location - If available */}
      {alert.location && (
        <div style={{
          background: '#FFF5F0',
          border: '2px solid #FF6B35',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            📍 Location Data Collected
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
            <div>
              <strong>Coordinates:</strong> {alert.location.latitude.toFixed(6)}, {alert.location.longitude.toFixed(6)}
            </div>
            <div>
              <strong>Accuracy:</strong> ±{alert.location.accuracy_meters}m
            </div>
            <div>
              <strong>Timestamp:</strong> {new Date(alert.location.timestamp).toLocaleString()}
            </div>
          </div>
          <a
            href={alert.location.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#FF6B35',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: '600',
              marginTop: '8px',
            }}
          >
            📍 View on Google Maps →
          </a>
        </div>
      )}

      {/* Device & Browser Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '12px',
        fontSize: '10px',
        color: '#666',
      }}>
        {alert.device_info && (
          <div style={{ background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Device</div>
            <div>{alert.device_info.device_type === 'mobile' ? '📱 Mobile' : '💻 Web'}</div>
            <div>{alert.device_info.screen_width}x{alert.device_info.screen_height}</div>
            <div>{alert.device_info.orientation}</div>
            <div>TZ: {alert.device_info.time_zone}</div>
          </div>
        )}
        {alert.browser_info && (
          <div style={{ background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Browser</div>
            <div>{alert.browser_info.browser}</div>
            <div style={{ fontSize: '9px', wordBreak: 'break-all' }}>
              {alert.browser_info.user_agent.substring(0, 50)}...
            </div>
            <div style={{ marginTop: '4px', fontSize: '9px' }}>
              {new Date(alert.browser_info.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Timestamps & SLA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '12px',
        fontSize: '11px',
      }}>
        <div style={{ background: '#E8F5E9', padding: '8px', borderRadius: '4px', color: '#2e7d32' }}>
          <div style={{ fontWeight: '600' }}>Submitted</div>
          {new Date(alert.submitted_at).toLocaleString()}
        </div>
        <div style={{
          background: alert.sos_type === 'police' ? '#FFEBEE' : '#FFF3E0',
          padding: '8px',
          borderRadius: '4px',
          color: alert.sos_type === 'police' ? '#c62828' : '#e65100',
        }}>
          <div style={{ fontWeight: '600' }}>Response Required By</div>
          {new Date(alert.response_required_by).toLocaleString()}
          <div style={{ fontSize: '9px', marginTop: '2px' }}>
            ⏱️ {Math.round((new Date(alert.response_required_by).getTime() - new Date().getTime()) / 60000)} min SLA
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
      }}>
        <button style={{
          padding: '8px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
        }}>
          ✓ Acknowledged
        </button>
        <button style={{
          padding: '8px',
          background: '#F0A81E',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
        }}>
          💬 Contact User
        </button>
        <button style={{
          padding: '8px',
          background: '#F0A81E',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
        }}>
          🚀 Escalate
        </button>
      </div>

      <style>{`
        @keyframes pulse-sos {
          0%, 100% {
            box-shadow: 0 0 20px ${sosType.color}40;
          }
          50% {
            box-shadow: 0 0 30px ${sosType.color}80;
          }
        }
      `}</style>
    </div>
  );
};
