import db from '../db.js';

export async function up() {
  console.log('Adding bank details columns to users table...');

  try {
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('bank_name', 'account_holder', 'account_number', 'bank_verified')
    `;

    const existing = await db.query(checkQuery);
    const existingColumns = existing.rows.map(r => r.column_name);

    // Add bank_name column if it doesn't exist
    if (!existingColumns.includes('bank_name')) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN bank_name VARCHAR(255)
      `);
      console.log('✅ Added bank_name column');
    }

    // Add account_holder column if it doesn't exist
    if (!existingColumns.includes('account_holder')) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN account_holder VARCHAR(255)
      `);
      console.log('✅ Added account_holder column');
    }

    // Add account_number column if it doesn't exist
    if (!existingColumns.includes('account_number')) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN account_number VARCHAR(255)
      `);
      console.log('✅ Added account_number column');
    }

    // Add bank_verified column if it doesn't exist
    if (!existingColumns.includes('bank_verified')) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN bank_verified BOOLEAN DEFAULT false
      `);
      console.log('✅ Added bank_verified column');
    }

    // Add stripe_account_id column if it doesn't exist
    if (!existingColumns.includes('stripe_account_id')) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN stripe_account_id VARCHAR(255) UNIQUE
      `);
      console.log('✅ Added stripe_account_id column');
    }

    // Add stripe_external_account_id column if it doesn't exist
    if (!existingColumns.includes('stripe_external_account_id')) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN stripe_external_account_id VARCHAR(255)
      `);
      console.log('✅ Added stripe_external_account_id column');
    }

    console.log('✅ Bank details migration completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

export async function down() {
  console.log('Removing bank details columns from users table...');

  try {
    await db.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS bank_name,
      DROP COLUMN IF EXISTS account_holder,
      DROP COLUMN IF EXISTS account_number,
      DROP COLUMN IF EXISTS bank_verified,
      DROP COLUMN IF EXISTS stripe_account_id,
      DROP COLUMN IF EXISTS stripe_external_account_id
    `);

    console.log('✅ Rollback completed');
  } catch (error) {
    console.error('❌ Rollback error:', error);
    throw error;
  }
}
