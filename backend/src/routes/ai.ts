import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import * as biasDetector from '../modules/bias-detector.js';
import * as contentMod from '../modules/content-moderation.js';
import * as privacyLogger from '../modules/privacy-logger.js';
import * as explainability from '../modules/explainability.js';

const router = Router();

// POST /api/ai/verify-chas-eligibility - Verify CHAS eligibility with AI check
router.post('/verify-chas-eligibility', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { monthly_household_income } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!monthly_household_income || monthly_household_income < 0) {
      return res.status(400).json({ error: 'Invalid income value' });
    }

    // Basic income-based calculation
    let chasColor = 'none';
    let subsidy = 0;
    let reasonCode = 'income_above_limit';

    if (monthly_household_income <= 1900) {
      chasColor = 'blue';
      subsidy = 25;
      reasonCode = 'chas_blue_eligible';
    } else if (monthly_household_income <= 3900) {
      chasColor = 'green';
      subsidy = 15;
      reasonCode = 'chas_green_eligible';
    }

    // Check for suspicious patterns (AI verification)
    let verificationStatus = 'verified';
    let requiresReview = false;

    // Simple heuristic: extreme income values
    if (monthly_household_income > 50000) {
      verificationStatus = 'requires_review';
      requiresReview = true;
      reasonCode = 'income_verification_pending';
    }

    // Log the decision
    const auditLogId = await privacyLogger.logAiDecision({
      userId,
      action: 'verify_chas_eligibility',
      aiModel: 'rule_based',
      reasonCode,
      resultSummary: {
        monthly_household_income,
        chas_color: chasColor,
        subsidy_percentage: subsidy,
        verification_status: verificationStatus,
        requires_review: requiresReview,
      },
    });

    // If bias detected, log it
    if (requiresReview) {
      await biasDetector.logBiasDetection(auditLogId, {
        is_biased: false,
        confidence: 0.5,
        flags: ['income_extreme_value'],
        details: { monthly_household_income },
      });
    }

    res.json({
      success: true,
      data: {
        verified: !requiresReview,
        chas_card_color: chasColor,
        subsidy_percentage: subsidy,
        requires_manual_review: requiresReview,
        reason: explainability.formatReasonForUser(reasonCode),
        audit_log_id: auditLogId,
      },
    });
  } catch (error) {
    console.error('CHAS verification error:', error);
    res.status(500).json({ error: 'Failed to verify CHAS eligibility' });
  }
});

// POST /api/ai/review-analyzer - Analyze review for bias
router.post('/review-analyzer', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { review_text, doer_id } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!review_text || !doer_id) {
      return res.status(400).json({ error: 'review_text and doer_id required' });
    }

    // Detect proxies in review
    const proxyResult = await biasDetector.detectProxiesInReview(review_text);

    // Check historical bias trend for doer
    const trendResult = await biasDetector.checkHistoricalBiasTrend(doer_id);

    const reasonCode = proxyResult.is_biased ? 'potential_bias_detected' : 'title_keyword_match';

    // Log the analysis
    const auditLogId = await privacyLogger.logAiDecision({
      userId,
      action: 'review_analysis',
      aiModel: 'bias_detector',
      reasonCode,
      resultSummary: {
        proxy_result: proxyResult,
        trend_result: trendResult,
      },
    });

    if (proxyResult.is_biased || trendResult.is_biased) {
      await biasDetector.logBiasDetection(auditLogId, proxyResult);
    }

    res.json({
      success: true,
      data: {
        has_proxy_language: proxyResult.is_biased,
        proxy_flags: proxyResult.flags,
        proxy_confidence: proxyResult.confidence,
        historical_pattern_concern: trendResult.is_biased,
        pattern_flags: trendResult.flags,
        overall_concern: proxyResult.is_biased || trendResult.is_biased,
        recommendation: proxyResult.is_biased || trendResult.is_biased ? 'manual_review' : 'approved',
        audit_log_id: auditLogId,
      },
    });
  } catch (error) {
    console.error('Review analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze review' });
  }
});

