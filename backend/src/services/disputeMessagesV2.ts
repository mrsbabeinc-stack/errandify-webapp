/**
 * Dispute Resolution Message Templates & Generation
 * AI-generated messages with warm, empathetic tone
 */

import { DisputeAnalysisResult } from './disputeAnalysisV2.js';

interface MessageContext {
  doerName: string;
  askerName: string;
  jobTitle: string;
  amount: number;
  disputeType: string;
  description: string;
  analysis: DisputeAnalysisResult;
  decision: 'full_payment' | 'partial_payment' | 'refund' | 'escalate';
  doerPayment?: number;
  askerRefund?: number;
  reasoning?: string;
  adminNotes?: string;
}

/**
 * Generate message for doer when AI auto-resolves (high confidence)
 */
export function generateAutoResolveMessageToDoer(context: MessageContext): string {
  const decision =
    context.decision === 'full_payment'
      ? 'APPROVED ✅'
      : context.decision === 'partial_payment'
        ? 'PARTIAL PAYMENT 💰'
        : 'REFUND ISSUED 💵';

  const amountText =
    context.decision === 'full_payment'
      ? `Full payment of SGD $${context.amount}`
      : context.decision === 'partial_payment'
        ? `SGD $${context.doerPayment} (50% of job)`
        : 'No payment';

  return `
Subject: ✅ Dispute Resolved - ${decision}

Hi ${context.doerName},

Your dispute has been reviewed and resolved.

Decision: ${decision}
You receive: ${amountText}

What happened:
${getDisputeExplanation(context.analysis, context.disputeType, true)}

Evidence reviewed:
${getEvidenceSummary(context.analysis)}

Why this decision:
${getDecisionReasoning(context.analysis, context.decision, true)}

Payment Details:
Amount: ${amountText}
Your account: Credited immediately
Arrives in wallet: Within 24 hours

Rating Impact: No impact to your reliability ✓

Next Steps:
If you have any questions, contact support.
You can appeal this decision within 7 days
with new evidence if you believe it's unfair.

Thanks for being a great part of our community! 🌸

[Appeal] [Support] [Chat]
  `.trim();
}

/**
 * Generate message for asker when AI auto-resolves
 */
export function generateAutoResolveMessageToAsker(context: MessageContext): string {
  const decision =
    context.decision === 'full_payment'
      ? 'Claim Approved ✓'
      : context.decision === 'partial_payment'
        ? 'Partial Refund 💰'
        : 'Full Refund 💵';

  const impactText =
    context.decision === 'full_payment'
      ? `Payment released to ${context.doerName}: SGD $${context.amount}`
      : context.decision === 'partial_payment'
        ? `You receive back: SGD $${context.askerRefund}\nDoer receives: SGD $${context.doerPayment}`
        : `You receive back: SGD $${context.amount}`;

  return `
Subject: ⚠️ Dispute Resolved - ${decision}

Hi ${context.askerName},

A dispute you're involved in has been resolved.

Decision: ${decision}
${impactText}

What happened:
${getDisputeExplanation(context.analysis, context.disputeType, false)}

Evidence reviewed:
${getEvidenceSummary(context.analysis)}

Why this decision:
${getDecisionReasoning(context.analysis, context.decision, false)}

Impact on you:
- ${impactText.replace(/\n/g, '\n- ')}
- Dispute closed
- Rating impact: Neutral

Your options:
1. Accept this decision
2. Appeal with new evidence (within 7 days)
3. Contact support to discuss

Appeal Process:
If you have counter-evidence, you can appeal within 7 days.

[Appeal] [Support] [Contact Admin]

────────────────
Thanks for using Errandify.
We're here to help both sides fairly. 🌸
  `.trim();
}

/**
 * Generate message for doer when human reviews (medium confidence)
 */
