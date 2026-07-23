import { QwenAI } from './qwenService.js';
import db from '../db.js';
import { validateDisputeVerdict, logVerdictAuditTrail, generateAuditReport } from './disputeVerdictValidator.js';

export interface DisputeVerdictData {
  verdict: 'full_payment' | 'partial_payment' | 'refund' | 'escalated';
  doerAmount: number;
  askerAmount: number;
  reasoning: string; // Human-readable explanation
  logic: string; // Step-by-step logic
  confidence: number;
  decisionType: 'auto_resolved' | 'human_reviewed' | 'escalated';
  adminNotes?: string;
}

/**
 * Use Qwen AI to craft a detailed verdict explanation
 * Takes the dispute details and generates human-friendly reasoning
 */
/**
 * REMOVED FROM USE — this had the AI decide a verdict.
 *
 * Errandify's rule is that AI proposes and never decides: Hana suggests, an
 * admin rules. This function asked Qwen to produce the verdict itself, which is
 * the opposite. It has no callers and must not gain any — use
 * services/hanaDisputeProposal.ts to generate a SUGGESTION for an admin.
 *
 * Left in place rather than deleted only because the verdict-shaping prompt
 * below is a useful reference; the guard makes it unusable as-is.
 */
export async function craftDisputeVerdict(
  disputeId: number,
  userRole: 'doer' | 'asker',
  claimantStatement: string,
  defendantStatement: string | null,
  evidence: {
    hasGps?: boolean;
    photoCount?: number;
    waitTime?: number;
    chatCount?: number;
  },
  aiRecommendation: {
    resolution: 'approve' | 'reject' | 'partial' | 'escalate';
    reasoning: string;
    confidence: number;
  }
): Promise<DisputeVerdictData> {
  throw new Error(
    'craftDisputeVerdict is disabled: AI must never decide a dispute. Use hanaDisputeProposal.proposeResolution() to produce a suggestion for an admin to rule on.'
  );
  // eslint-disable-next-line no-unreachable
  try {
    // Build context for Qwen
    const defendantSection = defendantStatement
      ? `\nDEFENDANT'S RESPONSE:\n${defendantStatement}`
      : '\nNOTE: Defendant did not submit a response (forfeited right to defend)';

    const evidenceSection = `
Evidence Assessment:
- GPS Location: ${evidence.hasGps ? '✓ Provided' : '✗ Not provided'}
- Photos: ${evidence.photoCount ? `✓ ${evidence.photoCount} photo(s)` : '✗ None'}
- Wait Time: ${evidence.waitTime ? `✓ ${evidence.waitTime} minutes` : '✗ Not documented'}
- Chat History: ${evidence.chatCount ? `✓ ${evidence.chatCount} messages` : '✗ No messages'}`;

    const prompt = `You are an expert mediator and dispute resolution specialist. Craft a detailed, fair, and empathetic verdict explanation.

TASK: Generate reasoning and logic for this dispute verdict.

CLAIMANT'S STATEMENT:
${claimantStatement}
${defendantSection}

${evidenceSection}

AI RECOMMENDATION:
- Decision: ${aiRecommendation.resolution.toUpperCase()}
- Confidence: ${(aiRecommendation.confidence * 100).toFixed(0)}%
- Initial Reasoning: ${aiRecommendation.reasoning}

YOUR TASK:
Generate TWO sections:

1. "REASONING" - A warm, fair, 3-4 sentence explanation that:
   - Acknowledges both perspectives
   - Explains why this verdict is fair
   - Uses empathetic language ("we understand", "we found that")
   - Focuses on the evidence and facts

2. "LOGIC" - A step-by-step breakdown that:
   - Shows exactly how we analyzed the claim
   - Lists what evidence we considered
   - Explains which evidence was decisive
   - Ends with the conclusion

Keep both sections professional but warm. Use "we" (representing Errandify) not "I".

Return JSON: {
  "reasoning": "3-4 sentences explaining fairness",
  "logic": "Step-by-step analysis with bullet points or numbered list"
}`;

    const response = await QwenAI.call(
      [{ role: 'user', content: prompt }],
      { temperature: 0.5, maxTokens: 1000 }
    );

    let verdictText: any = {
      reasoning: aiRecommendation.reasoning,
      logic: `We analyzed the claim and available evidence to reach this decision.`
    };

    try {
      verdictText = JSON.parse(response);
    } catch (e) {
      console.warn('[Dispute Verdict] Failed to parse Qwen response, using defaults');
    }

    // Map AI recommendation to verdict
    const verdictMap: { [key: string]: DisputeVerdictData['verdict'] } = {
      'approve': userRole === 'doer' ? 'full_payment' : 'refund',
      'reject': userRole === 'doer' ? 'refund' : 'full_payment',
      'partial': 'partial_payment',
      'escalate': 'escalated'
    };

    const verdict = verdictMap[aiRecommendation.resolution];

    // Calculate payment amounts (placeholder - admin can adjust)
    let doerAmount = 0;
    let askerAmount = 0;
    const budget = 100; // This should come from errand data

    if (verdict === 'full_payment') {
      if (userRole === 'doer') {
        doerAmount = budget;
      } else {
        askerAmount = budget;
      }
    } else if (verdict === 'partial_payment') {
      doerAmount = budget * 0.5;
      askerAmount = budget * 0.5;
    } else if (verdict === 'refund') {
      if (userRole === 'doer') {
        askerAmount = budget;
      } else {
        doerAmount = budget;
      }
    }

    const verdictData: DisputeVerdictData = {
      verdict,
      doerAmount,
      askerAmount,
      reasoning: verdictText.reasoning || aiRecommendation.reasoning,
      logic: verdictText.logic || `Based on the evidence review and analysis, we have determined this outcome.`,
      confidence: aiRecommendation.confidence,
      decisionType: aiRecommendation.confidence >= 0.8 ? 'auto_resolved' : 'human_reviewed'
    };

    // CRITICAL: Validate verdict for bias, legal, and safety compliance
    const validation = await validateDisputeVerdict(
      disputeId,
      claimantStatement,
      defendantStatement,
      verdictData,
      evidence
    );

    if (!validation.isValid) {
      console.warn(`[Dispute Verdict] ⚠️ COMPLIANCE ISSUES DETECTED for dispute ${disputeId}`);
      console.warn(generateAuditReport(validation));

      // If critical safety issues, escalate immediately
      if (validation.safetyFlags.length > 0) {
        console.error(`[SAFETY ESCALATION] Dispute ${disputeId} - ${validation.safetyFlags[0].description}`);
        // Queue for immediate safety team review
        await db.query(
          `INSERT INTO dispute_compliance_queue
           (dispute_id, queue_reason, severity, description)
           VALUES ($1, $2, $3, $4)`,
          [disputeId, 'safety_flag', 'critical', validation.safetyFlags[0].description]
        );
      }

      // Log all issues
      for (const issue of validation.issues) {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          await db.query(
            `INSERT INTO dispute_compliance_queue
             (dispute_id, queue_reason, severity, description)
             VALUES ($1, $2, $3, $4)`,
            [disputeId, issue.type, issue.severity, `${issue.message} - ${issue.recommendation}`]
          );
        }
      }

      // Mark for manual review if critical issues
      if (validation.issues.some(i => i.severity === 'critical')) {
        verdictData.decisionType = 'escalated';
      }
    }

    return verdictData;
  } catch (error) {
    console.error('[Dispute Verdict] Error crafting verdict:', error);

    // Fallback
    return {
      verdict: 'escalated',
      doerAmount: 0,
      askerAmount: 0,
      reasoning: 'Case requires manual review by admin',
      logic: 'Unable to generate automated analysis. Senior admin will review all evidence.',
      confidence: 0,
      decisionType: 'escalated'
    };
  }
}

