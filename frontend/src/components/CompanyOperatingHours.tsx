import React, { useState } from 'react';

interface OperatingHours {
  day: string;
  open: string;
  close: string;
  active: boolean;
}

interface SpecialDate {
  id: number;
  date: string;
  name: string;
  type: 'custom' | 'holiday';
  blocked: boolean;
}

const CompanyOperatingHours: React.FC = () => {
  const [hours, setHours] = useState<OperatingHours[]>([
    { day: 'Monday', open: '09:00', close: '18:00', active: true },
    { day: 'Tuesday', open: '09:00', close: '18:00', active: true },
    { day: 'Wednesday', open: '09:00', close: '18:00', active: true },
    { day: 'Thursday', open: '09:00', close: '18:00', active: true },
    { day: 'Friday', open: '09:00', close: '18:00', active: true },
    { day: 'Saturday', open: '09:00', close: '14:00', active: true },
    { day: 'Sunday', open: '00:00', close: '00:00', active: false },
  ]);

  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([
    { id: 1, date: '2026-02-10', name: 'Chinese New Year', type: 'holiday', blocked: false },
    { id: 2, date: '2026-02-11', name: 'Chinese New Year Day 2', type: 'holiday', blocked: false },
    { id: 3, date: '2026-12-24', name: 'Christmas Eve', type: 'holiday', blocked: false },
    { id: 4, date: '2026-12-25', name: 'Christmas Day', type: 'holiday', blocked: true },
  ]);

  const [showCustomDateForm, setShowCustomDateForm] = useState(false);
  const [newDateName, setNewDateName] = useState('');
  const [newDateValue, setNewDateValue] = useState('');
  const [newDateType, setNewDateType] = useState<'custom' | 'holiday'>('custom');
  const [savedMessage, setSavedMessage] = useState('');

  const singaporeHolidays = [
    { date: '2026-01-26', name: 'Thaipusam' },
    { date: '2026-02-10', name: 'Chinese New Year' },
    { date: '2026-02-11', name: 'Chinese New Year Day 2' },
    { date: '2026-04-10', name: 'Good Friday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-22', name: 'Vesak Day' },
    { date: '2026-08-09', name: 'National Day' },
    { date: '2026-10-31', name: 'Deepavali' },
    { date: '2026-12-24', name: 'Christmas Eve' },
    { date: '2026-12-25', name: 'Christmas Day' },
  ];

  const handleHourChange = (index: number, field: string, value: string) => {
    const updated = [...hours];
    updated[index] = { ...updated[index], [field]: value };
    setHours(updated);
  };

  const handleActiveToggle = (index: number) => {
    const updated = [...hours];
    updated[index].active = !updated[index].active;
    setHours(updated);
  };

  const handleToggleBlockDate = (dateId: number) => {
    setSpecialDates(
      specialDates.map((d) =>
        d.id === dateId ? { ...d, blocked: !d.blocked } : d
      )
    );
  };

  const handleAddCustomDate = () => {
    if (!newDateName.trim() || !newDateValue) {
      alert('Please fill in date name and date');
      return;
    }

    const newId = Math.max(...specialDates.map((d) => d.id), 0) + 1;
    setSpecialDates([
      ...specialDates,
      {
        id: newId,
        date: newDateValue,
        name: newDateName,
        type: newDateType,
        blocked: true, // Default custom dates to blocked
      },
    ]);

    setNewDateName('');
    setNewDateValue('');
    setNewDateType('custom');
    setShowCustomDateForm(false);
  };

  const handleDeleteDate = (dateId: number) => {
    setSpecialDates(specialDates.filter((d) => d.id !== dateId));
  };

  const handleSave = () => {
    setSavedMessage('✅ Operating hours saved successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px', color: '#333' }}>
        ⏰ Company Operating Hours
      </h2>

      {/* Operating Hours Section */}
      <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '24px', marginBottom: '32px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#333' }}>📅 Weekly Schedule</h3>

        <div style={{ display: 'grid', gap: '16px' }}>
          {hours.map((hour, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 1fr 100px', gap: '12px', alignItems: 'center', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <label style={{ fontWeight: '600', color: '#333' }}>{hour.day}</label>

              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Start Time</label>
                <input
                  type="time"
                  value={hour.open}
                  onChange={(e) => handleHourChange(index, 'open', e.target.value)}
                  disabled={!hour.active}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    opacity: hour.active ? 1 : 0.5,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>End Time</label>
                <input
                  type="time"
                  value={hour.close}
                  onChange={(e) => handleHourChange(index, 'close', e.target.value)}
                  disabled={!hour.active}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    opacity: hour.active ? 1 : 0.5,
                  }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Active</label>
                <input
                  type="checkbox"
                  checked={hour.active}
                  onChange={() => handleActiveToggle(index)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Dates & Public Holidays Section */}
      <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '24px', marginBottom: '32px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#333' }}>📅 Special Dates & Public Holidays</h3>

        <div style={{ marginBottom: '24px', padding: '16px', background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE4C4 100%)', borderRadius: '8px', border: '2px solid #FFB84D' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: '600' }}>
            💡 <strong>Flexible Blocking:</strong> Choose which dates to block off for staff. Some team members may work on certain public holidays - you control which dates are blocked.
          </p>
        </div>

        {/* Add Custom Date Form */}
        {!showCustomDateForm ? (
          <button
            onClick={() => setShowCustomDateForm(true)}
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            + Add Custom Date (D&D, Team Building, etc.)
          </button>
        ) : (
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '2px solid #FFD9B3' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>Add Custom Special Date</h4>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Date Name
                </label>
                <input
                  type="text"
                  value={newDateName}
                  onChange={(e) => setNewDateName(e.target.value)}
                  placeholder="e.g., Annual D&D, Team Building..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDateValue}
                    onChange={(e) => setNewDateValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Type
                  </label>
                  <select
                    value={newDateType}
                    onChange={(e) => setNewDateType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="custom">Custom Date</option>
                    <option value="holiday">Public Holiday</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleAddCustomDate}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✅ Add Date
              </button>
              <button
                onClick={() => setShowCustomDateForm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Special Dates List */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #ddd' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>
            {specialDates.length} Dates Configured
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            {specialDates.map((date) => (
              <div
                key={date.id}
                style={{
                  padding: '12px',
                  background: date.blocked ? '#e8f5e9' : '#fff9e6',
                  borderRadius: '6px',
                  border: `2px solid ${date.blocked ? '#4caf50' : '#ffd700'}`,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>
                    {date.type === 'holiday' ? '🇸🇬' : '📌'} {date.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    {new Date(date.date).toLocaleDateString('en-SG', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={date.blocked}
                    onChange={() => handleToggleBlockDate(date.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>{date.blocked ? '✓ Block' : '✗ Allow'}</span>
                </label>

                {date.type === 'custom' && (
                  <button
                    onClick={() => handleDeleteDate(date.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#ffebee',
                      color: '#d32f2f',
                      border: '1px solid #e53935',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          💾 Save Changes
        </button>
        {savedMessage && (
          <span style={{ color: '#27AE60', fontWeight: '600', fontSize: '14px' }}>
            {savedMessage}
          </span>
        )}
      </div>

      {/* Summary */}
      <div style={{ marginTop: '32px', padding: '20px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: '500' }}>
          <strong>Current Schedule:</strong><br />
          {hours
            .filter(h => h.active)
            .map(h => `${h.day}: ${h.open}-${h.close}`)
            .join(' | ')}
        </p>
      </div>
    </div>
  );
};

export default CompanyOperatingHours;
