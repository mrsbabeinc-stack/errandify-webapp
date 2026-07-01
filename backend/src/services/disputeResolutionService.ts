import db from '../db.js';
import { QwenAI } from './qwenService.js';

export interface DisputeAnalysis {
  confidenceLevel: number; // 0-1
  recommendedResolution: 'approve' | 'reject' | 'partial' | 'escalate';
  reasoning: string;
  evidenceScore: number; // How compelling is the evidence?
}

export interface SafetyAnalysis {
  hasConcern: boolean;
  concernType?: 'coercion' | 'abuse' | 'threats' | 'exploitation' | 'none';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  flaggedPhrases?: string[];
  recommendation: 'escalate_immediately' | 'monitor' | 'proceed_normally';
}

// Safety Monitoring: Detect coercion, threats, abuse
export async function analyzeDisputeSafety(description: string): Promise<SafetyAnalysis> {
  try {
    // Red flag keywords - organized by severity
    const criticalFlags = [
      'i\'ll destroy', 'i\'ll hurt', 'i\'ll sue', 'blackmail', 'unless you pay more',
      'threatened', 'threatened you', 'will report you', 'will expose', 'do what i say',
      'or else', 'or i\'ll', 'coerce', 'extort'
    ];

    const highFlags = [
      'refuse to pay', 'never pay', 'demanding refund', 'threatening legal',
      'ruined', 'useless', 'scam', 'fraud', 'criminal'
    ];

    const mediumFlags = [
      'unacceptable', 'disgusting', 'horrible', 'worst', 'never again',
      'reported to', 'warned everyone', 'told my friends'
    ];

    const description_lower = description.toLowerCase();
    const flaggedPhrases: string[] = [];
    let severity: SafetyAnalysis['severity'] = 'low';

    // Check for critical flags
    for (const flag of criticalFlags) {
      if (description_lower.includes(flag)) {
        flaggedPhrases.push(flag);
        severity = 'critical';
      }
    }

    // Check for high severity flags
    if (severity !== 'critical') {
      for (const flag of highFlags) {
        if (description_lower.includes(flag)) {
          flaggedPhrases.push(flag);
          severity = 'high';
        }
      }
    }

    // Check for medium severity flags
    if (severity === 'low') {
      for (const flag of mediumFlags) {
        if (description_lower.includes(flag)) {
          flaggedPhrases.push(flag);
          severity = 'medium';
        }
      }
    }

    if (flaggedPhrases.length === 0) {
      return {
        hasConcern: false,
        concernType: 'none',
        severity: 'low',
        recommendation: 'proceed_normally',
      };
    }

    // Determine concern type
    let concernType: SafetyAnalysis['concernType'] = 'none';
    if (flaggedPhrases.some(p => ['threatened', 'will hurt', 'destroy'].includes(p))) {
      concernType = 'threats';
    } else if (flaggedPhrases.some(p => ['unless you pay', 'blackmail', 'extort'].includes(p))) {
      concernType = 'coercion';
    } else if (flaggedPhrases.some(p => ['useless', 'scam', 'fraud'].includes(p))) {
      concernType = 'abuse';
    } else if (flaggedPhrases.some(p => ['unreasonable demands', 'demanding'].includes(p))) {
      concernType = 'exploitation';
    }

    const recommendation: SafetyAnalysis['recommendation'] =
      severity === 'critical' || severity === 'high' ? 'escalate_immediately' : 'monitor';

    return {
      hasConcern: true,
      concernType,
      severity,
      flaggedPhrases,
      recommendation,
    };
  } catch (error) {
    console.error('[Disputes] Safety analysis error:', error);
    return {
      hasConcern: false,
      severity: 'low',
      recommendation: 'proceed_normally',
    };
  }
}

