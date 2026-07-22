import db from '../db.js';

/**
 * Migration 032 — community_news.
 *
 * routes/news.ts is mounted and fully written, but every query in it targets
 * community_news, a table that does not exist. getCommunityNews swallows the
 * error and returns [], so GET /api/news has been answering
 * {"success":true,"data":[],"total":0} — success, no news, no sign of a
 * problem — and POST /api/news/community 500s.
 *
 * Columns are taken from the two statements that use them: the SELECT in
 * getCommunityNews (id, title, content, category, image, location,
 * postal_code, posted_by, created_at, filtered on status = 'published') and
 * the INSERT in POST /community.
 *
 * status defaults to 'published' because that is what the insert passes
 * explicitly. Worth revisiting: this is user-submitted content going live with
 * no moderation step, and there is now a working content filter at
 * /api/ai/content-filter that could gate it.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS community_news (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(60),
      image TEXT,
      location VARCHAR(120),
      postal_code VARCHAR(10),
      posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // The list query filters on status and orders by created_at
  await db.query(`CREATE INDEX IF NOT EXISTS idx_community_news_feed ON community_news(status, created_at DESC)`);
  // ...and optionally narrows by postal_code for neighbourhood filtering
  await db.query(`CREATE INDEX IF NOT EXISTS idx_community_news_postal ON community_news(postal_code)`);

  // errandify_news is the other half of the same router — the Errandify-authored
  // feed, written by POST /api/news/errandify and read by getErrandifyNews.
  // Same story: queried in two places, created nowhere.
  await db.query(`
    CREATE TABLE IF NOT EXISTS errandify_news (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(60),
      image TEXT,
      source VARCHAR(120) DEFAULT 'Errandify Team',
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_errandify_news_feed ON errandify_news(status, created_at DESC)`);

  console.log('[032] ✅ community_news + errandify_news created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS community_news CASCADE');
  await db.query('DROP TABLE IF EXISTS errandify_news CASCADE');
}

if (process.argv[1] && process.argv[1].includes('032_community_news')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
