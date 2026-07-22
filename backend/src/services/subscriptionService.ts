/**
 * Subscription Service
 * Handles subscription lifecycle: upgrade, downgrade, cancel
 */

import db from '../db.js';

export interface SubscriptionTier {
  id: number;
  name: string;
  commission_rate: number;
  ad_credit_monthly: number;
  ep_multiplier: number;
  max_team_members: number;
  price_monthly: number;
  price_annual: number;
}

export interface CompanySubscription {
  id: number;
  company_id: number;
  current_tier: string;
  billing_type: 'monthly' | 'annual';
  status: string;
  billing_date: string;
  renewal_date: string;
  pending_tier?: string;
  pending_effective_date?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get subscription tier configuration
 */
export async function getTierConfig(tierName: string): Promise<SubscriptionTier> {
  const result = await db.query(
    'SELECT * FROM subscription_tiers WHERE name = $1',
    [tierName]
  );

  if (result.rows.length === 0) {
    throw new Error(`Tier not found: ${tierName}`);
  }

  return result.rows[0];
}

/**
 * Get company's current subscription
 */
export async function getCompanySubscription(companyId: number): Promise<CompanySubscription | null> {
  const result = await db.query(
    'SELECT * FROM company_subscriptions WHERE company_id = $1',
    [companyId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get commission rate for company
 * Returns subscription tier rate if active, else 20% (free)
 */
export async function getCommissionRate(companyId: number): Promise<number> {
  const subscription = await getCompanySubscription(companyId);

  // No free tier exists — a company without an active subscription row is
  // mid-signup, not on a free plan, so it gets the entry (silver) rate rather
  // than the 20% individual rate.
  if (!subscription || subscription.status !== 'active') {
    const silver = await getTierConfig('silver');
    return Number(silver.commission_rate);
  }

  const tier = await getTierConfig(subscription.current_tier);
  return Number(tier.commission_rate);
}

/**
 * Get EP multiplier for company
 * Returns subscription tier multiplier if active, else 1x
 */
export async function getEpMultiplier(companyId: number): Promise<number> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription || subscription.status !== 'active') {
    return 1; // Free tier
  }

  const tier = await getTierConfig(subscription.current_tier);
  return tier.ep_multiplier;
}

/**
 * Get max team members for company
 */
export async function getMaxTeamMembers(companyId: number): Promise<number> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription || subscription.status !== 'active') {
    return 1; // Free tier: solo only
  }

  const tier = await getTierConfig(subscription.current_tier);
  return tier.max_team_members;
}

/**
 * Create new subscription (after Stripe payment)
 */
export async function createSubscription(
  companyId: number,
  tier: string,
  billingType: 'monthly' | 'annual',
  stripeSubscriptionId: string,
  stripeCustomerId: string
): Promise<CompanySubscription> {
  const now = new Date();
  const billingDate = now.getDate();

  let renewalDate = new Date(now);
  if (billingType === 'monthly') {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  } else {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  }

  const result = await db.query(
    `INSERT INTO company_subscriptions
     (company_id, current_tier, billing_type, status, billing_date, renewal_date, stripe_subscription_id, stripe_customer_id, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, NOW(), NOW())`,
    [companyId, tier, billingType, billingDate, renewalDate, stripeSubscriptionId, stripeCustomerId]
  );

  return getCompanySubscription(companyId) as Promise<CompanySubscription>;
}

/**
 * Upgrade subscription (immediate)
 * Charges difference for remaining period
 */
export async function upgradeSubscription(
  companyId: number,
  newTier: string
): Promise<CompanySubscription> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  // Update to new tier immediately
  await db.query(
    'UPDATE company_subscriptions SET current_tier = $1, updated_at = NOW() WHERE company_id = $2',
    [newTier, companyId]
  );

  // Log upgrade
  console.log(`✅ Upgraded company ${companyId} to ${newTier} tier`);

  return getCompanySubscription(companyId) as Promise<CompanySubscription>;
}

/**
 * Schedule downgrade (takes effect at month-end or renewal)
 */
export async function scheduleDowngrade(
  companyId: number,
  newTier: string
): Promise<CompanySubscription> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  let effectiveDate = new Date();

  if (subscription.billing_type === 'monthly') {
    // Month-end for monthly
    effectiveDate = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0);
  } else {
    // Renewal date for annual
    effectiveDate = new Date(subscription.renewal_date);
  }

  await db.query(
    `UPDATE company_subscriptions
     SET pending_tier = $1, pending_effective_date = $2, status = 'downgrade_pending', updated_at = NOW()
     WHERE company_id = $3`,
    [newTier, effectiveDate, companyId]
  );

  console.log(`📋 Scheduled downgrade for company ${companyId} to ${newTier} on ${effectiveDate}`);

  return getCompanySubscription(companyId) as Promise<CompanySubscription>;
}

/**
 * Apply pending downgrade (called by cron job)
 */
export async function applyPendingDowngrade(companyId: number): Promise<void> {
  await db.query(
    `UPDATE company_subscriptions
     SET current_tier = pending_tier,
         pending_tier = NULL,
         pending_effective_date = NULL,
         status = 'active',
         updated_at = NOW()
     WHERE company_id = $1 AND status = 'downgrade_pending' AND pending_effective_date <= NOW()`,
    [companyId]
  );

  console.log(`✅ Applied downgrade for company ${companyId}`);
}

/**
 * Cancel subscription (for annual: refund after 30 days)
 */
export async function cancelSubscription(
  companyId: number,
  reason?: string
): Promise<CompanySubscription> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  let effectiveDate = new Date();

  if (subscription.billing_type === 'monthly') {
    // Month-end for monthly
    effectiveDate = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0);
  } else {
    // Immediately for annual (but check 30-day window for refunds)
    const createdDate = new Date(subscription.created_at);
    const daysSinceSubscription = Math.floor(
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSubscription < 30) {
      // Full refund - process immediately
      console.log(`💰 Full refund eligible (${daysSinceSubscription} days)`);
    } else {
      // Pro-rata refund
      const daysRemaining = Math.ceil(
        (new Date(subscription.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      console.log(`💰 Pro-rata refund eligible (${daysRemaining} days remaining)`);
    }
  }

  await db.query(
    `UPDATE company_subscriptions
     SET status = 'canceled', current_tier = 'free', updated_at = NOW()
     WHERE company_id = $1`,
    [companyId]
  );

  console.log(`❌ Canceled subscription for company ${companyId}`);

  return getCompanySubscription(companyId) as Promise<CompanySubscription>;
}

/**
 * Cron job: Apply all pending downgrades
 */
export async function processPendingDowngrades(): Promise<void> {
  const pending = await db.query(
    `SELECT company_id FROM company_subscriptions
     WHERE status = 'downgrade_pending' AND pending_effective_date <= NOW()`
  );

  for (const record of pending.rows) {
    await applyPendingDowngrade(record.company_id);
  }

  console.log(`✅ Processed ${pending.rows.length} pending downgrades`);
}
