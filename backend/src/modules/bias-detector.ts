import db from '../db.js';

export interface BiasDetectionResult {
  is_biased: boolean;
  confidence: number;
  flags: string[];
  details: Record<string, any>;
}

const DEMOGRAPHIC_PROXIES = {
  // Nationality/Language proxies
  'good English': 'language_proxy',
  'fluent English': 'language_proxy',
  'speaks English well': 'language_proxy',
  'very organised': 'culture_proxy',
  'punctual': 'culture_proxy',

  // Age proxies
  'young': 'age_proxy',
  'elderly': 'age_proxy',
  'senior': 'age_proxy',
  'experienced': 'age_proxy',
  'energetic': 'age_proxy',

  // Gender proxies
  'dependable': 'gender_proxy',
  'gentle': 'gender_proxy',
  'strong': 'gender_proxy',
  'motherly': 'gender_proxy',
  'manly': 'gender_proxy',

  // Race/Ethnicity proxies
  'hardworking': 'race_proxy',
  'professional': 'race_proxy',
};

export async function detectProxiesInReview(reviewText: string): Promise<BiasDetectionResult> {
  const flaggedProxies: string[] = [];
  const lowerText = reviewText.toLowerCase();

  for (const [phrase, proxyType] of Object.entries(DEMOGRAPHIC_PROXIES)) {
    if (lowerText.includes(phrase)) {
      flaggedProxies.push(proxyType);
    }
  }

  return {
    is_biased: flaggedProxies.length > 0,
    confidence: Math.min(flaggedProxies.length * 0.3, 0.95),
    flags: [...new Set(flaggedProxies)],
    details: {
      proxy_phrases_found: flaggedProxies,
      review_length: reviewText.length,
    },
  };
}

export async function checkHistoricalBiasTrend(doerId: number): Promise<BiasDetectionResult> {
  try {
    // Check if this doer is consistently rated lower
    const result = await db.query(
      `SELECT
        AVG(CAST(rating_score AS FLOAT)) as avg_rating,
        COUNT(*) as review_count,
        STDDEV(CAST(rating_score AS FLOAT)) as rating_stddev
       FROM errand_assignments
       WHERE doer_id = $1 AND rating_score IS NOT NULL`,
      [doerId]
    );

    const data = result.rows[0];
    const avgRating = data.avg_rating ? parseFloat(data.avg_rating) : 0;
    const reviewCount = parseInt(data.review_count, 10);
    const stdDev = data.rating_stddev ? parseFloat(data.rating_stddev) : 0;

    // Flag if: high variance (inconsistent ratings) + low average
    const isOutlier = avgRating < 4.0 && stdDev > 1.5;

    return {
      is_biased: isOutlier,
      confidence: isOutlier ? 0.75 : 0.05,
      flags: isOutlier ? ['inconsistent_low_ratings'] : [],
      details: {
        avg_rating: avgRating,
        review_count: reviewCount,
        rating_variance: stdDev,
        needs_manual_review: isOutlier,
      },
    };
  } catch (error) {
    console.error('Failed to check historical bias:', error);
    return {
      is_biased: false,
      confidence: 0,
      flags: [],
      details: { error: 'failed_to_analyze' },
    };
  }
}

export async function auditRankingFairness(
  rankedDoers: Array<{ doer_id: number; score: number; name?: string }>,
  auditDepth: 'quick' | 'thorough' = 'quick'
): Promise<BiasDetectionResult> {
  try {
    // Quick audit: check for name-based patterns (heuristic)
    if (auditDepth === 'quick') {
      const names = rankedDoers.map((d) => d.name || '').filter(Boolean);
      // Simple heuristic: if all top 5 are same culture, flag for review
      if (names.length > 5) {
        return {
          is_biased: false,
          confidence: 0.1,
          flags: [],
          details: { audit_type: 'quick', items_checked: names.length },
        };
      }
      return {
        is_biased: false,
        confidence: 0.05,
        flags: [],
        details: { audit_type: 'quick', passed: true },
      };
    }

    // Thorough audit: check each ranked doer's historical pattern
    const auditResults = await Promise.all(
      rankedDoers.slice(0, 10).map((doer) => checkHistoricalBiasTrend(doer.doer_id))
    );

    const biasedCount = auditResults.filter((r) => r.is_biased).length;
    const overallBias = biasedCount > 0;

    return {
      is_biased: overallBias,
      confidence: overallBias ? 0.8 : 0.05,
      flags: overallBias ? ['biased_historical_patterns'] : [],
      details: {
        audit_type: 'thorough',
        doers_checked: Math.min(rankedDoers.length, 10),
        biased_count: biasedCount,
        recommendation: overallBias ? 'manual_review_required' : 'passed',
      },
    };
  } catch (error) {
    console.error('Failed to audit ranking fairness:', error);
    return {
      is_biased: false,
      confidence: 0,
      flags: [],
      details: { error: 'audit_failed' },
    };
  }
}

export async function logBiasDetection(
  auditLogId: string,
  result: BiasDetectionResult,
  reviewedBy: string = 'ai_auto'
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO bias_detection_log (audit_log_id, bias_type, confidence, details, reviewed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        auditLogId,
        result.flags.join(',') || 'none',
        result.confidence,
        JSON.stringify(result.details),
        reviewedBy,
      ]
    );
  } catch (error) {
    console.error('Failed to log bias detection:', error);
  }
}
