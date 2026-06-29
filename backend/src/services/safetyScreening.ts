import db from '../db.js';

export interface SafetyFlag {
  errandId: number;
  userId: number;
  flagType: 'trafficking' | 'abuse' | 'exploitation' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  aiConfidence: number;
  description: string;
  markers: string[];
  reportedAt: Date;
  resolvedAt?: Date;
  resolutionType?: 'false_alarm' | 'escalated_to_police' | 'victim_protected';
  notes?: string;
}

// Trafficking detection keywords - organized by category
const TRAFFICKING_KEYWORDS = {
  isolation: [
    'no phone',
    'no internet',
    'no outside contact',
    'kept indoors',
    'no visitors',
    'confined',
    'locked in',
    'cannot leave',
    'no communication',
    'isolated',
  ],
  control: [
    'must follow all instructions',
    'no questions',
    'blind obedience',
    'cannot refuse',
    'no choice',
    'forced to',
    'must obey',
    'under my control',
    'answer to me',
    'do as i say',
  ],
  documents: [
    'take passport',
    'hold id',
    'keep documents',
    'confiscate passport',
    'steal passport',
    'hold id card',
    'document control',
  ],
  debt: [
    'trapped by debt',
    'pay deducted for',
    'debt bondage',
    'debt trap',
    'pay for room',
    'pay for food',
    'pay for housing',
  ],
  urgency: [
    'must be available 24/7',
    'no days off',
    'work every day',
    'no breaks',
    'no time off',
    'always available',
    'round the clock',
    '24 hour',
  ],
  money: [
    'transfer money to',
    'send earnings to',
    'wire transfer',
    'direct deposit to me',
    'give me the money',
    'collect money',
    'hold money',
  ],
  living: [
    'live-in only',
    'must live here',
    'housing provided',
    'room and board deducted',
    'cannot leave housing',
  ],
};

// Severity scoring weights
const SEVERITY_WEIGHTS = {
  isolation: 0.8,
  control: 0.85,
  documents: 0.95, // Very serious
  debt: 0.9,
  urgency: 0.6,
  money: 0.75,
  living: 0.7,
};

/**
 * Screen errand for trafficking/exploitation markers
 * Returns risk level and confidence score
 */
export async function screenErrandForSafety(
  errandId: number,
  userId: number,
  title: string,
  description: string
): Promise<{ riskLevel: 'low' | 'medium' | 'high' | 'critical'; confidence: number; markers: string[] }> {
  try {
    const fullText = `${title} ${description}`.toLowerCase();
    const detectedMarkers: string[] = [];
    let confidenceScore = 0;

    // Scan for each category of red flags
    for (const [category, keywords] of Object.entries(TRAFFICKING_KEYWORDS)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          detectedMarkers.push(`${category}: "${keyword}"`);
          const weight = SEVERITY_WEIGHTS[category as keyof typeof SEVERITY_WEIGHTS] || 0.5;
          confidenceScore += weight * 0.1; // Each marker adds 0-10% confidence
        }
      }
    }

    // Cap confidence at 1.0
    confidenceScore = Math.min(confidenceScore, 1.0);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (confidenceScore >= 0.8) {
      riskLevel = 'critical';
    } else if (confidenceScore >= 0.6) {
      riskLevel = 'high';
    } else if (confidenceScore >= 0.4) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Store flag if medium or higher
    if (riskLevel !== 'low') {
      await storeSafetyFlag({
        errandId,
        userId,
        flagType: 'trafficking',
        severity: riskLevel,
        aiConfidence: confidenceScore,
        description: `AI detected ${detectedMarkers.length} trafficking markers`,
        markers: detectedMarkers,
        reportedAt: new Date(),
      });
    }

    return {
      riskLevel,
      confidence: confidenceScore,
      markers: detectedMarkers,
    };
  } catch (error) {
    console.error('Error screening errand for safety:', error);
    throw error;
  }
}

/**
 * Store safety flag in database
 */