// POST /api/ai/rank-doers - Rank doers with fairness audit
router.post('/rank-doers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errand_id, candidate_doers, audit_depth = 'quick' } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!errand_id || !Array.isArray(candidate_doers)) {
      return res.status(400).json({ error: 'errand_id and candidate_doers array required' });
    }

    // Simple scoring based on available data
    const rankedDoers = await Promise.all(
      candidate_doers.map(async (doer) => {
        const ratingResult = await db.query(
          `SELECT AVG(CAST(rating_score AS FLOAT)) as avg_rating, COUNT(*) as count
           FROM errand_assignments WHERE doer_id = $1`,
          [doer.doer_id]
        );

        const avgRating = ratingResult.rows[0]?.avg_rating
          ? parseFloat(ratingResult.rows[0].avg_rating)
          : 3.5;
        const completionCount = parseInt(ratingResult.rows[0]?.count || '0', 10);

        // Simple scoring (0-1)
        let score = 0.5;
        if (avgRating >= 4.8) score = 0.95;
        else if (avgRating >= 4.5) score = 0.85;
        else if (avgRating >= 4.0) score = 0.75;
        else if (avgRating >= 3.5) score = 0.65;

        // Boost for more completions
        score *= Math.min(1, 0.5 + completionCount / 10);

        return {
          doer_id: doer.doer_id,
          score: Math.min(score, 1),
          score_breakdown: {
            rating: Math.min(1, avgRating / 5),
            completion_history: Math.min(1, completionCount / 20),
            overall: Math.min(score, 1),
          },
          rank_reason: 'high_rating_history',
        };
      })
    );

    // Sort by score
    rankedDoers.sort((a, b) => b.score - a.score);

    // Perform fairness audit
    const fairnessAudit = await biasDetector.auditRankingFairness(
      rankedDoers,
      audit_depth as 'quick' | 'thorough'
    );

    const reasonCode = fairnessAudit.is_biased ? 'potential_bias_detected' : 'high_skill_fit';

    // Log the ranking decision
    const auditLogId = await privacyLogger.logAiDecision({
      userId,
      action: 'rank_doers',
      aiModel: 'skill_matcher',
      reasonCode,
      resultSummary: {
        errand_id,
        total_candidates: candidate_doers.length,
        ranked_count: rankedDoers.length,
        fairness_audit: fairnessAudit,
        top_scorer: rankedDoers[0]?.score,
      },
    });

    if (fairnessAudit.is_biased) {
      await biasDetector.logBiasDetection(auditLogId, fairnessAudit);
    }

    res.json({
      success: true,
      data: {
        ranked_doers: rankedDoers,
        fairness_audit: {
          passed: !fairnessAudit.is_biased,
          notes: fairnessAudit.details.recommendation || 'no_issues',
          confidence: fairnessAudit.confidence,
        },
        audit_log_id: auditLogId,
      },
    });
  } catch (error) {
    console.error('Ranking error:', error);
    res.status(500).json({ error: 'Failed to rank doers' });
  }
});

// POST /api/ai/suggest-recurrence - Suggest recurrence pattern
router.post('/suggest-recurrence', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!title || !category) {
      return res.status(400).json({ error: 'title and category required' });
    }

    // Simple heuristics based on category
    let suggestedPattern = { repeat_every: 1, repeat_unit: 'week', confidence: 0.6 };
    let reasonCode = 'similar_errands_weekly';

    const lowerTitle = title.toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    const fullText = `${lowerTitle} ${lowerDesc}`;

    if (
      category === 'pet-care' ||
      fullText.includes('walk') ||
      fullText.includes('dog') ||
      fullText.includes('pet')
    ) {
      suggestedPattern = { repeat_every: 1, repeat_unit: 'day', confidence: 0.8 };
      reasonCode = 'similar_errands_daily';
    } else if (
      category === 'cleaning-laundry' ||
      fullText.includes('clean') ||
      fullText.includes('laundry')
    ) {
      suggestedPattern = { repeat_every: 1, repeat_unit: 'week', confidence: 0.75 };
      reasonCode = 'similar_errands_weekly';
    } else if (
      category === 'shopping-errands' ||
      fullText.includes('grocery') ||
      fullText.includes('shop')
    ) {
      suggestedPattern = { repeat_every: 2, repeat_unit: 'week', confidence: 0.65 };
      reasonCode = 'similar_errands_weekly';
    }

    // Log the suggestion
    const auditLogId = await privacyLogger.logAiDecision({
      userId,
      action: 'suggest_recurrence',
      aiModel: 'pattern_detector',
      reasonCode,
      resultSummary: {
        category,
        suggested_pattern: suggestedPattern,
      },
    });

    res.json({
      success: true,
      data: {
        suggested_pattern: {
          repeat_every: suggestedPattern.repeat_every,
          repeat_unit: suggestedPattern.repeat_unit,
          occurrences: null,
          confidence: suggestedPattern.confidence,
          reason: explainability.formatReasonForUser(reasonCode),
        },
        validation: {
          valid: true,
          warnings: [],
        },
        audit_log_id: auditLogId,
      },
    });
  } catch (error) {
    console.error('Recurrence suggestion error:', error);
    res.status(500).json({ error: 'Failed to suggest recurrence' });
  }
});

