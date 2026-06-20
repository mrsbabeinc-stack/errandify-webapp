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

// Sanitize input to prevent XSS, SQL injection, and command injection
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Remove HTML/XML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b|--)/gi, '');

  // Remove command injection patterns
  sanitized = sanitized.replace(/(\$\(|`|&&|\|\||;\s*rm|\bwget\b|\bcurl\b)/gi, '');

  // Remove excessive special characters
  sanitized = sanitized.replace(/[^\w\s\-.,!?@#$%&()']/g, '');

  // Remove excessive repetition
  sanitized = sanitized.replace(/(.)\1{10,}/g, '$1');

  return sanitized.trim();
}

router.post('/extract-task-info', async (req: Request, res: Response) => {
  try {
    let { input } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });

    // Sanitize input
    input = sanitizeInput(input);
    if (!input || input.length === 0) {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    console.log('[Extract] Input:', input);

    // Extract postal code first (6 consecutive digits anywhere in input)
    const postalCodeMatch = input.match(/\b(\d{6})\b/);
    const postalCode = postalCodeMatch ? postalCodeMatch[1] : '';

    // Extract title - keep only meaningful words, filter filler words
    console.log('[Extract] Raw input:', input);

    // Filler words to remove (articles, prepositions, common function words, category names, certification words)
    // DO NOT remove action verbs: take, care, help, clean, pick, etc.
    const fillerWords = /\b(if|at|on|for|of|to|the|a|an|and|or|in|is|are|be|by|from|with|as|i|me|my|we|you|your|our|their|this|that|these|those|it|which|who|what|when|where|why|how|can|could|will|would|should|must|may|might|today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat|childcare|eldercare|petcare|homehelp|eventhelp|delivery|service|certified|certification|trained|professional|experienced|budget)\b/gi;

    let title = input
      // Remove all weird punctuation at start and throughout
      .replace(/^[^\w\s]+/, '') // Remove non-word chars at start
      .replace(/[+\-*~`!@#$%^&|\\\/=<>?:;"'.,_(){}[\]]/g, ' ') // Replace weird punctuation with spaces
      // Remove postal codes
      .replace(/\s*\d{6}\s*/g, ' ')
      // Remove times (5pm, 7am, 7:00pm, etc)
      .replace(/\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
      .replace(/\s*\d{1,2}(?:am|pm)\b/gi, '')
      // Remove durations - match digits followed by hour/min keywords (5hour, 3hours, 30mins, etc)
      .replace(/\s*\d+\s*(?:hour|hr|h|hours|min|mins|m|minute|minutes)?\b/gi, '')
      // Remove amounts ($100, @50, etc)
      .replace(/[\$@]\s*\d+/g, '')
      // Remove trailing numbers
      .replace(/\s+\d{2,4}\s*$/g, '')
      // Remove filler words (keep only meaningful words)
      .replace(fillerWords, ' ')
      // Collapse spaces
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);

    console.log('[Extract] After cleanup:', title);

    // Reorder words for natural-sounding title
    // Priority: (action verb, person/object, purpose/detail)
    const words = title.split(/\s+/);
    const actionVerbs = ['take', 'help', 'clean', 'care', 'pick', 'send', 'buy', 'cook', 'drive', 'repair', 'watch', 'babysit', 'walk', 'deliver', 'setup'];
    const priorities = {
      0: ['take', 'help', 'clean', 'care', 'do', 'make', 'fix', 'pick', 'send', 'buy', 'cook', 'drive', 'repair', 'watch', 'babysit', 'walk', 'deliver', 'setup'], // Verbs first
      1: ['baby', 'kid', 'mom', 'dad', 'child', 'dog', 'cat', 'house', 'home', 'car', 'lawn', 'laundry', 'groceries', 'elderly', 'parent'], // Objects/people second
      2: ['care', 'help', 'service', 'work', 'job', 'errand'], // Purposes last
    };

    const sortedWords = words.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aPriority = priorities[0].includes(aLower) ? 0 : priorities[1].includes(aLower) ? 1 : 2;
      const bPriority = priorities[0].includes(bLower) ? 0 : priorities[1].includes(bLower) ? 1 : 2;
      return aPriority - bPriority;
    });

    title = sortedWords.join(' ');

    // Auto-correct common mistakes and capitalize
    title = title
      .replace(/\bmykid\b/gi, 'my kid')
      .replace(/\byour\b/gi, 'my')
      .replace(/\bmim(?:s)?\b/gi, 'mom') // Fix "mim" or "mims" -> "mom"
      .replace(/\bmoms\b/gi, 'mom')
      .replace(/\bkids\b/gi, 'kid')
      .replace(/\bare\b/gi, 'care') // Fix "are" -> "care"
      .replace(/\bf\b/gi, '') // Remove single letter "f"
      .replace(/\s+/g, ' ') // Collapse spaces after replacements
      .trim()
      .replace(/\b(\w)/g, letter => letter.toUpperCase());

    console.log('[Extract] Final title:', title);
    title = title || 'Task';

    // Parse date - look for "tomorrow", "today", "later" (=today), "N days later", day names, or dates
    let date = '';

    // Check for "N days later" pattern first
    const daysLaterMatch = input.match(/(\d+)\s*days?\s+later/i);
    if (daysLaterMatch) {
      const daysToAdd = parseInt(daysLaterMatch[1]);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysToAdd);
      date = futureDate.toISOString().split('T')[0];
      console.log('[Extract] Date from "N days later":', date);
    } else if (/tomorrow/i.test(input)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
      console.log('[Extract] Date from "tomorrow":', date);
    } else if (/today|later/i.test(input)) {
      // "later" also means today
      date = new Date().toISOString().split('T')[0];
      console.log('[Extract] Date from "today/later":', date);
    } else {
      // Match full day names (sunday, monday, etc) OR short names (sun, mon, etc)
      const dayMatch = input.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i);
      if (dayMatch) {
        const dayStr = dayMatch[1].toLowerCase();
        // Map both full and short day names
        const dayMap: Record<string, number> = {
          sunday: 0, sun: 0,
          monday: 1, mon: 1,
          tuesday: 2, tue: 2,
          wednesday: 3, wed: 3,
          thursday: 4, thu: 4,
          friday: 5, fri: 5,
          saturday: 6, sat: 6
        };
        const dayIndex = dayMap[dayStr];
        if (dayIndex !== undefined) {
          const today = new Date();
          const current = today.getDay();
          let diff = dayIndex - current;
          if (diff <= 0) diff += 7;
          const result = new Date(today);
          result.setDate(result.getDate() + diff);
          date = result.toISOString().split('T')[0];
          console.log('[Extract] Date from day name:', dayStr, 'date:', date);
        }
      } else {
        console.log('[Extract] No date pattern matched in:', input);
      }
    }

    // Parse time - look for patterns like "3pm", "7pm", "15:00", "3:00pm"
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

    // Parse duration - look for "3 hours", "2 hrs", "30 min", "30min", "30m"
    let duration = '';
    let durationUnit = 'Hr'; // Default to hours
    const durationMatch = input.match(/(\d+)\s*(?:hour|hr|h)s?|(\d+)\s*(?:min|m)(?:ute)?s?/i);
    if (durationMatch) {
      duration = durationMatch[1] || durationMatch[2];
      // If it's minutes (matched second group), keep as is; if hours, keep as is
      if (durationMatch[2]) {
        durationUnit = 'Min'; // It's minutes
      }
    }

    // Parse budget - smart, order-independent extraction
    let budget = '';

    // Try explicit patterns first: $100, @100, budget 100
    let budgetMatch = input.match(/[\$@]\s*(\d+)|budget\s*[\$@]?\s*(\d+)/i);
    console.log('[Extract] Budget match (explicit):', budgetMatch);

    if (budgetMatch) {
      budget = budgetMatch[1] || budgetMatch[2];
      console.log('[Extract] Budget extracted (explicit):', budget);
    } else {
      // If no explicit pattern, find ALL numbers in the input
      const allNumbers = input.match(/\b(\d+)\b/g);
      console.log('[Extract] All numbers found:', allNumbers);

      if (allNumbers && allNumbers.length > 0) {
        // Filter to get reasonable budget amounts (8-999)
        // Also exclude 6-digit numbers (likely postal codes)
        const budgetCandidates = allNumbers
          .filter(num => num.length < 6) // Not a 6-digit postal code
          .map(num => parseInt(num))
          .filter(num => num >= 8 && num <= 999); // Only reasonable budget amounts

        console.log('[Extract] Budget candidates:', budgetCandidates);

        if (budgetCandidates.length > 0) {
          // Use the first reasonable budget found
          budget = budgetCandidates[0].toString();
          console.log('[Extract] Budget extracted (order-independent):', budget);
        }
      }
    }

    console.log('[Extract] Parsed - title:', title, 'postal:', postalCode, 'date:', date, 'time:', time, 'duration:', duration, 'budget:', budget);

    // Use OneMap API to lookup address from postal code
    let area = 'Singapore';
    let fullAddress = `Singapore ${postalCode}`;

    if (postalCode) {
      try {
        console.log(`[Extract] Looking up postal code: ${postalCode}`);
        const url = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
        url.searchParams.set('searchVal', postalCode);
        url.searchParams.set('returnGeom', 'Y');
        url.searchParams.set('getAddrDetails', 'Y');

        const oneMapResponse = await fetch(url.toString());
        const data = await oneMapResponse.json();

        console.log(`[Extract] OneMap response for ${postalCode}:`, data?.results?.length, 'results');

        if (data?.results && data.results.length > 0) {
          const result = data.results[0];
          // Use ADDRESS field directly from OneMap
          fullAddress = result.ADDRESS || `Singapore ${postalCode}`;
          // Extract area from road name or building name
          area = result.ROAD_NAME || result.BUILDING_NAME || 'Singapore';
          console.log(`[Extract] Found address: ${fullAddress}, area: ${area}`);
        } else {
          console.log(`[Extract] No results from OneMap for ${postalCode}, using fallback`);
          fullAddress = `Singapore ${postalCode}`;
          area = 'Singapore';
        }
      } catch (error) {
        console.error(`[Extract] OneMap lookup error for ${postalCode}:`, error instanceof Error ? error.message : error);
        fullAddress = `Singapore ${postalCode}`;
        area = 'Singapore';
      }
    } else {
      console.log('[Extract] No postal code found, using defaults');
    }

    // Detect category using keyword matching (check BOTH raw input and extracted title)
    let category = 'homehelp'; // Default
    const inputLower = input.toLowerCase();
    const titleLower = title.toLowerCase();
    const checkText = inputLower + ' ' + titleLower; // Check both for better matching

    if (checkText.includes('elder') || checkText.includes('mom') || checkText.includes('mum') || checkText.includes('dad') || checkText.includes('caregiv') || checkText.includes('senior') || checkText.includes('aged')) {
      category = 'eldercare';
    } else if (checkText.includes('baby') || checkText.includes('child') || checkText.includes('kid') || checkText.includes('pick') || checkText.includes('school') || checkText.includes('babysit') || checkText.includes('nanny')) {
      category = 'childcare';
    } else if (checkText.includes('dog') || checkText.includes('pet') || checkText.includes('cat') || checkText.includes('groom') || checkText.includes('walk') || checkText.includes('animal')) {
      category = 'petcare';
    } else if (checkText.includes('clean') || checkText.includes('laundry') || checkText.includes('repair') || checkText.includes('fix') || checkText.includes('household')) {
      category = 'homehelp';
    } else if (checkText.includes('deliver') || checkText.includes('parcel') || checkText.includes('food') || checkText.includes('courier')) {
      category = 'delivery';
    } else if (checkText.includes('event') || checkText.includes('setup') || checkText.includes('shop') || checkText.includes('party')) {
      category = 'eventhelp';
    }

    console.log('[Extract] Category detected:', category);

    // Extract certification/skill keywords from title and remove them from title
    const skillKeywords = {
      childcare: ['certified', 'certification', 'cpr', 'first aid', 'trained', 'professional'],
      eldercare: ['certified', 'certification', 'cpr', 'first aid', 'trained', 'professional', 'dementia'],
      petcare: ['certified', 'grooming', 'professional', 'experienced', 'trained'],
    };

    let suggestedSkills: string[] = [];
    // titleLower already declared above, reuse it

    // Check for skill-related keywords in the title
    if (category === 'childcare' && (titleLower.includes('certified') || titleLower.includes('certification'))) {
      suggestedSkills.push('Childcare Certification');
      title = title.replace(/\b(certified|certification)\b/gi, '').replace(/\s+/g, ' ').trim();
    }
    if (category === 'childcare' && (titleLower.includes('cpr') || titleLower.includes('first aid'))) {
      suggestedSkills.push('First Aid/CPR');
      title = title.replace(/\b(cpr|first\s+aid)\b/gi, '').replace(/\s+/g, ' ').trim();
    }
    if (category === 'eldercare' && (titleLower.includes('certified') || titleLower.includes('certification'))) {
      suggestedSkills.push('Basic Elder Care Certification');
      title = title.replace(/\b(certified|certification)\b/gi, '').replace(/\s+/g, ' ').trim();
    }
    if (category === 'eldercare' && (titleLower.includes('dementia') || titleLower.includes('alzheimer'))) {
      suggestedSkills.push('Dementia Care');
      title = title.replace(/\b(dementia|alzheimer)\b/gi, '').replace(/\s+/g, ' ').trim();
    }
    if (category === 'petcare' && (titleLower.includes('grooming') || titleLower.includes('groom'))) {
      suggestedSkills.push('Pet Grooming');
      title = title.replace(/\b(groom|grooming)\b/gi, '').replace(/\s+/g, ' ').trim();
    }

    console.log('[Extract] Extracted skills:', suggestedSkills);

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
        durationUnit,
        budget,
        category,
        postalCode,
        notes: '',
        suggestedSkills,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to extract' });
  }
});

