import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';
import https from 'https';
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

    // Map frontend category IDs to internal categories for consistency
    const categoryMap: Record<string, string> = {
      'home-maintenance': 'homehelp',
      'cleaning-laundry': 'homehelp',
      'shopping-errands': 'delivery',
      'delivery-moving': 'delivery',
      'childcare-tutoring': 'childcare',
      'pet-care': 'petcare',
      'tech-support': 'tech-support',
      'moving-help': 'delivery',
    };

    const normalizedCategory = categoryMap[category] || category;

    // Simple heuristics based on category
    let suggestedPattern = { repeat_every: 1, repeat_unit: 'week', confidence: 0.6 };
    let reasonCode = 'similar_errands_weekly';

    const lowerTitle = title.toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    const fullText = `${lowerTitle} ${lowerDesc}`;

    if (
      normalizedCategory === 'petcare' ||
      fullText.includes('walk') ||
      fullText.includes('dog') ||
      fullText.includes('pet')
    ) {
      suggestedPattern = { repeat_every: 1, repeat_unit: 'day', confidence: 0.8 };
      reasonCode = 'similar_errands_daily';
    } else if (
      normalizedCategory === 'homehelp' ||
      fullText.includes('clean') ||
      fullText.includes('laundry')
    ) {
      suggestedPattern = { repeat_every: 1, repeat_unit: 'week', confidence: 0.75 };
      reasonCode = 'similar_errands_weekly';
    } else if (
      normalizedCategory === 'delivery' ||
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
    console.log('[Extract] Input:', input);
    console.log('[Extract] Postal code regex match:', postalCodeMatch);
    console.log('[Extract] Extracted postal code:', postalCode || '(EMPTY)');

    // Extract title - keep only meaningful words, filter filler words
    console.log('[Extract] Raw input:', input);

    // MINIMAL title extraction - just take first meaningful part before metadata
    // Don't try to be clever - let Qwen handle grammar/wording
    let title = input;

    // Use Qwen to intelligently extract clean title from messy user input
    let cleanedTitle = title;
    const qwenApiKey = process.env.QWEN_API_KEY;

    if (qwenApiKey) {
      try {
        console.log('[Extract] Using Qwen to clean title...');
        const titleCleanResponse = await axios.post(
          `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
          {
            model: 'qwen-plus',
            messages: [
              {
                role: 'system',
                content: 'You are a task title extractor. Your ONLY job is to extract the core task description from user input. Remove ALL metadata: dates, times, deadlines, locations, addresses, postal codes, budgets, prices, durations. Return ONLY the task title (3-10 words, no punctuation except periods). Examples: Input "Fix my leaky tap on Saturday at 2pm" → Output "Fix leaky tap". Input "Deliver groceries tomorrow" → Output "Deliver groceries".',
              },
              {
                role: 'user',
                content: input,
              },
            ],
          },
          {
            headers: {
              'Authorization': `Bearer ${qwenApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );

        const qwenTitle = titleCleanResponse.data?.output?.text?.trim();
        if (qwenTitle && qwenTitle.length > 0 && qwenTitle.length < 100) {
          cleanedTitle = qwenTitle;
          console.log('[Extract] ✅ Qwen cleaned title:', cleanedTitle);
        }
      } catch (error) {
        console.warn('[Extract] Qwen title cleaning failed, using fallback:', error instanceof Error ? error.message : error);
      }
    }

    // Fallback: basic cleanup if Qwen not available
    if (cleanedTitle === title) {
      cleanedTitle = title
        .replace(/\s*\(\d{6}\)\s*/g, ' ') // Remove postal codes in parens
        .replace(/\s*,?\s*deadline.*$/i, '') // Remove "deadline..." (case-insensitive)
        .replace(/\s*,?\s*at\s+\d{6}\b.*$/i, '') // Remove "at [postal code]..." and everything after
        // Remove common Singapore area names (at [area] or just [area] if at end)
        .replace(/\s*,?\s*at\s+\b(?:clementi|bedok|tampines|jurong|bukit|pasir ris|yishun|hougang|serangoon|punggol|ang mo kio|bishan|toa payoh|novena|newton|tiong bahru|outram|queenstown|tanjong pagar|orchard|dhoby ghaut|chinatown|marina|raffles|sentosa|changi|kranji|woodlands|sembawang)\b.*$/i, '') // Remove area names
        .replace(/\s*,?\s*(?:on\s+)?\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b.*$/i, '') // Remove day names and anything after (with or without "on")
        .replace(/\s+at\s+\d{1,2}[ap]m.*$/i, '') // Remove "at 2pm, 10am, etc..."
        .replace(/\s*,?\s*\d{1,2}(:\d{2})?\s*[ap]m.*$/i, '') // Remove time patterns like "10am", "2:30pm"
        .replace(/\s+for\s+[\d.]+\s*(?:hours?|hrs?|h|mins?|m).*$/i, '') // Remove "for [duration]..."
        .replace(/\s*,?\s*budget.*$/i, '') // Remove "budget..."
        .replace(/\s*,?\s*postal.*$/i, '') // Remove "postal code..."
        .replace(/\s*,?\s*\$.*$/i, '') // Remove "$..."
        .replace(/\s+\d{6}\s*$/i, '') // Remove trailing 6-digit postal code at end
        .trim();
    }

    // Final cleanup
    if (!cleanedTitle || cleanedTitle.length < 2) {
      cleanedTitle = input.split(/\s+/).slice(0, 5).join(' ').trim();
    }

    cleanedTitle = cleanedTitle && cleanedTitle.length > 1 ? cleanedTitle : 'Task';

    // Title case
    cleanedTitle = cleanedTitle
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .substring(0, 50);

    title = cleanedTitle;
    console.log('[Extract] Final title:', title);

    // Fast keyword-based category detection (skip slow Qwen call)
    let category = 'homehelp'; // Default fallback
    const lowerInput = input.toLowerCase();

    // Map keywords to categories
    if (lowerInput.includes('walk') || lowerInput.includes('dog') || lowerInput.includes('pet') || lowerInput.includes('cat')) {
      category = 'petcare';
    } else if (lowerInput.includes('babysit') || lowerInput.includes('childcare') || lowerInput.includes('tutor') || lowerInput.includes('child')) {
      category = 'childcare';
    } else if (lowerInput.includes('elderly') || lowerInput.includes('elder') || lowerInput.includes('grandmother') || lowerInput.includes('grandfather') || lowerInput.includes('senior')) {
      category = 'eldercare';
    } else if (lowerInput.includes('deliver') || lowerInput.includes('move') || lowerInput.includes('moving') || lowerInput.includes('moving boxes') || lowerInput.includes('transport')) {
      category = 'delivery';
    } else if (lowerInput.includes('clean') || lowerInput.includes('laundry') || lowerInput.includes('house') || lowerInput.includes('kitchen')) {
      category = 'homehelp';
    } else if (lowerInput.includes('grocery') || lowerInput.includes('shopping') || lowerInput.includes('shop')) {
      category = 'delivery';
    } else if (lowerInput.includes('tech') || lowerInput.includes('computer') || lowerInput.includes('wifi') || lowerInput.includes('device')) {
      category = 'tech-support';
    } else if (lowerInput.includes('data entry') || lowerInput.includes('spreadsheet') || lowerInput.includes('excel')) {
      category = 'data-entry';
    }

    console.log('[Extract] Category detected (keyword-based):', category);

    // Title is already cleaned up above - skip additional Qwen polishing (too slow)
    console.log('[Extract] Final title:', title);

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
        // If no explicit date mentioned, check if it's today or use today as default
        // Don't auto-default - let user decide in form if truly no date given
        date = '';
        console.log('[Extract] No date pattern found, leaving empty for user to fill');
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

    // Parse duration - look for "3 hours", "2.5 hrs", "30 min", "30min", "30m"
    let duration = '';
    let durationUnit = 'Hr'; // Default to hours
    const durationMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)s?|(\d+(?:\.\d+)?)\s*(?:min|m)(?:ute)?s?/i);
    if (durationMatch) {
      duration = durationMatch[1] || durationMatch[2];
      // If it's minutes (matched second group), keep as is; if hours, keep as is
      if (durationMatch[2]) {
        durationUnit = 'Min'; // It's minutes
      }
      console.log('[Extract] Duration parsed:', duration, durationUnit);
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

    // Extract area name if mentioned (e.g., "at clementi", "at orchard")
    const singaporeAreas = ['clementi', 'bedok', 'tampines', 'jurong', 'bukit', 'pasir ris', 'yishun', 'hougang', 'serangoon', 'punggol', 'ang mo kio', 'bishan', 'toa payoh', 'novena', 'newton', 'tiong bahru', 'outram', 'queenstown', 'tanjong pagar', 'orchard', 'dhoby ghaut', 'chinatown', 'marina', 'raffles', 'sentosa', 'changi', 'kranji', 'woodlands', 'sembawang'];
    let detectedArea = '';
    for (const area_name of singaporeAreas) {
      // Match "at clementi" or just "clementi" as standalone word (lowerInput already defined above)
      if (new RegExp(`(at\\s+)?\\b${area_name}\\b`, 'i').test(input)) {
        detectedArea = area_name.charAt(0).toUpperCase() + area_name.slice(1);
        console.log('[Extract] Detected area from input:', detectedArea);
        break;
      }
    }

    // Use OneMap API to get real address from postal code
    let area = detectedArea || 'Singapore';
    console.log('[Extract] Area set to:', area, '(detected:', detectedArea, ')');
    let fullAddress = `Singapore ${postalCode}`;

    if (postalCode && postalCode.length === 6) {
      // Try OneMap API with proper error handling
      try {
        console.log(`[Extract] OneMap lookup: Postal code ${postalCode}`);
        const oneMapUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y`;

        try {
          console.log(`[Extract] Making OneMap request to: ${oneMapUrl}`);
          // Try with axios first (more reliable)
          const axiosResponse = await axios.get(oneMapUrl, {
            timeout: 5000,
            headers: { 'Accept': 'application/json' },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
          });

          console.log(`[Extract] OneMap response status:`, axiosResponse.status);
          console.log(`[Extract] OneMap response data:`, axiosResponse.data);

          if (axiosResponse.data?.results?.[0]) {
            const addr = axiosResponse.data.results[0];
            fullAddress = addr.ADDRESS || `Singapore ${postalCode}`;
            area = addr.ROAD_NAME?.trim() || addr.BUILDING_NAME?.trim() || 'Singapore';
            console.log(`[Extract] ✅ OneMap SUCCESS: address=${fullAddress}, area=${area}`);
          } else {
            console.log(`[Extract] OneMap: No results found in response`);
            fullAddress = `Singapore ${postalCode}`;
            area = 'Singapore';
          }
        } catch (axiosErr) {
          const axiosErrMsg = axiosErr instanceof Error ? axiosErr.message : String(axiosErr);
          console.warn(`[Extract] ❌ OneMap FAILED: ${axiosErrMsg}`);
          fullAddress = `Singapore ${postalCode}`;
          area = 'Singapore';
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[Extract] OneMap lookup error (${errorMsg}), using postal code only`);
        fullAddress = `Singapore ${postalCode}`;
        area = 'Singapore';
      }
    } else {
      console.log('[Extract] No postal code provided');
      // Keep detected area if found, otherwise default to Singapore
      if (!detectedArea) {
        area = 'Singapore';
      }
      fullAddress = detectedArea ? `${detectedArea}, Singapore` : 'Singapore';
    }


    // Extract certification/skill keywords from title and remove them from title
    const skillKeywords = {
      childcare: ['certified', 'certification', 'cpr', 'first aid', 'trained', 'professional'],
      eldercare: ['certified', 'certification', 'cpr', 'first aid', 'trained', 'professional', 'dementia'],
      petcare: ['certified', 'grooming', 'professional', 'experienced', 'trained'],
    };

    let suggestedSkills: string[] = [];
    const titleLower = title.toLowerCase();

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

    // Generate AI-based description suggestion based on title keywords
    // This creates context-aware descriptions tied to what the user actually typed
    let description = '';
    const titleLowercase = title.toLowerCase();

    // Check title for specific keywords and generate relevant descriptions
    if (titleLowercase.includes('hair') || titleLowercase.includes('salon') || titleLowercase.includes('cut')) {
      description = `Provide hair cutting/styling service. Specify hair type, length, style preference, and any special requirements.`;
    } else if (titleLowercase.includes('cleaning') || titleLowercase.includes('clean')) {
      description = `Professional cleaning service. Specify areas to clean (bedroom, kitchen, bathroom), type (deep clean, regular maintenance), and any allergies/sensitivities.`;
    } else if (titleLowercase.includes('dog') || titleLowercase.includes('walk') || titleLowercase.includes('pet')) {
      description = `Pet care service. Specify pet type, breed, size, temperament, health needs, and what's needed (walking, sitting, grooming, feeding).`;
    } else if (titleLowercase.includes('babysit') || titleLowercase.includes('childcare') || titleLowercase.includes('child')) {
      description = `Childcare service. Specify child age, activities to do, any allergies/dietary restrictions, bedtime routine, emergency contacts.`;
    } else if (titleLowercase.includes('elderly') || titleLowercase.includes('elder') || titleLowercase.includes('senior')) {
      description = `Elder care and companionship. Specify mobility needs, meal preparation, medication assistance, activities preferred, emergency contacts.`;
    } else if (titleLowercase.includes('delivery') || titleLowercase.includes('send') || titleLowercase.includes('deliver')) {
      description = `Delivery service. Specify what item(s) to deliver, pickup location, destination, size/weight, special handling needs, preferred timing.`;
    } else if (titleLowercase.includes('event') || titleLowercase.includes('party') || titleLowercase.includes('setup')) {
      description = `Event assistance. Specify event type, date, location, number of guests, setup/decoration needs, timeline, special requirements.`;
    } else if (titleLowercase.includes('teach') || titleLowercase.includes('tutor') || titleLowercase.includes('lesson')) {
      description = `Tutoring/teaching service. Specify subject, student age/level, learning goals, lesson frequency, duration per session, teaching style preference.`;
    } else if (titleLowercase.includes('repair') || titleLowercase.includes('fix')) {
      description = `Repair service. Specify what needs repair, issue/problem, preferred solution, timeline, budget constraints, any special requirements.`;
    } else if (titleLowercase.includes('move') || titleLowercase.includes('carry') || titleLowercase.includes('transport')) {
      description = `Moving/transport assistance. Specify items to move, pickup location, destination, timeline, equipment needed, help required (packing, lifting, driving).`;
    } else {
      // Fallback: use category-based description with title reference
      const categoryDescriptions: Record<string, string> = {
        'homehelp': 'Household assistance needed. Specify the task, areas involved, any materials needed, and timeline.',
        'petcare': 'Pet care needed. Specify pet type, requirements, and what care is needed.',
        'delivery': 'Delivery service needed. Specify items and destination.',
        'eventhelp': 'Event support needed. Specify event type and requirements.',
        'childcare': 'Childcare needed. Specify child age and requirements.',
        'eldercare': 'Elder care needed. Specify care requirements.',
        'wellness': 'Wellness support needed. Specify the type of assistance.',
      };
      description = categoryDescriptions[category] || `Help needed: ${title}. Please provide more details about the task, timeline, and specific requirements.`;
    }

    res.json({
      success: true,
      data: {
        title,
        description,
        location: '', // Don't infer location - user enters this in Hana chat step 2
        area, // Area from OneMap lookup (e.g., "CHOA CHU KANG AVENUE")
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
  console.log('[Suggestions] ========== REQUEST RECEIVED ==========');
  try {
    const { title = '', description = '', category = '', date = '', time = '' } = req.body;
    console.log('[Suggestions] Title:', title);
    console.log('[Suggestions] Description:', description);
    console.log('[Suggestions] Category:', category);
    console.log('[Suggestions] Date:', date);
    console.log('[Suggestions] Time:', time);

    if (!title || !category) {
      console.warn('[Suggestions] Missing required fields: title or category');
      return res.status(400).json({ error: 'Title and category required' });
    }

    // Get Qwen API key from environment
    const qwenApiKey = process.env.QWEN_API_KEY;

    if (!qwenApiKey) {
      console.warn('[Suggestions] ⚠️ Qwen API key not configured, will use fallbacks only');
    }

    // Map frontend category IDs to AI-friendly internal categories
    // Also handles internal category names (petcare, childcare, etc.) that come from extract endpoint
    const categoryMap: Record<string, string> = {
      // Frontend category IDs
      'home-maintenance': 'homehelp',
      'cleaning-laundry': 'homehelp',
      'shopping-errands': 'delivery',
      'delivery-moving': 'delivery',
      'childcare-tutoring': 'childcare',
      'pet-care': 'petcare',
      'tech-support': 'tech-support',
      'moving-help': 'delivery',
      // Internal categories (already normalized from extract)
      'eldercare': 'eldercare',
      'eventhelp': 'eventhelp',
      'data-entry': 'data-entry',
      'homehelp': 'homehelp',
      'childcare': 'childcare',
      'petcare': 'petcare',
      'delivery': 'delivery',
    };

    // Use provided category or detect from title/description
    let detectedCategory = categoryMap[category] || 'homehelp';

    // Parallel calls to Qwen for skills, description, and notes
    const skillMap: Record<string, string[]> = {
      'eldercare': ['Patience', 'Communication Skills', 'Physical Care Experience', 'Empathy'],
      'childcare': ['Child Safety Awareness', 'Communication', 'Patience', 'Activity Planning'],
      'homehelp': ['Attention to Detail', 'Time Management', 'Physical Stamina', 'Problem-solving'],
      'petcare': ['Animal Care Experience', 'Patience', 'Physical Fitness', 'Communication'],
      'delivery': ['Reliability', 'Navigation Skills', 'Physical Fitness', 'Customer Service'],
      'eventhelp': ['Organization', 'Communication', 'Physical Stamina', 'Problem-solving'],
      'tech-support': ['Technical Knowledge', 'Problem-solving', 'Patience', 'Communication'],
      'data-entry': ['Data Entry Skills', 'Accuracy', 'Time Management', 'Attention to Detail'],
    };

    const descriptionSuggestions: Record<string, string> = {
      'eldercare': 'Help with daily activities and companionship for elderly person. Include mobility assistance, meal prep, or medication reminders needed.',
      'childcare': 'Provide childcare and supervision for child. Specify age group, activities, any allergies or special needs.',
      'homehelp': 'Professional household assistance. Specify areas (bedroom, kitchen, bathroom) and type of work (cleaning, organizing, repairs).',
      'petcare': 'Pet care services. Specify pet type, size, temperament, and what\'s needed (walking, sitting, grooming).',
      'delivery': 'Deliver items from point A to point B. Specify item type, size, weight, and any special handling needs.',
      'eventhelp': 'Help with event preparation and execution. Specify event type (party, wedding, corporate), size, and setup needs.',
      'admin-business': 'Administrative support work. Specify exact tasks (data entry, document preparation, spreadsheet management).',
      'tech-support': 'Technical help for device or software. Specify device type, operating system, and exact problem or issue.',
      'creative-arts': 'Creative services project. Specify deliverable (design, photo, video), style preferences, and deadline.',
    };

    const notesSuggestions: Record<string, string> = {
      'eldercare': 'Ask doer: Experience with elderly care? Any medical training? Can handle mobility assistance? Can you provide references?',
      'childcare': 'Ask doer: Experience with this age group? Any certifications (CPR, First Aid)? Background check? References from previous families?',
      'homehelp': 'Ask doer: Own cleaning supplies or expect to be provided? Experience level? Can you handle same-day work? References?',
      'petcare': 'Ask doer: Experience with this pet type? Any certifications? Comfortable handling emergencies? What\'s your experience with this breed?',
      'delivery': 'Ask doer: Vehicle type? Can handle fragile/delicate items? Insured? Can pick up same day? Experience with this distance?',
      'eventhelp': 'Ask doer: Event experience? Physical fitness for setup work? Flexibility with timing? Can you follow instructions?',
      'admin-business': 'Ask doer: Software experience (Excel, Google Sheets)? Accuracy record? Attention to detail? Experience with this task type?',
      'tech-support': 'Ask doer: Device expertise? Problem-solving approach? Availability for follow-up? What tools do you typically use?',
      'creative-arts': 'Ask doer: Portfolio examples? Software/tools you use? Design philosophy? Timeline flexibility? Revision policy?',
    };

    // Make all Qwen calls in parallel
    const [skillsResult, descriptionResult, notesResult] = await Promise.allSettled([
      qwenApiKey ? axios.post(
        `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content: 'You are a skills assessment expert. Given a task, list 4-5 specific skills required to complete it successfully. Return ONLY the skills as a comma-separated list. Be specific to THIS task, not generic.',
            },
            {
              role: 'user',
              content: `Task: "${title}"\nCategory: ${detectedCategory}\nWhat specific skills are required?`,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${qwenApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 3000,
        }
      ) : Promise.reject('No API key'),
      qwenApiKey ? axios.post(
        `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content: 'You are a task description expert. Write a clear, specific task description that helps doers understand exactly what work is needed. Include: (1) What specifically needs to be done, (2) What the doer should bring/know, (3) Expected outcome. Keep it under 180 characters. Be direct and specific, not generic.',
            },
            {
              role: 'user',
              content: `Task: "${title}"\nCategory: ${detectedCategory}\nDate: ${date || 'TBD'}\nTime: ${time || 'TBD'}\n\nWrite a clear description of what this task involves and what doers should expect.`,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
          },
          timeout: 3000,
        }
      ) : Promise.reject('No API key'),
      qwenApiKey ? axios.post(
        `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content: 'You are a task screening expert. Generate 2-3 specific, practical questions the task poster should ask potential doers. Focus on: (1) Experience/qualifications needed, (2) Safety or quality concerns, (3) Logistical requirements. Use action-oriented language like "Ask doer about..." or "Verify...". Keep under 220 characters. Be specific to this task type.',
            },
            {
              role: 'user',
              content: `Task: "${title}"\nCategory: ${detectedCategory}\nWhat important questions should be asked to qualified doers for this task?`,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
          },
          timeout: 3000,
        }
      ) : Promise.reject('No API key'),
    ]);

    // Process results
    let skills: string[] = [];
    let suggestedDescription = '';
    let notes = '';

    if (skillsResult.status === 'fulfilled') {
      const skillsText = skillsResult.value.data?.output?.text?.trim() || '';
      if (skillsText) {
        skills = skillsText.split(',').map(s => s.trim()).filter(s => s && s.length > 0);
        console.log('[Qwen] Generated skills:', skills);
      }
    } else {
      console.warn('[Qwen] Skills generation failed');
    }

    if (descriptionResult.status === 'fulfilled') {
      const aiText = descriptionResult.value.data?.output?.text || '';
      if (aiText && aiText.trim().length > 0) {
        suggestedDescription = aiText.substring(0, 180).trim();
        console.log('[Qwen] ✅ Description generated:', suggestedDescription);
      }
    } else {
      console.warn('[Qwen] Description generation failed');
    }

    if (notesResult.status === 'fulfilled') {
      const aiNotes = notesResult.value.data?.output?.text || '';
      if (aiNotes && aiNotes.trim().length > 0) {
        notes = aiNotes.substring(0, 220).trim();
        console.log('[Qwen] ✅ Notes/questions generated:', notes);
      }
    } else {
      console.warn('[Qwen] Notes generation failed');
    }

    // Fallback to basic skills if Qwen fails
    if (skills.length === 0) {
      skills = skillMap[detectedCategory] || ['Problem-solving', 'Communication', 'Reliability'];
      console.log('[Suggestions] Using fallback skills for', detectedCategory, ':', skills);
    }

    // Fallback if Qwen not used
    if (!suggestedDescription) {
      suggestedDescription = descriptionSuggestions[detectedCategory] || 'Describe what needs to be done, what doers should expect, and any special requirements.';
      console.log('[Qwen] Using fallback description');
    }

    // Fallback if Qwen not used
    if (!notes) {
      notes = notesSuggestions[detectedCategory] || 'Add important questions or requirements for potential doers.';
      console.log('[Qwen] Using fallback notes');
    }

    // Ensure all response fields have valid values
    const responseData = {
      category: String(detectedCategory || 'homehelp'),
      description: String(suggestedDescription || 'Provide details about your task.'),
      notes: String(notes || 'Share any special requirements with doers.'),
      skills: Array.isArray(skills) ? skills : [],
    };

    console.log('[Suggestions] ✅ SUCCESS - Returning response');
    console.log('[Suggestions] Category:', responseData.category);
    console.log('[Suggestions] Description length:', responseData.description.length);
    console.log('[Suggestions] Notes length:', responseData.notes.length);
    console.log('[Suggestions] Skills count:', responseData.skills.length);

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('[Suggestions] ❌ ENDPOINT ERROR');
    console.error('[Suggestions] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Suggestions] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    if (error instanceof Error && error.stack) {
      console.error('[Suggestions] Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }

    // Always return a valid response, even on error
    try {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate suggestions',
        data: {
          category: 'homehelp',
          description: 'Provide details about your task.',
          notes: 'Share any special requirements with doers.',
          skills: [],
        }
      });
    } catch (responseErr) {
      console.error('[Suggestions] Failed to send error response:', responseErr);
      return res.status(500).send('Internal server error');
    }
  }
});

// POST /api/ai/analyze-task - Analyze task details (location, complexity, sentiment)
router.post('/analyze-task', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, location, category, budget } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description required' });
    }

    const qwenApiKey = process.env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return res.status(500).json({ error: 'AI service not available' });
    }

    // Build comprehensive analysis prompt
    const prompt = `Analyze this task posting for location, complexity, and sentiment:

TASK DETAILS:
- Title: "${title}"
- Description: "${description}"
- Location: ${location || 'Not specified'}
- Category: ${category || 'Not specified'}
- Budget: ${budget ? '$' + budget : 'Not specified'}

Provide analysis in JSON format with:
1. "location_insights": {
   - "postal_area": What postal area this is (e.g., "Central", "East", "North", etc.)
   - "accessibility": "easy/moderate/difficult" (based on location)
   - "estimated_travel_time": "quick/moderate/long" estimate
}
2. "task_complexity": {
   - "level": "simple/moderate/complex"
   - "required_skills": ["skill1", "skill2"] (list top 3)
   - "estimated_duration": "in hours or timeframe"
   - "physical_demand": "low/medium/high"
}
3. "sentiment_analysis": {
   - "tone": "friendly/neutral/urgent/frustrated"
   - "urgency": "low/medium/high"
   - "clarity": "clear/somewhat_unclear/unclear"
}
4. "ai_suggestions": {
   - "recommended_budget_range": "$X-$Y if budget seems misaligned"
   - "missing_details": ["detail1", "detail2"] to help find better doers
   - "best_doer_type": description of ideal person for this task
   - "estimated_interested_doers": "X% of doers" likely to be interested
}

Return ONLY valid JSON, no markdown or code blocks.`;

    try {
      const response = await axios.post(
        `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${qwenApiKey}`,
          },
          timeout: 15000,
        }
      );

      const analysisText = response.data?.output?.text?.trim();
      if (!analysisText) {
        throw new Error('No analysis returned');
      }

      // Parse JSON response
      let analysis;
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
      } catch {
        throw new Error('Failed to parse AI response');
      }

      // Save analysis for task
      try {
        await db.query(
          `INSERT INTO task_analysis (user_id, title, location_insights, task_complexity, sentiment_analysis, ai_suggestions, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (user_id, title) DO UPDATE SET
           location_insights = $3, task_complexity = $4, sentiment_analysis = $5, ai_suggestions = $6, created_at = NOW()`,
          [userId, title, JSON.stringify(analysis.location_insights || {}), JSON.stringify(analysis.task_complexity || {}), JSON.stringify(analysis.sentiment_analysis || {}), JSON.stringify(analysis.ai_suggestions || {})]
        );
      } catch (dbErr) {
        console.warn('[Task Analysis] DB save skipped:', dbErr);
      }

      console.log('[Task Analysis] ✅ Complete:', analysis);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (qwenErr: any) {
      console.error('[Task Analysis] Qwen error:', qwenErr.message);
      res.status(500).json({
        error: 'AI analysis failed',
        details: qwenErr.message,
      });
    }
  } catch (error: any) {
    console.error('[Task Analysis] Error:', error);
    res.status(500).json({
      error: 'Failed to analyze task',
      details: error.message,
    });
  }
});

// POST /api/ai/analyze-preferences - Analyze category selections to generate user profile
router.post('/analyze-preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doer_preferences, asker_needs } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!doer_preferences && !asker_needs) {
      return res.status(400).json({ error: 'No preferences provided' });
    }

    const qwenApiKey = process.env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return res.status(500).json({ error: 'AI service not available' });
    }

    // Prepare category names for AI analysis
    const categoryMap: Record<string, string> = {
      'home-maintenance': 'Home Maintenance',
      'cleaning-household': 'Cleaning & Household',
      'shopping-errands': 'Shopping & Errands',
      'delivery-moving': 'Delivery & Moving',
      'childcare-education': 'Childcare & Education',
      'pet-care': 'Pet Care',
      'tech-support': 'Tech Support',
      'personal-care': 'Personal Care',
      'elderly-care': 'Elderly Care',
      'fitness-wellness': 'Fitness & Wellness',
      'tutoring-learning': 'Tutoring & Learning',
      'event-planning': 'Event Planning',
      'gardening-landscaping': 'Gardening & Landscaping',
      'handyman-repairs': 'Handyman & Repairs',
      'moving-packing': 'Moving & Packing',
      'other': 'Other Services',
    };

    const doerServices = doer_preferences?.map((id: string) => categoryMap[id]).filter(Boolean) || [];
    const askerServices = asker_needs?.map((id: string) => categoryMap[id]).filter(Boolean) || [];

    // Build prompt for AI analysis
    const prompt = `Analyze this user profile based on their service preferences:

SERVICES THEY CAN PROVIDE (Doer): ${doerServices.length > 0 ? doerServices.join(', ') : 'None selected yet'}

SERVICES THEY NEED (Asker): ${askerServices.length > 0 ? askerServices.join(', ') : 'None selected yet'}

Based on these selections, provide a concise AI-generated profile (2-3 sentences) that:
1. Describes their likely expertise/skills as a doer
2. Describes what type of help they're seeking as an asker
3. Suggests potential income streams based on their skills
4. Identifies complementary skills they might consider

Format: Return as JSON with fields: doer_profile, asker_profile, skill_insights, recommendations`;

    console.log('[AI Analysis] Analyzing preferences:', { doerServices, askerServices });

    try {
      const response = await axios.post(
        `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${qwenApiKey}`,
          },
          timeout: 10000,
        }
      );

      const analysisText = response.data?.output?.text?.trim();
      if (!analysisText) {
        throw new Error('No analysis returned from AI');
      }

      // Try to parse JSON from response
      let analysis;
      try {
        // Extract JSON from response (might be wrapped in markdown code blocks)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
      } catch {
        // Fallback: Create structured analysis from text
        analysis = {
          doer_profile: 'Professional service provider',
          asker_profile: 'Active service seeker',
          skill_insights: analysisText,
          recommendations: 'Consider expanding skills in complementary areas',
        };
      }

      // Save analysis to database for future reference
      try {
        await db.query(
          `UPDATE users
           SET doer_profile = $1, asker_profile = $2, skill_insights = $3, updated_at = NOW()
           WHERE id = $4`,
          [
            analysis.doer_profile || null,
            analysis.asker_profile || null,
            analysis.skill_insights || null,
            userId,
          ]
        );
      } catch (dbErr) {
        console.error('[AI Analysis] Failed to save profile:', dbErr);
        // Don't fail the request if DB save fails
      }

      console.log('[AI Analysis] ✅ Profile analysis complete:', analysis);

      res.json({
        success: true,
        data: {
          ...analysis,
          doer_count: doerServices.length,
          asker_count: askerServices.length,
          completeness: Math.round((doerServices.length + askerServices.length) / 32 * 100),
        },
      });
    } catch (qwenErr: any) {
      console.error('[AI Analysis] Qwen error:', qwenErr.message);
      res.status(500).json({
        error: 'AI analysis failed',
        details: qwenErr.message,
      });
    }
  } catch (error: any) {
    console.error('[AI Analysis] Error:', error);
    res.status(500).json({
      error: 'Failed to analyze preferences',
      details: error.message,
    });
  }
});

// POST /api/ai/suggest-tasks - AI suggestions for tasks user should look at
router.post('/suggest-tasks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user_preferences, user_history, available_tasks, user_role } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!available_tasks || available_tasks.length === 0) {
      return res.status(400).json({ error: 'No tasks available' });
    }

    const qwenApiKey = process.env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return res.status(500).json({ error: 'AI service not available' });
    }

    // Build task suggestion prompt
    const prompt = `You are a task matching AI. A ${user_role} user is looking for ${user_role === 'doer' ? 'jobs to do' : 'help providers'}.

USER PROFILE:
- Role: ${user_role}
- Preferences: ${user_preferences || 'No specific preferences'}
- Past Work: ${user_history || 'No history yet'}

AVAILABLE ${user_role === 'doer' ? 'JOBS' : 'SERVICE PROVIDERS'}:
${available_tasks.slice(0, 10).map((t: any, i: number) => `${i + 1}. "${t.title}" - ${t.category} (${t.location || 'Location TBD'}, $${t.budget || 'TBD'})`).join('\n')}

Analyze and provide JSON response with:
1. "top_recommendations": [
   {
     "rank": 1,
     "title": "job title",
     "reason": "Why this is perfect for them",
     "match_score": 95,
     "why_match": "Specific reasoning"
   }
]
2. "personalized_advice": [
   "Tip 1 based on their profile",
   "Tip 2 for improvement"
]
3. "skill_gaps": ["skill1", "skill2"] if any common skills missing
4. "earning_potential": "Based on your skills, you could earn X-Y per month"

Return ONLY valid JSON.`;

    try {
      const response = await axios.post(
        `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${qwenApiKey}`,
          },
          timeout: 15000,
        }
      );

      const suggestionsText = response.data?.output?.text?.trim();
      if (!suggestionsText) {
        throw new Error('No suggestions returned');
      }

      // Parse JSON response
      let suggestions;
      try {
        const jsonMatch = suggestionsText.match(/\{[\s\S]*\}/);
        suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : suggestionsText);
      } catch {
        throw new Error('Failed to parse suggestions');
      }

      // Save suggestions for user
      try {
        await db.query(
          `INSERT INTO user_suggestions (user_id, suggestions, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET suggestions = $2, created_at = NOW()`,
          [userId, JSON.stringify(suggestions)]
        );
      } catch (dbErr) {
        console.warn('[Task Suggestions] DB save skipped:', dbErr);
      }

      console.log('[Task Suggestions] ✅ Generated:', suggestions);

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (qwenErr: any) {
      console.error('[Task Suggestions] Qwen error:', qwenErr.message);
      res.status(500).json({
        error: 'AI suggestion failed',
        details: qwenErr.message,
      });
    }
  } catch (error: any) {
    console.error('[Task Suggestions] Error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: error.message,
    });
  }
});

export default router;
