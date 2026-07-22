import db from '../db.js';

/**
 * Migration 025 — company_reviews.
 *
 * GET /api/companies/:id/reviews is called by the frontend and 500'd because
 * the table never existed anywhere: not in the database, not in database/*.sql,
 * not in any migration.
 *
 * Columns derive from the query in companyRoutes.ts, which joins users on
 * rater_id and orders by created_at.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_reviews (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      rater_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      errand_id INTEGER REFERENCES errands(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_company_reviews_company ON company_reviews(company_id, created_at DESC)`);
  // One review per rater per errand — stops a single job being rated repeatedly
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_reviews_unique
      ON company_reviews(company_id, rater_id, errand_id)
      WHERE errand_id IS NOT NULL
  `);
  console.log('[025] ✅ company_reviews created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS company_reviews CASCADE');
}

if (process.argv[1] && process.argv[1].includes('025_company_reviews')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
