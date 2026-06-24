import db from '../db.js';

export async function up() {
  try {
    console.log('Running migration: Creating errand_activity_log table...');

    // Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS errand_activity_log (
        id SERIAL PRIMARY KEY,
        errand_id INTEGER NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        actor_name VARCHAR(255),
        actor_role VARCHAR(50),
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_errand_activity_log_errand_id ON errand_activity_log(errand_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_errand_activity_log_created_at ON errand_activity_log(created_at)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_errand_activity_log_activity_type ON errand_activity_log(activity_type)
    `);

    // Create function
    await db.query(`
      CREATE OR REPLACE FUNCTION log_errand_activity(
        p_errand_id INTEGER,
        p_activity_type VARCHAR,
        p_actor_id INTEGER,
        p_actor_name VARCHAR,
        p_actor_role VARCHAR,
        p_details JSONB DEFAULT NULL
      ) RETURNS void AS $$
      BEGIN
        INSERT INTO errand_activity_log (errand_id, activity_type, actor_id, actor_name, actor_role, details)
        VALUES (p_errand_id, p_activity_type, p_actor_id, p_actor_name, p_actor_role, p_details);
      END;
      $$ LANGUAGE plpgsql
    `);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function down() {
  try {
    console.log('Rolling back migration...');

    await db.query(`DROP FUNCTION IF EXISTS log_errand_activity CASCADE`);
    await db.query(`DROP TABLE IF EXISTS errand_activity_log CASCADE`);

    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}