// Level 1: Auto-resolution based on hard rules
export async function autoResolveDispute(disputeId: number): Promise<{ resolved: boolean; reason: string }> {
  try {
    const dispute = await db.query(
      `SELECT id, errand_id, dispute_type, description FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) {
      return { resolved: false, reason: 'Dispute not found' };
    }

    const d = dispute.rows[0];

    // Rule 1: No chat usage = auto-refund to asker
    const chatCount = await db.query(
      `SELECT COUNT(*) as count FROM messages
       WHERE related_errand_id = $1`,
      [d.errand_id]
    );

    if (chatCount.rows[0].count === 0) {
      // Refund asker
      await db.query(
        `UPDATE errands SET status = 'dispute_resolved_auto', resolution = 'refunded' WHERE id = $1`,
        [d.errand_id]
      );

      console.log(`[Disputes] Auto-resolved dispute ${disputeId}: No communication, refunded asker`);
      return { resolved: true, reason: 'No communication detected - refunded asker' };
    }

    // Rule 2: Payment not released after completion = auto-refund
    const errand = await db.query(
      `SELECT status, payment_released_at FROM errands WHERE id = $1`,
      [d.errand_id]
    );

    if (!errand.rows[0].payment_released_at) {
      await db.query(
        `UPDATE errands SET status = 'dispute_resolved_auto', resolution = 'pending_payment' WHERE id = $1`,
        [d.errand_id]
      );

      console.log(`[Disputes] Auto-resolved dispute ${disputeId}: Payment not released`);
      return { resolved: true, reason: 'Payment not released - pending' };
    }

    return { resolved: false, reason: 'Does not match auto-resolution criteria' };
  } catch (error) {
    console.error('[Disputes] Auto-resolution error:', error);
    return { resolved: false, reason: 'Error during auto-resolution' };
  }
}

// Level 2: AI-assisted resolution
export async function analyzeDisputeWithAI(disputeId: number): Promise<DisputeAnalysis> {
  try {
    const dispute = await db.query(
      `SELECT id, errand_id, dispute_type, description, evidence FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) {
      return {
        confidenceLevel: 0,
        recommendedResolution: 'escalate',
        reasoning: 'Dispute not found',
        evidenceScore: 0,
      };
    }

    const d = dispute.rows[0];

    const prompt = `Analyze job dispute and recommend resolution:

Dispute Type: ${d.dispute_type}
Description: ${d.description}
Evidence Provided: ${d.evidence ? d.evidence.substring(0, 500) : 'None'}

Return JSON: {
  "confidence": 0.0-1.0,
  "resolution": "approve|reject|partial|escalate",
  "reasoning": "brief explanation",
  "evidenceStrength": 0.0-1.0
}`;

    const response = await QwenAI.call({
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    let analysis: any = {
      confidence: 0.5,
      resolution: 'escalate',
      reasoning: 'Unable to analyze',
      evidenceStrength: 0,
    };

    try {
      analysis = JSON.parse(response);
    } catch (e) {
      console.warn('[Disputes] Failed to parse AI response');
    }

    return {
      confidenceLevel: analysis.confidence || 0.5,
      recommendedResolution: analysis.resolution || 'escalate',
      reasoning: analysis.reasoning || 'AI analysis inconclusive',
      evidenceScore: analysis.evidenceStrength || 0,
    };
  } catch (error) {
    console.error('[Disputes] AI analysis error:', error);
    return {
      confidenceLevel: 0,
      recommendedResolution: 'escalate',
      reasoning: 'AI analysis failed',
      evidenceScore: 0,
    };
  }
}

// Level 3: Escalation for complex cases
export async function escalateDispute(
  disputeId: number,
  notes: string,
  priority: 'normal' | 'high' = 'normal'
) {
  try {
    const result = await db.query(
      `UPDATE disputes
       SET status = 'escalated', priority = $1, escalation_notes = $2, escalated_at = NOW()
       WHERE id = $3
       RETURNING id, status, priority`,
      [priority, notes, disputeId]
    );

    if (result.rows.length === 0) {
      return { success: false };
    }

    console.log(`[Disputes] Dispute ${disputeId} escalated to Level 3 (${priority})`);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('[Disputes] Escalation error:', error);
    return { success: false };
  }
}

// Create a dispute
export async function createDispute(params: {
  errandId: number;
  filedByUserId: number;
  type: 'payment_not_released' | 'work_not_completed' | 'low_quality' | 'safety_concern' | 'other';
  description: string;
  evidence?: string;
}) {
  try {
    // Check for safety concerns first
    const safetyAnalysis = await analyzeDisputeSafety(params.description);

    // Determine if this needs priority escalation
    let priority = 'normal';
    let status = 'level_1';

    if (safetyAnalysis.recommendation === 'escalate_immediately') {
      priority = 'high';
      status = 'level_2'; // Jump to human review
      console.warn(`[Disputes] SAFETY ALERT: ${safetyAnalysis.concernType} detected. Flagged phrases: ${safetyAnalysis.flaggedPhrases?.join(', ')}`);
    }

    const result = await db.query(
      `INSERT INTO disputes (errand_id, filed_by_user_id, dispute_type, description, evidence, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, status, created_at`,
      [params.errandId, params.filedByUserId, params.type, params.description, params.evidence || null, status, priority]
    );

    const disputeId = result.rows[0].id;
    console.log(`[Disputes] Dispute created: ${disputeId} (Priority: ${priority}, Status: ${status})`);

    // Only attempt auto-resolve if not escalated for safety
    if (status === 'level_1') {
      const autoResolve = await autoResolveDispute(disputeId);
      if (!autoResolve.resolved) {
        // Move to Level 2 (AI analysis)
        await db.query(
          `UPDATE disputes SET status = 'level_2' WHERE id = $1`,
          [disputeId]
        );
      }
    }

    return {
      success: true,
      disputeId,
      safetyFlaggedForReview: safetyAnalysis.hasConcern,
      safetyAnalysis: safetyAnalysis.hasConcern ? safetyAnalysis : undefined
    };
  } catch (error) {
    console.error('[Disputes] Create error:', error);
    return { success: false };
  }
}

// Hold payment during dispute
export async function holdPayment(errandId: number, reason: string) {
  try {
    await db.query(
      `UPDATE errands SET payment_held = true, payment_held_reason = $1, payment_held_at = NOW() WHERE id = $2`,
      [reason, errandId]
    );

    console.log(`[Disputes] Payment held for errand ${errandId}: ${reason}`);
  } catch (error) {
    console.error('[Disputes] Payment hold error:', error);
  }
}

// Release payment after dispute resolved
export async function releaseHeldPayment(errandId: number) {
  try {
    await db.query(
      `UPDATE errands SET payment_held = false, payment_held_reason = NULL WHERE id = $1`,
      [errandId]
    );

    console.log(`[Disputes] Payment released for errand ${errandId}`);
  } catch (error) {
    console.error('[Disputes] Payment release error:', error);
  }
}

// Get dispute status
export async function getDisputeStatus(disputeId: number) {
  try {
    const result = await db.query(
      `SELECT id, errand_id, filed_by_user_id, dispute_type, description, status, priority, created_at, resolved_at
       FROM disputes WHERE id = $1`,
      [disputeId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[Disputes] Status fetch error:', error);
    return null;
  }
}
