import db from '../db.js';
import { disputeConfig, isHighConfidence, isMediumConfidence, isLowConfidence } from '../config/disputes.js';

export interface DisputeAnalysisResult {
  // Safety analysis
  safetyConcern: boolean;
  safetySeverity?: 'low' | 'medium' | 'high' | 'critical';
  safetyConcernType?: string;
  flaggedPhrases: string[];

  // Evidence scoring
  evidenceScore: number; // 0-1
  hasGpsData: boolean;
  hasPhotos: boolean;
  photosCount: number;
  hasChatHistory: boolean;
  hasWaitTimeDocumentation: boolean;
  descriptionWordCount: number;

  // Classification
  classification: 'CLEAR' | 'AMBIGUOUS' | 'UNCLEAR';
  isPlausible: boolean;

  // Pattern detection
  doerDisputeCount: number;
  doerIsRepeatComplainer: boolean;
  askerDefenseCount: number;
  bothNewUsers: boolean;
  doerRatingAverage?: number;
  askerRatingAverage?: number;
  patternFlag: 'RED' | 'YELLOW' | 'GREEN';

  // AI recommendation
  recommendedDecision: 'full_payment' | 'partial_payment' | 'refund' | 'escalate';
  confidenceScore: number; // 0-1
  canAutoResolve: boolean;
  humanReviewNeeded: boolean;
  escalateImmediately: boolean;

  // Reasoning
  reasoning: string;
}

/**
 * Analyze dispute for safety concerns
 */
export async function analyzeSafety(description: string): Promise<{
  hasConcern: boolean;
  severity?: string;
  concernType?: string;
  flaggedPhrases: string[];
  recommendation: string;
}> {
  const descLower = description.toLowerCase();
  const flaggedPhrases: string[] = [];
  let severity = 'low';
  let concernType = 'none';

  // Check critical flags
  for (const flag of disputeConfig.safetyKeywords.critical) {
    if (descLower.includes(flag)) {
      flaggedPhrases.push(flag);
      severity = 'critical';
      concernType = 'coercion';
    }
  }

  // Check high flags
  if (severity !== 'critical') {
    for (const flag of disputeConfig.safetyKeywords.high) {
      if (descLower.includes(flag)) {
        flaggedPhrases.push(flag);
        severity = 'high';
        if (!concernType || concernType === 'none') {
          concernType = 'abuse';
        }
      }
    }
  }

  // Check medium flags
  if (severity === 'low') {
    for (const flag of disputeConfig.safetyKeywords.medium) {
      if (descLower.includes(flag)) {
        flaggedPhrases.push(flag);
        severity = 'medium';
        if (!concernType || concernType === 'none') {
          concernType = 'communication_issue';
        }
      }
    }
  }

  const hasConcern = flaggedPhrases.length > 0;
  const recommendation =
    severity === 'critical' || severity === 'high'
      ? 'escalate_immediately'
      : severity === 'medium'
        ? 'monitor'
        : 'proceed_normally';

  return {
    hasConcern,
    severity: hasConcern ? severity : 'low',
    concernType: hasConcern ? concernType : 'none',
    flaggedPhrases,
    recommendation,
  };
}

/**
 * Score evidence completeness (0-1)
 */
export function scoreEvidence(
  hasGps: boolean,
  photoCount: number,
  hasChat: boolean,
  hasWaitTime: boolean,
  descriptionWordCount: number,
  disputeType: string
): number {
  const requirements = disputeConfig.evidenceRequirements[disputeType as keyof typeof disputeConfig.evidenceRequirements];

  if (!requirements) {
    return 0.5; // Unknown type, give medium score
  }

  let score = 0;
  let maxScore = 0;

  // GPS (if required)
  if (requirements.gpsRequired) {
    maxScore += 25;
    if (hasGps) score += 25;
  }

  // Photos (if required)
  if (requirements.photosRequired) {
    maxScore += 25;
    if (photoCount >= (requirements.photosMinimum || 1)) {
      score += 25;
    } else if (photoCount > 0) {
      score += 12; // Partial credit
    }
  }

  // Chat history (if required)
  if (requirements.chatHistoryRequired) {
    maxScore += 25;
    if (hasChat) score += 25;
  }

  // Wait time (if required)
  if (requirements.waitTimeRequired) {
    maxScore += 25;
    if (hasWaitTime) score += 25;
  }

  // Description quality
  maxScore += 10;
  const minWords = requirements.descriptionMinimumWords || 30;
  if (descriptionWordCount >= minWords) {
    score += 10;
  } else if (descriptionWordCount >= minWords / 2) {
    score += 5; // Partial credit
  }

  return maxScore > 0 ? score / maxScore : 0.5;
}