// POST /api/ai/check-content - Content moderation
router.post('/check-content', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, errand_id } = req.body;
    const userId = req.userId ? parseInt(req.userId, 10) : 0;

    if (!title) {
      return res.status(400).json({ error: 'title required' });
    }

    const moderationResult = await contentMod.checkContentWithQwen(title, description);

    const reasonCode = moderationResult.is_safe ? 'title_keyword_match' : 'content_moderation_warning';

    if (userId > 0) {
      const auditLogId = await privacyLogger.logAiDecision({
        userId,
        action: 'content_moderation',
        aiModel: 'qwen',
        reasonCode,
        resultSummary: moderationResult,
      });

      if (!moderationResult.is_safe) {
        await biasDetector.logBiasDetection(auditLogId, {
          is_biased: false,
          confidence: moderationResult.confidence,
          flags: moderationResult.flags,
          details: moderationResult.details,
        });
      }
    }

    res.json({
      success: true,
      data: {
        is_safe: moderationResult.is_safe,
        issues: moderationResult.issues,
        confidence: moderationResult.confidence,
        flags: moderationResult.flags,
        recommendation: moderationResult.is_safe ? 'approved' : 'manual_review',
      },
    });
  } catch (error) {
    console.error('Content check error:', error);
    res.status(500).json({ error: 'Failed to check content' });
  }
});

