import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { leaveAPI, staffAPI, holidayAPI } from '../../services/adminAPI';

interface LeaveBalance {
  staffId: string;
  staffName: string;
  year: number;
  annualLeaveEntitlement: number;
  annualLeaveUsed: number;
  annualLeaveRemaining: number;
  sickLeaveEntitlement: number;
  sickLeaveUsed: number;
  sickLeaveRemaining: number;
}

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: 'annual' | 'sick' | 'medical-cert' | 'unpaid' | 'compassionate' | 'maternity' | 'paternity' | 'childcare' | 'marriage' | 'examination' | 'voluntary-absence';
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
  createdDate: string;
  lastModified: string;
}

interface PublicHoliday {
  date: string;
  name: string;
}

type LeaveType = LeaveRequest['leaveType'];

/**
 * The API stores leave_type as a human label; this screen keys off slugs.
 * Annual and Sick don't round-trip through plain slugification ("Annual Leave"
 * would become "annual-leave", not "annual"), so they are named explicitly and
 * everything else falls back to the general rule.
 */
const TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
};

const typeToLabel = (type: string): string =>
  TYPE_LABELS[type] ||
  type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const labelToType = (label: string): LeaveType => {
  if (!label) return 'annual';
  const match = Object.entries(TYPE_LABELS).find(
    ([, v]) => v.toLowerCase() === label.toLowerCase()
  );
  if (match) return match[0] as LeaveType;
  return label.toLowerCase().replace(/\s+/g, '-') as LeaveType;
};

// Dates arrive as plain YYYY-MM-DD; guard anyway in case a timestamp slips in.
const dateOnly = (v: string | null | undefined): string =>
  v ? String(v).split('T')[0] : '';

const toLeaveRequest = (row: any): LeaveRequest => ({
  id: String(row.id),
  staffId: row.staff_id,
  staffName: row.staff_name || '',
  leaveType: labelToType(row.leave_type),
  startDate: dateOnly(row.start_date),
  endDate: dateOnly(row.end_date),
  daysRequested: Number(row.days_count) || 0,
  reason: row.reason || '',
  status: (row.status || 'pending') as LeaveRequest['status'],
  approvedBy: row.approved_by || undefined,
  approvalDate: dateOnly(row.last_modified) || undefined,
  notes: row.notes || undefined,
  createdDate: row.created_at || '',
  lastModified: row.last_modified || '',
});

const LeaveManagementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'calendar' | 'balances' | 'holidays'>('dashboard');

  // State
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('-').slice(0, 2).join('-'));

  // New request form
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [requestForm, setRequestForm] = useState({
    // Widened to LeaveType: `as const` pinned this to the literal 'annual', so
    // the sick-leave balance check below was dead code the compiler flagged as
    // an impossible comparison.
    leaveType: 'annual' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const [loading, setLoading] = useState(true);

  /**
   * Everything below used to be invented: three fictional employees with
   * fictional balances and three fictional requests. Requests, balances and
   * holidays now all come from the API.
   *
   * The backend stores leave_type as a display label ("Annual Leave") while
   * this screen keys off slugs ("annual"), so the two are mapped at the edge.
   */
  const loadAll = async () => {
    try {
      setLoading(true);
      const [leaveRes, staffRes, holidayRes] = await Promise.all([
        leaveAPI.getAll(),
        staffAPI.getAll(),
        holidayAPI.getAll(new Date().getFullYear()),
      ]);

      const requests: LeaveRequest[] = (leaveRes.data || []).map(toLeaveRequest);
      setLeaveRequests(requests);

      // Balances are derived from each staff member's entitlement minus the
      // days already approved, rather than stored separately.
      const staff = staffRes.data || [];
      const balances: LeaveBalance[] = staff.map((st: any) => {
        const approved = requests.filter(
          r => r.staffId === st.staff_id && r.status === 'approved'
        );
        const usedOf = (type: string) =>
          approved.filter(r => r.leaveType === type)
                  .reduce((sum, r) => sum + r.daysRequested, 0);

        const annualEnt = Number(st.annual_leave_entitlement) || 0;
        const sickEnt = Number(st.sick_leave_entitlement) || 0;
        const annualUsed = usedOf('annual');
        const sickUsed = usedOf('sick');

        return {
          staffId: st.staff_id,
          staffName: `${st.first_name} ${st.last_name}`.trim(),
          year: new Date().getFullYear(),
          annualLeaveEntitlement: annualEnt,
          annualLeaveUsed: annualUsed,
          annualLeaveRemaining: annualEnt - annualUsed,
          sickLeaveEntitlement: sickEnt,
          sickLeaveUsed: sickUsed,
          sickLeaveRemaining: sickEnt - sickUsed,
        };
      });

      setLeaveBalances(balances);
      setSelectedStaffId(prev => prev || balances[0]?.staffId || '');

      setPublicHolidays(
        (holidayRes.data || []).map((h: any) => ({ date: h.date, name: h.name }))
      );
    } catch (error: any) {
      console.error('Failed to load leave data:', error);
      showToast(`⚠️ ${error.message || 'Could not load leave data'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Calculate days between dates
  const calculateDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Handle new leave request
  const handleSubmitLeaveRequest = async () => {
    console.log('[LeaveManagementDashboard] 🚀 Submit clicked!');
    console.log('[LeaveManagementDashboard] selectedStaffId:', selectedStaffId);
    console.log('[LeaveManagementDashboard] requestForm:', requestForm);
    console.log('[LeaveManagementDashboard] leaveRequests count before:', leaveRequests.length);

    if (!selectedStaffId || !requestForm.startDate || !requestForm.endDate) {
      console.log('[LeaveManagementDashboard] ❌ Missing required fields');
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const staff = leaveBalances.find(s => s.staffId === selectedStaffId);
    if (!staff) {
      console.log('[LeaveManagementDashboard] ❌ Staff not found');
      showToast('Staff member not found', 'error');
      return;
    }
    console.log('[LeaveManagementDashboard] ✓ Staff found:', staff.staffName);

    const daysRequested = calculateDays(requestForm.startDate, requestForm.endDate);

    // Check leave balance
    if (requestForm.leaveType === 'annual' && daysRequested > staff.annualLeaveRemaining) {
      showToast(`Insufficient annual leave balance. Remaining: ${staff.annualLeaveRemaining} days`, 'error');
      return;
    }

    if (requestForm.leaveType === 'sick' && daysRequested > staff.sickLeaveRemaining) {
      showToast(`Insufficient sick leave balance. Remaining: ${staff.sickLeaveRemaining} days`, 'error');
      return;
    }

    try {
      await leaveAPI.create({
        staff_id: selectedStaffId,
        staff_name: staff.staffName,
        leave_type: typeToLabel(requestForm.leaveType),
        start_date: requestForm.startDate,
        end_date: requestForm.endDate,
        reason: requestForm.reason,
        is_recurring: false,
        period: 'full-day',
      });

      // Reload rather than pushing a locally-built row: the server assigns the
      // id and computes days_count. The old code added the request to state
      // even when the POST failed, which is why a backend that had been
      // 500-ing on every create still looked like it was working.
      await loadAll();

      setRequestForm({
        leaveType: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
      });
      setShowNewRequestForm(false);
      setActiveTab('requests');
      showToast(`✅ Leave request submitted for ${staff.staffName}`, 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not submit leave request'}`, 'error');
    }
  };

  // Approve leave request
  const handleApproveRequest = async (requestId: string) => {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      await leaveAPI.update(Number(requestId), {
        status: 'approved',
        approved_by: 'Admin',
      });
      // Balances are derived from approved requests, so reloading refreshes
      // both the request and the balance it consumes.
      await loadAll();
      showToast(`✅ Leave request approved for ${request.staffName}`, 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not approve request'}`, 'error');
    }
  };

  // Reject leave request
  const handleRejectRequest = async (requestId: string) => {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      await leaveAPI.update(Number(requestId), {
        status: 'rejected',
        approved_by: 'Admin',
      });
      await loadAll();
      showToast(`✅ Leave request rejected for ${request.staffName}`, 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not reject request'}`, 'error');
    }
  };

  // Get pending requests count
  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;

  // Get total used leave days
  const totalUsedDays = leaveBalances.reduce((sum, b) => sum + b.annualLeaveUsed + b.sickLeaveUsed, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              🏖️ Leave Management
            </h1>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FF6B35',
                fontWeight: '700',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            Leave Requests, Approvals, Balances & Calendar
          </p>
        </div>

        {/* Compliance Banner */}
        <div style={{ padding: '12px 16px', background: '#E8F5E9', border: '2px solid #388E3C', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#1B5E20' }}>
          <strong>🇸🇬 MOM Compliance:</strong> Annual Leave: 12 days/year (no carry-over). Sick Leave: 4 days/year (medical cert after 2 consecutive days). All requests tracked with approval audit trail.
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Pending Requests</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>{pendingCount}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Awaiting approval</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Leave Taken</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>{totalUsedDays} days</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Year to date</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Available</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>
              {leaveBalances.reduce((sum, b) => sum + b.annualLeaveEntitlement + b.sickLeaveEntitlement, 0)} days
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>For all staff</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Public Holidays (SG)</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#9C27B0' }}>{publicHolidays.length}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>In 2026</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['dashboard', 'requests', 'calendar', 'balances', 'holidays'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'requests' && '📝 Requests'}
              {tab === 'calendar' && '📅 Calendar'}
              {tab === 'balances' && '⚖️ Balances'}
              {tab === 'holidays' && '🎉 Holidays'}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Team Leave Overview</h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {leaveBalances.map(balance => (
                <div key={balance.staffId} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                        {balance.staffName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>({balance.staffId})</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Annual Leave</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1, height: '8px', background: '#FFD9B3', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              background: '#4CAF50',
                              width: `${(balance.annualLeaveRemaining / balance.annualLeaveEntitlement) * 100}%`,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', minWidth: '50px', textAlign: 'right' }}>
                          {balance.annualLeaveRemaining}/{balance.annualLeaveEntitlement}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Sick Leave</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1, height: '8px', background: '#FFD9B3', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              background: '#2196F3',
                              width: `${(balance.sickLeaveRemaining / balance.sickLeaveEntitlement) * 100}%`,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', minWidth: '50px', textAlign: 'right' }}>
                          {balance.sickLeaveRemaining}/{balance.sickLeaveEntitlement}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#999', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>AL Used: {balance.annualLeaveUsed} days</div>
                    <div>SL Used: {balance.sickLeaveUsed} days</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div>
            <button
              onClick={() => setShowNewRequestForm(!showNewRequestForm)}
              style={{
                padding: '10px 16px',
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
                fontSize: '14px',
              }}
            >
              + New Leave Request
            </button>

            {showNewRequestForm && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>Submit Leave Request</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Staff Member
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    >
                      {leaveBalances.map(b => (
                        <option key={b.staffId} value={b.staffId}>
                          {b.staffName} ({b.staffId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Leave Type
                    </label>
                    <select
                      value={requestForm.leaveType}
                      onChange={(e) => setRequestForm({ ...requestForm, leaveType: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="annual">Annual Leave (12 days/year)</option>
                      <option value="sick">Sick Leave (4 days/year)</option>
                      <option value="unpaid">Unpaid Leave</option>
                      <option value="compassionate">Compassionate Leave</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={requestForm.startDate}
                        onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #FFD9B3',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={requestForm.endDate}
                        onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #FFD9B3',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {requestForm.startDate && requestForm.endDate && (
                    <div style={{ padding: '10px 12px', background: '#E8F5E9', borderRadius: '6px', fontSize: '12px', color: '#2E7D32', fontWeight: '600' }}>
                      📅 {calculateDays(requestForm.startDate, requestForm.endDate)} day(s)
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Reason
                    </label>
                    <textarea
                      placeholder="e.g., Family vacation, Medical appointment..."
                      value={requestForm.reason}
                      onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '13px',
                        minHeight: '60px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleSubmitLeaveRequest}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Submit Request
                    </button>
                    <button
                      onClick={() => setShowNewRequestForm(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Requests List */}
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>All Leave Requests</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {leaveRequests.map(request => (
                <div key={request.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                        {request.staffName} - {request.leaveType.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        {request.reason}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', display: 'grid', gap: '2px' }}>
                        <div>📅 {new Date(request.startDate).toLocaleDateString('en-SG')} - {new Date(request.endDate).toLocaleDateString('en-SG')}</div>
                        <div>📊 {request.daysRequested} day(s)</div>
                        {request.approvalDate && <div>✓ Approved: {new Date(request.approvalDate).toLocaleDateString('en-SG')}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background:
                          request.status === 'approved' ? '#E8F5E9' : request.status === 'pending' ? '#E3F2FD' : '#FFEBEE',
                        color:
                          request.status === 'approved' ? '#2E7D32' : request.status === 'pending' ? '#0D47A1' : '#C62828',
                        marginBottom: '8px',
                      }}>
                        {request.status === 'approved' && '✓ APPROVED'}
                        {request.status === 'pending' && '⏳ PENDING'}
                        {request.status === 'rejected' && '✗ REJECTED'}
                        {request.status === 'cancelled' && '⚪ CANCELLED'}
                      </div>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: '#F44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  maxWidth: '200px',
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                {new Date(`${selectedMonth}-01`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', fontSize: '12px' }}>
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={{ fontWeight: '700', textAlign: 'center', color: '#666', paddingBottom: '8px' }}>
                    {day}
                  </div>
                ))}

                {/* Calendar grid (simplified - just showing structure) */}
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px',
                      background: '#F5F5F5',
                      borderRadius: '4px',
                      minHeight: '40px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: '#999',
                    }}
                  >
                    {i + 1 <= 31 ? i + 1 : ''}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '12px', height: '12px', background: '#4CAF50', borderRadius: '2px' }} />
                  <span>Approved Leave</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '12px', height: '12px', background: '#9C27B0', borderRadius: '2px' }} />
                  <span>Public Holiday</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BALANCES TAB */}
        {activeTab === 'balances' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Leave Balances (2026)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FFF8F5', borderBottom: '2px solid #FFD9B3' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Staff</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>AL Entl.</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>AL Used</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>AL Remaining</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>SL Entl.</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>SL Used</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>SL Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveBalances.map(balance => (
                    <tr key={balance.staffId} style={{ borderBottom: '1px solid #FFD9B3' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#333' }}>{balance.staffName}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{balance.annualLeaveEntitlement}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#666' }}>{balance.annualLeaveUsed}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#4CAF50' }}>
                        {balance.annualLeaveRemaining}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{balance.sickLeaveEntitlement}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#666' }}>{balance.sickLeaveUsed}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2196F3' }}>
                        {balance.sickLeaveRemaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HOLIDAYS TAB */}
        {activeTab === 'holidays' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Singapore Public Holidays 2026</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {publicHolidays.map(holiday => (
                <div key={holiday.date} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#333' }}>
                    {holiday.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(holiday.date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LeaveManagementDashboard;
