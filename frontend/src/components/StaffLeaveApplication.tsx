import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveAPI } from '../services/adminAPI';

interface RecurringPattern {
  type: 'weekly' | 'bi-weekly' | 'monthly';
  daysOfWeek?: number[];
  effectiveFrom: string;
  effectiveUntil?: string;
}

interface LeaveApplication {
  id: number;
  staffName: string;
  isRecurring: boolean;
  startDate: string;
  endDate: string;
  period: 'full-day' | 'morning' | 'afternoon';
  reason: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  recurringPattern?: RecurringPattern;
}

const StaffLeaveApplication: React.FC = () => {
  const navigate = useNavigate();
  const [isRecurring, setIsRecurring] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [period, setPeriod] = useState<'full-day' | 'morning' | 'afternoon'>('full-day');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [applications, setApplications] = useState<LeaveApplication[]>(() => {
    try {
      const saved = localStorage.getItem('leaveApplications');
      console.log('[StaffLeaveApplication] Loaded from localStorage:', saved);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('[StaffLeaveApplication] Error loading from localStorage:', error);
      return [];
    }
  });

  // Recurring pattern state
  const [recurringType, setRecurringType] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([0]);
  const [isOngoing, setIsOngoing] = useState(true);
  const [recurringUntil, setRecurringUntil] = useState('');
  const [patternPreview, setPatternPreview] = useState('');

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayEmojis = ['🏠', '💼', '💼', '💼', '💼', '💼', '🎉'];

  useEffect(() => {
    console.log('[StaffLeaveApplication] Saving to localStorage:', applications);
    localStorage.setItem('leaveApplications', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    if (isRecurring && startDate) {
      generatePatternPreview();
    }
  }, [isRecurring, startDate, recurringType, selectedDays, recurringUntil, isOngoing]);

  const reasonOptions = [
    { value: 'training', label: '🏋️ Training/Workshop' },
    { value: 'busy', label: '🛑 Busy with other errands' },
    { value: 'medical', label: '🏥 Medical/Personal leave' },
    { value: 'education', label: '📚 Course/Education' },
    { value: 'client', label: '🤝 Client meeting' },
    { value: 'internal', label: '💼 Internal meeting' },
    { value: 'travel', label: '🌍 Travel' },
    { value: 'other', label: '📝 Other' },
  ];

  const generatePatternPreview = () => {
    const dayLabels = selectedDays.map(d => dayNames[d]).join(', ');
    let preview = `Every ${recurringType === 'bi-weekly' ? '2 weeks' : recurringType} on ${dayLabels}`;
    if (!isOngoing && recurringUntil) {
      preview += ` until ${new Date(recurringUntil).toLocaleDateString()}`;
    } else if (isOngoing) {
      preview += ' (ongoing)';
    }
    setPatternPreview(preview);
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { bg: '#FFF3E0', color: '#F57C00', text: '⏳ Pending' },
      approved: { bg: '#E8F5E9', color: '#2E7D32', text: '✅ Approved' },
      rejected: { bg: '#FFEBEE', color: '#C62828', text: '❌ Rejected' },
    };
    const style = styles[status as keyof typeof styles] || styles.pending;
    return (
      <span
        style={{
          padding: '6px 12px',
          background: style.bg,
          color: style.color,
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700',
        }}
      >
        {style.text}
      </span>
    );
  };

  const handleSubmit = async () => {
    if (!startDate || !reason) {
      alert('Please fill in required fields');
      return;
    }

    if (isRecurring && selectedDays.length === 0) {
      alert('Please select at least one day for recurring pattern');
      return;
    }

    try {
      // Get current staff ID from localStorage, sessionStorage, or use default
      const staffId = localStorage.getItem('staffId') || sessionStorage.getItem('staffId') || 'S001';
      const staffName = localStorage.getItem('staffName') || sessionStorage.getItem('staffName') || 'Current User';

      // Get company ID from localStorage
      const companyId = localStorage.getItem('companyId') || localStorage.getItem('current_company_id') || '1';

      const leaveData = {
        company_id: parseInt(companyId),
        leave_type: reason,
        start_date: startDate,
        end_date: endDate || startDate,
        period,
        reason,
        notes,
        is_recurring: isRecurring,
        recurring_pattern: isRecurring ? {
          type: recurringType,
          daysOfWeek: selectedDays,
          effectiveFrom: startDate,
          effectiveUntil: !isOngoing ? recurringUntil : undefined,
        } : null,
      };

      console.log('[LeaveApplication] Submitting leave request:', leaveData);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/leave/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(leaveData)
      }).then(r => r.json());

      if (response.success) {
        console.log('[LeaveApplication] Leave request created successfully:', response.data);
        // Store in localStorage as backup even if API succeeds
        const newApp: LeaveApplication = {
          id: response.data.id || (applications.length + 1),
          staffName,
          isRecurring,
          startDate,
          endDate: endDate || startDate,
          period,
          reason,
          notes,
          status: 'pending',
          ...(isRecurring && {
            recurringPattern: {
              type: recurringType,
              daysOfWeek: selectedDays,
              effectiveFrom: startDate,
              effectiveUntil: !isOngoing ? recurringUntil : undefined,
            },
          }),
        };
        setApplications([...applications, newApp]);
        setSubmitted(true);
        setStartDate('');
        setEndDate('');
        setPeriod('full-day');
        setReason('');
        setNotes('');
        setIsRecurring(false);
        setSelectedDays([0]);
        setRecurringUntil('');
        setIsOngoing(true);

        setTimeout(() => {
          navigate('/staff/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('[LeaveApplication] Error submitting leave request:', error);

      // Fallback to localStorage if API fails
      console.log('[LeaveApplication] API failed, using fallback localStorage');
      const newApp: LeaveApplication = {
        id: applications.length + 1,
        staffName: 'Current User',
        isRecurring,
        startDate,
        endDate: endDate || startDate,
        period,
        reason,
        notes,
        status: 'pending',
        ...(isRecurring && {
          recurringPattern: {
            type: recurringType,
            daysOfWeek: selectedDays,
            effectiveFrom: startDate,
            effectiveUntil: !isOngoing ? recurringUntil : undefined,
          },
        }),
      };

      setApplications([...applications, newApp]);
      setSubmitted(true);
      setStartDate('');
      setEndDate('');
      setPeriod('full-day');
      setReason('');
      setNotes('');
      setIsRecurring(false);
      setSelectedDays([0]);
      setRecurringUntil('');
      setIsOngoing(true);

      setTimeout(() => {
        navigate('/staff/dashboard');
      }, 2000);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
          📅 Apply for Unavailability
        </h2>
        <p style={{ fontSize: '15px', color: '#666', margin: 0 }}>
          Let your manager know when you won't be available for errand allocation
        </p>
      </div>

      {/* Success Message */}
      {submitted && (
        <div style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
          border: '2px solid #4caf50',
          borderRadius: '8px',
          marginBottom: '24px',
          color: '#2e7d32',
          fontWeight: '600',
        }}>
          🎉 Application submitted! Your manager will review it shortly.
        </div>
      )}

      {/* Application Form */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '20px',
        border: '2px solid #FFD9B3',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '20px' }}>
          ✨ New Application
        </h3>

        {/* Recurring Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '12px' }}>
            Is this recurring?
          </label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={!isRecurring}
                onChange={() => setIsRecurring(false)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>One-time</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={isRecurring}
                onChange={() => setIsRecurring(true)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>Recurring Pattern</span>
            </label>
          </div>
        </div>

        {/* Date Range / Recurring Setup */}
        <div style={{ marginBottom: '20px' }}>
          {!isRecurring ? (
            <>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                📅 Date Range *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                    }}
                    placeholder="From"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                    }}
                    placeholder="To"
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #FFF0E6 0%, #FFE0CC 100%)',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #FFB366',
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  📅 Effective From *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  🔄 Recurring Type
                </label>
                <select
                  value={recurringType}
                  onChange={(e) => setRecurringType(e.target.value as 'weekly' | 'bi-weekly' | 'monthly')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value="weekly">Every Week</option>
                  <option value="bi-weekly">Every 2 Weeks</option>
                  <option value="monthly">Every Month</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '12px' }}>
                  📌 Select Days
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {dayNames.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: selectedDays.includes(idx) ? '2px solid #FF6B35' : '2px solid #FFD9B3',
                        background: selectedDays.includes(idx) ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : 'white',
                        color: selectedDays.includes(idx) ? 'white' : '#333',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{dayEmojis[idx]}</span>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  <input
                    type="checkbox"
                    checked={isOngoing}
                    onChange={(e) => setIsOngoing(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  Ongoing (no end date)
                </label>
              </div>

              {!isOngoing && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                    ⏸️ End Date
                  </label>
                  <input
                    type="date"
                    value={recurringUntil}
                    onChange={(e) => setRecurringUntil(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                    }}
                  />
                </div>
              )}

              {patternPreview && (
                <div style={{
                  padding: '12px',
                  background: 'white',
                  borderLeft: '4px solid #FF6B35',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#333',
                  fontWeight: '600',
                }}>
                  📋 Preview: {patternPreview}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Period Type */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '12px' }}>
            🕐 Period Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {['full-day', 'morning', 'afternoon'].map((type) => (
              <button
                key={type}
                onClick={() => setPeriod(type as any)}
                style={{
                  padding: '12px',
                  border: period === type ? '2px solid #FF6B35' : '2px solid #FFD9B3',
                  background: period === type ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : 'white',
                  color: period === type ? 'white' : '#333',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                {type === 'full-day' ? 'Full Days' : type === 'morning' ? 'Morning' : 'Afternoon'}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
            💡 Reason *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="">Select a reason...</option>
            {reasonOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
            📝 Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tell your manager more details..."
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              minHeight: '100px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          🚀 Submit Application
        </button>
      </div>

      {/* My Applications */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
          📋 My Applications ({applications.length})
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {applications.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              background: '#f5f5f5',
              borderRadius: '12px',
              color: '#999',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <p style={{ fontSize: '14px', margin: 0 }}>No leave applications yet. Submit one above!</p>
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                style={{
                  padding: '16px',
                  background: 'white',
                  border: '2px solid #FFD9B3',
                  borderRadius: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>
                    Dates
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    {new Date(app.startDate).toLocaleDateString()} -{' '}
                    {new Date(app.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>
                    Reason
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    {reasonOptions.find((r) => r.value === app.reason)?.label || app.reason}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>
                    Period
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333', textTransform: 'capitalize' }}>
                    {app.period.replace('-', ' ')}
                  </p>
                </div>
                <div>{getStatusBadge(app.status)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffLeaveApplication;
