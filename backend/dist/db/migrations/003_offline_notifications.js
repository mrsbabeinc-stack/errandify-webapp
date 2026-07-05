import db from '../index.js';
export async function up() {
    console.log('Migration: Adding offline_notifications table...');
    await db.query(`
    CREATE TABLE IF NOT EXISTS offline_notifications (
      id SERIAL PRIMARY KEY,
      recipient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_alias VARCHAR(255) NOT NULL,
      errand_id INT NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
      errand_title VARCHAR(255) NOT NULL,
      message_preview TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP
    )
  `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_offline_notifications_recipient_id ON offline_notifications(recipient_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_offline_notifications_created_at ON offline_notifications(created_at)`);
    console.log('Migration: offline_notifications table created');
}
export async function down() {
    console.log('Migration: Dropping offline_notifications table...');
    await db.query(`DROP TABLE IF NOT EXISTS offline_notifications`);
    console.log('Migration: offline_notifications table dropped');
}
