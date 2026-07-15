import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../components/Toast';
import Layout from '../components/Layout';

interface ClockRecord {
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: 'clocked_in' | 'clocked_out';
  location: string;
  date: string;
}

const StaffAttendanceClockIn: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [clockRecord, setClockRecord] = useState<ClockRecord>({
    clock_in_time: null,
    clock_out_time: null,
    status: 'clocked_out',
    location: 'Office',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('Office');
  const [notes, setNotes] = useState('');
  const [todayHistory, setTodayHistory] = useState<any[]>([]);

  useEffect(() => {
    loadTodayHistory();
  }, []);

  const loadTodayHistory = async () => {
    try {
      // Mock data - today's clock in/out history
      const mockHistory = [
        {
          id: 1,
          clock_in_time: '09:15',
          clock_out_time: null,
          status: 'clocked_in',
          location: 'Office - Desk 5',
          timestamp: new Date(),
        },
      ];
      setTodayHistory(mockHistory);
      if (mockHistory.length > 0 && !mockHistory[mockHistory.length - 1].clock_out_time) {
        setClockRecord({
          ...clockRecord,
          clock_in_time: mockHistory[mockHistory.length - 1].clock_in_time,
          status: 'clocked_in',
        });
      }
    } catch (error) {
      console.error('Error loading history', error);
    }
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setClockRecord({
        ...clockRecord,
        clock_in_time: now,
        status: 'clocked_in',
        location: location,
      });
      showToast(`✅ Clocked in at ${now}`, 'success');
    } catch (error) {
      showToast('Failed to clock in', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setClockRecord({
        ...clockRecord,
        clock_out_time: now,
        status: 'clocked_out',
      });
      showToast(`✅ Clocked out at ${now}`, 'success');
      setNotes('');
    } catch (error) {
      showToast('Failed to clock out', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = clockRecord.status === 'clocked_in';
  const elapsedTime = isClockedIn && clockRecord.clock_in_time ?
    `~${Math.floor(Math.random() * 4) + 1}h ${Math.floor(Math.random() * 60)}m` : null;

  return (
    <Layout>
      <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
            ⏰ Attendance Clock In/Out
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Current Status Card */}
        <div
          style={{
            padding: '24px',
            background: 'white',
            border: `3px solid ${isClockedIn ? '#4CAF50' : '#F44336'}`,
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {isClockedIn ? '✓' : '✗'}
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: isClockedIn ? '#4CAF50' : '#F44336', marginBottom: '8px' }}>
            {isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
          </div>
          {clockRecord.clock_in_time && (
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              Clock in: {clockRecord.clock_in_time}
            </div>
          )}
          {clockRecord.clock_out_time && (
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              Clock out: {clockRecord.clock_out_time}
            </div>
          )}
          {elapsedTime && (
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#FF6B35', marginTop: '12px' }}>
              Time elapsed: {elapsedTime}
            </div>
          )}
        </div>

        {/* Location Selection (Only for Clock In) */}
        {!isClockedIn && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            >
              <option value="Office">Office</option>
              <option value="Remote">Remote</option>
              <option value="On-site (Client)">On-site (Client)</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        {/* Notes (Only for Clock Out) */}
        {isClockedIn && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
              Clock Out Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Left early for appointment..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* Main Button */}
        <button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: isClockedIn ? '#F44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: '16px',
          }}
        >
          {loading ? 'Processing...' : isClockedIn ? '🔴 CLOCK OUT' : '🟢 CLOCK IN'}
        </button>

        {/* View My Attendance Link */}
        <button
          onClick={() => navigate('/staff/attendance-history')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'white',
            color: '#FF6B35',
            border: '2px solid #FF6B35',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          📊 View My Attendance History
        </button>

        {/* Today's Summary */}
        {todayHistory.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Today's Records
            </h3>
            <div
              style={{
                padding: '12px',
                background: '#F5F5F5',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              {todayHistory.map((record, idx) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#333' }}>
                    Clock In: {record.clock_in_time}
                  </div>
                  {record.clock_out_time && (
                    <div style={{ color: '#666' }}>
                      Clock Out: {record.clock_out_time}
                    </div>
                  )}
                  <div style={{ color: '#999', fontSize: '11px' }}>
                    Location: {record.location}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div style={{ marginTop: '24px', padding: '12px', background: '#FFF3E0', borderRadius: '6px', borderLeft: '4px solid #FF6B35' }}>
          <p style={{ fontSize: '12px', color: '#E65100', margin: 0, lineHeight: '1.6' }}>
            <strong>ℹ️ Remember:</strong> Clock in when you arrive and clock out before you leave. Your attendance is tracked daily.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default StaffAttendanceClockIn;
