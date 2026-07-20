import React, { useState, useEffect } from 'react';

interface DayHours {
  open: string;
  close: string;
  active: boolean;
}

interface OperationHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  timezone: string;
}

interface OperationHoursManagerProps {
  companyId: number;
  onSave?: (hours: OperationHours) => void;
}

const OperationHoursManager: React.FC<OperationHoursManagerProps> = ({ companyId, onSave }) => {
  const [hours, setHours] = useState<OperationHours>({
    monday: { open: '09:00', close: '18:00', active: true },
    tuesday: { open: '09:00', close: '18:00', active: true },
    wednesday: { open: '09:00', close: '18:00', active: true },
    thursday: { open: '09:00', close: '18:00', active: true },
    friday: { open: '09:00', close: '18:00', active: true },
    saturday: { open: '09:00', close: '13:00', active: false },
    sunday: { open: '09:00', close: '13:00', active: false },
    timezone: 'Asia/Singapore'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const dayLabels: Record<typeof days[number], string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  useEffect(() => {
    fetchOperationHours();
  }, [companyId]);

  const fetchOperationHours = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operations/hours/${companyId}`);
      const data = await response.json();
      if (data.success && data.data) {
        setHours(data.data);
      }
    } catch (error) {
      console.error('Error fetching operation hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: typeof days[number]) => {
    setHours({
      ...hours,
      [day]: {
        ...hours[day],
        active: !hours[day].active
      }
    });
  };

  const handleTimeChange = (day: typeof days[number], field: 'open' | 'close', value: string) => {
    setHours({
      ...hours,
      [day]: {
        ...hours[day],
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/operations/hours/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(hours)
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Operation hours updated successfully');
        if (onSave) onSave(hours);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Failed to save operation hours');
      }
    } catch (error) {
      console.error('Error saving operation hours:', error);
      setMessage('❌ Error saving operation hours');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading operation hours...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#333' }}>
          ⏰ Operation Hours
        </h2>
        <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>
          Set your company's operating hours for each day of the week
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            background: message.includes('✅') ? '#E8F5E9' : '#FFEBEE',
            color: message.includes('✅') ? '#2E7D32' : '#C62828',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '12px' }}>
        {days.map((day) => (
          <div
            key={day}
            style={{
              background: hours[day].active ? 'white' : '#F5F5F5',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            {/* Day label */}
            <div style={{ flex: '0 0 100px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hours[day].active}
                  onChange={() => handleDayToggle(day)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '600', color: hours[day].active ? '#333' : '#999' }}>
                  {dayLabels[day]}
                </span>
              </label>
            </div>

            {/* Time inputs */}
            {hours[day].active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>Open:</label>
                  <input
                    type="time"
                    value={hours[day].open}
                    onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                    style={{
                      padding: '8px',
                      border: '1px solid #DDD',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>Close:</label>
                  <input
                    type="time"
                    value={hours[day].close}
                    onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                    style={{
                      padding: '8px',
                      border: '1px solid #DDD',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
            )}

            {!hours[day].active && (
              <div style={{ color: '#999', fontSize: '13px' }}>
                Closed
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: '#FF6B35',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? '⏳ Saving...' : '💾 Save Operation Hours'}
        </button>
      </div>

      <div style={{ marginTop: '16px', padding: '12px', background: '#F9F9F9', borderRadius: '8px' }}>
        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
          💡 <strong>Tip:</strong> Staff can only accept errands during your operating hours. Errands scheduled outside these times will be blocked.
        </p>
      </div>
    </div>
  );
};

export default OperationHoursManager;
