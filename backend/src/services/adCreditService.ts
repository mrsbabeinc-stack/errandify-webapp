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
  const now = new Date();
  const monthKey = getCurrentMonthKey();
  const expiresAt = getEndOfMonth();

  let query = `
    SELECT cs.company_id, st.ad_credit_monthly
    FROM company_subscriptions cs
    JOIN subscription_tiers st ON cs.current_tier = st.name
    WHERE cs.status = 'active'
  `;

  if (companyId) {
    query += ` AND cs.company_id = ${companyId}`;
  }

  const subscriptions = await db.query(query);

  let allocated = 0;

  for (const sub of subscriptions) {
    // Check if already allocated this month
    const existing = await db.query(
      'SELECT id FROM subscription_ad_credits WHERE company_id = ? AND month = ?',
      [sub.company_id, monthKey]
    );

    if (existing.length === 0) {
      // Allocate new credits
      await db.query(
        `INSERT INTO subscription_ad_credits
         (company_id, month, allocated_amount, used_amount, expires_at, created_at)
         VALUES (?, ?, ?, 0, ?, NOW())`,
        [sub.company_id, monthKey, sub.ad_credit_monthly, expiresAt]
      );

      allocated++;
      console.log(`✅ Allocated ${sub.ad_credit_monthly / 100} credits to company ${sub.company_id}`);
    }
  }

  return allocated;
}

/**
 * Get current month's ad credits for company
 */
export async function getCredits(companyId: number): Promise<AdCredit | null> {
  const monthKey = getCurrentMonthKey();

  const result = await db.query(
    `SELECT *,
            (allocated_amount - used_amount) as available_amount
     FROM subscription_ad_credits
     WHERE company_id = ? AND month = ?`,
    [companyId, monthKey]
  );

  if (result.length === 0) {
    return null;
  }

  return result[0];
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

  // Deduct from used_amount
  await db.query(
    'UPDATE subscription_ad_credits SET used_amount = used_amount + ? WHERE company_id = ? AND month = ?',
    [amountCents, companyId, getCurrentMonthKey()]
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

  const newUsedAmount = Math.max(0, credits.used_amount - amountCents);

  await db.query(
    'UPDATE subscription_ad_credits SET used_amount = ? WHERE company_id = ? AND month = ?',
    [newUsedAmount, companyId, getCurrentMonthKey()]
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
  const monthKey = getCurrentMonthKey();

  // Check if allocation exists, if not create it
  const existing = await db.query(
    'SELECT id FROM subscription_ad_credits WHERE company_id = ? AND month = ?',
    [companyId, monthKey]
  );

  if (existing.length === 0) {
    const expiresAt = getEndOfMonth();
    await db.query(
      `INSERT INTO subscription_ad_credits
       (company_id, month, allocated_amount, used_amount, expires_at, created_at)
       VALUES (?, ?, ?, 0, ?, NOW())`,
      [companyId, monthKey, bonusAmountCents, expiresAt]
    );
  } else {
    // Add to existing allocation
    await db.query(
      'UPDATE subscription_ad_credits SET allocated_amount = allocated_amount + ? WHERE company_id = ? AND month = ?',
      [bonusAmountCents, companyId, monthKey]
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
    `SELECT *,
            (allocated_amount - used_amount) as available_amount
     FROM subscription_ad_credits
     WHERE company_id = ?
     ORDER BY month DESC
     LIMIT ?`,
    [companyId, limit]
  );

  return result;
}

/**
 * Cron job: Expire old credits at end of month
 */
export async function expireOldCredits(): Promise<number> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const result = await db.query(
    'UPDATE subscription_ad_credits SET updated_at = NOW() WHERE expires_at <= ?',
    [today]
  );

  console.log(`⏰ Expired old ad credits`);

  return result.affectedRows || 0;
}
