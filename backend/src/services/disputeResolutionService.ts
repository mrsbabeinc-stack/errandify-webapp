import db from '../db.js';
import { QwenAI } from './qwenService.js';
import { proposeResolution } from './hanaDisputeProposal.js';

export type DisputeTier = 'auto' | 'statement_only' | 'full_investigation';

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

// Auto-resolution was removed deliberately.
//
// It used to close a dispute and set the errand to 'refunded' with no human
// involved. The product model is that Hana only ever PROPOSES and an admin
// makes every decision, so there must be no code path that resolves a dispute
// on its own. See services/hanaDisputeProposal.ts.
//
// (It had also never actually run: it queried messages.related_errand_id,
// errands.resolution and errands.payment_released_at, none of which exist, so
// it threw on its first query every time.)

/** Evidence is TEXT on the claimant side but JSONB on the defendant side, so it
 *  can arrive as an object — calling .substring() on it throws. */
function formatEvidence(value: unknown): string {
  if (!value) return 'None';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.slice(0, 300);
}

// Level 2: AI-assisted resolution
export async function analyzeDisputeWithAI(disputeId: number): Promise<DisputeAnalysis> {
  try {
    const dispute = await db.query(
      `SELECT d.id, d.errand_id, d.dispute_type, d.filed_by_user_id, d.description,
              d.evidence, d.defendant_response, d.defendant_response_evidence,
              d.response_status,
              e.asker_id, ab.doer_id
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
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
    // There is no disputes.filed_by — work the role out from who filed it.
    // Selecting that column threw, which is why every analysis came back
    // "AI analysis failed" regardless of what the model returned.
    const isDoerFiled = Number(d.filed_by_user_id) === Number(d.doer_id);
    const perspective = isDoerFiled
      ? 'DOER CLAIM: Did asker prevent completion?'
      : 'ASKER CLAIM: Did doer deliver quality work?';

    // Build prompt with both sides if defendant responded
    let analysisPrompt = `You are a fair dispute resolver. Analyze both perspectives fairly:

${perspective}

CLAIMANT'S STATEMENT:
${d.description}

CLAIMANT'S EVIDENCE: ${formatEvidence(d.evidence)}`;

    if (d.response_status === 'received' && d.defendant_response) {
      analysisPrompt += `

DEFENDANT'S RESPONSE (Submitted on time):
${d.defendant_response}

DEFENDANT'S EVIDENCE: ${formatEvidence(d.defendant_response_evidence)}`;
    } else if (d.response_status === 'forfeited') {
      analysisPrompt += `

NOTE: Defendant was given 24 hours to respond but did not submit a response. Defendant has forfeited right to defend.`;
    }

    analysisPrompt += `

ANALYSIS INSTRUCTIONS:
- If defendant forfeited: Strongly favor claimant (0.85+ confidence)
- If both provided evidence: Analyze objectively which side has stronger proof
- Only recommend "approve" for claimant if evidence strongly supports their claim
- If unclear: Recommend escalation for human judgment

Return JSON: {
  "confidence": 0.0-1.0,
  "resolution": "approve|reject|partial|escalate",
  "reasoning": "specific action for admin to take",
  "evidenceStrength": 0.0-1.0
}`;

    const prompt = analysisPrompt;

    const response = await QwenAI.call(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 500 }
    );

    let analysis: any = {
      confidence: 0.5,
      resolution: 'escalate',
      reasoning: 'Unable to analyze',
      evidenceStrength: 0,
    };

    try {
      // Qwen wraps JSON in ```json fences, so a bare JSON.parse always threw and
      // the analysis silently degraded to "Unable to analyze".
      const cleaned = String(response)
        .replace(/^\s*```(?:json)?/i, '')
        .replace(/```\s*$/, '')
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : cleaned);
    } catch (e) {
      console.warn('[Disputes] Failed to parse AI response:', String(response).slice(0, 200));
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

    // Every dispute lands with an admin. Hana looks at it first and proposes,
    // but the decision is always a person's.
    let priority = 'normal';
    let status = 'hana_reviewing';

    if (safetyAnalysis.recommendation === 'escalate_immediately') {
      priority = 'high';
      // Safety cases skip Hana entirely and go straight to a person
      status = 'admin_review';
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

    // Still used to decide whether the other side is asked for a statement
    const tierClassification = await classifyDisputeTier(disputeId);

    // Auto-resolution is deliberately gone. It used to close disputes and set a
    // refund outcome with no human involved, which is not the model: Hana only
    // ever proposes. Hana runs in the background so filing stays fast, and the
    // dispute moves to admin_review either way — including if Hana fails.
    if (status === 'hana_reviewing') {
      proposeResolution(disputeId).catch((err) =>
        console.error(`[Disputes] Hana proposal failed for ${disputeId}:`, err)
      );
    }

    return {
      success: true,
      disputeId,
      safetyFlaggedForReview: safetyAnalysis.hasConcern,
      safetyAnalysis: safetyAnalysis.hasConcern ? safetyAnalysis : undefined,
      tier: tierClassification.tier,
      tierReason: tierClassification.reason,
      defendantNeedsResponse: tierClassification.defendantNeedsResponse,
      responseDeadline: tierClassification.responseDeadline
    };
  } catch (error) {
    console.error('[Disputes] Create error:', error);
    return { success: false };
  }
}

// Classify dispute into tier: Auto / Statement-Only / Full Investigation
export async function classifyDisputeTier(disputeId: number): Promise<{
  tier: 'auto' | 'statement_only' | 'full_investigation';
  reason: string;
  defendantNeedsResponse: boolean;
  responseDeadline?: Date;
}> {
  try {
    const dispute = await db.query(
      `SELECT id, errand_id, filed_by_user_id, dispute_type, description, evidence FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) {
      return { tier: 'full_investigation', reason: 'Dispute not found', defendantNeedsResponse: true };
    }

    const d = dispute.rows[0];

    // Score evidence strength
    const evidence = d.evidence ? JSON.parse(d.evidence) : {};
    let claimantScore = 0;

    // GPS evidence (strong proof of location)
    if (evidence.gpsLocation) claimantScore += 0.4;

    // Multiple photos (strong visual evidence)
    if (evidence.photos && evidence.photos.length >= 2) claimantScore += 0.3;
    else if (evidence.photos && evidence.photos.length === 1) claimantScore += 0.15;

    // Wait time (shows effort/attempt)
    if (evidence.waitTime && evidence.waitTime >= 20) claimantScore += 0.15;
    else if (evidence.waitTime) claimantScore += 0.05;

    // Substantive description
    const descriptionWords = d.description.split(/\s+/).length;
    if (descriptionWords >= 50) claimantScore += 0.1;
    else if (descriptionWords >= 30) claimantScore += 0.05;

    // Normalize to 0-1
    claimantScore = Math.min(1, claimantScore);

    // Determine tier based on evidence strength
    let tier: 'auto' | 'statement_only' | 'full_investigation' = 'full_investigation';
    let reason = '';
    let defendantNeedsResponse = true;

    if (claimantScore >= 0.75) {
      // Very strong evidence: Auto-resolve, no need for defendant to respond
      tier = 'auto';
      reason = 'Claimant has strong evidence (GPS + multiple photos or equivalent)';
      defendantNeedsResponse = false;
    } else if (claimantScore >= 0.45) {
      // Moderate evidence: Ask defendant for statement only
      tier = 'statement_only';
      reason = 'Claimant has some evidence, defendant gets chance to respond';
      defendantNeedsResponse = true;
    } else {
      // Weak evidence: Full investigation, need both sides
      tier = 'full_investigation';
      reason = 'Evidence unclear, need both parties to provide statements';
      defendantNeedsResponse = true;
    }

    // Store classification
    // 24 hours to reply — but never past the working deadline, or the reply
    // lands with no time left for an admin to weigh it. On a dispute raised
    // late in the window this shortens to whatever is actually available.
    let responseDeadline: Date | undefined;
    if (defendantNeedsResponse) {
      responseDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // No longer clamped to a payment window. The money is captured and held
      // in Stripe, so a reply deadline is about keeping things moving, not about
      // beating an expiry.
    }

    await db.query(
      `INSERT INTO dispute_tier_classification
       (dispute_id, assigned_tier, tier_reason, claimant_evidence_score, evidence_clarity, can_skip_defendant_response, skip_reason, classified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (dispute_id) DO UPDATE SET
         assigned_tier = $2, tier_reason = $3, claimant_evidence_score = $4, updated_at = NOW()`,
      [
        disputeId,
        tier,
        reason,
        claimantScore,
        claimantScore >= 0.75 ? 'clear' : claimantScore >= 0.45 ? 'ambiguous' : 'unclear',
        !defendantNeedsResponse,
        !defendantNeedsResponse ? reason : null
      ]
    );

    // If defendant needs to respond, create defense request
    if (defendantNeedsResponse && responseDeadline) {
      const errand = await db.query(
        `SELECT e.asker_id, ab.doer_id
           FROM errands e
           LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
          WHERE e.id = $1`,
        [d.errand_id]
      );

      if (errand.rows.length > 0) {
        const isDoerFiled = d.filed_by_user_id === errand.rows[0].doer_id;
        const defendantId = isDoerFiled ? errand.rows[0].asker_id : errand.rows[0].doer_id;

        await db.query(
          `INSERT INTO dispute_defense_requests (dispute_id, defendant_user_id, request_reason, deadline, notified_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (dispute_id) DO NOTHING`,
          [disputeId, defendantId, tier === 'statement_only' ? 'asker_has_strong_evidence' : 'evidence_unclear', responseDeadline]
        );

        // Update disputes table with defendant info
        await db.query(
          `UPDATE disputes
           SET defendant_user_id = $1, response_deadline = $2, defense_tier = $3, requires_defense = true
           WHERE id = $4`,
          [defendantId, responseDeadline, tier, disputeId]
        );
      }
    }

    console.log(`[Disputes] Tier classified: ${disputeId} -> ${tier} (Score: ${claimantScore.toFixed(2)})`);

    return { tier, reason, defendantNeedsResponse, responseDeadline };
  } catch (error) {
    console.error('[Disputes] Tier classification error:', error);
    return { tier: 'full_investigation', reason: 'Error during classification', defendantNeedsResponse: true };
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

/**
 * Put the errand into dispute, remembering where it came from.
 *
 * Holding the payment was the only thing filing used to do, so an errand under
 * dispute looked exactly like one that had gone through cleanly — to the asker,
 * to the doer, and to every admin query that filters on status. It also meant
 * nothing could tell you which errands were stuck.
 *
 * The previous status is kept because some disputes end with nothing changing
 * hands, and those have to put the errand back where it was rather than guess
 * at a plausible-looking status.
 */
export async function markErrandDisputed(errandId: number) {
  try {
    await db.query(
      `UPDATE errands
          SET pre_dispute_status = COALESCE(pre_dispute_status, status),
              status = 'disputed'
        WHERE id = $1 AND status <> 'disputed'`,
      [errandId]
    );
  } catch (error) {
    console.error('[Disputes] Could not mark errand disputed:', error);
  }
}

/**
 * Take the errand back out of dispute, once the dispute is genuinely over.
 *
 * "Over" means the money has moved (or there was never any to move). Calling
 * this at the moment an admin decides would be wrong — the decision can still
 * be appealed, and the errand would be showing a finished state while the funds
 * are still frozen.
 *
 *   restored   nothing changed hands — back to whatever it was before
 *   cancelled  the asker got the whole amount back, so no work was paid for
 *   completed  the doer was paid something, in full or in part
 */
export async function closeErrandAfterDispute(
  errandId: number,
  outcome: 'restore' | 'cancelled' | 'completed'
) {
  try {
    if (outcome === 'restore') {
      await db.query(
        `UPDATE errands
            SET status = COALESCE(pre_dispute_status, 'completed'),
                pre_dispute_status = NULL
          WHERE id = $1 AND status = 'disputed'`,
        [errandId]
      );
    } else {
      await db.query(
        `UPDATE errands SET status = $2, pre_dispute_status = NULL WHERE id = $1`,
        [errandId, outcome]
      );
    }
  } catch (error) {
    console.error('[Disputes] Could not close errand after dispute:', error);
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
