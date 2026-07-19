/**
 * Milestone Service
 * Tracks milestone achievements and awards bonus ad credits
 */

import db from '../db.js';
import { getCompanySubscription } from './subscriptionService.js';
import { addBonusCredits } from './adCreditService.js';

export interface Milestone {
  id: number;
  company_id: number;
  milestone_type: string;
  completed_at: string;
  bonus_amount: number;
  bonus_applied: boolean;
}

/**
 * Define milestones by tier
 */
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

/**
 * Check milestones when task is posted
 */
export async function checkMilestones(companyId: number): Promise<void> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription || subscription.status !== 'active') {
    return; // No active subscription
  }

  // Get total tasks posted
  const result = await db.query(
    'SELECT COUNT(*) as total FROM tasks WHERE company_id = ? AND status = "posted"',
    [companyId]
  );

  const totalTasks = result[0]?.total || 0;

  // Get tier milestones
  const milestones = TIER_MILESTONES[subscription.current_tier] || [];

  // Check each milestone
  for (const milestone of milestones) {
    if (totalTasks >= milestone.tasks) {
      await awardMilestone(
        companyId,
        `tasks_posted_${milestone.tasks}`,
        milestone.bonus
      );
    }
  }
}

/**
 * Award a milestone (add to database and bonus credits)
 */
async function awardMilestone(
  companyId: number,
  milestoneType: string,
  bonusAmount: number
): Promise<void> {
  // Check if already awarded
  const existing = await db.query(
    'SELECT id FROM subscription_milestones WHERE company_id = ? AND milestone_type = ?',
    [companyId, milestoneType]
  );

  if (existing.length > 0) {
    return; // Already awarded
  }

  // Create milestone record
  await db.query(
    `INSERT INTO subscription_milestones
     (company_id, milestone_type, completed_at, bonus_amount, bonus_applied, created_at)
     VALUES (?, ?, NOW(), ?, FALSE, NOW())`,
    [companyId, milestoneType, bonusAmount]
  );

  // Add bonus credits
  await addBonusCredits(companyId, bonusAmount, `Milestone: ${milestoneType}`);

  // Mark as applied
  await db.query(
    'UPDATE subscription_milestones SET bonus_applied = TRUE WHERE company_id = ? AND milestone_type = ?',
    [companyId, milestoneType]
  );

  const tasks = milestoneType.replace('tasks_posted_', '');
  console.log(`🎉 Awarded milestone: ${tasks} tasks. Bonus: SGD $${bonusAmount / 100}`);
}

/**
 * Get milestones for company
 */
export async function getMilestones(companyId: number): Promise<Milestone[]> {
  const result = await db.query(
    'SELECT * FROM subscription_milestones WHERE company_id = ? ORDER BY completed_at DESC',
    [companyId]
  );

  return result;
}

/**
 * Get next milestone for company
 */
export async function getNextMilestone(
  companyId: number
): Promise<{ tasks: number; bonus: number } | null> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription || subscription.status !== 'active') {
    return null;
  }

  // Get current task count
  const result = await db.query(
    'SELECT COUNT(*) as total FROM tasks WHERE company_id = ? AND status = "posted"',
    [companyId]
  );

  const totalTasks = result[0]?.total || 0;

  // Get tier milestones
  const milestones = TIER_MILESTONES[subscription.current_tier] || [];

  // Find next uncompleted milestone
  for (const milestone of milestones) {
    const completed = await db.query(
      'SELECT id FROM subscription_milestones WHERE company_id = ? AND milestone_type = ?',
      [companyId, `tasks_posted_${milestone.tasks}`]
    );

    if (completed.length === 0) {
      return {
        tasks: milestone.tasks,
        bonus: milestone.bonus,
      };
    }
  }

  return null; // All milestones completed
}

/**
 * Get milestone progress
 */
export async function getMilestoneProgress(companyId: number): Promise<{
  current_tasks: number;
  next_milestone: number | null;
  progress_percent: number;
}> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription || subscription.status !== 'active') {
    return {
      current_tasks: 0,
      next_milestone: null,
      progress_percent: 0,
    };
  }

  // Get current task count
  const result = await db.query(
    'SELECT COUNT(*) as total FROM tasks WHERE company_id = ? AND status = "posted"',
    [companyId]
  );

  const currentTasks = result[0]?.total || 0;

  // Get next milestone
  const next = await getNextMilestone(companyId);

  if (!next) {
    return {
      current_tasks: currentTasks,
      next_milestone: null,
      progress_percent: 100,
    };
  }

  const progress = Math.floor((currentTasks / next.tasks) * 100);

  return {
    current_tasks: currentTasks,
    next_milestone: next.tasks,
    progress_percent: Math.min(progress, 99), // Cap at 99 until reached
  };
}