/**
 * Detect patterns in user history
 */
export async function detectPatterns(
  doerId: number,
  askerId: number
): Promise<{
  doerDisputeCount: number;
  doerRepeatComplainer: boolean;
  askerDefenseCount: number;
  bothNewUsers: boolean;
  doerRating: number;
  askerRating: number;
  patternFlag: 'RED' | 'YELLOW' | 'GREEN';
}> {
  try {
    // Get doer dispute history
    const doerDisputes = await db.query(
      `SELECT COUNT(*) as count FROM disputes
       WHERE filed_by_user_id = $1 OR user_id = $1
       AND created_at > NOW() - INTERVAL '30 days'`,
      [doerId]
    );
    const doerDisputeCount = parseInt(doerDisputes.rows[0]?.count || '0');
    const doerRepeatComplainer = doerDisputeCount > 3;

    // Get asker defense history
    const askerDisputes = await db.query(
      `SELECT COUNT(*) as count FROM disputes
       WHERE filed_by_user_id = $1
       AND status = 'resolved'
       AND created_at > NOW() - INTERVAL '30 days'`,
      [askerId]
    );
    const askerDefenseCount = parseInt(askerDisputes.rows[0]?.count || '0');

    // Get ratings
    const doerRatings = await db.query(
      `SELECT AVG(CAST(rating as DECIMAL)) as avg_rating FROM ratings
       WHERE rated_user_id = $1`,
      [doerId]
    );
    const doerRating = parseFloat(doerRatings.rows[0]?.avg_rating || '4.5');

    const askerRatings = await db.query(
      `SELECT AVG(CAST(rating as DECIMAL)) as avg_rating FROM ratings
       WHERE rated_user_id = $1`,
      [askerId]
    );
    const askerRating = parseFloat(askerRatings.rows[0]?.avg_rating || '4.5');

    // Get job counts
    const doerJobs = await db.query(
      `SELECT COUNT(*) as count FROM errands WHERE doer_id = $1`,
      [doerId]
    );
    const doerJobCount = parseInt(doerJobs.rows[0]?.count || '0');

    const askerJobs = await db.query(
      `SELECT COUNT(*) as count FROM errands WHERE asker_id = $1`,
      [askerId]
    );
    const askerJobCount = parseInt(askerJobs.rows[0]?.count || '0');

    const bothNewUsers = doerJobCount < 10 && askerJobCount < 10;

    // Determine pattern flag
    let patternFlag: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';
    if (doerRepeatComplainer || doerRating < 3.0) {
      patternFlag = 'RED';
    } else if (doerDisputeCount > 1 || doerRating < 4.0) {
      patternFlag = 'YELLOW';
    }

    return {
      doerDisputeCount,
      doerRepeatComplainer,
      askerDefenseCount,
      bothNewUsers,
      doerRating,
      askerRating,
      patternFlag,
    };
  } catch (error) {
    console.error('[DisputeAnalysis] Pattern detection error:', error);
    return {
      doerDisputeCount: 0,
      doerRepeatComplainer: false,
      askerDefenseCount: 0,
      bothNewUsers: false,
      doerRating: 4.5,
      askerRating: 4.5,
      patternFlag: 'GREEN',
    };
  }
}

