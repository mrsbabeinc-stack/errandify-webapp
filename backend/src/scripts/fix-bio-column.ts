import db from '../db.js';

async function fixBioColumn() {
  try {
    console.log('🔄 Expanding bio column from VARCHAR(500) to TEXT...');

    await db.query('ALTER TABLE users ALTER COLUMN bio TYPE TEXT;');

    console.log('✅ Bio column expanded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBioColumn();
