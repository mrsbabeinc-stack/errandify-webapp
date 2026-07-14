/**
 * Recurring Leave Helper
 * Calculates actual blocked dates from recurring patterns
 */

export interface RecurringPattern {
  type: 'weekly' | 'bi-weekly' | 'monthly';
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, etc.
  effectiveFrom: string; // YYYY-MM-DD
  effectiveUntil?: string; // YYYY-MM-DD, undefined = ongoing
  frequency?: number; // For custom patterns
}

/**
 * Generate all blocked dates from a recurring pattern
 * @param pattern - Recurring pattern definition
 * @param limit - Maximum dates to generate (default 52 for 1 year)
 * @returns Array of YYYY-MM-DD strings
 */
export function getBlockedDatesFromPattern(
  pattern: RecurringPattern,
  limit: number = 52
): string[] {
  const blockedDates: string[] = [];
  const startDate = new Date(pattern.effectiveFrom);
  const endDate = pattern.effectiveUntil ? new Date(pattern.effectiveUntil) : new Date(2099, 11, 31);

  let currentDate = new Date(startDate);
  let count = 0;

  while (currentDate <= endDate && count < limit) {
    if (pattern.type === 'weekly' && pattern.daysOfWeek) {
      // Weekly pattern
      const dayOfWeek = currentDate.getDay();
      if (pattern.daysOfWeek.includes(dayOfWeek)) {
        blockedDates.push(formatDate(currentDate));
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pattern.type === 'bi-weekly' && pattern.daysOfWeek) {
      // Bi-weekly pattern
      const dayOfWeek = currentDate.getDay();
      const weeksDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      if (pattern.daysOfWeek.includes(dayOfWeek) && weeksDiff % 2 === 0) {
        blockedDates.push(formatDate(currentDate));
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pattern.type === 'monthly' && pattern.daysOfWeek) {
      // Monthly pattern (same day of month each month)
      const dayOfMonth = startDate.getDate();
      if (currentDate.getDate() === dayOfMonth) {
        blockedDates.push(formatDate(currentDate));
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return blockedDates;
}

/**
 * Check if a date falls on a blocked recurring pattern
 */
export function isDateBlocked(date: string, pattern: RecurringPattern): boolean {
  const checkDate = new Date(date);
  const dayOfWeek = checkDate.getDay();

  // Check if date is within effective range
  const startDate = new Date(pattern.effectiveFrom);
  if (checkDate < startDate) return false;

  if (pattern.effectiveUntil) {
    const endDate = new Date(pattern.effectiveUntil);
    if (checkDate > endDate) return false;
  }

  if (!pattern.daysOfWeek) return false;

  if (pattern.type === 'weekly') {
    return pattern.daysOfWeek.includes(dayOfWeek);
  } else if (pattern.type === 'bi-weekly') {
    const weeksDiff = Math.floor((checkDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return pattern.daysOfWeek.includes(dayOfWeek) && weeksDiff % 2 === 0;
  } else if (pattern.type === 'monthly') {
    const dayOfMonth = startDate.getDate();
    return pattern.daysOfWeek.includes(dayOfWeek) && checkDate.getDate() === dayOfMonth;
  }

  return false;
}

/**
 * Get next occurrence of a recurring pattern
 */
export function getNextOccurrence(pattern: RecurringPattern): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const blocked = getBlockedDatesFromPattern(pattern, 100);
  for (const date of blocked) {
    if (new Date(date) >= today) {
      return date;
    }
  }

  return null;
}

/**
 * Get all occurrences in a date range
 */
export function getOccurrencesInRange(pattern: RecurringPattern, startDate: string, endDate: string): string[] {
  const blocked = getBlockedDatesFromPattern(pattern, 200);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return blocked.filter(date => {
    const d = new Date(date);
    return d >= start && d <= end;
  });
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate impact of recurring pattern
 */
export function calculatePatternImpact(pattern: RecurringPattern): {
  daysPerYear: number;
  description: string;
  nextOccurrence: string | null;
} {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0];

  const occurrences = getOccurrencesInRange(pattern, yearStart, yearEnd);
  let description = '';

  if (pattern.type === 'weekly' && pattern.daysOfWeek) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = pattern.daysOfWeek.map(d => dayNames[d]).join(', ');
    description = `Every week on ${days}`;
  } else if (pattern.type === 'bi-weekly' && pattern.daysOfWeek) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = pattern.daysOfWeek.map(d => dayNames[d]).join(', ');
    description = `Every 2 weeks on ${days}`;
  } else if (pattern.type === 'monthly' && pattern.daysOfWeek) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = pattern.daysOfWeek.map(d => dayNames[d]).join(', ');
    description = `Every month on ${days}`;
  }

  if (pattern.effectiveUntil) {
    description += ` (until ${new Date(pattern.effectiveUntil).toLocaleDateString()})`;
  } else {
    description += ' (ongoing)';
  }

  return {
    daysPerYear: occurrences.length,
    description,
    nextOccurrence: getNextOccurrence(pattern),
  };
}
