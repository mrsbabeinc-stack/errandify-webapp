import { QwenAI } from './qwenService.js';
import db from '../db.js';

export interface VerdictValidation {
  isValid: boolean;
  issues: VerdictIssue[];
  safetyFlags: SafetyFlag[];
  legalRisks: LegalRisk[];
  biasDetected: boolean;
}

export interface VerdictIssue {
  type: 'bias' | 'safety' | 'legal' | 'fairness';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
}

export interface SafetyFlag {
  type: 'coercion' | 'threats' | 'abuse' | 'injury' | 'fraud';
  severity: 'critical' | 'high' | 'medium';
  description: string;
  action: string;
}

export interface LegalRisk {
  type: 'liability' | 'discrimination' | 'contract' | 'enforcement';
  description: string;
  recommendation: string;
}

/**
 * Comprehensive verdict validation framework
 * Checks for bias, legal compliance, and safety issues
 */
export async function validateDisputeVerdict(
  disputeId: number,
  claimantStatement: string,
  defendantStatement: string | null,
  proposedVerdict: {
    verdict: string;
    doerAmount: number;
    askerAmount: number;
    reasoning: string;
  },
  evidence: any
): Promise<VerdictValidation> {
  const issues: VerdictIssue[] = [];
  const safetyFlags: SafetyFlag[] = [];
  const legalRisks: LegalRisk[] = [];
  let biasDetected = false;

  try {
    // 1. SAFETY CHECK: Detect coercion, threats, abuse
    const safetyAnalysis = await analyzeSafetyRisks(claimantStatement, defendantStatement);
    if (safetyAnalysis.hasRisks) {
      safetyFlags.push(...safetyAnalysis.flags);
      issues.push({
        type: 'safety',
        severity: 'critical',
        message: `Safety concern detected: ${safetyAnalysis.flags[0]?.description}`,
        recommendation: 'Escalate to safety team immediately. Do not proceed with standard resolution.'
      });
    }

    // 2. BIAS CHECK: Ensure fair treatment of both parties
    const biasAnalysis = await detectBias(
      claimantStatement,
      defendantStatement,
      proposedVerdict.reasoning,
      evidence
    );
    if (biasAnalysis.biasDetected) {
      biasDetected = true;
      issues.push({
        type: 'bias',
        severity: 'high',
        message: `Potential bias detected: ${biasAnalysis.description}`,
        recommendation: biasAnalysis.correction
      });
    }

    // 3. FAIRNESS CHECK: Evidence-based verdict
    const fairnessAnalysis = await validateFairness(
      claimantStatement,
      defendantStatement,
      proposedVerdict,
      evidence
    );
    if (!fairnessAnalysis.isFair) {
      issues.push({
        type: 'fairness',
        severity: 'high',
        message: fairnessAnalysis.issue,
        recommendation: fairnessAnalysis.recommendation
      });
    }

    // 4. LEGAL CHECK: Compliance & liability
    const legalAnalysis = await validateLegalCompliance(
      proposedVerdict,
      claimantStatement,
      defendantStatement,
      evidence
    );
    if (legalAnalysis.risks.length > 0) {
      legalRisks.push(...legalAnalysis.risks);
      issues.push({
        type: 'legal',
        severity: 'high',
        message: `Legal risk: ${legalAnalysis.risks[0]?.description}`,
        recommendation: legalAnalysis.risks[0]?.recommendation || 'Consult legal team'
      });
    }

    // 5. CONSISTENCY CHECK: Verdict matches reasoning
    const consistencyValid = await validateConsistency(proposedVerdict);
    if (!consistencyValid.isConsistent) {
      issues.push({
        type: 'fairness',
        severity: 'medium',
        message: 'Verdict does not align with reasoning provided',
        recommendation: 'Revise reasoning or verdict to ensure consistency'
      });
    }

    return {
      isValid: issues.length === 0 || !issues.some(i => i.severity === 'critical'),
      issues,
      safetyFlags,
      legalRisks,
      biasDetected
    };
  } catch (error) {
    console.error('[Verdict Validator] Error:', error);
    return {
      isValid: false,
      issues: [{
        type: 'fairness',
        severity: 'high',
        message: 'Validation system error',
        recommendation: 'Escalate to manual review'
      }],
      safetyFlags: [],
      legalRisks: [],
      biasDetected: false
    };
  }
}

/**
 * Safety Risk Analysis
 * Detect coercion, threats, abuse, injury, fraud
 */