export function generateHumanReviewMessageToDoer(context: MessageContext): string {
  return `
Subject: ⏳ Your Dispute is Under Review

Hi ${context.doerName},

Thank you for raising a dispute about "${context.jobTitle}".

Status: Under human review
Case ID: #${Math.random().toString().slice(2, 8)}

Your claim:
${context.description}

What we're doing:
Our admin team is carefully reviewing your evidence and the other party's response. We take every case seriously and want to make a fair decision.

Timeline:
- Review period: 24-48 hours
- You'll get an update: [Notification date]
- Appeal period: 7 days after decision

Your evidence:
✓ GPS location verification
✓ Timestamped photos
✓ Chat history
✓ Your detailed description

Next steps:
We may contact you for clarification. Keep your phone available.
If we need more info, we'll let you know within 12 hours.

Questions?
[Contact Support] [View Case]

We appreciate your patience. 🌸

────────────────
  `.trim();
}

/**
 * Generate message for asker when human reviews
 */
export function generateHumanReviewMessageToAsker(context: MessageContext): string {
  return `
Subject: ⏳ Response Needed - Dispute Under Review

Hi ${context.askerName},

We received a dispute for "${context.jobTitle}".

Status: Under review
Case ID: #${Math.random().toString().slice(2, 8)}

The other party's claim:
${context.description}

What you can do:
We'd like to hear your side of the story. Please provide:
- Your explanation of what happened
- Any photos or evidence you have
- Chat records if available
- Any other supporting documentation

Your response deadline: Within 24 hours

This helps us make a fair decision for everyone.

View full case details & respond: [Open Case]

Questions?
[Contact Support]

We appreciate your cooperation. 🌸

────────────────
  `.trim();
}

/**
 * Generate escalation notice (safety concerns)
 */
