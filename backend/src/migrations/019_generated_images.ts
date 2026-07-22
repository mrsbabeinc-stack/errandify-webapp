import db from '../db.js';

/**
 * Migration 019 — somewhere to keep generated images.
 *
 * The model returns a SIGNED URL that expires in about a week. Storing that URL
 * on a campaign or banner means the image silently 404s later, so we keep our
 * own copy and serve it from `/api/ai/images/:id`.
 *
 * Data URIs in Postgres is a pragmatic choice, not a permanent one — S3 belongs
 * here once the storage service is working.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS generated_images (
      id SERIAL PRIMARY KEY,
      prompt TEXT NOT NULL,
      data_uri TEXT NOT NULL,
      source_url TEXT,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      used_in VARCHAR(60),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_generated_images_created ON generated_images(created_at DESC)`);
  console.log('[019] ✅ generated_images created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS generated_images CASCADE');
}

if (process.argv[1] && process.argv[1].includes('019_generated_images')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
