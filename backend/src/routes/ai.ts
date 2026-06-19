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

    console.log('[Extract] Input:', input);

    // Extract postal code first (6 consecutive digits anywhere in input)
    const postalCodeMatch = input.match(/\b(\d{6})\b/);
    const postalCode = postalCodeMatch ? postalCodeMatch[1] : '';

    // Extract title - split on common delimiters and take meaningful part
    let titleParts = input.split(/\s+(?:at\s+)?\d{6}|tomorrow|today|at\s+\d+\s*(?:am|pm)|\$\d+|\d+\s*(?:hour|hr|h)/i);
    let title = titleParts[0].trim().substring(0, 50) || 'Task';

    // Parse date - look for "tomorrow", day names
    let date = '';
    if (/tomorrow/i.test(input)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
    } else if (/today/i.test(input)) {
      date = new Date().toISOString().split('T')[0];
    } else {
      const dateMatch = input.match(/on\s+([a-zA-Z]+day)/i);
      if (dateMatch) {
        const dayStr = dateMatch[1].toLowerCase();
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

    // Parse time - look for patterns like "3pm", "15:00", "3:00pm"
    let time = '';
    const timeMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)|(\d{1,2})\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1] || timeMatch[4]);
      const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = (timeMatch[3] || timeMatch[5])?.toLowerCase();
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    // Parse duration - look for "3 hours", "2 hrs", "3h"
    let duration = '';
    const durationMatch = input.match(/(\d+)\s*(hour|hr|h)/i);
    if (durationMatch) {
      duration = durationMatch[1];
    }

    // Parse budget - look for "$100", "budget $100", "$100"
    let budget = '';
    const budgetMatch = input.match(/[\$](\d+)|budget\s*[\$]?(\d+)/i);
    if (budgetMatch) {
      budget = budgetMatch[1] || budgetMatch[2];
    }

    console.log('[Extract] Parsed - title:', title, 'postal:', postalCode, 'time:', time, 'duration:', duration, 'budget:', budget);

    // Use OneMap API to lookup address from postal code
    let area = 'Singapore';
    let fullAddress = `Singapore ${postalCode}`;

    if (postalCode) {
      try {
        console.log(`[Hana] Looking up postal code: ${postalCode}`);
        const url = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
        url.searchParams.set('searchVal', postalCode);
        url.searchParams.set('returnGeom', 'Y');
        url.searchParams.set('getAddrDetails', 'Y');

        const oneMapResponse = await fetch(url.toString());
        const data = await oneMapResponse.json();

        console.log(`[Hana] OneMap response:`, data);

        if (data?.results && data.results.length > 0) {
          const result = data.results[0];
          // Use ADDRESS field directly from OneMap
          fullAddress = result.ADDRESS || `Singapore ${postalCode}`;

          // Extract area from road name
          area = result.ROAD_NAME || 'Singapore';
          console.log(`[Hana] Found address: ${fullAddress}, area: ${area}`);
        } else {
          console.log(`[Hana] No results from OneMap for ${postalCode}`);
        }
      } catch (error) {
        console.error(`[Hana] OneMap lookup error for ${postalCode}:`, error instanceof Error ? error.message : error);
        fullAddress = `Singapore ${postalCode}`;
        area = 'Singapore';
      }
    }

    // Detect category from keywords in title or input (map to correct category IDs)
    let category = '';
    const inputLower = input.toLowerCase();

    // Category mapping
    if (inputLower.includes('elder') || inputLower.includes('caregiv') || inputLower.includes('companion')) {
      category = 'eldercare'; // Caregiving & Elder Companionship
    } else if (inputLower.includes('child') || inputLower.includes('babysit') || inputLower.includes('school') || inputLower.includes('pickup') || inputLower.includes('dropoff')) {
      category = 'childcare'; // Childcare & School Pickup/Drop-off
    } else if (inputLower.includes('clean') || inputLower.includes('laundry') || inputLower.includes('wash') || inputLower.includes('maintenance') || inputLower.includes('repair') || inputLower.includes('fix') || inputLower.includes('install')) {
      category = 'homehelp'; // Household Errands & Home Maintenance
    } else if (inputLower.includes('wellness') || inputLower.includes('mental') || inputLower.includes('health') || inputLower.includes('therapy')) {
      category = 'wellness'; // Wellness Support (incl. Mental Wellness)
    } else if (inputLower.includes('cross') || inputLower.includes('border') || inputLower.includes('trip') || inputLower.includes('travel')) {
      category = 'tripcarry'; // Cross-Border Errands
    } else if (inputLower.includes('dog') || inputLower.includes('pet') || inputLower.includes('cat') || inputLower.includes('groom') || inputLower.includes('walk') || inputLower.includes('sitting')) {
      category = 'petcare'; // Pet Care (sitting, grooming, walking)
    } else if (inputLower.includes('deliver') || inputLower.includes('parcel') || inputLower.includes('food') || inputLower.includes('document')) {
      category = 'delivery'; // Delivery (local errands, parcels, food, documents)
    } else if (inputLower.includes('event') || inputLower.includes('setup') || inputLower.includes('shop') || inputLower.includes('plan')) {
      category = 'eventhelp'; // Events (setup, shopping, planning)
    } else if (inputLower.includes('donate') || inputLower.includes('giveback')) {
      category = 'donate'; // Donate / Giveback
    } else if (inputLower.includes('business') || inputLower.includes('sme') || inputLower.includes('micro')) {
      category = 'localbiz'; // Microservices for Local SMEs
    } else {
      // Default fallback
      category = 'homehelp';
    }

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
        category,
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
    const { title, description, category } = req.body;

    // Use provided category or detect from title/description
    let detectedCategory = category || 'homehelp';

    // Suggest skills based on category
    const skillMap: Record<string, string[]> = {
      'eldercare': ['Empathy', 'Patience', 'Communication', 'Care skills'],
      'childcare': ['Patience', 'Communication', 'Child safety awareness', 'Reliability'],
      'homehelp': ['Attention to detail', 'Time management', 'Problem-solving'],
      'wellness': ['Empathy', 'Active listening', 'Confidentiality'],
      'tripcarry': ['Organization', 'Logistics', 'Communication', 'Reliability'],
      'petcare': ['Dog handling', 'Patience', 'Physical fitness', 'Animal care'],
      'delivery': ['Time management', 'Reliability', 'Attention to detail', 'Driving'],
      'eventhelp': ['Organization', 'Creativity', 'Communication', 'Time management'],
      'donate': ['Compassion', 'Organization', 'Communication'],
      'localbiz': ['Business acumen', 'Problem-solving', 'Communication'],
    };

    const skills = skillMap[detectedCategory] || [];

    // Generate AI-suggested description (more detailed than title)
    const descriptionMap: Record<string, string> = {
      'eldercare': `${title}. Provide compassionate support and companionship. Ensure comfort, safety, and well-being at all times. Follow any special instructions.`,
      'childcare': `${title}. Ensure child's safety and well-being. Follow schedule and parent instructions. Provide updates and report any issues immediately.`,
      'homehelp': `${title}. Complete the task professionally and thoroughly. Ensure all work meets quality standards. Communicate any issues that arise.`,
      'wellness': `${title}. Provide supportive and confidential assistance. Follow best practices. Ensure comfort and respect at all times.`,
      'tripcarry': `${title}. Ensure items are handled carefully and delivered safely. Follow customs requirements where applicable.`,
      'petcare': `${title}. Handle with care and ensure pet safety and comfort. Provide fresh water and follow special instructions.`,
      'delivery': `${title}. Handle items carefully and deliver to specified location. Take photos if required. Communicate arrival.`,
      'eventhelp': `${title}. Complete setup/shopping/planning professionally. Follow instructions carefully. Ensure everything is ready on time.`,
      'donate': `${title}. Handle with care and respect. Follow all guidelines. Ensure smooth and successful completion.`,
      'localbiz': `${title}. Provide professional service to support local business operations. Ensure quality and reliability.`,
    };

    const suggestedDescription = descriptionMap[detectedCategory] || `${title}. Please complete the task professionally and communicate any issues.`;

    // Generate task-specific notes (actionable, not duplicating info)
    const notesMap: Record<string, string> = {
      'eldercare': 'Show respect and patience. Follow health protocols. Report any concerns.',
      'childcare': 'Know emergency contacts. Prioritize safety. Engage positively.',
      'homehelp': 'Use provided supplies if available. Clean as you work. Report any damage.',
      'wellness': 'Maintain confidentiality. Be a good listener. Report concerns appropriately.',
      'tripcarry': 'Check customs requirements. Keep items secure. Arrive on time.',
      'petcare': 'Check for health concerns. Use leash in public. Keep pet calm.',
      'delivery': 'Take care with items. Ring doorbell/call upon arrival. Update customer.',
      'eventhelp': 'Follow host instructions precisely. Arrive early if needed. Communicate updates.',
      'donate': 'Handle items with respect. Follow guidelines. Thank participants.',
      'localbiz': 'Deliver quality work. Communicate professionally. Support business goals.',
    };

    const notes = notesMap[detectedCategory] || 'Please ensure quality work and communicate any concerns.';

    res.json({
      success: true,
      data: {
        category: detectedCategory,
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
