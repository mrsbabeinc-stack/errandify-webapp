import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { SOSAlertDisplay } from '../../components/admin/SOSAlertDisplay';
import { useToast, ToastContainer } from '../../components/Toast';

interface SOSAlert {
  case_id: string;
  sos_type: string;
  user_id: number;
  user_name: string;
  errand_id?: number;
  severity: 'critical' | 'high';
  case_type: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    timestamp: string;
    maps_url: string;
  };
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
  submitted_at: string;
  response_required_by: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

export const SOSAlertsPage: React.FC = () => {
  const { toasts, showToast, removeToast } = useToast();
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'acknowledged'>('all');

  useEffect(() => {
    fetchSOSAlerts();
  }, []);

  const fetchSOSAlerts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cases/sos-alerts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Fetch SOS alerts error:', error);
      // A failed request used to fall through to a hardcoded mockAlerts array
      // and then call setError(''), so a dead endpoint rendered as a healthy
      // screen full of invented rows. That is how a broken route survives for
      // months: nobody can see it is broken. Show the failure instead.
      setAlerts([]);
      showToast('Could not load SOS alerts — this is a problem on our side, not an empty list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(a => a.status === filter);

  const pendingCount = alerts.filter(a => a.status === 'pending').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginBottom: '4px', margin: 0 }}>
              🆘 SOS Emergency Alerts
            </h2>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
              Real-time emergency cases with location tracking & device info
            </p>
          </div>
          {pendingCount > 0 && (
            <div style={{
              background: '#ef4444',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              textAlign: 'center',
            }}>
              {pendingCount} Pending
              {criticalCount > 0 && (
                <div style={{ fontSize: '10px', marginTop: '2px' }}>
                  {criticalCount} Critical
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            background: '#fff',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>Critical</div>
          </div>
          <div style={{
            background: '#fff',
            border: '2px solid #F0A81E',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0A81E' }}>
              {pendingCount}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>Pending</div>
          </div>
          <div style={{
            background: '#fff',
            border: '2px solid #10b981',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
              {alerts.filter(a => a.status === 'resolved').length}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>Resolved</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['all', 'pending', 'acknowledged'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filter === status ? '#FF6B35' : '#f5f5f5',
                color: filter === status ? 'white' : '#333',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {status === 'all' ? 'All' : status === 'pending' ? 'Pending' : 'Acknowledged'}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Loading SOS alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: '#f9f9f9',
            borderRadius: '8px',
            color: '#666',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>No {filter !== 'all' ? filter : ''} alerts</p>
            <p style={{ margin: 0, fontSize: '12px' }}>
              All emergency cases are being handled
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredAlerts.map(alert => (
              <SOSAlertDisplay
                key={alert.case_id}
                alert={alert}
                onDismiss={() => {
                  setAlerts(alerts.filter(a => a.case_id !== alert.case_id));
                  showToast(`Alert ${alert.case_id} dismissed`, 'success');
                }}
              />
            ))}
          </div>
        )}

        {/* Info Box */}
        <div style={{
          marginTop: '24px',
          background: '#FFF5F0',
          border: '2px solid #FF6B35',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
          color: '#666',
        }}>
          <div style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            📍 What data is collected in SOS alerts?
          </div>
          <ul style={{ margin: '0 0 8px 0', paddingLeft: '16px' }}>
            <li>User location (GPS) - Latitude, longitude, accuracy</li>
            <li>Device info - Screen size, orientation, timezone, language</li>
            <li>Browser details - Type, version, OS, user agent</li>
            <li>Timestamps - When alert was submitted & SLA deadline</li>
            <li>Direct Google Maps link to user location</li>
          </ul>
          <div style={{ fontStyle: 'italic', color: '#999' }}>
            This data helps support team respond faster and locate users in emergencies. Only admins can access this data.
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