/**
 * Calculate confidence score based on all factors
 */
export function calculateConfidenceScore(
  evidenceScore: number,
  safetyFactor: number, // 0 = no concern, -0.2 = medium concern, -0.3 = high concern
  patternRisk: number, // 0 = green, 0.1 = yellow, 0.3 = red
  plausibility: number // 0-1
): number {
  // Base score from evidence
  let confidence = evidenceScore * 0.4;

  // Add plausibility factor
  confidence += plausibility * 0.3;

  // Reduce for safety concerns
  confidence += Math.max(safetyFactor, 0) * 0.15;

  // Reduce for pattern risk
  confidence -= patternRisk * 0.15;

  // Clamp between 0-1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Main AI analysis function
 */
export async function analyzeDispute(
  disputeId: number,
  filedByUserId: number,
  otherPartyId: number,
  description: string,
  evidence: {
    hasGps: boolean;
    photoCount: number;
    hasChat: boolean;
    hasWaitTime: boolean;
    waitTimeMinutes?: number;
  },
  disputeType: string
): Promise<DisputeAnalysisResult> {
  try {
    // Safety analysis
    const safetyAnalysis = await analyzeSafety(description);

    // Evidence scoring
    const wordCount = description.split(/\s+/).length;
    const evidenceScore = scoreEvidence(
      evidence.hasGps,
      evidence.photoCount,
      evidence.hasChat,
      evidence.hasWaitTime,
      wordCount,
      disputeType
    );

    // Pattern detection
    const patterns = await detectPatterns(otherPartyId, filedByUserId);

    // Plausibility (is the claim reasonable?)
    let plausibilityScore = 0.7;
    if (evidence.hasGps && evidence.photoCount > 0 && evidence.hasChat) {
      plausibilityScore = 0.95; // Very strong evidence
    } else if (evidenceScore > 0.7) {
      plausibilityScore = 0.85; // Good evidence
    } else if (evidenceScore > 0.4) {
      plausibilityScore = 0.7; // Partial evidence
    } else {
      plausibilityScore = 0.4; // Weak evidence
    }

    // Safety factor (-0.3 to 0)
    let safetyFactor = 0;
    if (safetyAnalysis.severity === 'critical') {
      safetyFactor = -0.3;
    } else if (safetyAnalysis.severity === 'high') {
      safetyFactor = -0.25;
    } else if (safetyAnalysis.severity === 'medium') {
      safetyFactor = -0.15;
    }

    // Pattern risk
    let patternRisk = 0;
    if (patterns.patternFlag === 'RED') patternRisk = 0.3;
    else if (patterns.patternFlag === 'YELLOW') patternRisk = 0.1;

    // Calculate confidence
    const confidenceScore = calculateConfidenceScore(
      evidenceScore,
      safetyFactor,
      patternRisk,
      plausibilityScore
    );

    // Determine if auto-resolvable
    const canAutoResolve =
      confidenceScore >= disputeConfig.aiThresholds.autoResolveThreshold &&
      !safetyAnalysis.hasConcern;

    const escalateImmediately =
      safetyAnalysis.severity === 'critical' || safetyAnalysis.severity === 'high';

    const humanReviewNeeded = !canAutoResolve || escalateImmediately;

    // Recommend decision
    let recommendedDecision: 'full_payment' | 'partial_payment' | 'refund' | 'escalate' =
      'partial_payment';

    if (escalateImmediately) {
      recommendedDecision = 'escalate';
    } else if (canAutoResolve) {
      if (evidenceScore > 0.8 && plausibilityScore > 0.85) {
        recommendedDecision = 'full_payment';
      } else if (evidenceScore < 0.4) {
        recommendedDecision = 'refund';
      }
    }

    // Classification
    let classification: 'CLEAR' | 'AMBIGUOUS' | 'UNCLEAR' = 'CLEAR';
    if (confidenceScore < disputeConfig.aiThresholds.humanReviewThreshold) {
      classification = 'UNCLEAR';
    } else if (confidenceScore < disputeConfig.aiThresholds.autoResolveThreshold) {
      classification = 'AMBIGUOUS';
    }

    // Build reasoning
    const reasoning = `
      Evidence Score: ${(evidenceScore * 100).toFixed(0)}%
      Plausibility: ${(plausibilityScore * 100).toFixed(0)}%
      Safety: ${safetyAnalysis.severity}
      Doer Reliability: ${patterns.patternFlag}
      Doer Rating: ${patterns.doerRating.toFixed(1)}/5.0
      Disputes (30d): ${patterns.doerDisputeCount}
    `.trim();

    const result: DisputeAnalysisResult = {
      safetyConcern: safetyAnalysis.hasConcern,
      safetySeverity: (safetyAnalysis.severity || 'low') as any,
      safetyConcernType: safetyAnalysis.concernType,
      flaggedPhrases: safetyAnalysis.flaggedPhrases,

      evidenceScore,
      hasGpsData: evidence.hasGps,
      hasPhotos: evidence.photoCount > 0,
      photosCount: evidence.photoCount,
      hasChatHistory: evidence.hasChat,
      hasWaitTimeDocumentation: evidence.hasWaitTime,
      descriptionWordCount: wordCount,

      classification,
      isPlausible: plausibilityScore > 0.5,

      doerDisputeCount: patterns.doerDisputeCount,
      doerIsRepeatComplainer: patterns.doerRepeatComplainer,
      askerDefenseCount: patterns.askerDefenseCount,
      bothNewUsers: patterns.bothNewUsers,
      doerRatingAverage: patterns.doerRating,
      askerRatingAverage: patterns.askerRating,
      patternFlag: patterns.patternFlag,

      recommendedDecision,
      confidenceScore,
      canAutoResolve,
      humanReviewNeeded,
      escalateImmediately,

      reasoning,
    };

    return result;
  } catch (error) {
    console.error('[DisputeAnalysis] Analysis error:', error);
    throw error;
  }
}

/**
 * Save analysis to database
 */
export async function saveAnalysis(
  disputeId: number,
  analysis: DisputeAnalysisResult
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO dispute_ai_analysis (
        dispute_id,
        safety_concern,
        safety_severity,
        safety_concern_type,
        flagged_phrases,
        safety_recommendation,
        has_gps_data,
        has_photos,
        photo_count,
        has_chat_history,
        has_wait_time_documentation,
        description_word_count,
        evidence_score,
        dispute_classification,
        is_plausible,
        doer_dispute_count,
        doer_is_repeat_complainer,
        asker_defense_count,
        both_new_users,
        doer_rating_average,
        asker_rating_average,
        pattern_flag,
        ai_recommended_decision,
        ai_confidence_score,
        can_auto_resolve,
        human_review_needed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
      [
        disputeId,
        analysis.safetyConcern,
        analysis.safetySeverity || 'low',
        analysis.safetyConcernType || 'none',
        analysis.flaggedPhrases,
        analysis.safetyConcern
          ? analysis.safetySeverity === 'critical'
            ? 'escalate_immediately'
            : 'monitor'
          : 'proceed_normally',
        analysis.hasGpsData,
        analysis.hasPhotos,
        analysis.photosCount,
        analysis.hasChatHistory,
        analysis.hasWaitTimeDocumentation,
        analysis.descriptionWordCount,
        analysis.evidenceScore,
        analysis.classification,
        analysis.isPlausible,
        analysis.doerDisputeCount,
        analysis.doerIsRepeatComplainer,
        analysis.askerDefenseCount,
        analysis.bothNewUsers,
        analysis.doerRatingAverage,
        analysis.askerRatingAverage,
        analysis.patternFlag,
        analysis.recommendedDecision,
        analysis.confidenceScore,
        analysis.canAutoResolve,
        analysis.humanReviewNeeded,
      ]
    );
  } catch (error) {
    console.error('[DisputeAnalysis] Save error:', error);
    throw error;
  }
}
