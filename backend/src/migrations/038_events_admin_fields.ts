import db from '../db.js';

/**
 * Migration 038 — carry the admin event fields on community_events.
 *
 * 033 created community_events from what MyKampung renders. The admin Events
 * screen models considerably more: it runs signups against a capacity, closes
 * them at a cutoff, charges a cost, and distinguishes online from offline.
 * Wiring that screen to the smaller table would have silently dropped all of
 * it — an admin would set a $15 cost and a 50-person cap and neither would be
 * stored.
 *
 * Two things called "type" meet here and they are not the same axis:
 *   admin      online | offline            — how you attend
 *   MyKampung  workshop | webinar | meetup | competition  — what it is
 * So the admin value goes to a new `format` column and `type` keeps its
 * existing meaning. Collapsing them would have made "online" a kind of event.
 *
 * Status vocabulary follows the admin's (draft/active/cancelled/completed),
 * since that is where events are authored and it carries states the reader
 * never needed. Rows created before this run used 'published', so those are
 * mapped to 'active' rather than left invisible.
 */
export async function up() {
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS format VARCHAR(20) NOT NULL DEFAULT 'offline'`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS online_link TEXT`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS end_time VARCHAR(40)`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS cutoff_date DATE`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS cutoff_time VARCHAR(40)`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS min_pax INTEGER`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS max_pax INTEGER`);
  await db.query(`ALTER TABLE community_events ADD COLUMN IF NOT EXISTS reminders_sent BOOLEAN NOT NULL DEFAULT FALSE`);

  // Anything already stored under the old vocabulary stays visible
  await db.query(`UPDATE community_events SET status = 'active' WHERE status = 'published'`);

  console.log('[038] ✅ community_events carries admin event fields');
}

export async function down() {
  for (const c of ['format', 'online_link', 'end_time', 'cutoff_date', 'cutoff_time',
                   'cost', 'min_pax', 'max_pax', 'reminders_sent']) {
    await db.query(`ALTER TABLE community_events DROP COLUMN IF EXISTS ${c}`);
  }
}

if (process.argv[1] && process.argv[1].includes('038_events_admin_fields')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
