import db from '../db.js';
import { createNotification } from '../routes/notifications.js';

/**
 * Automated Dispute Resolution Service
 * 3-tier system:
 * Level 1: Auto-resolve clear cases (non-response, obvious refund scenarios)
 * Level 2: AI evaluation + human escalation (AI predicts, human confirms)
 * Level 3: Manual review (complex edge cases)
 */

export interface DisputeResolution {
  level: 1 | 2 | 3;
  decision: 'auto_refund' | 'auto_hold' | 'escalate_human' | 'escalate_ai';
  reason: string;
  refundAmount?: number;
  confidence?: number; // 0-100 for AI decisions
}

/**
 * Check if dispute qualifies for Level 1 auto-resolution
 * Rules:
 * - Non-response (48h+): Auto-refund to asker
 * - Completed but unrated (72h+): Auto-release payment
 * - Obvious categorization based on reason
 */
export async function checkAutoResolution(disputeId: number, taskId: number): Promise<DisputeResolution | null> {
  try {
    const disputeResult = await db.query(
      `SELECT d.*, e.status, e.budget, e.completed_at, e.created_at
       FROM disputes d
       JOIN errands e ON d.task_id = e.id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (disputeResult.rows.length === 0) {
      return null;
    }

    const dispute = disputeResult.rows[0];
    const now = new Date();
    const createdAt = new Date(dispute.created_at);
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Level 1 Auto-Resolve Rule 1: Non-response after 48 hours
    if (dispute.reason === 'non_response' && hoursElapsed >= 48) {
      return {
        level: 1,
        decision: 'auto_refund',
        reason: 'Non-response dispute after 48 hours - auto-refund to asker',
        refundAmount: dispute.budget,
      };
    }

    // Level 1 Auto-Resolve Rule 2: Work done but not rated (72h+)
    if (dispute.status === 'completed_unconfirmed' && hoursElapsed >= 72) {
      // Auto-release payment to doer (work was done)
      return {
        level: 1,
        decision: 'auto_hold',
        reason: 'Completed work not rated after 72 hours - auto-release to doer',
        refundAmount: dispute.budget,
      };
    }

    // Level 1 Auto-Resolve Rule 3: Obvious refund scenarios
    const obviousRefundReasons = ['work_not_done', 'non_response', 'ghosted'];
    if (obviousRefundReasons.includes(dispute.reason)) {
      return {
        level: 1,
        decision: 'auto_refund',
        reason: `Obvious refund case: ${dispute.reason} - auto-refund to asker`,
        refundAmount: dispute.budget,
      };
    }

    return null;
  } catch (error) {
    console.error('Auto-resolution check error:', error);
    return null;
  }
}

/**
 * Apply auto-resolution decision
 * Handles payment refunds/releases and notifications
 */
export async function applyAutoResolution(
  disputeId: number,
  taskId: number,
  resolution: DisputeResolution
): Promise<boolean> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get dispute and task details
    const disputeResult = await client.query(
      `SELECT d.*, e.asker_id, e.budget FROM disputes d
       JOIN errands e ON d.task_id = e.id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (disputeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const dispute = disputeResult.rows[0];

    // Determine who gets the refund
    if (resolution.decision === 'auto_refund') {
      // Refund to asker (work not done case)
      await client.query(
        `UPDATE users SET errandify_points = errandify_points + $1 WHERE id = $2`,
        [resolution.refundAmount, dispute.asker_id]
      );

      // Log refund transaction
      await client.query(
        `INSERT INTO ep_transactions (user_id, transaction_type, points_change, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [dispute.asker_id, 'dispute_auto_refund', resolution.refundAmount, `Auto-refund for dispute #${disputeId}`]
      );

      // Update dispute status
      await client.query(
        `UPDATE disputes SET status = $1, resolution = $2, updated_at = NOW() WHERE id = $3`,
        [resolution.level === 1 ? 'auto_resolved_l1' : 'auto_resolved_l2', resolution.reason, disputeId]
      );

      // Update task status
      await client.query(
        `UPDATE errands SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['cancelled', taskId]
      );

      // Notify asker
      await createNotification(
        dispute.asker_id,
        'dispute_resolved',
        '✓ Dispute Resolved',
        `Your dispute was auto-resolved. Refund of ${resolution.refundAmount} EP applied.`,
        { disputeId, taskId, refundAmount: resolution.refundAmount }
      ).catch(console.error);
    }

    if (resolution.decision === 'auto_hold') {
      // Release payment to doer (work was done)
      const doerResult = await client.query(
        `SELECT doer_id FROM errand_assignments WHERE errand_id = $1`,
        [taskId]
      );

      if (doerResult.rows.length > 0) {
        const doerId = doerResult.rows[0].doer_id;

        await client.query(
          `UPDATE users SET errandify_points = errandify_points + $1 WHERE id = $2`,
          [resolution.refundAmount, doerId]
        );

        // Log payment transaction
        await client.query(
          `INSERT INTO ep_transactions (user_id, transaction_type, points_change, description, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [doerId, 'dispute_auto_release', resolution.refundAmount, `Auto-release for dispute #${disputeId}`]
        );

        // Notify doer
        await createNotification(
          doerId,
          'dispute_resolved',
          '✓ Dispute Resolved',
          `Your payment of ${resolution.refundAmount} EP was auto-released.`,
          { disputeId, taskId, paymentAmount: resolution.refundAmount }
        ).catch(console.error);
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Apply auto-resolution error:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Check if dispute needs escalation to human review
 * Factors: Evidence quality, complexity, urgency
 */
export async function checkEscalation(disputeId: number): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT d.*, e.budget FROM disputes d
       JOIN errands e ON d.task_id = e.id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const dispute = result.rows[0];

    // Escalate if: High value (>$100), complex reason, has evidence
    const complexReasons = ['quality_issue', 'safety_concern', 'partial_work', 'dispute'];
    const highValue = dispute.budget > 100;
    const hasEvidence = !!dispute.evidence;

    if (highValue || complexReasons.includes(dispute.reason) || hasEvidence) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Escalation check error:', error);
    return false;
  }
}

/**
 * Mark dispute for Level 2 (AI + Human) review
 */
export async function escalateToReview(
  disputeId: number,
  reason: string
): Promise<boolean> {
  try {
    const result = await db.query(
      `UPDATE disputes SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3
       RETURNING id`,
      ['escalate_review', reason, disputeId]
    );

    if (result.rows.length > 0) {
      // Could trigger AI evaluation here
      // For now, just mark for human review
      console.log(`[Dispute ${disputeId}] Escalated to Level 2 review: ${reason}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Escalation error:', error);
    return false;
  }
}

/**
 * Batch process disputes for auto-resolution
 * Called periodically (e.g., every 6 hours)
 */
export async function batchProcessDisputes(): Promise<{ processed: number; resolved: number }> {
  try {
    // Get open disputes
    const result = await db.query(
      `SELECT id, task_id FROM disputes WHERE status = 'open' ORDER BY created_at ASC LIMIT 100`
    );

    let resolved = 0;

    for (const dispute of result.rows) {
      // Check for auto-resolution
      const autoResolution = await checkAutoResolution(dispute.id, dispute.task_id);

      if (autoResolution && autoResolution.level === 1) {
        // Apply Level 1 resolution
        const applied = await applyAutoResolution(dispute.id, dispute.task_id, autoResolution);
        if (applied) {
          resolved++;
        }
      } else if (autoResolution && autoResolution.level === 2) {
        // Escalate to Level 2 (AI + Human)
        await escalateToReview(dispute.id, autoResolution.reason);
      } else {
        // Check if needs escalation
        const needsEscalation = await checkEscalation(dispute.id);
        if (needsEscalation) {
          await escalateToReview(dispute.id, 'Complex case requiring human review');
        }
      }
    }

    console.log(`[Dispute Processing] Processed ${result.rows.length} disputes, auto-resolved ${resolved}`);
    return { processed: result.rows.length, resolved };
  } catch (error) {
    console.error('Batch dispute processing error:', error);
    return { processed: 0, resolved: 0 };
  }
}

export default {
  checkAutoResolution,
  applyAutoResolution,
  checkEscalation,
  escalateToReview,
  batchProcessDisputes,
};
