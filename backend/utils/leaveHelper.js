/**
 * Leave Management Helper Functions
 * Shared utilities for leave operations
 */

const db = require('../database/connection');

/**
 * Get staff availability for date range
 * @param {number} companyId - Company ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>}
 */
async function getStaffAvailability(companyId, startDate, endDate) {
  const query = `
    SELECT DISTINCT
      u.id,
      u.display_name,
      u.email,
      la.id as leave_id,
      la.start_date,
      la.end_date,
      la.reason,
      la.period_type,
      la.status
    FROM users u
    LEFT JOIN leave_applications la ON u.id = la.staff_id
    WHERE u.company_id = ? AND u.role = 'staff'
      AND (la.id IS NULL OR (
        la.start_date <= ? AND la.end_date >= ?
      ))
    ORDER BY u.display_name, la.start_date
  `;

  return db.query(query, [companyId, endDate, startDate]);
}

/**
 * Check if staff has conflicting leave
 * @param {number} staffId - Staff ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} excludeId - Exclude application ID (for updates)
 * @returns {Promise<Array>}
 */
async function getConflictingLeave(staffId, startDate, endDate, excludeId = null) {
  let query = `
    SELECT *
    FROM leave_applications
    WHERE staff_id = ?
      AND status IN ('pending', 'approved')
      AND start_date <= ? AND end_date >= ?
  `;
  const params = [staffId, endDate, startDate];

  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }

  return db.query(query, params);
}

/**
 * Check if company is closed on dates
 * @param {number} companyId - Company ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Blocked dates
 */
async function getBlockedDates(companyId, startDate, endDate) {
  const query = `
    SELECT date, name, date_type
    FROM special_dates
    WHERE company_id = ? AND is_blocked = TRUE
      AND date >= ? AND date <= ?
    ORDER BY date
  `;

  return db.query(query, [companyId, startDate, endDate]);
}

/**
 * Get company operating hours
 * @param {number} companyId - Company ID
 * @returns {Promise<Array>}
 */
async function getOperatingHours(companyId) {
  const query = `
    SELECT day_of_week, is_active, open_time, close_time
    FROM company_operating_hours
    WHERE company_id = ?
    ORDER BY day_of_week
  `;

  return db.query(query, [companyId]);
}

/**
 * Validate leave request
 * @param {Object} leaveData - Leave application data
 * @param {number} companyId - Company ID
 * @returns {Promise<{valid: boolean, errors: Array}>}
 */
