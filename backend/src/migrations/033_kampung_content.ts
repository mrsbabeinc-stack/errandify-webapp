import db from '../db.js';

/**
 * Migration 033 — MyKampung content, authored from Errandify admin.
 *
 * MyKampung reads four streams — posts, discussions, announcements and events —
 * from endpoints that did not exist, and falls back to placeholder content in
 * its own catch blocks, so the page always looked populated.
 *
 * The admin side existed too, and was worse than missing: CommunityFeed and
 * Events both persist to localStorage. An admin writing a post saved it to
 * their own browser, where no user could ever see it, and it vanished with the
 * cache. These tables are what connects the two ends.
 *
 * Columns are derived from what each page actually renders, so nothing is
 * stored that nothing displays:
 *   posts        author, author_rating, category, title, content, excerpt,
 *                likes, comments_count, read_time, moderation_status
 *   discussions  title, author, category, replies, views, last_updated
 *   announcements title, content, type, icon, is_pinned
 *   events       title, description, date, time, location, attendees, type
 *
 * isLiked and isAttending are per-viewer, not per-row, so they come from the
 * two join tables rather than a column — a boolean on the post would mean
 * "liked by whoever last looked at it".
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      author VARCHAR(120) NOT NULL,
      author_rating NUMERIC(3,2),
      category VARCHAR(60) NOT NULL DEFAULT 'tip',
      read_time INTEGER,
      likes INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0,
      moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved',
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON community_posts(status, created_at DESC)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS community_post_likes (
      post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (post_id, user_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS community_discussions (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      author VARCHAR(120) NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'general',
      replies INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_community_discussions_feed ON community_discussions(status, last_updated DESC)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'tip',
      icon VARCHAR(16),
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // Pinned first, then newest — the order the page renders them in
  await db.query(`CREATE INDEX IF NOT EXISTS idx_announcements_feed ON announcements(status, is_pinned DESC, created_at DESC)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS community_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      event_date DATE,
      event_time VARCHAR(40),
      location VARCHAR(200),
      type VARCHAR(20) NOT NULL DEFAULT 'meetup',
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_community_events_feed ON community_events(status, event_date)`);

  // Attendance is counted from this table rather than an attendees column, so
  // the number and the "are you going" flag can never disagree.
  await db.query(`
    CREATE TABLE IF NOT EXISTS community_event_attendees (
      event_id INTEGER NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (event_id, user_id)
    )
  `);

  console.log('[033] ✅ MyKampung content tables created');
}

export async function down() {
  for (const t of [
    'community_event_attendees',
    'community_events',
    'announcements',
    'community_discussions',
    'community_post_likes',
    'community_posts',
  ]) {
    await db.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
}

if (process.argv[1] && process.argv[1].includes('033_kampung_content')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
