import db from '../db.js';

export async function up() {
  console.log('Running migration 006: Add full_address column to errands table');

  try {
    // Add full_address column to errands table
    await db.query(
      `ALTER TABLE errands ADD COLUMN full_address VARCHAR(255)`
    );

    console.log('✓ Added full_address column to errands table');
  } catch (err: any) {
    if (err.code === '42701') { // Column already exists
      console.log('✓ full_address column already exists, skipping');
    } else {
      throw err;
    }
  }
}

export async function down() {
  console.log('Running migration 006 rollback: Remove full_address column');

  try {
    await db.query(
      `ALTER TABLE errands DROP COLUMN full_address`
    );
    console.log('✓ Removed full_address column from errands table');
  } catch (err: any) {
    if (err.code === '42703') { // Column doesn't exist
      console.log('✓ full_address column does not exist, skipping');
    } else {
      throw err;
    }
  }
}
