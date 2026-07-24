import db from '../db.js';
import { QwenAI } from './qwenService.js';

export interface VulnerabilityAssessment {
  vulnerabilityScore: number;
  riskFactors: string[];
  recommendedSupport: string[];
}

export interface CoercionDetection {
  suspicionLevel: 'low' | 'medium' | 'high';
  indicators: string[];
  recommendedAction: string;
}

export async function assessUserVulnerability(userId: number): Promise<VulnerabilityAssessment> {
  try {
    const userResult = await db.query(
      `SELECT id, display_name, created_at, average_rating, total_jobs_completed
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { vulnerabilityScore: 0, riskFactors: [], recommendedSupport: [] };
    }

    const user = userResult.rows[0];

    const capResult = await db.query(
      `SELECT physical_limitations, health_conditions, vulnerable_support_needs
       FROM user_capabilities WHERE user_id = $1`,
      [userId]
    );

    const capabilities = capResult.rows[0] || {};

    const prompt = `Assess vulnerability (0.0-1.0): ${user.total_jobs_completed || 0} jobs, rating ${user.average_rating || 'N/A'}, needs: ${capabilities.vulnerable_support_needs || 'none'}.
Return JSON: {"score": number, "riskFactors": [], "supportNeeded": []}`;

    const response = await QwenAI.call([{ role: 'user', content: prompt }]);

    let assessment: any = { score: 0.3, riskFactors: [], supportNeeded: [] };
    try {
      assessment = JSON.parse(response);
    } catch (e) {
      console.warn('[AI Safety] Parse failed');
    }

    return {
      vulnerabilityScore: assessment.score || 0,
      riskFactors: assessment.riskFactors || [],
      recommendedSupport: assessment.supportNeeded || [],
    };
  } catch (error) {
    console.error('[AI Safety] Assessment error:', error);
    return { vulnerabilityScore: 0, riskFactors: [], recommendedSupport: [] };
  }
}

export async function detectCoercion(userId: number, timeframe: 'day' | 'week' | 'month' = 'month'): Promise<CoercionDetection> {
  try {
    const interval = timeframe === 'day' ? '1 day' : timeframe === 'week' ? '7 days' : '30 days';

    const activityResult = await db.query(
      `SELECT COUNT(*) as jobs_accepted, AVG(e.budget) as avg_budget
       FROM errands e WHERE doer_id = $1 AND completed_at > NOW() - INTERVAL $2`,
      [userId, interval]
    );

    const activity = activityResult.rows[0] || {};

    const userResult = await db.query('SELECT average_rating FROM users WHERE id = $1', [userId]);
    const userRating = userResult.rows[0]?.average_rating || 3.0;

    const indicators: string[] = [];
    let suspicionScore = 0;

    if (activity.jobs_accepted > 10) {
      indicators.push('unusually_high_job_acceptance');
      suspicionScore += 0.2;
    }

    if (activity.avg_budget < 10) {
      indicators.push('accepting_very_low_pay');
      suspicionScore += 0.25;
    }

    if (userRating < 2.5 && activity.jobs_accepted > 5) {
      indicators.push('receiving_low_ratings');
      suspicionScore += 0.15;
    }

    let suspicionLevel: 'low' | 'medium' | 'high' = 'low';
    if (suspicionScore > 0.7) suspicionLevel = 'high';
    else if (suspicionScore > 0.4) suspicionLevel = 'medium';

    let recommendedAction = 'monitor';
    if (suspicionLevel === 'high') {
      recommendedAction = 'flag_for_review';
      await createAdminAlert({ type: 'potential_trafficking', userId, evidence: indicators, severity: 'high' }).catch(console.error);
    }

    return { suspicionLevel, indicators, recommendedAction };
  } catch (error) {
    console.error('[AI Safety] Coercion error:', error);
    return { suspicionLevel: 'low', indicators: [], recommendedAction: 'monitor' };
  }
}

async function createAdminAlert(params: { type: string; userId: number; evidence: string[]; severity: string }) {
  try {
    await db.query(
      `INSERT INTO safety_flags (user_id, flag_type, severity, description, markers)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.userId, params.type, params.severity, `AI-detected ${params.type}`, JSON.stringify(params.evidence)]
    );
  } catch (error) {
    console.error('[AI Safety] Alert creation error:', error);
  }
}