export function generateEscalationNotice(context: MessageContext): string {
  return `
Subject: 🚨 Your Dispute Requires Immediate Review

Hi,

We've flagged your dispute for immediate review by our safety team.

Reason: Safety concern detected

What this means:
- Your case gets priority attention
- Senior admin will review within 1 hour
- May involve safety protocols
- You'll be notified of next steps

Your case is safe with us. We take all safety concerns seriously.

Next steps:
- Safety team will review your evidence
- You may be contacted for more info
- Clear decision within 24 hours

Contact us anytime: [Support]

Your safety matters to us. 🌸

────────────────
  `.trim();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDisputeExplanation(
  analysis: DisputeAnalysisResult,
  disputeType: string,
  isDoer: boolean
): string {
  if (isDoer) {
    if (analysis.hasGpsData && analysis.photosCount > 0 && analysis.hasChatHistory) {
      return `You were at the correct location (verified by GPS at [timestamp]).
You attempted to contact the other party multiple times through chat.
The other party did not respond to your messages.`;
    }
  } else {
    if (analysis.hasGpsData && analysis.photosCount > 0) {
      return `The other party's evidence shows they were at the correct location.
Their photos and GPS data support their claim.
Your response did not provide sufficient counter-evidence.`;
    }
  }

  return 'Our review of the evidence supports the decision below.';
}

function getEvidenceSummary(analysis: DisputeAnalysisResult): string {
  const evidence = [];
  if (analysis.hasGpsData) evidence.push('✓ GPS location verification');
  if (analysis.hasPhotos) evidence.push(`✓ ${analysis.photosCount} timestamped photo(s)`);
  if (analysis.hasChatHistory) evidence.push('✓ Chat history reviewed');
  if (analysis.hasWaitTimeDocumentation) evidence.push('✓ Wait time documented');
  if (analysis.descriptionWordCount > 50) evidence.push('✓ Detailed description provided');

  if (evidence.length === 0) return 'Limited evidence available';
  return evidence.join('\n');
}

function getDecisionReasoning(
  analysis: DisputeAnalysisResult,
  decision: string,
  isDoer: boolean
): string {
  if (decision === 'full_payment') {
    return isDoer
      ? `Your evidence clearly demonstrates good-faith effort to complete the job.
The other party's unavailability prevented completion. This was not your fault.`
      : `Your evidence was insufficient to overturn the other party's claim.
They made genuine efforts, documented by GPS and photos.`;
  }

  if (decision === 'partial_payment') {
    return `Both sides have valid points but the situation is not entirely clear.
A 50/50 split acknowledges the effort made while protecting both parties fairly.`;
  }

  if (decision === 'refund') {
    return isDoer
      ? `Your evidence did not support the claim of unavailability on the other party's part.
The other party should receive a refund for the service not rendered.`
      : `Your evidence supports your claim that the service was not properly completed.
You deserve a refund for the work not performed as promised.`;
  }

  return 'Our review supports this decision.';
}

// ============================================
// CANCELLATION PENALTY MESSAGES
// ============================================

export function generateCancellationPenaltyMessageToDoer(
  doerName: string,
  jobTitle: string,
  penalty: number,
  hoursBeforeStart: number
): string {
  const penaltyDescription =
    hoursBeforeStart > 4
      ? 'free (no penalty - good notice)'
      : hoursBeforeStart >= 2
        ? '20% cancellation fee'
        : hoursBeforeStart > 0
          ? '50% cancellation fee'
          : '100% penalty (job already started)';

  return `
Subject: ⚠️ Cancellation Penalty Applied

Hi ${doerName},

You cancelled: "${jobTitle}"

Timing: ${Math.round(hoursBeforeStart)} hours before job start

Penalty: ${penaltyDescription}
Amount: SGD $${penalty}

Charged to: Your next payment

Impact:
- Your reliability score: Updated
- Status: Check app for details

You can improve your score by:
- Accepting jobs you can complete
- Providing early notice if you need to cancel
- Maintaining high standards on completed jobs

Tips for success:
[View reliability guide] [Contact support]

We believe in you! 🌸

────────────────
  `.trim();
}

export function generateCancellationRefundMessageToAsker(
  askerName: string,
  jobTitle: string,
  refundAmount: number,
  creditAmount: number
): string {
  return `
Subject: ✅ Cancellation Refund + Credit Issued

Hi ${askerName},

The doer cancelled: "${jobTitle}"

You receive:
- Full refund: SGD $${refundAmount}
- Credit bonus: SGD $${creditAmount} (for inconvenience)
- Total available: SGD $${refundAmount + creditAmount}

Your wallet: Updated now
Available for: Any future jobs

Find replacement:
[Search similar jobs] [Browse providers]

We're sorry for the inconvenience.
Let's find you a great replacement! 🌸

────────────────
  `.trim();
}

// ============================================
// APPEAL MESSAGES
// ============================================

export function generateAppealReceivedMessage(
  userName: string,
  decision: string
): string {
  return `
Subject: 📩 Appeal Received

Hi ${userName},

We received your appeal of the dispute decision.

Original decision: ${decision}
Status: Under senior review

Timeline:
- Review: 48 hours
- Decision: Within 2 days
- You'll get: Full explanation

What we're doing:
Your new evidence is being carefully reviewed by our senior team.
We take appeals seriously.

Hang tight! We'll get back to you soon. 🌸

────────────────
  `.trim();
}

export function generateAppealDecisionMessage(
  userName: string,
  originalDecision: string,
  newDecision: string,
  reasoning: string
): string {
  const outcomeText =
    newDecision === 'appeal_upheld'
      ? 'Your appeal was APPROVED ✅'
      : newDecision === 'appeal_modified'
        ? 'The decision was MODIFIED 🔄'
        : 'The original decision was UPHELD ✓';

  return `
Subject: 📋 Appeal Decision

Hi ${userName},

Your appeal has been reviewed.

Original decision: ${originalDecision}
New decision: ${outcomeText}

Reasoning:
${reasoning}

Next steps:
[View updated decision] [Contact support]

Thanks for your patience. 🌸

────────────────
  `.trim();
}
