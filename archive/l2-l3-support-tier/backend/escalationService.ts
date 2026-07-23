// Dispute Escalation Service (L2+L3)
// Handle dispute escalation, assignment, and resolution

import db from '../db.js';

/**
 * Escalate dispute to L2 (AI + Human review)
 */
export async function escalateDisputeToL2(
  disputeId: number,
  aiConfidence: number,
  aiRecommendation: 'refund' | 'split' | 'release',
  aiReasoning: string
): Promise<void> {
  try {
    // Create escalation record
    await db.query(
      `INSERT INTO dispute_escalations
       (dispute_id, level, ai_confidence, ai_recommendation, ai_reasoning, status)
       VALUES ($1, $2, $3, $4, $5, 'open')`,
      [disputeId, 2, aiConfidence, aiRecommendation, aiReasoning]
    );

    // Update dispute status
    await db.query(
      'UPDATE disputes SET status = $1 WHERE id = $2',
      ['escalated_to_l2', disputeId]
    );

    // Add to support queue
    await addToQueue(disputeId, 3, 'ai_escalation'); // Priority 3 = medium

    console.log(`Dispute ${disputeId} escalated to L2`);
  } catch (error) {
    console.error('Error escalating to L2:', error);
    throw error;
  }
}

/**
 * Assign dispute to support agent
 */
export async function assignDisputeToAgent(
  escalationId: number,
  agentId: number
): Promise<void> {
  try {
    await db.query(
      `UPDATE dispute_escalations
       SET assigned_to_user_id = $1, status = 'in_progress'
       WHERE id = $2`,
      [agentId, escalationId]
    );

    console.log(`Escalation ${escalationId} assigned to agent ${agentId}`);
  } catch (error) {
    console.error('Error assigning dispute:', error);
    throw error;
  }
}

/**
 * Get L2 disputes for agent
 */
