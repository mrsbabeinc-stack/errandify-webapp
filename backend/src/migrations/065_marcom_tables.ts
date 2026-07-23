import db from '../db.js';

/**
 * Migration 065 — storage for the Communications (Marcom) module.
 *
 * Numbered 057 originally, which collided with 057_finance_module. Nothing
 * tracks applied migrations in the database, so the two were reconciled by
 * hand and the finance one won: it applied in full while this one never ran at
 * all, leaving GET /api/banners and GET /api/recognitions to 500 against three
 * tables that did not exist. Renumbered to the next free slot so the pair
 * cannot be mistaken for one another again.
 *
 * Five of the ten Marcom screens kept everything in localStorage: email
 * campaigns, notification broadcasts and their audience groups, recognition
 * awards, and hero banners. A campaign written on one laptop did not exist on
 * another, and nothing an admin did there ever reached a user.
 *
 * admin.ts already had POST handlers aimed at `email_campaigns`,
 * `recognitions`, `hero_banners` and `event_reminders`. None of those tables
 * existed, and the statements used MySQL `?` placeholders against a Postgres
 * pool, so every one of them 500'd. The column names below deliberately follow
 * those statements where they were sensible, so the intent of that code
 * survives even though the code itself is replaced.
 *
 * Two decisions worth stating:
 *
 *  - Audience groups store a *rule* (`segment`), not a member list and not a
 *    frozen count. The old screen made up `userCount: Math.random() * 5000`.
 *    A count that is computed at read time is either right or obviously wrong;
 *    a stored one drifts silently.
 *
 *  - `email_logs` gains `campaign_id` so open and click rates come from
 *    delivery records. The screen previously displayed `openRate` fields that
 *    nothing ever wrote, so every campaign showed 0% — or, for the seeded
 *    demo row, an invented 42%.
 */
