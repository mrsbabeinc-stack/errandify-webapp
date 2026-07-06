const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sqlFiles = [
  'database/schema.sql',
  'database/add_postal_code.sql',
  'database/add_offer_id.sql',
  'database/add_formatted_ids.sql',
  'database/add_notifications_system.sql',
  'database/add_ratings_system.sql',
  'database/add_disputes_system.sql',
  'database/add_errand_activity_log.sql',
  'database/add_errandify_points.sql',
  'database/add_rating_reminders.sql',
  'database/add_push_subscriptions.sql',
  'database/add_income_field.sql',
  'database/add_task_execution.sql',
  'database/add_email_notifications.sql',
  'database/add_session_assignments.sql',
  'database/add_user_favorites.sql',
  'database/add_completion_notes.sql',
  'database/add_chas_fields.sql',
  'database/add_criminal_records_check.sql',
  'database/add_criminal_screening.sql',
  'database/add_ai_audit_tables.sql',
  'database/add_bid_viewed_tracking.sql',
  'database/create_postal_code_cache.sql',
  'database/update_user_roles.sql',
  'database/create_admin_accounts.sql',
  'database/backfill_offer_ids.sql',
];

async function runMigrations() {
  console.log('🚀 Starting database migration to Supabase...');
  console.log(`📦 Database: ${DATABASE_URL.split('@')[1]}`);
  console.log('');

  let succeeded = 0;
  let failed = 0;

  for (const sqlFile of sqlFiles) {
    const filePath = path.join(__dirname, sqlFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  SKIPPED: ${sqlFile} (file not found)`);
      continue;
    }

    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`📝 Applying: ${sqlFile}`);

      // Split by semicolon and execute statements (skip empty ones)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        await pool.query(statement);
      }

      console.log(`✅ SUCCESS: ${sqlFile}`);
      succeeded++;
    } catch (error) {
      console.log(`❌ FAILED: ${sqlFile}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log('========================================');
  console.log('🎉 Migration Summary');
  console.log('========================================');
  console.log(`✅ Succeeded: ${succeeded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('🚀 All migrations completed successfully!');
    console.log('✨ Supabase is now ready with full schema!');
  } else {
    console.log('⚠️  Some migrations failed. Check errors above.');
  }

  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