router.post('/content-filter', async (req: Request, res: Response) => {
  try {
    const { title, description, notes } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title required' });
    }

    // Check title, description, and notes for inappropriate content
    const fullText = `${title} ${description || ''} ${notes || ''}`;
    const moderationResult = await contentMod.checkContentWithQwen(title, description || '', notes || '');

    const status = moderationResult.is_safe ? 'SAFE' : 'FLAG';

    res.json({
      success: true,
      data: {
        status,
        is_safe: moderationResult.is_safe,
        flags: moderationResult.flags,
        issues: moderationResult.issues,
        confidence: moderationResult.confidence,
      },
    });
  } catch (error) {
    console.error('Content filter error:', error);
    res.status(500).json({ error: 'Failed to filter' });
  }
});

router.post('/suggestions', async (req: Request, res: Response) => {
  try {
    const { title, description, category } = req.body;

    // Use provided category or detect from title/description
    let detectedCategory = category || 'homehelp';

    // Suggest certified/professional skills needed based on category
    const skillMap: Record<string, string[]> = {
      'eldercare': ['Basic Elder Care Certification', 'First Aid/CPR', 'Communication', 'Patience'],
      'childcare': ['Childcare Certification', 'First Aid/CPR', 'Child Safety Awareness', 'Communication'],
      'homehelp': ['Housekeeping Skills', 'Time Management', 'Attention to Detail', 'Problem-solving'],
      'wellness': ['Basic Counseling Skills', 'Active Listening', 'Confidentiality', 'Empathy'],
      'tripcarry': ['Travel Experience', 'Organization', 'Logistics Knowledge', 'Communication'],
      'petcare': ['Dog Handling Certificate', 'Animal Care Training', 'Physical Fitness', 'Patience'],
      'delivery': ['Driving License', 'Time Management', 'Reliability', 'Attention to Detail'],
      'eventhelp': ['Event Planning Experience', 'Organization', 'Communication', 'Problem-solving'],
      'donate': ['Charity Experience', 'Organization', 'Communication', 'Compassion'],
      'localbiz': ['Business Experience', 'Professional Communication', 'Problem-solving', 'Reliability'],
    };

    const skills = skillMap[detectedCategory] || [];

    // Generate suggested description using Qwen AI (with fallback)
    let suggestedDescription = '';
    try {
      const config = require('../config').default;
      if (config.qwen.apiKey) {
        const qwenResponse = await axios.post(
          `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
          {
            model: 'qwen-plus',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant. Generate ONE clarifying question for a task poster. Ask what important INFO you need to know to help with this errand. Keep it under 150 characters. Be specific to the task type.',
              },
              {
                role: 'user',
                content: `For this ${detectedCategory} task: "${title}" on ${date} at ${time}. What ONE important clarifying question should I ask the person posting this task?`,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${config.qwen.apiKey}`,
            },
            timeout: 5000,
          }
        );

        const aiText = qwenResponse.data?.output?.text || '';
        suggestedDescription = aiText.substring(0, 150).trim();
        console.log('[AI] Dynamic description generated:', suggestedDescription);
      }
    } catch (qwenErr) {
      console.warn('[AI] Qwen description generation failed, using fallback:', qwenErr instanceof Error ? qwenErr.message : qwenErr);
    }

    // Fallback if Qwen fails
    if (!suggestedDescription) {
      const descriptionSuggestions: Record<string, string> = {
        'eldercare': 'Any specific health conditions or medications the caregiver should know about?',
        'childcare': 'Any allergies, dietary restrictions, or special needs the child has?',
        'homehelp': 'What specific areas need most attention? Any fragile items to avoid?',
        'petcare': 'Any health issues, medications, or behavioral notes about your pet?',
        'delivery': 'Any special handling requirements or preferred delivery time?',
        'eventhelp': 'What\'s the event type and approximate setup time needed?',
        'wellness': 'What type of wellness support do you need and any medical history?',
        'tripcarry': 'What items are being transported and any fragile/valuable items?',
        'donate': 'What type of items and approximate quantity for pickup?',
        'localbiz': 'What specific services or tasks does your business need help with?',
      };
      suggestedDescription = descriptionSuggestions[detectedCategory] || 'Add any important details or special requirements for this task.';
    }

    // Generate suggested notes using Qwen AI (with fallback)
    let notes = '';
    try {
      const config = require('../config').default;
      if (config.qwen.apiKey) {
        const qwenNotesResponse = await axios.post(
          `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
          {
            model: 'qwen-plus',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant. Suggest 2-3 key questions the task poster should ask a potential doer. Focus on safety, experience, and task understanding. Keep it under 300 characters. Be specific to the task type.',
              },
              {
                role: 'user',
                content: `For a ${detectedCategory} task: "${title}" on ${date}. What 2-3 key questions should I ask a doer to ensure they understand the full scope and are qualified?`,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${config.qwen.apiKey}`,
            },
            timeout: 5000,
          }
        );

        const aiNotes = qwenNotesResponse.data?.output?.text || '';
        notes = aiNotes.substring(0, 300).trim();
        console.log('[AI] Dynamic notes generated:', notes);
      }
    } catch (qwenErr) {
      console.warn('[AI] Qwen notes generation failed, using fallback:', qwenErr instanceof Error ? qwenErr.message : qwenErr);
    }

    // Fallback if Qwen fails
    if (!notes) {
      const notesSuggestions: Record<string, string> = {
        'eldercare': 'Ask doer: Emergency contact? Experience with seniors? Any medical training?',
        'childcare': 'Ask doer: Experience with kids this age? Any certifications? First aid trained?',
        'homehelp': 'Ask doer: Own tools/supplies? Experience level? Availability for same-day work?',
        'petcare': 'Ask doer: Experience with animals? Any certifications? Can stay for full duration?',
        'delivery': 'Ask doer: Vehicle type? Can handle fragile items? Insurance coverage?',
        'eventhelp': 'Ask doer: Experience with events? Availability on date? Physical fitness needed?',
        'wellness': 'Ask doer: Relevant certifications? Confidentiality agreement? Flexible schedule?',
        'tripcarry': 'Ask doer: Travel experience? Passport required? Any weight/size limits?',
        'donate': 'Ask doer: Vehicle needed? Help required at both ends? Flexible timing?',
        'localbiz': 'Ask doer: Relevant business experience? Schedule flexibility? Quality standards?',
      };
      notes = notesSuggestions[detectedCategory] || 'Add any requirements or questions for the doer.';
    }

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
