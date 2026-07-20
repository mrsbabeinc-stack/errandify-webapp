import db from '../db.js';

export class LeaveService {
  // Check if staff is on approved leave on a specific date
  static async isStaffOnLeave(staffId: number, checkDate: Date): Promise<boolean> {
    try {
      const result = await db.query(
        `SELECT id FROM leave_requests
         WHERE staff_id = $1
         AND status = 'approved'
         AND $2::DATE BETWEEN start_date AND end_date`,
        [staffId, checkDate.toISOString().split('T')[0]]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Leave check error:', error);
      return false;
    }
  }

  // Check if staff is on leave during a date range
  static async isStaffOnLeaveRange(
    staffId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{ onLeave: boolean; leaveDetails?: any }> {
    try {
      const result = await db.query(
        `SELECT id, leave_type, start_date, end_date, period
         FROM leave_requests
         WHERE staff_id = $1
         AND status = 'approved'
         AND (
           (start_date <= $2::DATE AND end_date >= $2::DATE)
           OR (start_date <= $3::DATE AND end_date >= $3::DATE)
           OR (start_date >= $2::DATE AND end_date <= $3::DATE)
         )`,
        [staffId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      if (result.rows.length > 0) {
        return {
          onLeave: true,
          leaveDetails: result.rows[0]
        };
      }
      return { onLeave: false };
    } catch (error) {
      console.error('Leave range check error:', error);
      return { onLeave: false };
    }
  }

  // Get leave balance for staff
  static async getLeaveBalance(staffId: number, year: number = new Date().getFullYear()) {
    try {
      const result = await db.query(
        `SELECT
          leave_type,
          entitlement_days,
          used_days,
          COALESCE(entitlement_days - used_days, entitlement_days) as remaining_days
         FROM leave_entitlements
         WHERE staff_id = $1 AND year = $2`,
        [staffId, year]
      );

      return result.rows;
    } catch (error) {
      console.error('Leave balance error:', error);
      return [];
    }
  }

  // Deduct used days when leave is approved
  static async deductLeaveDays(staffId: number, leaveType: string, days: number, year: number = new Date().getFullYear()) {
    try {
      await db.query(
        `UPDATE leave_entitlements
         SET used_days = used_days + $1,
             remaining_days = entitlement_days - (used_days + $1),
             last_updated = NOW()
         WHERE staff_id = $2 AND leave_type = $3 AND year = $4`,
        [days, staffId, leaveType, year]
      );
    } catch (error) {
      console.error('Leave deduction error:', error);
    }
  }

  // Restore days when leave is rejected
  static async restoreLeaveDays(staffId: number, leaveType: string, days: number, year: number = new Date().getFullYear()) {
    try {
      await db.query(
        `UPDATE leave_entitlements
         SET used_days = GREATEST(0, used_days - $1),
             remaining_days = entitlement_days - GREATEST(0, used_days - $1),
             last_updated = NOW()
         WHERE staff_id = $2 AND leave_type = $3 AND year = $4`,
        [days, staffId, leaveType, year]
      );
    } catch (error) {
      console.error('Leave restoration error:', error);
    }
  }

  // Get all leave requests for company with filters
  static async getLeaveRequests(
    companyId: number,
    filters?: {
      status?: string;
      staffId?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    try {
      let query = `
        SELECT
          id, company_id, staff_id, staff_name, leave_type,
          start_date, end_date, period, reason, notes,
          days_count, is_recurring, recurring_pattern,
          status, approved_by, approval_notes, rejected_reason,
          created_at, approved_at, last_modified
        FROM leave_requests
        WHERE company_id = $1
      `;
      const params: any[] = [companyId];

      if (filters?.status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(filters.status);
      }
      if (filters?.staffId) {
        query += ` AND staff_id = $${params.length + 1}`;
        params.push(filters.staffId);
      }
      if (filters?.startDate) {
        query += ` AND start_date >= $${params.length + 1}::DATE`;
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        query += ` AND end_date <= $${params.length + 1}::DATE`;
        params.push(filters.endDate);
      }

      query += ' ORDER BY created_at DESC';
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get leave requests error:', error);
      return [];
    }
  }
}

export default LeaveService;
