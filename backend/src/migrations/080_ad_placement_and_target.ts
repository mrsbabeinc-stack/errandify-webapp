import db from '../db.js';

/**
 * Migration 080 — give a paid ad somewhere to point and a slot to live in.
 *
 * The campaign wizard asks the buyer for two things it then throws away:
 *
 *   - **which ad type** they are buying (`hero-banner` or `in-feed-ads`), and
 *   - **where the ad should send people** (their website, Instagram, Facebook
 *     or TikTok — the wizard even AI-validates the URL).
 *
 * `CompanyAdvertisingManagement.handleCampaignSubmit` posts only title,
 * description, image_url, budget and dates, so both were dropped in the
 * browser before the API ever saw them — and `campaigns` had no column for
 * either. A paid hero banner therefore had no action button target, which is
 * the entire point of buying one.
 *
 * `startCampaign` compounded it by inserting four hardcoded placement rows
 * (`homepage_banner`, `browse_sidebar`, `email_newsletter`, `company_profile`)
 * that match neither the two types the wizard sells nor the four locations
 * Marcom banners use. Three vocabularies for one concept, none aligned — which
 * is why no ordering between paid and own content could have been right.
 *
 * This settles on the vocabulary the customer actually buys in, because that
 * is the one with money attached.
 *
 * Additive and nullable; `placement_type` defaults to the type the wizard
 * leads with, so existing draft campaigns keep working.
 */
export async function up() {
  await db.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_url TEXT`);
  await db.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_url_type VARCHAR(20)`);
  await db.query(
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS placement_type VARCHAR(30) NOT NULL DEFAULT 'hero-banner'`
  );
  await db.query(
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cta_text VARCHAR(60) NOT NULL DEFAULT 'Learn More'`
  );

  /**
   * Serving picks the live campaign with the largest share-of-voice deficit,
   * so it filters on status and the date window on every page load.
   */
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_campaigns_serving
       ON campaigns(placement_type, status, starts_at, ends_at)`
  );

  // One metrics row per campaign per placement; the rotation reads impressions
  // from here, so a duplicate would split a campaign's delivery figures in two
  // and it would be over-served forever.
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_placements_unique
       ON ad_placements(campaign_id, placement_type)`
  );

  console.log('[080] ✅ campaigns carry a target URL, CTA and placement type');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_ad_placements_unique`);
  await db.query(`DROP INDEX IF EXISTS idx_campaigns_serving`);
  for (const c of ['target_url', 'target_url_type', 'placement_type', 'cta_text']) {
    await db.query(`ALTER TABLE campaigns DROP COLUMN IF EXISTS ${c}`);
  }
}

if (process.argv[1] && process.argv[1].includes('080_ad_placement_and_target')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
