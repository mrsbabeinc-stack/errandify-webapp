/**
 * Milestone Service
 * Tracks milestone achievements and awards bonus ad credits.
 *
 * Ported from MySQL to Postgres. The previous version used ? placeholders,
 * "double-quoted" string literals, a `tasks` table that does not exist, array
 * result access (result[0]) instead of result.rows, and subscription_milestones
 * columns (milestone_type, bonus_amount, bonus_applied, completed_at) that do
 * not match the real table (tier, milestone_threshold, reward_amount, achieved,
 * achieved_at). Every function threw, so no milestone was ever shown or awarded.
 *
 * "Tasks" for a milestone means jobs the company COMPLETED as a doer — counted
 * from company_orders with status 'completed'. The reward amounts match the
 * owner's tier spec.
 */

import db from '../db.js';
import { getCompanySubscription } from './subscriptionService.js';
import { addBonusCredits } from './adCreditService.js';

export interface Milestone {
  id: number;
  company_id: number;
  tier: string;
  milestone_threshold: number;
  reward_amount: number;
  achieved: boolean;
  achieved_at: string | null;
}

/** Milestones by tier — matches the canonical tier spec. Amounts in cents. */
const TIER_MILESTONES: Record<string, Array<{ tasks: number; bonus: number }>> = {
  silver: [
    { tasks: 50, bonus: 2000 }, // SGD $20
  ],
  gold: [
    { tasks: 50, bonus: 5000 }, // SGD $50
    { tasks: 100, bonus: 10000 }, // SGD $100
  ],
  platinum: [
    { tasks: 50, bonus: 10000 }, // SGD $100
    { tasks: 100, bonus: 20000 }, // SGD $200
    { tasks: 200, bonus: 50000 }, // SGD $500
  ],
};

/** The active tier for a company, or null. Active = no expiry, or not lapsed. */
async function activeTier(companyId: number): Promise<string | null> {
  const sub: any = await getCompanySubscription(companyId);
  if (!sub || !sub.subscription_tier) return null;
  if (sub.expires_at && new Date(sub.expires_at) <= new Date()) return null;
  return sub.subscription_tier;
}

/** Jobs this company has completed as a doer. */
async function completedTaskCount(companyId: number): Promise<number> {
  const r = await db.query(
    `SELECT COUNT(*)::int AS total FROM company_orders WHERE company_id = $1 AND status = 'completed'`,
    [companyId]
  );
  return Number(r.rows[0]?.total || 0);
}

/**
 * Check milestones — call this when a company completes a job. Awards any
 * milestone whose threshold the company has now reached and not yet been given.
 */
export async function checkMilestones(companyId: number): Promise<void> {
  const tier = await activeTier(companyId);
  if (!tier) return;

  const total = await completedTaskCount(companyId);
  for (const m of (TIER_MILESTONES[tier] || [])) {
    if (total >= m.tasks) {
      await awardMilestone(companyId, tier, m.tasks, m.bonus);
    }
  }
}

async function awardMilestone(companyId: number, tier: string, threshold: number, bonus: number): Promise<void> {
  // Idempotent: one row per (company, threshold).
  const existing = await db.query(
    `SELECT id FROM subscription_milestones WHERE company_id = $1 AND milestone_threshold = $2`,
    [companyId, threshold]
  );
  if (existing.rows.length > 0) return;

  await db.query(
    `INSERT INTO subscription_milestones
       (company_id, tier, milestone_threshold, reward_amount, achieved, achieved_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW(), NOW(), NOW())`,
    [companyId, tier, threshold, bonus / 100] // reward_amount is stored in dollars
  );

  // The bonus is ad credit. A failure here must not lose the milestone record.
  try {
    await addBonusCredits(companyId, bonus, `Milestone: ${threshold} tasks`);
  } catch (err) {
    console.error(`[Milestone] recorded ${threshold}-task milestone for company ${companyId} but crediting failed:`, err);
  }

  console.log(`🎉 Company ${companyId} hit ${threshold} tasks — SGD $${bonus / 100} bonus`);
}

/** Milestones a company has been awarded. */
export async function getMilestones(companyId: number): Promise<Milestone[]> {
  const r = await db.query(
    `SELECT * FROM subscription_milestones WHERE company_id = $1 ORDER BY achieved_at DESC NULLS LAST`,
    [companyId]
  );
  return r.rows;
}

/** The next milestone the company has not yet reached, or null. */
export async function getNextMilestone(companyId: number): Promise<{ tasks: number; bonus: number } | null> {
  const tier = await activeTier(companyId);
  if (!tier) return null;

  for (const m of (TIER_MILESTONES[tier] || [])) {
    const done = await db.query(
      `SELECT id FROM subscription_milestones WHERE company_id = $1 AND milestone_threshold = $2`,
      [companyId, m.tasks]
    );
    if (done.rows.length === 0) return { tasks: m.tasks, bonus: m.bonus };
  }
  return null;
}

/** Progress toward the next milestone, for the subscription screen. */
export async function getMilestoneProgress(companyId: number): Promise<{
  current_tasks: number;
  next_milestone: number | null;
  progress_percent: number;
}> {
  const tier = await activeTier(companyId);
  if (!tier) return { current_tasks: 0, next_milestone: null, progress_percent: 0 };

  const current = await completedTaskCount(companyId);
  const next = await getNextMilestone(companyId);
  if (!next) return { current_tasks: current, next_milestone: null, progress_percent: 100 };

  const progress = Math.floor((current / next.tasks) * 100);
  return { current_tasks: current, next_milestone: next.tasks, progress_percent: Math.min(progress, 99) };
}