export async function storeSafetyFlag(flag: SafetyFlag): Promise<void> {
  try {
    await db.query(
      `INSERT INTO safety_flags
       (errand_id, user_id, flag_type, severity, ai_confidence, description, markers, reported_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        flag.errandId,
        flag.userId,
        flag.flagType,
        flag.severity,
        flag.aiConfidence,
        flag.description,
        JSON.stringify(flag.markers),
        flag.reportedAt,
      ]
    );

    // If critical, alert support immediately (in production: send to support team notification)
    if (flag.severity === 'critical') {
      console.warn(`🚨 CRITICAL SAFETY FLAG - Errand ${flag.errandId} by User ${flag.userId}`);
      console.warn(`Markers: ${flag.markers.join(', ')}`);
      // TODO: Send to support team Slack/email
    }
  } catch (error) {
    console.error('Error storing safety flag:', error);
    throw error;
  }
}

/**
 * Get all flags for a user (for support team)
 */
export async function getUserSafetyFlags(userId: number): Promise<SafetyFlag[]> {
  try {
    const result = await db.query(
      `SELECT * FROM safety_flags
       WHERE user_id = $1
       ORDER BY reported_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      errandId: row.errand_id,
      userId: row.user_id,
      flagType: row.flag_type,
      severity: row.severity,
      aiConfidence: row.ai_confidence,
      description: row.description,
      markers: JSON.parse(row.markers),
      reportedAt: row.reported_at,
      resolvedAt: row.resolved_at,
      resolutionType: row.resolution_type,
      notes: row.notes,
    }));
  } catch (error) {
    console.error('Error fetching user safety flags:', error);
    throw error;
  }
}

/**
 * Resolve a safety flag (after support team review)
 */
export async function resolveSafetyFlag(
  flagId: number,
  resolutionType: 'false_alarm' | 'escalated_to_police' | 'victim_protected',
  notes: string
): Promise<void> {
  try {
    await db.query(
      `UPDATE safety_flags
       SET resolved_at = NOW(), resolution_type = $1, notes = $2
       WHERE id = $3`,
      [resolutionType, notes, flagId]
    );
  } catch (error) {
    console.error('Error resolving safety flag:', error);
    throw error;
  }
}

/**
 * Check if user has pattern of trafficking/exploitation behavior
 */
export async function checkUserBehaviorPattern(userId: number): Promise<{
  isHighRisk: boolean;
  patternDescription: string;
  jobCount: number;
  averagePay: number;
  commonKeywords: string[];
}> {
  try {
    // Get user's recent errand postings
    const result = await db.query(
      `SELECT description, title, budget
       FROM errands
       WHERE asker_id = $1
       AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC`,
      [userId]
    );

    const errands = result.rows;
    if (errands.length === 0) {
      return {
        isHighRisk: false,
        patternDescription: 'No recent job postings',
        jobCount: 0,
        averagePay: 0,
        commonKeywords: [],
      };
    }

    // Analyze patterns
    let redFlagCount = 0;
    const allText = errands.map((e: any) => `${e.title} ${e.description}`).join(' ').toLowerCase();
    const commonKeywords: string[] = [];

    // Check for isolation/control keywords appearing multiple times
    for (const [category, keywords] of Object.entries(TRAFFICKING_KEYWORDS)) {
      for (const keyword of keywords) {
        const occurrences = (allText.match(new RegExp(keyword, 'g')) || []).length;
        if (occurrences >= 2) {
          redFlagCount += occurrences;
          commonKeywords.push(`${keyword} (${occurrences}x)`);
        }
      }
    }

    const averagePay = errands.reduce((sum: number, e: any) => sum + (e.budget || 0), 0) / errands.length;

    const isHighRisk = redFlagCount >= 5 || (averagePay < 300 && errands.length >= 5);

    return {
      isHighRisk,
      patternDescription: isHighRisk
        ? `User has ${redFlagCount} trafficking markers across ${errands.length} recent jobs (avg $${averagePay}/month)`
        : `Normal job posting pattern`,
      jobCount: errands.length,
      averagePay,
      commonKeywords,
    };
  } catch (error) {
    console.error('Error checking user behavior pattern:', error);
    throw error;
  }
}

/**
 * Submit anonymous vulnerability report
 */
export async function submitVulnerabilityReport(
  reportType: 'unsafe_job' | 'abuse' | 'trafficking' | 'other',
  description: string,
  relatedErrandId?: number,
  relatedUserId?: number,
  contactPhone?: string,
  contactEmail?: string,
  severity?: 'low' | 'medium' | 'high' | 'critical'
): Promise<number> {
  try {
    const result = await db.query(
      `INSERT INTO vulnerability_reports
       (report_type, description, related_errand_id, related_user_id, contact_phone, contact_email, severity, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', NOW())
       RETURNING id`,
      [reportType, description, relatedErrandId || null, relatedUserId || null, contactPhone || null, contactEmail || null, severity || 'medium']
    );

    const reportId = result.rows[0].id;

    // Alert support team for critical reports
    if (severity === 'critical') {
      console.warn(`🚨 CRITICAL VULNERABILITY REPORT #${reportId}: ${reportType}`);
      // TODO: Send to support team
    }

    return reportId;
  } catch (error) {
    console.error('Error submitting vulnerability report:', error);
    throw error;
  }
}
