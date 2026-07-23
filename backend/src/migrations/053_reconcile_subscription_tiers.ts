import db from '../db.js';

/**
 * Make the subscription tiers consistent, and give the write path the columns
 * it was always coded against.
 *
 * The tier names were fragmented three ways:
 *   subscription_tiers (the rate config)  -> silver, gold, platinum   (canonical)
 *   company_subscriptions CHECK            -> free, basic, premium, enterprise
 *   the one data row                       -> premium
 * The rate config and the pricing memo agree on silver/gold/platinum, confirmed
 * by the owner, so that is made canonical everywhere.
 *
 * The only data is company 3, the demo company, with a bare 'premium' seed
 * (no price, no dates). Mapped to 'platinum' — the top tier — so the demo has
 * full features. Reversible.
 *
 * Also adds the three columns the create/upgrade/downgrade code references but
 * the table never had: pending_tier and pending_effective_date (scheduled
 * downgrades) and stripe_subscription_id (the Stripe link). With these plus the
 * column renames handled in code, that write path can work.
 */

const OLD_TO_NEW: Record<string, string> = {
  premium: 'platinum',
  enterprise: 'platinum',
  basic: 'silver',
  free: 'silver',
};

export async function up(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Drop both old constraints so the data can be remapped without tripping
    // them. companies.subscription_status is a denormalised mirror of the tier,
    // with the same old-scheme constraint.
    await client.query(`ALTER TABLE company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_subscription_tier_check`);
    await client.query(`ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_status_check`);

    for (const [oldName, newName] of Object.entries(OLD_TO_NEW)) {
      await client.query(
        `UPDATE company_subscriptions SET subscription_tier = $1 WHERE subscription_tier = $2`,
        [newName, oldName]
      );
      await client.query(
        `UPDATE companies SET subscription_status = $1 WHERE subscription_status = $2`,
        [newName, oldName]
      );
    }

    // New constraints: only the canonical tiers. The companies mirror also
    // allows NULL, for a company with no subscription yet.
    await client.query(`
      ALTER TABLE company_subscriptions
        ADD CONSTRAINT company_subscriptions_subscription_tier_check
        CHECK (subscription_tier IN ('silver', 'gold', 'platinum'))
    `);
    await client.query(`
      ALTER TABLE companies
        ADD CONSTRAINT companies_subscription_status_check
        CHECK (subscription_status IS NULL OR subscription_status IN ('silver', 'gold', 'platinum'))
    `);
    // The column defaulted to 'free', which the new constraint rejects — that
    // would break every new company insert. No free tier exists, so a company
    // with no subscription is simply NULL.
    await client.query(`ALTER TABLE companies ALTER COLUMN subscription_status SET DEFAULT NULL`);

    // Columns the write path needs.
    await client.query(`
      ALTER TABLE company_subscriptions
        ADD COLUMN IF NOT EXISTS pending_tier           VARCHAR(20),
        ADD COLUMN IF NOT EXISTS pending_effective_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)
    `);
    await client.query(`
      ALTER TABLE company_subscriptions
        ADD CONSTRAINT company_subscriptions_pending_tier_check
        CHECK (pending_tier IS NULL OR pending_tier IN ('silver', 'gold', 'platinum'))
    `);

    await client.query('COMMIT');
    console.log('[053] subscription tiers reconciled to silver/gold/platinum; write-path columns added');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function down(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_pending_tier_check`);
    await client.query(`
      ALTER TABLE company_subscriptions
        DROP COLUMN IF EXISTS pending_tier,
        DROP COLUMN IF EXISTS pending_effective_date,
        DROP COLUMN IF EXISTS stripe_subscription_id
    `);
    await client.query(`ALTER TABLE company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_subscription_tier_check`);
    await client.query(`ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_status_check`);
    // Map the demo row back so the old constraints would accept it again.
    await client.query(`UPDATE company_subscriptions SET subscription_tier = 'premium' WHERE subscription_tier = 'platinum'`);
    await client.query(`UPDATE companies SET subscription_status = 'premium' WHERE subscription_status = 'platinum'`);
    await client.query(`
      ALTER TABLE company_subscriptions
        ADD CONSTRAINT company_subscriptions_subscription_tier_check
        CHECK (subscription_tier IN ('free','basic','premium','enterprise'))
    `);
    await client.query(`
      ALTER TABLE companies
        ADD CONSTRAINT companies_subscription_status_check
        CHECK (subscription_status IN ('free','basic','premium','enterprise'))
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