async function analyzeSafetyRisks(
  claimantStatement: string,
  defendantStatement: string | null
): Promise<{ hasRisks: boolean; flags: SafetyFlag[] }> {
  const allText = `${claimantStatement}\n${defendantStatement || ''}`;

  // Critical keywords that trigger escalation
  const criticalKeywords = [
    'threatened', 'coerce', 'blackmail', 'extort',
    'hit', 'hurt', 'injured', 'attack', 'violence',
    'abuse', 'harass', 'stalk', 'assault',
    'trafficking', 'exploitation', 'slavery',
    'fraud', 'fake', 'stolen'
  ];

  const flags: SafetyFlag[] = [];
  const textLower = allText.toLowerCase();

  for (const keyword of criticalKeywords) {
    if (textLower.includes(keyword)) {
      let flagType: SafetyFlag['type'] = 'fraud';
      if (['threatened', 'coerce', 'blackmail', 'extort'].includes(keyword)) flagType = 'coercion';
      if (['hit', 'hurt', 'injured', 'attack', 'violence'].includes(keyword)) flagType = 'injury';
      if (['abuse', 'harass', 'stalk', 'assault'].includes(keyword)) flagType = 'abuse';
      if (['trafficking', 'exploitation', 'slavery'].includes(keyword)) flagType = 'abuse';

      flags.push({
        type: flagType,
        severity: 'critical',
        description: `Keyword detected: "${keyword}"`,
        action: 'Immediate escalation to safety team required'
      });
    }
  }

  return {
    hasRisks: flags.length > 0,
    flags
  };
}

/**
 * Bias Detection
 * Check for discriminatory language, unfair treatment, protected class issues
 */
async function detectBias(
  claimantStatement: string,
  defendantStatement: string | null,
  reasoning: string,
  evidence: any
): Promise<{ biasDetected: boolean; description: string; correction: string }> {
  const prompt = `You are a fairness auditor. Analyze this dispute for potential bias or discrimination.

CLAIMANT: ${claimantStatement}
DEFENDANT: ${defendantStatement || '(no response provided)'}
REASONING: ${reasoning}
EVIDENCE: GPS=${evidence.hasGps}, Photos=${evidence.photoCount}, Wait=${evidence.waitTime}min

Check for:
1. Gender/age/ethnicity discrimination in reasoning
2. Unequal treatment based on protected characteristics
3. Assumptions that favor one party
4. Evidence weighting that seems biased
5. Language that suggests prejudice

Return JSON: {
  "biasDetected": true/false,
  "issues": ["specific bias found"],
  "correction": "how to fix it"
}`;

  try {
    const response = await QwenAI.call(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 500 }
    );

    let analysis: any = {
      biasDetected: false,
      issues: [],
      correction: 'No bias detected'
    };

    try {
      analysis = JSON.parse(response);
    } catch (e) {
      console.warn('[Bias Detection] Failed to parse response');
    }

    return {
      biasDetected: analysis.biasDetected || false,
      description: analysis.issues?.join(', ') || 'None detected',
      correction: analysis.correction || 'Review reasoning for fairness'
    };
  } catch (error) {
    console.error('[Bias Detection] Error:', error);
    return {
      biasDetected: false,
      description: 'Analysis unavailable',
      correction: 'Manual review recommended'
    };
  }
}

/**
 * Fairness Validation
 * Ensure verdict is supported by evidence and treats both parties fairly
 */
async function validateFairness(
  claimantStatement: string,
  defendantStatement: string | null,
  verdict: any,
  evidence: any
): Promise<{ isFair: boolean; issue?: string; recommendation?: string }> {
  const prompt = `You are a fairness auditor. Is this verdict fair based on the evidence?

CLAIMANT CLAIM: ${claimantStatement}
DEFENDANT RESPONSE: ${defendantStatement || '(Defendant did not respond - forfeited)'}

EVIDENCE ASSESSMENT:
- GPS proof: ${evidence.hasGps ? 'Yes' : 'No'}
- Photos: ${evidence.photoCount || 0}
- Chat messages: ${evidence.chatCount || 0}
- Wait time: ${evidence.waitTime || 0} minutes

PROPOSED VERDICT: ${verdict.verdict}
REASONING: ${verdict.reasoning}

Evaluate:
1. Is verdict supported by evidence?
2. Are both perspectives fairly considered?
3. Would a reasonable person agree?
4. Is the outcome proportional?

Return JSON: {
  "isFair": true/false,
  "explanation": "why or why not",
  "suggestion": "alternative if unfair"
}`;

  try {
    const response = await QwenAI.call(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 500 }
    );

    let analysis: any = {
      isFair: true,
      explanation: '',
      suggestion: ''
    };

    try {
      analysis = JSON.parse(response);
    } catch (e) {
      console.warn('[Fairness Check] Failed to parse response');
    }

    return {
      isFair: analysis.isFair !== false,
      issue: analysis.isFair === false ? analysis.explanation : undefined,
      recommendation: analysis.isFair === false ? analysis.suggestion : undefined
    };
  } catch (error) {
    console.error('[Fairness Check] Error:', error);
    return { isFair: true };
  }
}

/**
 * Legal Compliance Check
 * Ensure verdict doesn't create liability or violate law
 */