// GET /api/ai/audit-log - Get audit log for current user
router.get('/audit-log', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { action, limit = 50 } = req.query;
    const userId = parseInt(req.userId || '0', 10);

    const logs = await privacyLogger.getAuditLog(
      userId,
      action as string | undefined,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/ai/bias-audit-summary - Get bias audit summary (for admins)
router.get('/bias-audit-summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM bias_audit_summary ORDER BY flagged_logs DESC LIMIT 20`
    );

    res.json({
      success: true,
      data: {
        summary: result.rows,
        total_users_flagged: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Bias audit summary error:', error);
    res.status(500).json({ error: 'Failed to fetch audit summary' });
  }
});

router.post('/extract-task-info', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });

    // Extract title - first few words before "at"
    const titleMatch = input.match(/^(.+?)\s+at\s+/i) || input.match(/^(.+?)(?:\s+on|\s+for|,)/i);
    const title = titleMatch ? titleMatch[1].trim().substring(0, 50) : input.substring(0, 50);

    // Parse location
    const locationMatch = input.match(/at\s+(\d{6}|\S+?)(?:\s+on|\s+at|,)/i);
    const location = locationMatch ? locationMatch[1].trim() : '';
    const postalCode = location.match(/\d{6}/) ? location : '';

    // Parse date
    const dateMatch = input.match(/on\s+([a-zA-Z]+day|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    let date = '';
    if (dateMatch) {
      const dayStr = dateMatch[1].toLowerCase();
      if (dayStr.includes('day')) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.findIndex(d => dayStr.includes(d));
        if (dayIndex >= 0) {
          const today = new Date();
          const current = today.getDay();
          let diff = dayIndex - current;
          if (diff <= 0) diff += 7;
          const result = new Date(today);
          result.setDate(result.getDate() + diff);
          date = result.toISOString().split('T')[0];
        }
      }
    }

    // Parse time
    const timeMatch = input.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    let time = '10:00';
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    // Parse duration
    const durationMatch = input.match(/for\s+(\d+)\s*(hour|hr)/i);
    const duration = durationMatch ? durationMatch[1] : '';

    // Parse budget
    const budgetMatch = input.match(/budget\s*\$?(\d+)/i);
    const budget = budgetMatch ? budgetMatch[1] : '';

    // Map postal code to area (Singapore postal code prefixes)
    const postalCodeAreas: Record<string, { area: string; building: string }> = {
      '01': { area: 'Raffles', building: 'Raffles Place' },
      '02': { area: 'Cecil', building: 'Cecil Street' },
      '03': { area: 'Shenton', building: 'Shenton Way' },
      '04': { area: 'Telok', building: 'Telok Ayer' },
      '05': { area: 'Outram', building: 'Outram Park' },
      '06': { area: 'Tiong Bahru', building: 'Tiong Bahru' },
      '07': { area: 'Queenstown', building: 'Queenstown' },
      '08': { area: 'Bukit Merah', building: 'Bukit Merah' },
      '09': { area: 'Redhill', building: 'Redhill' },
      '10': { area: 'Tanglin', building: 'Tanglin' },
      '11': { area: 'Novena', building: 'Novena' },
      '12': { area: 'Balestier', building: 'Balestier' },
      '13': { area: 'Potong Pasir', building: 'Potong Pasir' },
      '14': { area: 'Geylang', building: 'Geylang' },
      '15': { area: 'Kallang', building: 'Kallang' },
      '16': { area: 'Whampoa', building: 'Whampoa' },
      '17': { area: 'Serangoon', building: 'Serangoon' },
      '18': { area: 'Macpherson', building: 'Macpherson' },
      '19': { area: 'Tai Seng', building: 'Tai Seng' },
      '20': { area: 'Bishan', building: 'Bishan' },
      '21': { area: 'Ang Mo Kio', building: 'Ang Mo Kio' },
      '22': { area: 'Hougang', building: 'Hougang' },
      '23': { area: 'Punggol', building: 'Punggol' },
      '24': { area: 'Tampines', building: 'Tampines' },
      '25': { area: 'Pasir Ris', building: 'Pasir Ris' },
      '26': { area: 'Tampines', building: 'Tampines' },
      '27': { area: 'Bedok', building: 'Bedok' },
      '28': { area: 'Changi', building: 'Changi' },
      '29': { area: 'Changi', building: 'Changi' },
      '30': { area: 'Marine Parade', building: 'Marine Parade' },
      '31': { area: 'Marine Parade', building: 'Marine Parade' },
      '32': { area: 'Katong', building: 'Katong' },
      '33': { area: 'Joo Chiat', building: 'Joo Chiat' },
      '34': { area: 'Eunos', building: 'Eunos' },
      '35': { area: 'Geylang Lorong', building: 'Geylang Lorong' },
      '36': { area: 'Kembangan', building: 'Kembangan' },
      '37': { area: 'Teban', building: 'Teban' },
      '38': { area: 'Clementi', building: 'Clementi' },
      '39': { area: 'Clementi', building: 'Clementi' },
      '40': { area: 'Bukit Batok', building: 'Bukit Batok' },
      '41': { area: 'Bukit Gombak', building: 'Bukit Gombak' },
      '42': { area: 'Bukit Panjang', building: 'Bukit Panjang' },
      '43': { area: 'Choa Chu Kang', building: 'Choa Chu Kang' },
      '44': { area: 'Yung Ho', building: 'Yung Ho' },
      '45': { area: 'Yung Ho', building: 'Yung Ho' },
      '46': { area: 'Lim Chu Kang', building: 'Lim Chu Kang' },
      '47': { area: 'Kranji', building: 'Kranji' },
      '48': { area: 'Woodlands', building: 'Woodlands' },
      '49': { area: 'Woodlands', building: 'Woodlands' },
      '50': { area: 'Yishun', building: 'Yishun' },
      '51': { area: 'Yishun', building: 'Yishun' },
      '52': { area: 'Sembawang', building: 'Sembawang' },
      '53': { area: 'Sembawang', building: 'Sembawang' },
      '54': { area: 'Mandai', building: 'Mandai' },
      '55': { area: 'Mandai', building: 'Mandai' },
      '56': { area: 'Admiralty', building: 'Admiralty' },
      '57': { area: 'Punggol', building: 'Punggol' },
      '58': { area: 'Marine Parade', building: 'Marine Parade' },
      '59': { area: 'Pasir Ris', building: 'Pasir Ris' },
      '60': { area: 'Sentosa', building: 'Sentosa' },
      '61': { area: 'Bukit Merah', building: 'Bukit Merah' },
      '62': { area: 'Tiong Bahru', building: 'Tiong Bahru' },
      '63': { area: 'Bukit Merah', building: 'Bukit Merah' },
      '64': { area: 'Bukit Merah', building: 'Bukit Merah' },
      '65': { area: 'Bukit Merah', building: 'Bukit Merah' },
      '66': { area: 'Tiong Bahru', building: 'Tiong Bahru' },
      '67': { area: 'Tiong Bahru', building: 'Tiong Bahru' },
      '68': { area: 'Tanjong Pagar', building: 'Pinnacle@Duxton' },
      '69': { area: 'Tanjong Pagar', building: 'Tanjong Pagar' },
      '70': { area: 'Clementi', building: 'Clementi' },
      '71': { area: 'Clementi', building: 'Clementi' },
      '72': { area: 'Clementi', building: 'Clementi' },
      '73': { area: 'Clementi', building: 'Clementi' },
      '74': { area: 'Clementi', building: 'Clementi' },
      '75': { area: 'Dover', building: 'Dover' },
      '76': { area: 'Bukit Timah', building: 'Bukit Timah' },
      '77': { area: 'Bukit Timah', building: 'Bukit Timah' },
      '78': { area: 'Bukit Timah', building: 'Bukit Timah' },
      '79': { area: 'Bukit Timah', building: 'Bukit Timah' },
      '80': { area: 'Farrer', building: 'Farrer' },
      '81': { area: 'Farrer', building: 'Farrer' },
      '82': { area: 'Farrer', building: 'Farrer' },
      '83': { area: 'Ghim Moh', building: 'Ghim Moh' },
    };

    let area = 'Singapore';
    let building = 'Location';
    if (postalCode && postalCode.length >= 2) {
      const prefix = postalCode.substring(0, 2);
      const areaData = postalCodeAreas[prefix];
      if (areaData) {
        area = areaData.area;
        building = areaData.building;
      }
    }

    const fullAddress = postalCode ? `${building}, Singapore ${postalCode}` : '';

    res.json({
      success: true,
      data: {
        title,
        description: '',
        location: area,
        fullAddress,
        date,
        time,
        duration,
        durationUnit: 'Hr',
        budget,
        category: 'cleaning-laundry',
        postalCode,
        notes: '',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to extract' });
  }
});

router.post('/content-filter', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    res.json({
      success: true,
      data: { status: 'SAFE' },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to filter' });
  }
});

router.post('/suggestions', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const text = `${title} ${description}`.toLowerCase();

    // Detect category from keywords
    let category = 'other';
    if (text.includes('clean')) category = 'cleaning-laundry';
    else if (text.includes('walk') || text.includes('dog') || text.includes('pet')) category = 'pet-care';
    else if (text.includes('shop') || text.includes('buy')) category = 'shopping-errands';
    else if (text.includes('move') || text.includes('delivery')) category = 'delivery-moving';
    else if (text.includes('tutor') || text.includes('teach') || text.includes('child')) category = 'childcare-tutoring';

    // Suggest skills based on category
    const skillMap: Record<string, string[]> = {
      'cleaning-laundry': ['Thorough cleaning', 'Attention to detail', 'Time management'],
      'pet-care': ['Dog handling', 'Patience', 'Physical fitness'],
      'shopping-errands': ['Time management', 'Organization', 'Reliability'],
      'delivery-moving': ['Physical fitness', 'Driving', 'Logistics'],
      'childcare-tutoring': ['Patience', 'Communication', 'Teaching skills'],
    };

    const skills = skillMap[category] || [];

    // Generate AI-suggested description (more detailed than title)
    const descriptionMap: Record<string, string> = {
      'cleaning-laundry': `${title}. Please ensure all surfaces are thoroughly cleaned, dusted, and organized. Vacuum or sweep floors and dispose of trash properly.`,
      'pet-care': `${title}. Please handle with care and ensure the pet is safe and comfortable. Provide fresh water and follow any special instructions.`,
      'shopping-errands': `${title}. Please get exactly what is needed and keep receipts. Call if any items are unavailable.`,
      'delivery-moving': `${title}. Please handle items carefully and deliver to the specified location. Take photos if required.`,
      'childcare-tutoring': `${title}. Please follow the schedule and provide updates. Ensure the child's safety and well-being at all times.`,
    };

    const suggestedDescription = descriptionMap[category] || `${title}. Please complete the task professionally and communicate any issues.`;

    // Generate task-specific notes (actionable, not duplicating info)
    const notesMap: Record<string, string> = {
      'cleaning-laundry': 'Use provided cleaning supplies if available. Empty all trash bins.',
      'pet-care': 'Check for any health concerns. Keep pet on leash in public areas.',
      'shopping-errands': 'Purchase fresh items. Avoid expired products. Keep within budget.',
      'delivery-moving': 'Take extra care with fragile items. Ring doorbell/call upon arrival.',
      'childcare-tutoring': 'Engage child in learning activities. Report any issues immediately.',
    };

    const notes = notesMap[category] || 'Please ensure quality work and communicate any concerns.';

    res.json({
      success: true,
      data: {
        category,
        description: suggestedDescription,
        suggestedBudget: 50,
        notes,
        skills,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;
