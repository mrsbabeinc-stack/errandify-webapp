import React, { useState, useMemo, useEffect } from 'react';
import { getHolidaysInRange, isPublicHoliday, SINGAPORE_HOLIDAYS_2026 } from '../utils/publicHolidayService';
import { getBlockedDatesFromPattern, RecurringPattern, isDateBlocked } from '../utils/recurringLeaveHelper';

interface LeaveApplication {
  id: number;
  staffName: string;
  startDate: string;
  endDate: string;
  period: 'full-day' | 'morning' | 'afternoon';
  reason: string;
  status: 'approved' | 'pending';
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}

interface UnavailableStaff {
  id: number;
  staffName: string;
  startDate: string;
  endDate: string;
  period: 'full-day' | 'morning' | 'afternoon';
  reason: string;
  status: 'approved' | 'pending';
  type?: 'leave' | 'holiday' | 'recurring';
}

interface Props {
  companyId?: number | null;
}

/**
 * The company's availability calendar.
 *
 * Read its leave from localStorage['leaveApplications'] — a key nothing in the
 * app has ever written — and listed six invented colleagues (Jordan Smith, Ava
 * Johnson, …) as the team. So it showed a fictional roster with no leave, on
 * every account, forever.
 *
 * Now reads the real team from /api/companies/:id/staff and real leave from
 * /api/companies/:id/leaves, which is the same company_leave table the Apply
 * for Unavailability and Leave Approvals screens write to.
 */
