import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../components/Toast';
import { staffAttendanceAPI } from '../services/staffAttendanceAPI';

interface ClockRecord {
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: 'clocked_in' | 'clocked_out';
  date: string;
}

/** "2026-07-23T09:15:00Z" -> "09:15" in the viewer's timezone. */
const hhmm = (v: string | null): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toTimeString().slice(0, 5);
};

const StaffAttendanceClockIn: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [clockRecord, setClockRecord] = useState<ClockRecord>({
    clock_in_time: null,
    clock_out_time: null,
    status: 'clocked_out',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('');
  const [staffName, setStaffName] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const loadToday = async () => {
    try {
      const res = await staffAttendanceAPI.today();
      const d = res.data;
      setStaffName(d.staff?.name || '');
      setClockRecord({
        clock_in_time: d.record?.clock_in || null,
        clock_out_time: d.record?.clock_out || null,
        status: d.clocked_in ? 'clocked_in' : 'clocked_out',
        date: d.date,
      });
      setLinkError(null);
    } catch (error: any) {
      // The API refuses rather than guessing which employee this login is;
      // surface that instead of showing an empty card that looks working.
      setLinkError(error.message || 'Could not load your attendance');
    }
  };

  useEffect(() => {
    loadToday();
  }, []);

  // Ticks the on-screen elapsed timer. It previously showed
  // Math.random() hours, which changed on every render.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const handleClockIn = async () => {
    try {
      setLoading(true);
      await staffAttendanceAPI.clockIn(notes || undefined);
      await loadToday();
      showToast('✅ Clocked in', 'success');
      setNotes('');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Failed to clock in'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      await staffAttendanceAPI.clockOut({
        break_minutes: breakMinutes ? Number(breakMinutes) : undefined,
        notes: notes || undefined,
      });
      await loadToday();
      showToast('✅ Clocked out', 'success');
      setNotes('');
      setBreakMinutes('');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Failed to clock out'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = clockRecord.status === 'clocked_in';

  // Real elapsed time since clock-in. This was
  // `~${Math.floor(Math.random()*4)+1}h ${Math.floor(Math.random()*60)}m`,
  // i.e. a different invented duration on every render.
  const elapsedTime = (() => {
    if (!isClockedIn || !clockRecord.clock_in_time) return null;
    const started = new Date(clockRecord.clock_in_time).getTime();
    if (Number.isNaN(started)) return null;
    const mins = Math.max(Math.floor((now - started) / 60000), 0);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  })();

  return (
    <>
      <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
            ⏰ Attendance Clock In/Out
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            {staffName ? `${staffName} — ` : ''}
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* An unlinked login cannot clock in. Say so plainly rather than
            showing a working-looking card that silently records nothing. */}
        {linkError && (
          <div style={{ padding: '16px', background: '#FFEBEE', border: '2px solid #F44336', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#C62828', marginBottom: '4px' }}>
              Attendance unavailable
            </div>
            <div style={{ fontSize: '13px', color: '#333' }}>{linkError}</div>
          </div>
        )}

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
              Clock in: {hhmm(clockRecord.clock_in_time)}
            </div>
          )}
          {clockRecord.clock_out_time && (
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              Clock out: {hhmm(clockRecord.clock_out_time)}
            </div>
          )}
          {elapsedTime && (
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#FF6B35', marginTop: '12px' }}>
              Time elapsed: {elapsedTime}
            </div>
          )}
        </div>

        {/* Break minutes, shown when clocking out — it is subtracted from the
            worked hours the server computes. Replaces a "Location" selector
            that had nowhere to be stored. */}
        {isClockedIn && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
              Break taken (minutes)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 60"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
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

        {/* Today's record, straight from the stored row */}
        {(clockRecord.clock_in_time || clockRecord.clock_out_time) && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Today's Record
            </h3>
            <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px', fontSize: '12px' }}>
              <div style={{ fontWeight: '600', color: '#333' }}>
                Clock In: {hhmm(clockRecord.clock_in_time) || '—'}
              </div>
              <div style={{ color: '#666' }}>
                Clock Out: {hhmm(clockRecord.clock_out_time) || '—'}
              </div>
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
    </>
  );
};

export default StaffAttendanceClockIn;