/**
 * Generate notification message for in-app display
 * Professional, warm, neutral tone
 */
export function generateDisputeNotification(verdict: DisputeVerdictData, userRole: 'doer' | 'asker'): string {
  const verdictMessages = {
    full_payment: userRole === 'doer'
      ? '✅ Dispute resolved. Full payment approved.'
      : '💵 Dispute resolved. Refund approved.',
    partial_payment: '🤝 Dispute resolved. Partial payment approved to both parties.',
    refund: userRole === 'doer'
      ? '📋 Dispute resolved. Refund approved to other party.'
      : '✅ Dispute resolved. Refund approved to you.',
    escalated: '⏳ Dispute escalated to senior admin for further review.'
  };

  return `${verdictMessages[verdict.verdict]} ${verdict.verdict !== 'escalated' ? 'Payment processing in 24-48 hours.' : ''}`;
}

/**
 * Attach verdict to dispute record in database
 */
export async function saveDisputeVerdict(
  disputeId: number,
  verdict: DisputeVerdictData,
  decidedBy: string = 'ai'
): Promise<boolean> {
  try {
    // First, get the errand details for amounts
    const dispute = await db.query(
      `SELECT errand_id FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) return false;

    const errandId = dispute.rows[0].errand_id;

    // Get errand to calculate actual amounts
    const errand = await db.query(
      `SELECT budget FROM errands WHERE id = $1`,
      [errandId]
    );

    if (errand.rows.length === 0) return false;

    const budget = errand.rows[0].budget;

    // Calculate actual payment amounts based on budget
    let doerAmount = verdict.doerAmount;
    let askerAmount = verdict.askerAmount;

    if (verdict.verdict === 'full_payment') {
      doerAmount = budget;
      askerAmount = 0;
    } else if (verdict.verdict === 'partial_payment') {
      doerAmount = budget * 0.5;
      askerAmount = budget * 0.5;
    } else if (verdict.verdict === 'refund') {
      doerAmount = 0;
      askerAmount = budget;
    }

    // Store verdict in database
    await db.query(
      `INSERT INTO dispute_decisions
       (dispute_id, decision_type, decided_by, final_decision, payment_to_doer, payment_to_asker, decision_reasoning)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (dispute_id) DO UPDATE SET
         decision_type = $2, decided_by = $3, final_decision = $4,
         payment_to_doer = $5, payment_to_asker = $6, decision_reasoning = $7, updated_at = NOW()`,
      [
        disputeId,
        verdict.decisionType,
        decidedBy,
        verdict.verdict,
        doerAmount,
        askerAmount,
        JSON.stringify({
          reasoning: verdict.reasoning,
          logic: verdict.logic,
          confidence: verdict.confidence,
          adminNotes: verdict.adminNotes
        })
      ]
    );

    console.log(`[Dispute Verdict] Saved verdict for dispute ${disputeId}: ${verdict.verdict}`);
    return true;
  } catch (error) {
    console.error('[Dispute Verdict] Error saving verdict:', error);
    return false;
  }
}
