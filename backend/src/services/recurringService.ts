import db from '../db.js';

interface RecurringConfig {
  repeatEvery: number;
  repeatUnit: 'day' | 'week' | 'month';
  occurrences?: number | null;
}

// Category codes mapping - All 16 Categories (same as in errands.ts)
const categoryCodeMap: { [key: string]: string } = {
  'home-maintenance': 'HM',      // Home Maintenance
  'cleaning-household': 'CL',    // Cleaning & Laundry
  'food-beverage': 'FD',         // Food & Beverage
  'furniture-assembly': 'FR',    // Furniture Assembly
  'shopping-errands': 'SH',      // Shopping & Errands
  'delivery-moving': 'DV',       // Delivery & Moving
  'travel-mobility': 'TR',       // Travel & Mobility
  'event-planning': 'EV',        // Event Planning & Setup
  'childcare-education': 'CH',   // Childcare & Education
  'eldercare-healthcare': 'EL',  // Eldercare & Healthcare
  'pet-care': 'PC',              // Pet Care
  'personal-care': 'PS',         // Personal Care
  'tech-support': 'TC',          // Tech Support
  'creative-arts': 'AR',         // Creative & Arts
  'admin-business': 'AD',        // Admin & Business
  'charity-community': 'CC',     // Charity & Community
};

// Generate unique errand ID: ER26HM-XXXX
function generateErrandId(category: string): string {
  const year = new Date().getFullYear().toString().slice(-2); // Get last 2 digits: 2026 -> 26
  const categoryCode = categoryCodeMap[category.toLowerCase()] || 'XX';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ER${year}${categoryCode}-${code}`;
}

// Generate recurring task instances based on config
export const generateRecurringInstances = async (
  parentErrandId: number,
  startDate: Date,
  config: RecurringConfig
): Promise<number[]> => {
  const instances: number[] = [];

  // Calculate the number of occurrences
  const occurrences = config.occurrences || 1;

  // Get parent errand details
  const parentResult = await db.query(
    `SELECT id, asker_id, title, description, category, location, postal_code, budget, is_recurring, recurring_schedule, formatted_id
     FROM errands WHERE id = $1`,
    [parentErrandId]
  );

  if (parentResult.rows.length === 0) {
    throw new Error(`Parent errand ${parentErrandId} not found`);
  }

  const parent = parentResult.rows[0];

  // Generate instances
  for (let i = 1; i <= occurrences; i++) {
    const scheduledDate = calculateNextDate(startDate, config.repeatEvery, config.repeatUnit, i - 1);
    const errandId = generateErrandId(parent.category);

    // Create instance errand with unique errand_id
    const instanceResult = await db.query(
      `INSERT INTO errands (
        asker_id, title, description, category, location, postal_code, budget, deadline, status, errand_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9)
       RETURNING id`,
      [parent.asker_id, parent.title, parent.description, parent.category, parent.location, parent.postal_code, parent.budget, scheduledDate, errandId]
    );

    const instanceId = instanceResult.rows[0].id;
    instances.push(instanceId);

    // Link to parent via recurring_sessions
    await db.query(
      `INSERT INTO recurring_sessions (parent_errand_id, instance_number, errand_id, scheduled_date)
       VALUES ($1, $2, $3, $4)`,
      [parentErrandId, i, instanceId, scheduledDate]
    );

    console.log(`[Recurring] Created instance ${i}/${occurrences} for errand ${parentErrandId}: instance_id=${instanceId}, errand_id=${errandId}, scheduled=${scheduledDate.toISOString()}`);
  }

  return instances;
};

// Calculate next date based on repeat config
const calculateNextDate = (baseDate: Date, repeatEvery: number, repeatUnit: 'day' | 'week' | 'month', offsetCount: number): Date => {
  const date = new Date(baseDate);

  switch (repeatUnit) {
    case 'day':
      date.setDate(date.getDate() + repeatEvery * offsetCount);
      break;
    case 'week':
      date.setDate(date.getDate() + 7 * repeatEvery * offsetCount);
      break;
    case 'month':
      date.setMonth(date.getMonth() + repeatEvery * offsetCount);
      break;
  }

  return date;
};

// Get all instances of a recurring task
export const getRecurringInstances = async (parentErrandId: number) => {
  const result = await db.query(
    `SELECT rs.id, rs.instance_number, rs.errand_id, rs.scheduled_date, e.title, e.status, e.budget
     FROM recurring_sessions rs
     JOIN errands e ON rs.errand_id = e.id
     WHERE rs.parent_errand_id = $1
     ORDER BY rs.instance_number ASC`,
    [parentErrandId]
  );

  return result.rows;
};

// Get parent errand of a recurring instance
export const getParentErrand = async (instanceErrandId: number) => {
  const result = await db.query(
    `SELECT rs.parent_errand_id, rs.instance_number,
            (SELECT COUNT(*) FROM recurring_sessions WHERE parent_errand_id = rs.parent_errand_id) as total_instances
     FROM recurring_sessions rs
     WHERE rs.errand_id = $1`,
    [instanceErrandId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    parentErrandId: row.parent_errand_id,
    instanceNumber: row.instance_number,
    totalInstances: parseInt(row.total_instances, 10),
  };
};

// Check if errand is part of a recurring series
export const isRecurringInstance = async (errandId: number): Promise<boolean> => {
  const result = await db.query(
    'SELECT id FROM recurring_sessions WHERE errand_id = $1 LIMIT 1',
    [errandId]
  );
  return result.rows.length > 0;
};