export async function up() {
  // ------------------------------------------------------------- campaigns
  await db.query(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id              SERIAL PRIMARY KEY,
      name            VARCHAR(200) NOT NULL,
      subject         VARCHAR(300) NOT NULL,
      content         TEXT NOT NULL,
      from_name       VARCHAR(120) NOT NULL DEFAULT 'Errandify',
      from_email      VARCHAR(200) NOT NULL DEFAULT 'noreply@errandify.com',
      segment         VARCHAR(40)  NOT NULL DEFAULT 'all-users',
      template_type   VARCHAR(40)  NOT NULL DEFAULT 'promotional',
      image_url       TEXT,
      image_alt       TEXT,
      status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
      scheduled_at    TIMESTAMP,
      sent_at         TIMESTAMP,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      sent_count      INTEGER NOT NULL DEFAULT 0,
      error_count     INTEGER NOT NULL DEFAULT 0,
      error_log       TEXT,
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status)`);

  // Ties a delivery record back to the campaign that produced it, so open and
  // click rates are counted rather than guessed.
  await db.query(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS campaign_id INTEGER`);
  await db.query(`
    DO $$ BEGIN
      ALTER TABLE email_logs
        ADD CONSTRAINT email_logs_campaign_id_fkey
        FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id)`);

  // ------------------------------------------------------ audience groups
  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_groups (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(120) NOT NULL,
      description TEXT,
      segment     VARCHAR(40) NOT NULL DEFAULT 'all-users',
      channels    TEXT[] NOT NULL DEFAULT ARRAY['push','inapp']::TEXT[],
      created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // The four groups the screen used to fabricate on first load. They are
  // configuration, not content: each is a name for a rule the backend already
  // knows how to evaluate. Seeded once, then owned by the admin.
  await db.query(`
    INSERT INTO notification_groups (name, description, segment, channels)
    SELECT * FROM (VALUES
      ('All Users',  'Every active account',                 'all-users', ARRAY['push','inapp','email']::TEXT[]),
      ('Doers',      'Anyone whose offer has been accepted', 'doers',     ARRAY['push','inapp']::TEXT[]),
      ('Askers',     'Anyone who has posted an errand',      'askers',    ARRAY['push','inapp']::TEXT[]),
      ('New Users',  'Joined in the last 30 days',           'new-users', ARRAY['push','inapp','email']::TEXT[])
    ) AS seed(name, description, segment, channels)
    WHERE NOT EXISTS (SELECT 1 FROM notification_groups)
  `);

  // --------------------------------------------------------- broadcasts
  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_broadcasts (
      id           SERIAL PRIMARY KEY,
      title        VARCHAR(255) NOT NULL,
      message      TEXT NOT NULL,
      type         VARCHAR(30) NOT NULL DEFAULT 'announcement',
      group_id     INTEGER REFERENCES notification_groups(id) ON DELETE SET NULL,
      segment      VARCHAR(40) NOT NULL DEFAULT 'all-users',
      channels     TEXT[] NOT NULL DEFAULT ARRAY['push','inapp']::TEXT[],
      status       VARCHAR(20) NOT NULL DEFAULT 'draft',
      scheduled_at TIMESTAMP,
      sent_at      TIMESTAMP,
      sent_count   INTEGER NOT NULL DEFAULT 0,
      error_count  INTEGER NOT NULL DEFAULT 0,
      error_log    TEXT,
      created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON notification_broadcasts(status)`);

  // -------------------------------------------------------- recognitions
  //
  // user_id, not a copied name. MyKampung's Hall of Stars renders whatever the
  // users row says, so an account that is later anonymised under PDPA s25
  // stops being named here without a second purge touching this table. The
  // free-text `reason` is the exception — it is written by an admin and can
  // contain a name, so accountDeletion clears it alongside the profile.
  await db.query(`
    CREATE TABLE IF NOT EXISTS recognitions (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      award           VARCHAR(160) NOT NULL,
      reason          TEXT NOT NULL,
      icon            VARCHAR(16) NOT NULL DEFAULT '🏅',
      visibility      VARCHAR(10) NOT NULL DEFAULT 'public',
      award_image_url TEXT,
      award_image_alt TEXT,
      awarded_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      awarded_at      TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_recognitions_visibility ON recognitions(visibility, awarded_at DESC)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS recognition_votes (
      recognition_id INTEGER NOT NULL REFERENCES recognitions(id) ON DELETE CASCADE,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (recognition_id, user_id)
    )
  `);

  // --------------------------------------------------------- hero banners
  await db.query(`
    CREATE TABLE IF NOT EXISTS hero_banners (
      id               SERIAL PRIMARY KEY,
      title            VARCHAR(200) NOT NULL,
      subtitle         VARCHAR(300),
      emoji            VARCHAR(16) NOT NULL DEFAULT '📢',
      image_url        TEXT,
      cta_text         VARCHAR(80) NOT NULL,
      cta_link         VARCHAR(300) NOT NULL DEFAULT '/browse',
      display_location VARCHAR(60) NOT NULL DEFAULT 'home',
      status           VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      active_from      TIMESTAMP,
      active_to        TIMESTAMP,
      created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_hero_banners_live ON hero_banners(display_location, status)`
  );

  // ------------------------------------------------------ event reminders
  //
  // community_events.reminders_sent (added in 038) is a single boolean, which
  // cannot express "the 7-day went out but the 24-hour has not". One row per
  // event per reminder kind, unique, so a double-click or a re-run of the
  // scheduler cannot mail the same attendees twice.
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_reminder_log (
      id         SERIAL PRIMARY KEY,
      event_id   INTEGER NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
      kind       VARCHAR(20) NOT NULL,
      sent_count INTEGER NOT NULL DEFAULT 0,
      sent_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      sent_at    TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (event_id, kind)
    )
  `);

  console.log('[065] ✅ Marcom tables ready');
}

export async function down() {
  await db.query(`DROP TABLE IF EXISTS event_reminder_log`);
  await db.query(`DROP TABLE IF EXISTS hero_banners`);
  await db.query(`DROP TABLE IF EXISTS recognition_votes`);
  await db.query(`DROP TABLE IF EXISTS recognitions`);
  await db.query(`DROP TABLE IF EXISTS notification_broadcasts`);
  await db.query(`DROP TABLE IF EXISTS notification_groups`);
  await db.query(`ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_campaign_id_fkey`);
  await db.query(`ALTER TABLE email_logs DROP COLUMN IF EXISTS campaign_id`);
  await db.query(`DROP TABLE IF EXISTS email_campaigns`);
}

if (process.argv[1] && process.argv[1].includes('065_marcom_tables')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
