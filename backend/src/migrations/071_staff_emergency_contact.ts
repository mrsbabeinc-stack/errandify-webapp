import db from '../db.js';

/**
 * Emergency contact on the employee record.
 *
 * These columns existed on `job_applications` and nowhere else, which is
 * backwards: an emergency contact is useless for deciding whether to hire
 * someone, and essential once they are working for you. Migration 069 dropped
 * them from the application; this puts them where they belong, so the hire
 * endpoint has somewhere to write them.
 *
 * The contact is a third party who never applied for anything. Collecting them
 * at the point of employment — when there is a real safety purpose and a
 * relationship to justify it — is the difference between a lawful collection
 * and holding a stranger's phone number on the off-chance.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS emergency_contact_name         VARCHAR(255),
      ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emergency_contact_phone        VARCHAR(50)
  `);
  console.log('[071] emergency contact added to staff');
}

export async function down(): Promise<void> {
  await db.query(`
    ALTER TABLE staff
      DROP COLUMN IF EXISTS emergency_contact_name,
      DROP COLUMN IF EXISTS emergency_contact_relationship,
      DROP COLUMN IF EXISTS emergency_contact_phone
  `);
}
