import db from '../db.js';

interface DayHours {
  open: string; // HH:MM
  close: string; // HH:MM
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

export class OperationHoursService {
  // Get company operation hours
  static async getCompanyHours(companyId: number): Promise<OperationHours | null> {
    try {
      const result = await db.query(
        `SELECT
          monday_open, monday_close, monday_active,
          tuesday_open, tuesday_close, tuesday_active,
          wednesday_open, wednesday_close, wednesday_active,
          thursday_open, thursday_close, thursday_active,
          friday_open, friday_close, friday_active,
          saturday_open, saturday_close, saturday_active,
          sunday_open, sunday_close, sunday_active,
          timezone
         FROM company_operation_hours
         WHERE company_id = $1`,
        [companyId]
      );

      if (!result.rows.length) return null;

      const row = result.rows[0] as any;
      return {
        monday: { open: row.monday_open, close: row.monday_close, active: row.monday_active },
        tuesday: { open: row.tuesday_open, close: row.tuesday_close, active: row.tuesday_active },
        wednesday: { open: row.wednesday_open, close: row.wednesday_close, active: row.wednesday_active },
        thursday: { open: row.thursday_open, close: row.thursday_close, active: row.thursday_active },
        friday: { open: row.friday_open, close: row.friday_close, active: row.friday_active },
        saturday: { open: row.saturday_open, close: row.saturday_close, active: row.saturday_active },
        sunday: { open: row.sunday_open, close: row.sunday_close, active: row.sunday_active },
        timezone: row.timezone
      } as OperationHours;
    } catch (error) {
      console.error('Get operation hours error:', error);
      return null;
    }
  }

  // Check if a time falls within operation hours
  static async isWithinOperatingHours(
    companyId: number,
    checkDateTime: Date
  ): Promise<{ withinHours: boolean; reason?: string }> {
    try {
      const hours = await this.getCompanyHours(companyId);
      if (!hours) {
        return { withinHours: true }; // If no hours set, allow
      }

      const dayOfWeek = checkDateTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const time = checkDateTime.toTimeString().slice(0, 5); // HH:MM

      const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = daysMap[dayOfWeek] as keyof OperationHours;
      const dayHours = hours[dayKey] as DayHours;

      if (!dayHours.active) {
        return {
          withinHours: false,
          reason: `Company is closed on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}s`
        };
      }

      if (time < dayHours.open || time > dayHours.close) {
        return {
          withinHours: false,
          reason: `Errand time (${time}) is outside operating hours (${dayHours.open}-${dayHours.close})`
        };
      }

      return { withinHours: true };
    } catch (error) {
      console.error('Operating hours check error:', error);
      return { withinHours: true }; // Allow on error
    }
  }

  // Update company operation hours
  static async updateCompanyHours(companyId: number, hours: Partial<OperationHours>) {
    try {
      const updates: string[] = [];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (hours.monday) {
        updates.push(`monday_open = $${paramCount}`, `monday_close = $${paramCount + 1}`, `monday_active = $${paramCount + 2}`);
        params.push(hours.monday.open, hours.monday.close, hours.monday.active);
        paramCount += 3;
      }
      if (hours.tuesday) {
        updates.push(`tuesday_open = $${paramCount}`, `tuesday_close = $${paramCount + 1}`, `tuesday_active = $${paramCount + 2}`);
        params.push(hours.tuesday.open, hours.tuesday.close, hours.tuesday.active);
        paramCount += 3;
      }
      if (hours.wednesday) {
        updates.push(`wednesday_open = $${paramCount}`, `wednesday_close = $${paramCount + 1}`, `wednesday_active = $${paramCount + 2}`);
        params.push(hours.wednesday.open, hours.wednesday.close, hours.wednesday.active);
        paramCount += 3;
      }
      if (hours.thursday) {
        updates.push(`thursday_open = $${paramCount}`, `thursday_close = $${paramCount + 1}`, `thursday_active = $${paramCount + 2}`);
        params.push(hours.thursday.open, hours.thursday.close, hours.thursday.active);
        paramCount += 3;
      }
      if (hours.friday) {
        updates.push(`friday_open = $${paramCount}`, `friday_close = $${paramCount + 1}`, `friday_active = $${paramCount + 2}`);
        params.push(hours.friday.open, hours.friday.close, hours.friday.active);
        paramCount += 3;
      }
      if (hours.saturday) {
        updates.push(`saturday_open = $${paramCount}`, `saturday_close = $${paramCount + 1}`, `saturday_active = $${paramCount + 2}`);
        params.push(hours.saturday.open, hours.saturday.close, hours.saturday.active);
        paramCount += 3;
      }
      if (hours.sunday) {
        updates.push(`sunday_open = $${paramCount}`, `sunday_close = $${paramCount + 1}`, `sunday_active = $${paramCount + 2}`);
        params.push(hours.sunday.open, hours.sunday.close, hours.sunday.active);
        paramCount += 3;
      }

      if (hours.timezone) {
        updates.push(`timezone = $${paramCount}`);
        params.push(hours.timezone);
      }

      if (updates.length === 0) return null;

      const query = `
        UPDATE company_operation_hours
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE company_id = $1
        RETURNING *
      `;

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Update operation hours error:', error);
      return null;
    }
  }

  // Get staff availability for date
  static async getStaffAvailability(staffId: number, date: Date) {
    try {
      const result = await db.query(
        `SELECT status, reason, notes
         FROM staff_availability
         WHERE staff_id = $1 AND availability_date = $2::DATE`,
        [staffId, date.toISOString().split('T')[0]]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Get staff availability error:', error);
      return null;
    }
  }

  // Set staff availability override
  static async setStaffAvailability(
    companyId: number,
    staffId: number,
    date: Date,
    status: string,
    reason?: string
  ) {
    try {
      const result = await db.query(
        `INSERT INTO staff_availability (company_id, staff_id, availability_date, status, reason)
         VALUES ($1, $2, $3::DATE, $4, $5)
         ON CONFLICT (company_id, staff_id, availability_date)
         DO UPDATE SET status = $4, reason = $5
         RETURNING *`,
        [companyId, staffId, date.toISOString().split('T')[0], status, reason || '']
      );

      return result.rows[0];
    } catch (error) {
      console.error('Set staff availability error:', error);
      return null;
    }
  }
}

export default OperationHoursService;
