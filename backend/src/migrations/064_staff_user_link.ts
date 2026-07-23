import db from '../db.js';

/**
 * Links an employee record to the login that belongs to them.
 *
 * There was no link at all: `staff` and `users` shared nothing but an email
 * column. That blocked the staff-facing clock-in, because a request carries a
 * user id and nothing could say which employee that user is.
 *
 * Email matching was the obvious shortcut and is the wrong answer here. Emails
 * get reused, changed, and typo'd, and `staff.email` has no uniqueness
 * constraint — so a near-match would attribute one person's hours to another,
 * and those hours flow into timesheets and then into pay. An explicit,
 * unique, deliberately-set foreign key is the only version of this that is
 * safe to build on.
 *
 * Nullable on purpose: most staff records have no login yet, and the clock-in
 * endpoints refuse to guess when the link is absent rather than falling back
 * to a heuristic.
 */

export async function up(): Promise<void> {
  await db.query(`
    ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL
  `);

  // One login maps to at most one employee, and vice versa. Without this a
  // single user could be clocked in as two different people.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_staff_user_id
      ON staff (user_id) WHERE user_id IS NOT NULL
  `);

  console.log('[064] staff.user_id link added');
}

export async function down(): Promise<void> {
  await db.query(`DROP INDEX IF EXISTS uniq_staff_user_id`);
  await db.query(`ALTER TABLE staff DROP COLUMN IF EXISTS user_id`);
}