export async function getL2DisputesForAgent(agentId: number): Promise<any[]> {
  try {
    const result = await db.query(
      `SELECT 
        e.id as escalation_id,
        e.dispute_id,
        e.level,
        e.ai_confidence,
        e.ai_recommendation,
        e.ai_reasoning,
        e.status,
        d.errand_id,
        er.formatted_id,
        er.asker_id,
        ab.doer_id,
        COALESCE(ab.amount, er.budget) AS amount,
        d.description AS reason,
        COALESCE(u1.alias, u1.display_name) as asker_name,
        COALESCE(u2.alias, u2.display_name) as doer_name
       FROM dispute_escalations e
       JOIN disputes d ON e.dispute_id = d.id
       JOIN errands er ON er.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = er.accepted_bid_id
       LEFT JOIN users u1 ON er.asker_id = u1.id
       LEFT JOIN users u2 ON ab.doer_id = u2.id
       WHERE e.assigned_to_user_id = $1 AND e.level = 2
       ORDER BY e.created_at DESC`,
      [agentId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting L2 disputes:', error);
    throw error;
  }
}

/**
 * Resolve L2 dispute (make human decision)
 */
export async function resolveL2Dispute(
  escalationId: number,
  decision: 'refund' | 'split' | 'release',
  reasoning: string,
  agentId: number
): Promise<void> {
  try {
    // Update escalation with decision
    await db.query(
      `UPDATE dispute_escalations
       SET human_decision = $1, human_reasoning = $2, decided_by_user_id = $3, decided_at = NOW(), status = 'resolved'
       WHERE id = $4`,
      [decision, reasoning, agentId, escalationId]
    );

    // Get dispute ID
    const result = await db.query(
      'SELECT dispute_id FROM dispute_escalations WHERE id = $1',
      [escalationId]
    );

    const disputeId = result.rows[0].dispute_id;

    // Update dispute status based on decision
    await db.query(
      'UPDATE disputes SET status = $1 WHERE id = $2',
      [`resolved_l2_${decision}`, disputeId]
    );

    console.log(`L2 dispute ${disputeId} resolved with decision: ${decision}`);
  } catch (error) {
    console.error('Error resolving L2 dispute:', error);
    throw error;
  }
}

/**
 * Create appeal (escalate to L3)
 */
export async function createAppeal(
  disputeId: number,
  appealReason: string,
  newEvidenceUrl: string | null,
  userId: number
): Promise<number> {
  try {
    const result = await db.query(
      `INSERT INTO dispute_appeals
       (dispute_id, appeal_reason, new_evidence_url, appealed_by_user_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [disputeId, appealReason, newEvidenceUrl, userId]
    );

    const appealId = result.rows[0].id;

    // Update dispute status
    await db.query(
      'UPDATE disputes SET status = $1 WHERE id = $2',
      ['escalated_to_l3', disputeId]
    );

    // Add to queue with high priority
    await addToQueue(disputeId, 5, 'appeal'); // Priority 5 = highest

    console.log(`Appeal created for dispute ${disputeId}`);
    return appealId;
  } catch (error) {
    console.error('Error creating appeal:', error);
    throw error;
  }
}

/**
 * Get L3 appeals for senior support
 */
export async function getL3Appeals(): Promise<any[]> {
  try {
    const result = await db.query(
      `SELECT 
        a.id as appeal_id,
        a.dispute_id,
        a.appeal_reason,
        a.new_evidence_url,
        a.appealed_by_user_id,
        a.appealed_at,
        a.status,
        d.errand_id,
        er.formatted_id,
        er.asker_id,
        ab.doer_id,
        COALESCE(ab.amount, er.budget) AS amount,
        COALESCE(u1.alias, u1.display_name) as asker_name,
        COALESCE(u2.alias, u2.display_name) as doer_name,
        COALESCE(u3.alias, u3.display_name) as appealer_name
       FROM dispute_appeals a
       JOIN disputes d ON a.dispute_id = d.id
       JOIN errands er ON er.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = er.accepted_bid_id
       LEFT JOIN users u1 ON er.asker_id = u1.id
       LEFT JOIN users u2 ON ab.doer_id = u2.id
       LEFT JOIN users u3 ON a.appealed_by_user_id = u3.id
       WHERE a.status IN ('pending', 'approved')
       ORDER BY a.appealed_at DESC`,
      []
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting L3 appeals:', error);
    throw error;
  }
}

/**
 * Resolve appeal (L3 final decision)
 */
export async function resolveAppeal(
  appealId: number,
  decision: 'refund' | 'split' | 'release' | 'upheld',
  reasoning: string,
  agentId: number
): Promise<void> {
  try {
    // Update appeal with final decision
    await db.query(
      `UPDATE dispute_appeals
       SET l3_decision = $1, l3_reasoning = $2, decided_by_user_id = $3, decided_at = NOW(), status = 'final'
       WHERE id = $4`,
      [decision, reasoning, agentId, appealId]
    );

    // Get dispute ID
    const result = await db.query(
      'SELECT dispute_id FROM dispute_appeals WHERE id = $1',
      [appealId]
    );

    const disputeId = result.rows[0].dispute_id;

    // Update dispute status
    await db.query(
      'UPDATE disputes SET status = $1 WHERE id = $2',
      [`resolved_l3_${decision}`, disputeId]
    );

    console.log(`L3 appeal ${appealId} resolved with final decision: ${decision}`);
  } catch (error) {
    console.error('Error resolving appeal:', error);
    throw error;
  }
}

/**
 * Add dispute to support queue
 */
async function addToQueue(
  disputeId: number,
  priority: number,
  category: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO support_queue (dispute_id, priority, category, status)
       VALUES ($1, $2, $3, 'open')`,
      [disputeId, priority, category]
    );
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
}

/**
 * Get support queue for dashboard
 */
export async function getSupportQueue(): Promise<any[]> {
  try {
    const result = await db.query(
      `SELECT 
        q.id as queue_id,
        q.dispute_id,
        q.priority,
        q.category,
        q.status,
        q.created_at,
        d.errand_id,
        er.formatted_id,
        COALESCE(ab.amount, er.budget) AS amount,
        e.level,
        e.status as escalation_status
       FROM support_queue q
       JOIN disputes d ON q.dispute_id = d.id
       JOIN errands er ON er.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = er.accepted_bid_id
       LEFT JOIN dispute_escalations e ON d.id = e.dispute_id
       WHERE q.status IN ('open', 'in_progress')
       ORDER BY q.priority DESC, q.created_at ASC`,
      []
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting support queue:', error);
    throw error;
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<any> {
  try {
    const result = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM dispute_escalations WHERE status = 'open' AND level = 2) as open_l2,
        (SELECT COUNT(*) FROM dispute_escalations WHERE status = 'in_progress' AND level = 2) as in_progress_l2,
        (SELECT COUNT(*) FROM dispute_appeals WHERE status IN ('pending', 'approved')) as pending_l3,
        (SELECT AVG(EXTRACT(EPOCH FROM (decided_at - created_at))/3600) FROM dispute_escalations WHERE decided_at IS NOT NULL AND level = 2) as avg_resolution_hours,
        (SELECT COUNT(*) FROM dispute_escalations WHERE level = 2) as total_l2_resolved,
        (SELECT COUNT(*) FROM dispute_appeals WHERE status = 'final') as total_l3_resolved`
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}