async function validateLeave(leaveData, companyId) {
  const errors = [];

  // Date validation
  if (!leaveData.startDate || !leaveData.endDate) {
    errors.push('Start and end dates are required');
    return { valid: false, errors };
  }

  const start = new Date(leaveData.startDate);
  const end = new Date(leaveData.endDate);

  if (start > end) {
    errors.push('Start date must be before end date');
  }

  if (start < new Date()) {
    errors.push('Cannot apply for leave in the past');
  }

  // Check for conflicts
  const conflicts = await getConflictingLeave(
    leaveData.staffId,
    leaveData.startDate,
    leaveData.endDate
  );

  if (conflicts.length > 0) {
    errors.push(`Conflicting leave found: ${conflicts.length} overlapping request(s)`);
  }

  // Check for blocked dates (optional warning)
  const blockedDates = await getBlockedDates(companyId, leaveData.startDate, leaveData.endDate);
  if (blockedDates.length > 0) {
    errors.push(`Leave includes ${blockedDates.length} company-blocked date(s): ${blockedDates.map(d => d.name).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create leave application (with or without recurrence)
 * @param {Object} leaveData - Leave details
 * @returns {Promise<{id: number, created_instances: number}>}
 */
async function createLeaveApplication(leaveData) {
  const {
    staffId,
    companyId,
    startDate,
    endDate,
    periodType,
    reason,
    recurrencePattern,
    recurrenceEndDate,
    maxOccurrences,
  } = leaveData;

  const isRecurring = !!recurrencePattern;

  const result = await db.insert('leave_applications', {
    staff_id: staffId,
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
    period_type: periodType,
    reason,
    status: 'pending',
    is_recurring: isRecurring,
    recurrence_pattern: recurrencePattern || null,
    recurrence_end_date: recurrenceEndDate || null,
    max_occurrences: maxOccurrences || null,
    occurrences_created: isRecurring ? 0 : 1,
    created_at: new Date(),
  });

  // If recurring, generate instances
  if (isRecurring) {
    await db.query('CALL sp_create_recurring_leave_instances()');
  }

  return {
    id: result.insertId,
    created_instances: isRecurring ? maxOccurrences || 'unlimited' : 1,
  };
}

/**
 * Approve leave application
 * @param {number} applicationId - Application ID
 * @param {number} approvedBy - Approver user ID
 * @param {string} notes - Approval notes
 * @returns {Promise<void>}
 */
async function approveLeave(applicationId, approvedBy, notes = '') {
  return db.transaction(async (conn) => {
    // Update application status
    await db.update(
      'leave_applications',
      { status: 'approved' },
      'id = ?',
      [applicationId]
    );

    // Record approval history
    await db.insert('leave_approval_history', {
      application_id: applicationId,
      approved_by: approvedBy,
      status: 'approved',
      notes,
      created_at: new Date(),
    });

    // Detect any new conflicts
    await db.query('CALL sp_detect_leave_conflicts()');
  });
}

/**
 * Reject leave application
 * @param {number} applicationId - Application ID
 * @param {number} rejectedBy - Rejector user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 */
async function rejectLeave(applicationId, rejectedBy, reason = '') {
  return db.transaction(async (conn) => {
    // Update application status
    await db.update(
      'leave_applications',
      { status: 'rejected' },
      'id = ?',
      [applicationId]
    );

    // Record rejection history
    await db.insert('leave_approval_history', {
      application_id: applicationId,
      approved_by: rejectedBy,
      status: 'rejected',
      notes: reason,
      created_at: new Date(),
    });
  });
}

/**
 * Get leave statistics for dashboard
 * @param {number} companyId - Company ID
 * @returns {Promise<Object>}
 */
async function getLeaveStats(companyId) {
  const query = `
    SELECT
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
      COUNT(DISTINCT staff_id) as staff_with_leave,
      AVG(DATEDIFF(end_date, start_date)) as avg_leave_days
    FROM leave_applications
    WHERE company_id = ? AND start_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `;

  const [stats] = await db.query(query, [companyId]);
  return stats || {
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    staff_with_leave: 0,
    avg_leave_days: 0,
  };
}

/**
 * Export leave data as CSV
 * @param {number} companyId - Company ID
 * @param {Date} startDate - Date range start
 * @param {Date} endDate - Date range end
 * @returns {Promise<string>} - CSV content
 */
async function exportLeavesAsCSV(companyId, startDate, endDate) {
  const query = `
    SELECT
      u.display_name as 'Staff Name',
      la.start_date as 'Start Date',
      la.end_date as 'End Date',
      DATEDIFF(la.end_date, la.start_date) + 1 as 'Days',
      la.period_type as 'Period',
      la.reason as 'Reason',
      la.status as 'Status',
      la.created_at as 'Applied Date'
    FROM leave_applications la
    JOIN users u ON la.staff_id = u.id
    WHERE la.company_id = ?
      AND la.start_date >= ? AND la.end_date <= ?
    ORDER BY la.start_date DESC, u.display_name
  `;

  const data = await db.query(query, [companyId, startDate, endDate]);

  // Convert to CSV
  const headers = Object.keys(data[0] || {});
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ),
  ].join('\n');

  return csv;
}

module.exports = {
  getStaffAvailability,
  getConflictingLeave,
  getBlockedDates,
  getOperatingHours,
  validateLeave,
  createLeaveApplication,
  approveLeave,
  rejectLeave,
  getLeaveStats,
  exportLeavesAsCSV,
};