const CompanyLeaveCalendar: React.FC<Props> = ({ companyId: companyIdProp }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [view, setView] = useState<'today' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'blocked' | 'pending' | 'available'>('all');
  const [reasonFilter, setReasonFilter] = useState<'all' | 'training' | 'medical' | 'other'>('all');

  const [companyId, setCompanyId] = useState<number | null>(companyIdProp ?? null);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [leaveApps, setLeaveApps] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    if (companyIdProp) { setCompanyId(companyIdProp); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/companies/user/my-company`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const b = await res.json();
          if (b.data?.id) { setCompanyId(b.data.id); return; }
        }
        setLoading(false);
      } catch { setLoading(false); }
    })();
  }, [companyIdProp, API_URL]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      try {
        const [staffRes, leaveRes] = await Promise.all([
          fetch(`${API_URL}/api/companies/${companyId}/staff`, { headers: { Authorization: `Bearer ${token()}` } }),
          fetch(`${API_URL}/api/companies/${companyId}/leaves`, { headers: { Authorization: `Bearer ${token()}` } }),
        ]);

        if (staffRes.ok) {
          const sb = await staffRes.json();
          setTeamNames((sb.data?.staff || []).map((m: any) => m.alias || m.display_name).filter(Boolean));
        }

        if (leaveRes.ok) {
          const lb = await leaveRes.json();
          setLeaveApps((lb.data || []).map((l: any) => ({
            id: l.id,
            staffName: l.user_name,
            startDate: String(l.start_date).slice(0, 10),
            endDate: String(l.end_date).slice(0, 10),
            period: l.period || 'full-day',
            reason: l.reason || l.leave_type || 'Leave',
            // company_leave uses approved/pending/rejected; the calendar only
            // distinguishes blocked from tentative, so rejected leave is simply
            // not shown rather than being painted as pending.
            status: l.status,
            isRecurring: !!l.is_recurring,
            recurringPattern: l.recurring_pattern || undefined,
          })).filter((l: any) => l.status === 'approved' || l.status === 'pending'));
          setError('');
        } else {
          const eb = await leaveRes.json().catch(() => ({}));
          setError(eb.message || eb.error || 'Could not load leave');
        }
      } catch {
        setError('Could not load the calendar');
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, API_URL]);

  // Expand leave data with holidays and recurring patterns
  const unavailableStaff: UnavailableStaff[] = useMemo(() => {
    const result: UnavailableStaff[] = [];
    let id = 1;

    // Add regular leave
    leaveApps.forEach((app) => {
      result.push({
        id: id++,
        staffName: app.staffName,
        startDate: app.startDate,
        endDate: app.endDate,
        period: app.period,
        reason: app.reason,
        status: app.status,
        type: 'leave',
      });

      // If recurring, add expanded instances
      if (app.isRecurring && app.recurringPattern) {
        const blockedDates = getBlockedDatesFromPattern(app.recurringPattern, 52);
        blockedDates.forEach(date => {
          result.push({
            id: id++,
            staffName: app.staffName,
            startDate: date,
            endDate: date,
            period: app.period,
            reason: `${app.reason} (recurring pattern)`,
            status: app.status,
            type: 'recurring',
          });
        });
      }
    });

    // Add public holidays (applies to all staff)
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    const holidays = getHolidaysInRange(monthStart, monthEnd);

    holidays.forEach(holiday => {
      teamNames.forEach(staffName => {
        result.push({
          id: id++,
          staffName,
          startDate: holiday.date,
          endDate: holiday.date,
          period: 'full-day',
          reason: `🇸🇬 ${holiday.name}`,
          status: 'approved',
          type: 'holiday',
        });
      });
    });

    return result;
  }, [currentDate, leaveApps, teamNames]);

  let staff = teamNames;

  // Apply search filter
  if (searchTerm) {
    staff = staff.filter((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  // Get reason from unavailable record
  const getReason = (reason: string): 'training' | 'medical' | 'other' => {
    if (reason.toLowerCase().includes('training')) return 'training';
    if (reason.toLowerCase().includes('medical')) return 'medical';
    return 'other';
  };

  const isStaffUnavailable = (staffName: string, date: Date): { unavailable: boolean; period: string; reason: string; status: string } => {
    const dateStr = date.toISOString().split('T')[0];
    const record = unavailableStaff.find(
      (u) => staffName === u.staffName && dateStr >= u.startDate && dateStr <= u.endDate
    );
    if (record) {
      return { unavailable: true, period: record.period, reason: record.reason, status: record.status };
    }
    return { unavailable: false, period: '', reason: '', status: '' };
  };

  // Apply filters to check if record should be shown
  const passesFilters = (staffName: string, date: Date): boolean => {
    const status = isStaffUnavailable(staffName, date);

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'blocked' && (!status.unavailable || status.status !== 'approved')) return false;
      if (statusFilter === 'pending' && (!status.unavailable || status.status !== 'pending')) return false;
      if (statusFilter === 'available' && status.unavailable) return false;
    }

    // Reason filter
    if (reasonFilter !== 'all' && status.unavailable) {
      const reason = getReason(status.reason);
      if (reasonFilter !== reason) return false;
    }

    return true;
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getMonthDays = () => {
    const days = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= getDaysInMonth(currentDate); i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    return days;
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const renderToday = () => {
    const today = currentDate;
    const filteredStaff = staff.filter((s) => passesFilters(s, today));

    return (
      <div style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#333' }}>
          📅 Today - {today.toLocaleDateString('en-SG', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </h3>

        {filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <p style={{ fontSize: '14px' }}>No staff matching filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredStaff.map((staffName) => {
              const status = isStaffUnavailable(staffName, today);
              return (
              <div
                key={staffName}
                style={{
                  padding: '16px',
                  background: status.unavailable
                    ? status.status === 'approved'
                      ? '#ffebee'
                      : '#fff9e6'
                    : '#e8f5e9',
                  borderLeft: `4px solid ${status.unavailable ? status.status === 'approved' ? '#e53935' : '#fbc02d' : '#4caf50'}`,
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#333' }}>
                    {status.unavailable ? '❌' : '✅'} {staffName}
                  </p>
                  {status.unavailable && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                      {status.reason} • {status.period === 'full-day' ? 'Full Day' : status.period === 'morning' ? 'Morning' : 'Afternoon'}
                    </p>
                  )}
                </div>
                {status.unavailable && (
                  <span
                    style={{
                      padding: '6px 12px',
                      background: status.status === 'approved' ? '#e53935' : '#fbc02d',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    {status.status === 'approved' ? 'Blocked' : 'Pending'}
                  </span>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWeek = () => {
    const days = getWeekDays();
    const filteredStaff = staff.filter((s) => {
      // Check if staff passes filters for ANY day in the week
      return days.some((day) => passesFilters(s, day));
    });

    return (
      <div style={{ padding: '20px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#333' }}>
          📅 Week View - {days[0].toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })} to{' '}
          {days[6].toLocaleDateString('en-SG', { month: 'short', day: 'numeric', year: 'numeric' })}
        </h3>

        {filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <p style={{ fontSize: '14px' }}>No staff matching filters for this week</p>
          </div>
        ) : (
          <div style={{ minWidth: '800px', display: 'grid', gridTemplateColumns: `100px repeat(7, 1fr)`, gap: '8px' }}>
            {/* Header with days */}
            <div style={{ fontWeight: '700', color: '#999', fontSize: '12px', textAlign: 'center', paddingTop: '10px' }}>
              Staff
            </div>
            {days.map((day) => (
              <div key={day.toISOString()} style={{ textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '12px', paddingBottom: '8px' }}>
                <p style={{ margin: '0 0 4px 0' }}>{day.toLocaleDateString('en-SG', { weekday: 'short' })}</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>{day.getDate()}</p>
              </div>
            ))}

            {/* Staff rows */}
            {filteredStaff.map((staffName) => (
            <React.Fragment key={staffName}>
              <div style={{ fontWeight: '600', color: '#333', fontSize: '12px', paddingTop: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {staffName}
              </div>
              {days.map((day) => {
                const status = isStaffUnavailable(staffName, day);
                return (
                  <div
                    key={`${staffName}-${day.toISOString()}`}
                    style={{
                      padding: '12px 8px',
                      background: status.unavailable
                        ? status.status === 'approved'
                          ? '#ffcdd2'
                          : '#fff9c4'
                        : '#c8e6c9',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'help',
                    }}
                    // `title` was inside the style object, so it was never a
                    // real attribute and the hover tooltip never appeared.
                    title={status.unavailable ? `${status.reason} (${status.period})` : 'Available'}
                  >
                    {status.unavailable ? status.status === 'approved' ? '✗' : '?' : '✓'}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
          )}
      </div>
    );
  };

  const renderMonth = () => {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get all unavailable records for this month
    const monthUnavailable = unavailableStaff.filter((record) => {
      const start = new Date(record.startDate);
      const end = new Date(record.endDate);
      return !(end < startDate || start > endDate);
    });

    // Group by date and apply filters
    const dateUnavailability: Record<string, typeof unavailableStaff> = {};
    monthUnavailable.forEach((record) => {
      const start = new Date(record.startDate);
      const end = new Date(record.endDate);
      const current = new Date(start);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (!dateUnavailability[dateStr]) dateUnavailability[dateStr] = [];
        dateUnavailability[dateStr].push(record);
        current.setDate(current.getDate() + 1);
      }
    });

    // Build list of dates with unavailable staff
    const datesWithUnavailable = Object.entries(dateUnavailability)
      .map(([date, records]) => ({
        date: new Date(date),
        records: records.filter((r) => passesFilters(r.staffName, new Date(date))),
      }))
      .filter((d) => d.records.length > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
      <div style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#333' }}>
          📅 {currentDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
        </h3>

        {datesWithUnavailable.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <p style={{ fontSize: '14px' }}>No staff unavailable this month matching filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {datesWithUnavailable.map(({ date, records }) => (
              <div
                key={date.toISOString()}
                style={{
                  padding: '16px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
                  📅 {date.toLocaleDateString('en-SG', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </h4>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {records.map((record) => {
                    const status = isStaffUnavailable(record.staffName, date);
                    return (
                      <div
                        key={`${record.staffName}-${date.toISOString()}`}
                        style={{
                          padding: '12px',
                          background: 'white',
                          borderRadius: '6px',
                          border: `2px solid ${status.status === 'approved' ? '#e53935' : '#ffc107'}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>
                            {status.status === 'approved' ? '✗' : '?'} {record.staffName}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                            {status.reason} • {status.period}
                          </p>
                        </div>
                        <span
                          style={{
                            padding: '4px 12px',
                            background: status.status === 'approved' ? '#ffebee' : '#fff9e6',
                            color: status.status === 'approved' ? '#e53935' : '#f57c00',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'capitalize',
                          }}
                        >
                          {status.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            style={{
              padding: '10px 16px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              padding: '10px 16px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            style={{
              padding: '10px 16px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
          📅 Staff Availability Calendar
        </h2>
        <p style={{ fontSize: '15px', color: '#666', margin: 0 }}>
          Monitor who is unavailable on each day
        </p>
      </div>

      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
        }}>{error}</div>
      )}

      {loading && (
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Loading your team's availability…</p>
      )}

      {!loading && !error && staff.length === 0 && (
        <div style={{
          background: '#FFF8F5', border: '1px solid #FFD9B3', color: '#8B4513',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
        }}>
          Nobody on the team yet — invite staff from My Staff and their availability will show here.
        </div>
      )}

      {/* Search & Filter Section */}
      <div style={{ marginBottom: '24px', padding: '16px', background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)', borderRadius: '12px', border: '2px solid #FFD9B3' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            🔍 Search Staff
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by staff name..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {/* Status Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              📊 Status
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['all', 'available', 'blocked', 'pending'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '6px 12px',
                    background: statusFilter === s ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : '#f5f5f5',
                    color: statusFilter === s ? 'white' : '#333',
                    border: statusFilter === s ? 'none' : '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  {s === 'all' && 'All'}
                  {s === 'available' && '✓ Available'}
                  {s === 'blocked' && '✗ Blocked'}
                  {s === 'pending' && '? Pending'}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              💡 Reason
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['all', 'training', 'medical', 'other'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setReasonFilter(r)}
                  style={{
                    padding: '6px 12px',
                    background: reasonFilter === r ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : '#f5f5f5',
                    color: reasonFilter === r ? 'white' : '#333',
                    border: reasonFilter === r ? 'none' : '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  {r === 'all' && 'All Reasons'}
                  {r === 'training' && '🏋️ Training'}
                  {r === 'medical' && '🏥 Medical'}
                  {r === 'other' && '📝 Other'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results indicator */}
        {(searchTerm || statusFilter !== 'all' || reasonFilter !== 'all') && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FFD9B3', fontSize: '13px', color: '#666', fontWeight: '600' }}>
            Showing {staff.length} staff • Filters active
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e0e0e0', paddingBottom: '12px' }}>
        {(['today', 'week', 'month'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '10px 20px',
              background: view === v ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : 'transparent',
              color: view === v ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            {v === 'today' ? '📅 Today' : v === 'week' ? '📆 Week' : '📋 Month'}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px', padding: '16px', background: '#FFF9F5', borderRadius: '8px', fontSize: '13px' }}>
        <div>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4caf50', borderRadius: '2px', marginRight: '8px' }}></span>
          <strong>✓ Available</strong>
        </div>
        <div>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ffcdd2', borderRadius: '2px', marginRight: '8px' }}></span>
          <strong>✗ Blocked</strong> (Approved)
        </div>
        <div>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#fff9c4', borderRadius: '2px', marginRight: '8px' }}></span>
          <strong>? Pending</strong> (Not Confirmed)
        </div>
      </div>

      {/* Content */}
      {view === 'today' && renderToday()}
      {view === 'week' && renderWeek()}
      {view === 'month' && renderMonth()}
    </div>
  );
};

export default CompanyLeaveCalendar;
