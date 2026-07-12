import React, { useState } from 'react';

interface Leave {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: 'full-day' | 'half-day-morning' | 'half-day-afternoon' | 'time-off';
  startDate: string;
  endDate: string;
  startTime?: string; // HH:mm format (e.g., "14:00")
  endTime?: string;   // HH:mm format (e.g., "15:00")
  reason: string;
  assignedManager: string;
  status: 'pending' | 'approved' | 'rejected';
  createdDate: string;
}

interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  fullDay: number;
  halfDay: number;
  timeOff: number;
}

interface CompanyLeavePolicy {
  fullDayPerYear: number;
  halfDayPerYear: number;
  timeOffHoursPerYear: number;
}

interface CompanyLeaveCalendarProps {
  viewMode?: 'calendar' | 'list';
}

const CompanyLeaveCalendar: React.FC<CompanyLeaveCalendarProps> = ({ viewMode = 'calendar' }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6)); // July 2026
  const [view, setView] = useState<'today' | 'week' | 'month'>('today');
  const [showSetup, setShowSetup] = useState(false);
  const [leavePolicy, setLeavePolicy] = useState<CompanyLeavePolicy>({
    fullDayPerYear: 14,
    halfDayPerYear: 8,
    timeOffHoursPerYear: 40,
  });

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([
    { employeeId: 'STF-001', employeeName: 'Jordan Smith', fullDay: 12, halfDay: 6, timeOff: 32 },
    { employeeId: 'STF-002', employeeName: 'Ava Johnson', fullDay: 14, halfDay: 8, timeOff: 40 },
    { employeeId: 'STF-003', employeeName: 'Liam Brown', fullDay: 10, halfDay: 5, timeOff: 24 },
    { employeeId: 'STF-004', employeeName: 'Mason Wilson', fullDay: 11, halfDay: 7, timeOff: 28 },
    { employeeId: 'STF-005', employeeName: 'Sarah Davis', fullDay: 14, halfDay: 8, timeOff: 40 },
    { employeeId: 'STF-006', employeeName: 'Emily Lee', fullDay: 13, halfDay: 7, timeOff: 36 },
  ]);

  const [leaves, setLeaves] = useState<Leave[]>([
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Jordan Smith',
      leaveType: 'full-day',
      startDate: '2026-07-15',
      endDate: '2026-07-15',
      reason: 'Personal leave',
      assignedManager: 'Loh Kean Yew',
      status: 'approved',
      createdDate: '2026-07-10',
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Ava Johnson',
      leaveType: 'half-day-morning',
      startDate: '2026-07-18',
      endDate: '2026-07-18',
      reason: 'Medical appointment',
      assignedManager: 'Loh Kean Yew',
      status: 'pending',
      createdDate: '2026-07-11',
    },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeSearchInput, setEmployeeSearchInput] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [leaveType, setLeaveType] = useState<'full-day' | 'half-day-morning' | 'half-day-afternoon' | 'time-off'>('full-day');
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  const employees = [
    { id: 'STF-001', name: 'Jordan Smith' },
    { id: 'STF-002', name: 'Ava Johnson' },
    { id: 'STF-003', name: 'Liam Brown' },
    { id: 'STF-004', name: 'Mason Wilson' },
    { id: 'STF-005', name: 'Sarah Davis' },
    { id: 'STF-006', name: 'Emily Lee' },
  ];

  const leaveReasons = [
    'Medical / Doctor Appointment',
    'Family Emergency',
    'Personal Leave',
    'Vacation / Holiday',
    'Bereavement',
    'Marriage / Wedding',
    'Maternity / Paternity',
    'Sabbatical',
    'Training / Conference',
    'Others',
  ];

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(employeeSearchInput.toLowerCase()) ||
    emp.id.includes(employeeSearchInput)
  );

  const getEmployeeLeaveBalance = (employeeId: string) => {
    return leaveBalances.find(b => b.employeeId === employeeId);
  };

  const calculateRemainingBalance = (employeeId: string, leaveType: string) => {
    const balance = getEmployeeLeaveBalance(employeeId);
    if (!balance) return null;

    let remaining = 0;
    if (leaveType === 'full-day') remaining = balance.fullDay - 1;
    else if (leaveType === 'half-day-morning' || leaveType === 'half-day-afternoon') remaining = balance.halfDay - 1;
    else if (leaveType === 'time-off') remaining = balance.timeOff - 1;

    return {
      current: { fullDay: balance.fullDay, halfDay: balance.halfDay, timeOff: balance.timeOff },
      remaining: { fullDay: leaveType === 'full-day' ? remaining : balance.fullDay, halfDay: leaveType === 'half-day-morning' || leaveType === 'half-day-afternoon' ? remaining : balance.halfDay, timeOff: leaveType === 'time-off' ? remaining : balance.timeOff }
    };
  };

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleSubmitLeave = () => {
    if (!selectedEmployee || !leaveDate || !reason) {
      alert('Please fill in all required fields');
      return;
    }

    const newLeave: Leave = {
      id: leaves.length + 1,
      employeeId: 1,
      employeeName: selectedEmployee,
      leaveType: leaveType,
      startDate: leaveDate,
      endDate: leaveDate,
      startTime: leaveType === 'time-off' ? startTime : undefined,
      endTime: leaveType === 'time-off' ? endTime : undefined,
      reason: reason,
      assignedManager: 'Loh Kean Yew',
      status: 'pending',
      createdDate: new Date().toISOString().split('T')[0],
    };

    setLeaves([...leaves, newLeave]);
    setShowModal(false);
    setSelectedEmployee('');
    setLeaveType('full-day');
    setReason('');
    setLeaveDate('');
    setStartTime('09:00');
    setEndTime('12:00');
  };

  const handleApprove = (leaveId: number) => {
    setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: 'approved' } : l));
  };

  const handleReject = (leaveId: number) => {
    setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: 'rejected' } : l));
  };

  const monthDays = daysInMonth(currentMonth);
  const startDay = firstDayOfMonth(currentMonth);
  const days = Array.from({ length: monthDays }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startDay }, (_, i) => i);

  const getLeavesForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr && l.status === 'approved');
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const getTodaysLeaves = () => {
    return leaves.filter(l => l.startDate <= todayStr && l.endDate >= todayStr && l.status === 'approved');
  };

  const getThisWeeksLeaves = () => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;

    return leaves.filter(l => l.startDate <= endStr && l.endDate >= startStr && l.status === 'approved');
  };

  const todaysLeaves = getTodaysLeaves();
  const thisWeeksLeaves = getThisWeeksLeaves();

  return (
    <div className="company-leave-calendar">
      {/* Header */}
      <div className="leave-header">
        <h2>Leave Calendar</h2>
        <div className="header-controls">
          <div className="view-toggle">
            <button className={`${view === 'today' ? 'active' : ''}`} onClick={() => setView('today')}>
              👁️ Today
            </button>
            <button className={`${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>
              📅 This Week
            </button>
            <button className={`${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>
              📊 Month
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-setup" onClick={() => setShowSetup(true)}>⚙️ Leave Setup</button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>+ Request Leave</button>
          </div>
        </div>
      </div>

      {/* Quick View Widgets */}
      <div className="quick-view-widgets">
        <div className="widget today-widget">
          <div className="widget-title">👁️ Today's Leaves</div>
          <div className="widget-content">
            {todaysLeaves.length === 0 ? (
              <p className="no-data">No one on leave today</p>
            ) : (
              <div className="leaves-list-compact">
                {todaysLeaves.map(leave => (
                  <div key={leave.id} className="leave-item-compact">
                    <span className="staff-name">{leave.employeeName}</span>
                    <span className={`leave-badge ${leave.leaveType}`}>
                      {leave.leaveType === 'full-day' ? 'Full Day' : leave.leaveType === 'half-day-morning' ? 'AM' : leave.leaveType === 'half-day-afternoon' ? 'PM' : 'Time Off'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="widget week-widget">
          <div className="widget-title">📅 This Week's Leaves</div>
          <div className="widget-content">
            {thisWeeksLeaves.length === 0 ? (
              <p className="no-data">No leaves scheduled this week</p>
            ) : (
              <div className="leaves-list-compact">
                {thisWeeksLeaves.map(leave => (
                  <div key={leave.id} className="leave-item-compact">
                    <span className="staff-name">{leave.employeeName}</span>
                    <span className="leave-date">{leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} - ${leave.endDate}`}</span>
                    <span className={`leave-badge ${leave.leaveType}`}>
                      {leave.leaveType === 'full-day' ? 'Full Day' : leave.leaveType === 'half-day-morning' ? 'AM' : leave.leaveType === 'half-day-afternoon' ? 'PM' : 'Time Off'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {view === 'month' ? (
        // Calendar View
        <div className="calendar-view">
          <div className="month-header">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>◀</button>
            <h3>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>▶</button>
          </div>

          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
            {emptyDays.map(i => <div key={`empty-${i}`} className="empty-day"></div>)}
            {days.map(day => {
              const dayLeaves = getLeavesForDate(day);
              return (
                <div key={day} className={`calendar-day ${dayLeaves.length > 0 ? 'has-leave' : ''}`}>
                  <div className="day-number">{day}</div>
                  {dayLeaves.map(leave => (
                    <div key={leave.id} className={`leave-indicator ${leave.leaveType}`}>
                      {leave.employeeName.split(' ')[0]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Today/Week List View
        <div className="leave-list-view">
          <div className="leave-list">
            {leaves.map(leave => (
              <div key={leave.id} className={`leave-item ${leave.status}`}>
                <div className="leave-info">
                  <div className="employee-info">
                    <h4>{leave.employeeName}</h4>
                    <span className={`status-badge ${leave.status}`}>{leave.status.toUpperCase()}</span>
                  </div>
                  <div className="leave-details">
                    <span className="leave-type">
                      {leave.leaveType === 'time-off'
                        ? `⏰ TIME OFF (${leave.startTime} - ${leave.endTime})`
                        : leave.leaveType.replace('-', ' ').toUpperCase()
                      }
                    </span>
                    <span className="date-range">
                      {leave.leaveType === 'time-off'
                        ? leave.startDate
                        : `${leave.startDate} to ${leave.endDate}`
                      }
                    </span>
                    <span className="reason">{leave.reason}</span>
                  </div>
                </div>
                {leave.status === 'pending' && (
                  <div className="leave-actions">
                    <button className="btn-approve" onClick={() => handleApprove(leave.id)}>✓ Approve</button>
                    <button className="btn-reject" onClick={() => handleReject(leave.id)}>✗ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Setup Modal */}
      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Leave Policy Setup</h3>
              <button className="close-btn" onClick={() => setShowSetup(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Company Policy Section */}
              <div className="setup-section">
                <h4>Company Leave Policy</h4>
                <div className="policy-form">
                  <div className="policy-input-group">
                    <label>Full Day Leaves per Year</label>
                    <input
                      type="number"
                      value={leavePolicy.fullDayPerYear}
                      onChange={e => setLeavePolicy({ ...leavePolicy, fullDayPerYear: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="policy-input-group">
                    <label>Half Day Leaves per Year</label>
                    <input
                      type="number"
                      value={leavePolicy.halfDayPerYear}
                      onChange={e => setLeavePolicy({ ...leavePolicy, halfDayPerYear: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="policy-input-group">
                    <label>Time Off Hours per Year</label>
                    <input
                      type="number"
                      value={leavePolicy.timeOffHoursPerYear}
                      onChange={e => setLeavePolicy({ ...leavePolicy, timeOffHoursPerYear: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Employee Leave Balances Section */}
              <div className="setup-section">
                <h4>Employee Leave Balances</h4>
                <div className="balance-table-container">
                  <table className="balance-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Employee Name</th>
                        <th>Full Day</th>
                        <th>Half Day</th>
                        <th>Time Off (hrs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveBalances.map(balance => (
                        <tr key={balance.employeeId}>
                          <td><strong>{balance.employeeId}</strong></td>
                          <td>{balance.employeeName}</td>
                          <td>
                            <input
                              type="number"
                              value={balance.fullDay}
                              onChange={e => {
                                const updated = leaveBalances.map(b =>
                                  b.employeeId === balance.employeeId
                                    ? { ...b, fullDay: parseInt(e.target.value) }
                                    : b
                                );
                                setLeaveBalances(updated);
                              }}
                              className="balance-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={balance.halfDay}
                              onChange={e => {
                                const updated = leaveBalances.map(b =>
                                  b.employeeId === balance.employeeId
                                    ? { ...b, halfDay: parseInt(e.target.value) }
                                    : b
                                );
                                setLeaveBalances(updated);
                              }}
                              className="balance-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={balance.timeOff}
                              onChange={e => {
                                const updated = leaveBalances.map(b =>
                                  b.employeeId === balance.employeeId
                                    ? { ...b, timeOff: parseInt(e.target.value) }
                                    : b
                                );
                                setLeaveBalances(updated);
                              }}
                              className="balance-input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={() => setShowSetup(false)}>Save Changes</button>
                <button className="btn-secondary" onClick={() => setShowSetup(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Leave</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Employee <span style={{ color: '#E74C3C' }}>*</span></label>
                <div className="employee-search-container">
                  <input
                    type="text"
                    placeholder="Search by name or employee ID (e.g., STF-001)"
                    value={employeeSearchInput}
                    onChange={e => setEmployeeSearchInput(e.target.value)}
                    onFocus={() => setShowEmployeeDropdown(true)}
                    className="employee-search-input"
                  />
                  {showEmployeeDropdown && (
                    <div className="employee-dropdown">
                      {filteredEmployees.length === 0 ? (
                        <div className="dropdown-item no-results">No employees found</div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <div
                            key={emp.id}
                            className="dropdown-item"
                            onClick={() => {
                              setSelectedEmployee(emp.id);
                              setEmployeeSearchInput(emp.name);
                              setShowEmployeeDropdown(false);
                            }}
                          >
                            <span className="emp-name">{emp.name}</span>
                            <span className="emp-id">{emp.id}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {selectedEmployee && (
                    <div className="selected-employee-display">
                      Selected: <strong>{employeeSearchInput}</strong> ({selectedEmployee})
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Balance Display */}
              {selectedEmployee && getEmployeeLeaveBalance(selectedEmployee) && (
                <div className="balance-summary">
                  <div className="balance-title">📊 Current Leave Balance</div>
                  <div className="balance-cards">
                    <div className="balance-card">
                      <span className="balance-label">Full Day</span>
                      <span className="balance-value">{getEmployeeLeaveBalance(selectedEmployee)?.fullDay ?? 0}</span>
                    </div>
                    <div className="balance-card">
                      <span className="balance-label">Half Day</span>
                      <span className="balance-value">{getEmployeeLeaveBalance(selectedEmployee)?.halfDay ?? 0}</span>
                    </div>
                    <div className="balance-card">
                      <span className="balance-label">Time Off (hrs)</span>
                      <span className="balance-value">{getEmployeeLeaveBalance(selectedEmployee)?.timeOff ?? 0}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Leave Type</label>
                <select value={leaveType} onChange={e => setLeaveType(e.target.value as any)}>
                  <option value="full-day">Full Day</option>
                  <option value="half-day-morning">Half Day - Morning (9am-1pm)</option>
                  <option value="half-day-afternoon">Half Day - Afternoon (1pm-5pm)</option>
                  <option value="time-off">Time Off - Custom Hours</option>
                </select>
              </div>

              {/* Remaining Balance Preview */}
              {selectedEmployee && leaveType && (
                <div className="remaining-balance-preview">
                  <div className="preview-label">📈 Balance After Apply</div>
                  <div className="preview-content">
                    {leaveType === 'full-day' && getEmployeeLeaveBalance(selectedEmployee) && (
                      <div className="preview-info">
                        <span>Full Day: <strong>{getEmployeeLeaveBalance(selectedEmployee)!.fullDay}</strong> → <strong style={{ color: getEmployeeLeaveBalance(selectedEmployee)!.fullDay - 1 < 0 ? '#E74C3C' : '#27AE60' }}>{getEmployeeLeaveBalance(selectedEmployee)!.fullDay - 1}</strong></span>
                        {getEmployeeLeaveBalance(selectedEmployee)!.fullDay - 1 < 0 && <span style={{ color: '#E74C3C', fontSize: '12px' }}>⚠️ Insufficient balance</span>}
                      </div>
                    )}
                    {(leaveType === 'half-day-morning' || leaveType === 'half-day-afternoon') && getEmployeeLeaveBalance(selectedEmployee) && (
                      <div className="preview-info">
                        <span>Half Day: <strong>{getEmployeeLeaveBalance(selectedEmployee)!.halfDay}</strong> → <strong style={{ color: getEmployeeLeaveBalance(selectedEmployee)!.halfDay - 1 < 0 ? '#E74C3C' : '#27AE60' }}>{getEmployeeLeaveBalance(selectedEmployee)!.halfDay - 1}</strong></span>
                        {getEmployeeLeaveBalance(selectedEmployee)!.halfDay - 1 < 0 && <span style={{ color: '#E74C3C', fontSize: '12px' }}>⚠️ Insufficient balance</span>}
                      </div>
                    )}
                    {leaveType === 'time-off' && getEmployeeLeaveBalance(selectedEmployee) && (
                      <div className="preview-info">
                        <span>Time Off: <strong>{getEmployeeLeaveBalance(selectedEmployee)!.timeOff}</strong> → <strong style={{ color: getEmployeeLeaveBalance(selectedEmployee)!.timeOff - 1 < 0 ? '#E74C3C' : '#27AE60' }}>{getEmployeeLeaveBalance(selectedEmployee)!.timeOff - 1}</strong></span>
                        {getEmployeeLeaveBalance(selectedEmployee)!.timeOff - 1 < 0 && <span style={{ color: '#E74C3C', fontSize: '12px' }}>⚠️ Insufficient balance</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={e => setLeaveDate(e.target.value)}
                />
              </div>

              {leaveType === 'time-off' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>From Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>To Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="time-display">
                    <span className="time-info">⏰ {startTime} to {endTime}</span>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Reason <span style={{ color: '#E74C3C' }}>*</span></label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ marginBottom: reason === 'Others' ? '12px' : '0' }}
                >
                  <option value="">-- Select a reason --</option>
                  {leaveReasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {reason === 'Others' && (
                  <textarea
                    placeholder="Please specify your reason"
                    value={otherReason}
                    onChange={e => setOtherReason(e.target.value)}
                    style={{ marginTop: '12px' }}
                  />
                )}
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handleSubmitLeave}>Submit Request</button>
                <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .company-leave-calendar {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .leave-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        .header-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .view-toggle {
          display: flex;
          gap: 8px;
        }

        .view-toggle button {
          padding: 8px 12px;
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .view-toggle button.active {
          background: #FF6B35;
          color: #fff;
          border-color: #FF6B35;
        }

        .quick-view-widgets {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .widget {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #e0e0e0;
        }

        .widget-title {
          font-weight: 600;
          margin-bottom: 12px;
          font-size: 13px;
          color: #333;
        }

        .widget-content {
          font-size: 13px;
        }

        .no-data {
          color: #999;
          margin: 0;
          font-style: italic;
        }

        .leaves-list-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leave-item-compact {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #fff;
          border-radius: 6px;
          border-left: 3px solid #FF6B35;
        }

        .staff-name {
          font-weight: 600;
          color: #333;
          flex: 1;
        }

        .leave-date {
          font-size: 12px;
          color: #666;
        }

        .leave-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .leave-badge.full-day {
          background: #FFE0CC;
          color: #D97706;
        }

        .leave-badge.half-day-morning,
        .leave-badge.half-day-afternoon {
          background: #DBEAFE;
          color: #0284C7;
        }

        .leave-badge.time-off {
          background: #F3E8FF;
          color: #7C3AED;
        }

        .quick-entry-section {
          margin-bottom: 24px;
        }

        .quick-entry-card {
          background: linear-gradient(135deg, #FFF8F0 0%, #FFE8D6 100%);
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #FFD9BE;
        }

        .quick-entry-card h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .quick-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }

        .quick-input {
          padding: 10px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          font-size: 13px;
          background: #fff;
        }

        .quick-input:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 4px rgba(255, 107, 53, 0.2);
        }

        .btn-quick-submit {
          padding: 10px 16px;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-quick-submit:hover {
          background: #E55A2B;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 24px;
        }

        .day-header {
          font-weight: 600;
          text-align: center;
          padding: 12px 0;
          color: #666;
          font-size: 12px;
        }

        .calendar-day {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px;
          min-height: 80px;
          background: #fafafa;
          cursor: pointer;
          transition: all 0.2s;
        }

        .calendar-day:hover {
          background: #f0f0f0;
        }

        .calendar-day.has-leave {
          background: #FFF3E0;
          border-color: #FF6B35;
        }

        .day-number {
          font-weight: 600;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .leave-indicator {
          font-size: 11px;
          padding: 2px 4px;
          background: #FF6B35;
          color: #fff;
          border-radius: 3px;
          margin-top: 2px;
          white-space: nowrap;
        }

        .leave-list-view {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 16px;
        }

        .leave-item {
          background: #fff;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .leave-item.pending {
          border-left: 4px solid #FFC107;
        }

        .leave-item.approved {
          border-left: 4px solid #27AE60;
        }

        .leave-item.rejected {
          border-left: 4px solid #E74C3C;
          opacity: 0.7;
        }

        .leave-info {
          flex: 1;
        }

        .employee-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .employee-info h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .status-badge {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .status-badge.pending {
          background: #FFC107;
          color: #fff;
        }

        .status-badge.approved {
          background: #27AE60;
          color: #fff;
        }

        .status-badge.rejected {
          background: #E74C3C;
          color: #fff;
        }

        .leave-details {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #666;
        }

        .leave-type {
          font-weight: 600;
          color: #333;
        }

        .leave-actions {
          display: flex;
          gap: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .time-display {
          background: #E3F2FD;
          border: 1px solid #90CAF9;
          border-radius: 6px;
          padding: 12px;
          margin-top: 8px;
          text-align: center;
        }

        .time-info {
          font-weight: 600;
          color: #1976D2;
          font-size: 14px;
        }

        input[type="date"],
        input[type="time"] {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        input[type="date"]:focus,
        input[type="time"]:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 4px rgba(255, 107, 53, 0.2);
        }

        .btn-approve, .btn-reject {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .btn-approve {
          background: #27AE60;
          color: #fff;
        }

        .btn-reject {
          background: #E74C3C;
          color: #fff;
        }

        .btn-primary {
          padding: 10px 16px;
          background: #FF6B35;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 14px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .btn-secondary {
          padding: 10px 16px;
          background: #e0e0e0;
          color: #333;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .employee-search-container {
          position: relative;
        }

        .employee-search-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .employee-search-input:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 4px rgba(255, 107, 53, 0.2);
        }

        .employee-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 6px 6px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .dropdown-item {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }

        .dropdown-item:hover {
          background: #f9f9f9;
        }

        .dropdown-item.no-results {
          cursor: default;
          color: #999;
          font-style: italic;
        }

        .dropdown-item.no-results:hover {
          background: #fff;
        }

        .emp-name {
          font-weight: 500;
          color: #333;
          flex: 1;
        }

        .emp-id {
          font-size: 12px;
          color: #FF6B35;
          font-weight: 600;
          margin-left: 8px;
          white-space: nowrap;
        }

        .selected-employee-display {
          margin-top: 8px;
          padding: 8px 12px;
          background: #E8F5E9;
          border-left: 3px solid #27AE60;
          border-radius: 4px;
          font-size: 12px;
          color: #2E7D32;
        }

        .selected-employee-display strong {
          color: #1B5E20;
        }

        .btn-setup {
          padding: 10px 16px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-setup:hover {
          background: #e0e0e0;
          transform: translateY(-2px);
        }

        .modal-large {
          max-width: 900px !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
        }

        .setup-section {
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .setup-section:last-child {
          border-bottom: none;
        }

        .setup-section h4 {
          margin: 0 0 16px 0;
          font-size: 15px;
          font-weight: 600;
          color: #333;
        }

        .policy-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .policy-input-group {
          display: flex;
          flex-direction: column;
        }

        .policy-input-group label {
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 13px;
          color: #666;
        }

        .policy-input-group input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .balance-table-container {
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .balance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .balance-table thead {
          background: #f5f5f5;
          position: sticky;
          top: 0;
        }

        .balance-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #e0e0e0;
        }

        .balance-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .balance-table tr:hover {
          background: #fafafa;
        }

        .balance-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          text-align: center;
        }

        .balance-input:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 4px rgba(255, 107, 53, 0.2);
        }

        .balance-summary {
          background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
          border: 1px solid #90CAF9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .balance-title {
          font-weight: 600;
          margin-bottom: 12px;
          font-size: 13px;
          color: #0D47A1;
        }

        .balance-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .balance-card {
          background: #fff;
          border-left: 3px solid #2196F3;
          padding: 12px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .balance-label {
          font-size: 11px;
          color: #666;
          font-weight: 600;
        }

        .balance-value {
          font-size: 18px;
          font-weight: 700;
          color: #0D47A1;
        }

        .remaining-balance-preview {
          background: linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%);
          border: 1px solid #CE93D8;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .preview-label {
          font-weight: 600;
          margin-bottom: 10px;
          font-size: 12px;
          color: #6A1B9A;
        }

        .preview-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }

        .preview-info span {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default CompanyLeaveCalendar;
