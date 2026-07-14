import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';

interface SOSButtonProps {
  errandId?: number;
  userId?: number;
  userName?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

const SOS_SUPPORT_NUMBER = '+65 6234 5678';

const SOS_OPTIONS = [
  {
    id: 'safety',
    icon: '🚨',
    label: 'Safety Issue',
    description: 'Harassment, threat, or unsafe situation',
    urgent: true,
    collectLocation: true,
  },
  {
    id: 'medical',
    icon: '🏥',
    label: 'Medical Emergency',
    description: 'Need ambulance or immediate medical help',
    urgent: true,
    collectLocation: true,
  },
  {
    id: 'police',
    icon: '👮',
    label: 'Police Needed',
    description: 'Crime in progress or law enforcement needed',
    urgent: true,
    collectLocation: true,
  },
  {
    id: 'lost',
    icon: '📍',
    label: 'Send My Location',
    description: 'Share GPS coordinates with support team',
    urgent: false,
    collectLocation: true,
  },
  {
    id: 'call',
    icon: '📞',
    label: 'Call Support Now',
    description: `Speak to support team immediately (${SOS_SUPPORT_NUMBER})`,
    urgent: false,
    collectLocation: false,
  },
];

export const SOSButton: React.FC<SOSButtonProps> = ({ errandId, userId, userName }) => {
  const { showToast } = useToast();
  const [showSOSMenu, setShowSOSMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [showNumberAlert, setShowNumberAlert] = useState(false);
  const [selectedSOSType, setSelectedSOSType] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>('');

  // Collect user device & browser info
  const getUserDeviceInfo = () => {
    return {
      user_agent: navigator.userAgent,
      device_type: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'web',
      browser: getBrowserInfo(),
      timestamp: new Date().toISOString(),
    };
  };

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  // Collect device orientation & screen info
  const getDeviceInfo = () => {
    return {
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  };

  // Get GPS location with high accuracy
  const getLocation = async (): Promise<LocationData | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        showToast('GPS not available on this device', 'warning');
        resolve(null);
        return;
      }

      // High accuracy GPS collection
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          setLocationData(data);
          resolve(data);
        },
        (error) => {
          console.error('Geolocation error:', error);
          showToast('Could not access GPS. Please enable location services.', 'warning');
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleSOSAction = async (actionId: string) => {
    // Show confirmation for critical actions
    if (['safety', 'medical', 'police'].includes(actionId)) {
      setPendingAction(actionId);
      setShowConfirmation(true);
      return;
    }

    // For call option, just show the number and dial
    if (actionId === 'call') {
      setShowNumberAlert(true);
      return;
    }

    // For non-critical (lost, location share), proceed
    submitSOSAlert(actionId);
  };

  const submitSOSAlert = async (actionId: string) => {
    setSelectedSOSType(actionId);

    setShowConfirmation(false);

    // For location-based actions, collect GPS first
    let gpsData = null;
    if (SOS_OPTIONS.find(o => o.id === actionId)?.collectLocation) {
      showToast('Collecting your location...', 'info');
      gpsData = await getLocation();
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      // Comprehensive data collection for admin alert
      const sosPayload = {
        sos_type: actionId,
        errand_id: errandId,
        user_id: userId,
        user_name: userName || 'Unknown User',
        case_type: actionId === 'medical' ? 'safety_concern' :
                   actionId === 'police' ? 'safety_concern' :
                   actionId === 'safety' ? 'safety_concern' : 'task_enquiry',
        severity: actionId === 'police' || actionId === 'medical' ? 'critical' : 'high',

        // Location data
        location: gpsData ? {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          accuracy_meters: Math.round(gpsData.accuracy),
          timestamp: gpsData.timestamp,
          // Google Maps link for admin
          maps_url: `https://www.google.com/maps?q=${gpsData.latitude},${gpsData.longitude}`,
        } : null,

        // Device info
        device_info: getDeviceInfo(),
        browser_info: getUserDeviceInfo(),

        // Timestamps
        submitted_at: new Date().toISOString(),
        response_required_by: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min SLA
      };

      const response = await fetch('/api/cases/sos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sosPayload),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(`🚨 SOS Alert sent! Case #${data.case_id}. Support team notified immediately.`, 'success');
        setShowSOSMenu(false);
      } else {
        showToast('Failed to send SOS alert', 'error');
      }
    } catch (error) {
      console.error('SOS action error:', error);
      showToast('Error sending SOS alert. Call support directly: ' + SOS_SUPPORT_NUMBER, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showSOSMenu && !showNumberAlert) {
    return (
      <button
        onClick={() => setShowSOSMenu(true)}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: '#f5f5f5',
          color: '#999',
          border: '2px solid #ddd',
          fontSize: '18px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'all 0.3s',
        }}
        title="Help & Support"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.style.borderColor = '#999';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f5f5f5';
          e.currentTarget.style.borderColor = '#ddd';
        }}
      >
        ?
      </button>
    );
  }