async function validateLegalCompliance(
  verdict: any,
  claimantStatement: string,
  defendantStatement: string | null,
  evidence: any
): Promise<{ risks: LegalRisk[] }> {
  const risks: LegalRisk[] = [];

  // Check 1: Payment amounts reasonable
  if (verdict.doerAmount < 0 || verdict.askerAmount < 0) {
    risks.push({
      type: 'liability',
      description: 'Negative payment amounts detected',
      recommendation: 'Verify payment calculation is correct'
    });
  }

  // Check 2: Discrimination concerns
  const allText = `${claimantStatement}${defendantStatement || ''}`.toLowerCase();
  const protectedKeywords = ['age', 'gender', 'race', 'religion', 'disability', 'national origin'];

  for (const keyword of protectedKeywords) {
    if (allText.includes(keyword)) {
      risks.push({
        type: 'discrimination',
        description: `Reference to protected characteristic: ${keyword}`,
        recommendation: 'Ensure verdict is based on evidence, not protected characteristic'
      });
    }
  }

  // Check 3: Contract/agreement validation
  if (!evidence.hasGps && !evidence.photoCount && !evidence.chatCount) {
    risks.push({
      type: 'contract',
      description: 'Very limited evidence to establish what was agreed',
      recommendation: 'Consider escalation for manual review'
    });
  }

  // Check 4: Enforcement feasibility
  if (verdict.verdict === 'partial_payment') {
    // Partial payments are harder to enforce, may need additional documentation
    risks.push({
      type: 'enforcement',
      description: 'Partial payment may be subject to dispute interpretation',
      recommendation: 'Document clearly what constitutes fulfillment of partial agreement'
    });
  }

  return { risks };
}

/**
 * Consistency Check
 * Ensure verdict aligns with reasoning
 */
async function validateConsistency(verdict: any): Promise<{ isConsistent: boolean }> {
  const prompt = `Does this verdict match its reasoning?

VERDICT: ${verdict.verdict}
DOER GETS: $${verdict.doerAmount}
ASKER GETS: $${verdict.askerAmount}

REASONING: ${verdict.reasoning}

The verdict and reasoning should align - if reasoning says "doer made effort" then verdict should favor doer.

Return JSON: { "consistent": true/false }`;

  try {
    const response = await QwenAI.call(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 200 }
    );

    let analysis: any = { consistent: true };
    try {
      analysis = JSON.parse(response);
    } catch (e) {
      console.warn('[Consistency Check] Parse error');
    }

    return { isConsistent: analysis.consistent !== false };
  } catch (error) {
    console.error('[Consistency Check] Error:', error);
    return { isConsistent: true };
  }
}

/**
 * Log verdict decision for audit trail
 * Required for legal compliance and accountability
 */
export async function logVerdictAuditTrail(
  disputeId: number,
  userId: string,
  verdict: any,
  validation: VerdictValidation
): Promise<boolean> {
  try {
    await db.query(
      `INSERT INTO dispute_audit_trail
       (dispute_id, admin_id, action, verdict_data, validation_results, issues_count, has_safety_flags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        disputeId,
        userId,
        'verdict_created',
        JSON.stringify(verdict),
        JSON.stringify(validation),
        validation.issues.length,
        validation.safetyFlags.length > 0
      ]
    );

    console.log(`[Audit Trail] Verdict logged for dispute ${disputeId}`);
    return true;
  } catch (error) {
    console.error('[Audit Trail] Error logging verdict:', error);
    return false;
  }
}

/**
 * Generate audit report for legal/compliance review
 */
export function generateAuditReport(validation: VerdictValidation): string {
  const report = `
DISPUTE VERDICT AUDIT REPORT
============================

VALIDATION STATUS: ${validation.isValid ? 'PASSED' : 'FAILED - MANUAL REVIEW REQUIRED'}

CRITICAL ISSUES:
${validation.issues.filter(i => i.severity === 'critical').map(i => `  ⚠️ ${i.type}: ${i.message}\n     Action: ${i.recommendation}`).join('\n')}

HIGH PRIORITY ISSUES:
${validation.issues.filter(i => i.severity === 'high').map(i => `  ⚠️ ${i.type}: ${i.message}`).join('\n')}

SAFETY FLAGS:
${validation.safetyFlags.map(f => `  🚨 ${f.type}: ${f.description}\n     Action: ${f.action}`).join('\n')}

LEGAL RISKS:
${validation.legalRisks.map(r => `  ⚖️ ${r.type}: ${r.description}\n     Recommendation: ${r.recommendation}`).join('\n')}

BIAS ASSESSMENT: ${validation.biasDetected ? '❌ BIAS DETECTED' : '✅ No bias detected'}

RECOMMENDATION:
${validation.isValid ? 'Verdict approved for implementation' : 'DO NOT IMPLEMENT - Escalate to manual review'}
  `;

  return report;
}
