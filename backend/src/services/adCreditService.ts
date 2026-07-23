/**
 * Ad Credit Service
 * Manages monthly ad credit allocation and usage tracking
 */

import db from '../db.js';
import { getTierConfig, getCompanySubscription } from './subscriptionService.js';

export interface AdCredit {
  id: number;
  company_id: number;
  month: string;
  allocated_amount: number;
  used_amount: number;
  available_amount: number;
  expires_at: string;
  created_at: string;
}

/**
 * Get current month key (e.g., "June-2026")
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[now.getMonth()]}-${now.getFullYear()}`;
}

/**
 * Get end of current month
 */
function getEndOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

/**
 * Allocate monthly ad credits (called by cron on 1st of month)
 */
export async function allocateMonthlyCredits(companyId?: number): Promise<number> {
  const expiresAt = getEndOfMonth();

  // cs.current_tier and cs.status do not exist — the join and filter both
  // silently matched nothing, so no company was ever allocated its monthly ad
  // credits ($50 / $200 / $500 by tier). The real columns are subscription_tier
  // and expires_at (active = no expiry, or not yet lapsed).
  let query = `
    SELECT cs.company_id, st.ad_credit_monthly
    FROM company_subscriptions cs
    JOIN subscription_tiers st ON cs.subscription_tier = st.name
    WHERE (cs.expires_at IS NULL OR cs.expires_at > NOW())
  `;

  const params: any[] = [];
  if (companyId) {
    query += ` AND cs.company_id = $1`;
    params.push(companyId);
  }

  const result = await db.query(query, params);
  const subscriptions = result.rows || [];

  let allocated = 0;

  for (const sub of subscriptions) {
    // Insert or update ad credits for this company
    await db.query(
      `INSERT INTO subscription_ad_credits (company_id, amount, spent, expires_at, created_at)
       VALUES ($1, $2, COALESCE(0, 0), $3, NOW())
       ON CONFLICT (company_id) DO UPDATE SET amount = EXCLUDED.amount, expires_at = EXCLUDED.expires_at`,
      [sub.company_id, sub.ad_credit_monthly, expiresAt]
    );

    allocated++;
    console.log(`✅ Allocated SGD $${sub.ad_credit_monthly / 100} credits to company ${sub.company_id}`);
  }

  return allocated;
}

/**
 * Get current month's ad credits for company
 */
export async function getCredits(companyId: number): Promise<AdCredit | null> {
  const result = await db.query(
    `SELECT id, company_id, amount as allocated_amount, spent as used_amount,
            (amount - COALESCE(spent, 0)) as available_amount,
            expires_at, created_at
     FROM subscription_ad_credits
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [companyId]
  );

  if (result.rows && result.rows.length === 0) {
    return null;
  }

  return result.rows?.[0] || null;
}

/**
 * Deduct credits when campaign is created
 */
export async function deductCredits(
  companyId: number,
  amountCents: number
): Promise<boolean> {
  const credits = await getCredits(companyId);

  if (!credits) {
    throw new Error('No ad credits allocated for this month');
  }

  if (credits.available_amount < amountCents) {
    throw new Error(
      `Insufficient ad credits. Available: SGD $${credits.available_amount / 100}, Required: SGD $${amountCents / 100}`
    );
  }

  // Deduct from spent column
  await db.query(
    'UPDATE subscription_ad_credits SET spent = spent + $1 WHERE company_id = $2',
    [amountCents, companyId]
  );

  console.log(`💳 Deducted SGD $${amountCents / 100} from company ${companyId}`);

  return true;
}

/**
 * Refund credits when campaign is deleted/paused
 */
export async function refundCredits(
  companyId: number,
  amountCents: number
): Promise<void> {
  const credits = await getCredits(companyId);

  if (!credits) {
    console.warn(`No active credits to refund for company ${companyId}`);
    return;
  }

  const newSpentAmount = Math.max(0, (credits.used_amount || 0) - amountCents);

  await db.query(
    'UPDATE subscription_ad_credits SET spent = $1 WHERE company_id = $2',
    [newSpentAmount, companyId]
  );

  console.log(`💸 Refunded SGD $${amountCents / 100} to company ${companyId}`);
}

/**
 * Add bonus credits (e.g., from milestone achievement)
 */
export async function addBonusCredits(
  companyId: number,
  bonusAmountCents: number,
  reason: string
): Promise<void> {
  // Check if allocation exists, if not create it
  const existing = await db.query(
    'SELECT id FROM subscription_ad_credits WHERE company_id = $1',
    [companyId]
  );

  if ((existing.rows || []).length === 0) {
    const expiresAt = getEndOfMonth();
    await db.query(
      `INSERT INTO subscription_ad_credits (company_id, amount, spent, expires_at, created_at)
       VALUES ($1, $2, 0, $3, NOW())`,
      [companyId, bonusAmountCents, expiresAt]
    );
  } else {
    // Add to existing allocation
    await db.query(
      'UPDATE subscription_ad_credits SET amount = amount + $1 WHERE company_id = $2',
      [bonusAmountCents, companyId]
    );
  }

  console.log(`🎁 Added SGD $${bonusAmountCents / 100} bonus to company ${companyId} (${reason})`);
}

/**
 * Get credit history for company
 */
export async function getCreditHistory(
  companyId: number,
  limit: number = 12
): Promise<AdCredit[]> {
  const result = await db.query(
    `SELECT id, company_id, amount as allocated_amount, spent as used_amount,
            (amount - COALESCE(spent, 0)) as available_amount,
            expires_at, created_at
     FROM subscription_ad_credits
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [companyId, limit]
  );

  return result.rows || [];
}

/**
 * Cron job: Expire old credits at end of month
 */
export async function expireOldCredits(): Promise<number> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const result = await db.query(
    'UPDATE subscription_ad_credits SET updated_at = NOW() WHERE expires_at <= $1',
    [today]
  );

  console.log(`⏰ Expired old ad credits`);

  return result.rowCount || 0;
}