  // Show confirmation for critical emergencies
  if (showConfirmation && pendingAction) {
    const actionLabel = SOS_OPTIONS.find(o => o.id === pendingAction)?.label || 'Emergency';
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={() => setShowConfirmation(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 998,
          }}
        />

        {/* Confirmation Modal */}
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 1000,
          maxWidth: '340px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
            Confirm Emergency Alert
          </h2>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 20px 0', lineHeight: '1.6' }}>
            You are reporting: <strong>{actionLabel}</strong>
          </p>

          <div style={{
            background: '#FFF3E0',
            border: '1px solid #FFB74D',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#333',
            lineHeight: '1.5',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>⚠️ Important:</div>
            This will alert support and emergency services. False emergencies may result in account suspension.
          </div>

          {/* Buttons */}
          <div style={{ display: 'grid', gap: '8px' }}>
            <button
              onClick={() => submitSOSAlert(pendingAction)}
              disabled={isSubmitting}
              style={{
                padding: '12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'Sending...' : 'Yes, Confirm Alert'}
            </button>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setPendingAction('');
              }}
              disabled={isSubmitting}
              style={{
                padding: '12px',
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  // Show phone number alert
  if (showNumberAlert) {
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={() => setShowNumberAlert(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 998,
          }}
        />

        {/* Alert Modal */}
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 1000,
          maxWidth: '320px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🆘</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
            Call Support Now
          </h2>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 20px 0', lineHeight: '1.6' }}>
            Our support team is available 24/7 to help you
          </p>

          {/* Phone Number - Large & Prominent */}
          <div style={{
            background: '#ef4444',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontFamily: 'monospace',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', opacity: 0.9 }}>
              EMERGENCY HOTLINE
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>
              {SOS_SUPPORT_NUMBER}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'grid', gap: '8px' }}>
            <button
              onClick={() => {
                // Also send SOS alert to backend even though they're calling directly
                handleSOSAction('call-direct');
                window.location.href = `tel:${SOS_SUPPORT_NUMBER.replace(/\s+/g, '')}`;
              }}
              style={{
                padding: '12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              📞 Call Now
            </button>
            <button
              onClick={() => setShowNumberAlert(false)}
              style={{
                padding: '12px',
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Back
            </button>
          </div>

          {/* Small text */}
          <p style={{
            fontSize: '10px',
            color: '#999',
            margin: '12px 0 0 0',
          }}>
            For emergencies, also call local authorities (112/999)
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop - subtle */}
      <div
        onClick={() => setShowSOSMenu(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 998,
        }}
      />

      {/* Help Menu - Discreet */}
      <div style={{
        position: 'fixed',
        bottom: '70px',
        right: '16px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        zIndex: 1000,
        width: '260px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: '#f9f9f9',
          color: '#333',
          padding: '10px 12px',
          fontSize: '12px',
          fontWeight: '600',
          borderBottom: '1px solid #eee',
        }}>
          Support Options
        </div>

        {/* Options - Simple, no emojis */}
        <div style={{ maxHeight: '350px', overflow: 'auto' }}>
          {SOS_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => handleSOSAction(option.id)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderBottom: '1px solid #eee',
                background: '#fff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s',
                opacity: isSubmitting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = '#fafafa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              <div style={{ fontWeight: '500', color: '#333', fontSize: '12px', marginBottom: '2px' }}>
                {option.label}
              </div>
              <div style={{ fontSize: '10px', color: '#777', lineHeight: '1.3' }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {/* Footer - minimal info */}
        <div style={{
          padding: '8px 12px',
          background: '#f5f5f5',
          borderTop: '1px solid #eee',
          fontSize: '9px',
          color: '#999',
          textAlign: 'center',
        }}>
          For emergencies: {SOS_SUPPORT_NUMBER}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.8); }
        }
      `}</style>
    </>
  );
};
