import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import { getRestrictedSlugs } from '../services/categoryRestrictions.js';
import { lookupAddress } from '../services/providers/addressProvider.js';
import axios from 'axios';
import https from 'https';
import * as biasDetector from '../modules/bias-detector.js';
import * as contentMod from '../modules/content-moderation.js';
import { screenUserMessage } from '../modules/hanaGuardrails.js';
import * as privacyLogger from '../modules/privacy-logger.js';
import * as explainability from '../modules/explainability.js';
import { QWEN_API_BASE } from '../config/aiRegion.js';

const router = Router();

// Helper: Fast regex-based title cleaning (fallback for when Qwen is unavailable)
function fallbackTitleClean(title: string): string {
  let cleaned = title;

  // IMPORTANT: Remove metadata BEFORE we do case normalization
  // Order matters - remove specific patterns first

  // Remove budget patterns: "budget 300", "$300", ", 300"
  cleaned = cleaned.replace(/,?\s*budget\s*\$?\s*\d+(?:\.\d{2})?/gi, '');
  cleaned = cleaned.replace(/,?\s*\$\s*\d+(?:\.\d{2})?(?:\s+budget)?/gi, '');

  // Remove any standalone 6-digit postal code (with surrounding comma/space), anywhere
  cleaned = cleaned.replace(/,?\s*\b\d{6}\b/g, '');

  // Remove time ranges like "2pm-5pm", "from 2pm-5pm"
  cleaned = cleaned.replace(/\s+(?:from\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m|p\.m)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m|p\.m)?/gi, '');

  // Remove postal codes with "at": "at 680433"
  cleaned = cleaned.replace(/\s+at\s+\d{6}\b/gi, '');

  // Remove postal codes at end
  cleaned = cleaned.replace(/\s+\d{6}\s*$/g, '');

  // Remove "at <number>" time patterns (e.g., "at 3pm")
  cleaned = cleaned.replace(/\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m|p\.m)/gi, '');

  // Remove time patterns like "tomorrow 9am", "next monday 2pm", "on Saturday 3pm"
  cleaned = cleaned.replace(/\s+(?:on|at)?\s+(?:tomorrow|today|tonight|next|this)\s+\w+\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m|p\.m)?/gi, '');
  cleaned = cleaned.replace(/\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m|p\.m)/gi, '');

  // Remove day names with optional "on"
  cleaned = cleaned.replace(/\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, '');

  // Remove "tomorrow", "today", "next <word>", "in X days", date patterns
  cleaned = cleaned.replace(/\s+(?:tomorrow|today|tonight)\b/gi, '');
  cleaned = cleaned.replace(/\s+next\s+\w+/gi, ''); // "next Tuesday", etc
  cleaned = cleaned.replace(/\s+in\s+\d+\s+days?\b/gi, '');

  // Remove duration like "2 hours", "30 mins", "4 hours"
  cleaned = cleaned.replace(/,?\s+\d+\s*(?:hours?|hrs?|h|mins?|m|days?)\b/gi, '');

  // Remove "from", "to", comma separators
  cleaned = cleaned.replace(/\s+from\b/gi, '');
  cleaned = cleaned.replace(/\s+to\b/gi, '');

  // Remove "at" followed by generic location (after postal code is removed)
  cleaned = cleaned.replace(/\s+at\s+[\w\s]+/gi, '');

  // Remove leading/trailing commas, spaces, hyphens
  cleaned = cleaned.replace(/^\s*,\s*/, '').replace(/\s*,\s*$/, '');
  cleaned = cleaned.replace(/\s+at\s*$/gi, ''); // Remove trailing "at"
  cleaned = cleaned.replace(/\s+(?:on|from|to|next)\s*$/gi, ''); // Remove trailing keywords
  cleaned = cleaned.replace(/[,\-\s]+$/g, ''); // Remove trailing punctuation

  // Remove commas that are followed by metadata (keep commas in titles like "Boxes, Bags")
  cleaned = cleaned.replace(/,\s*(?:next|tomorrow|today|on|at|from)\b/gi, '');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Title case
  cleaned = cleaned
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();

  return cleaned || title;
}

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
    const { title, description, notes, errand_id } = req.body;
    const userId = req.userId ? parseInt(req.userId, 10) : 0;

    if (!title) {
      return res.status(400).json({ error: 'title required' });
    }

    const moderationResult = await contentMod.checkContentWithQwen(title, description || '', notes || '');

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

    // Guardrail: this endpoint only extracts errand details — reject attempts to
    // use it as a general/injection channel.
    const extractScreen = screenUserMessage(input);
    if (extractScreen.blocked) {
      console.warn('[Extract] Blocked input (', extractScreen.tag, ')');
      return res.status(200).json({
        success: false,
        error: "I can only help set up an errand here. Please describe the errand you need done (what, where, when, and your budget).",
      });
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

    console.log('[Extract] Qwen API Key available:', !!qwenApiKey);

    // Always use regex fallback first for faster processing
    // Only try Qwen if fallback didn't work well
    const regexCleanedTitle = fallbackTitleClean(title);

    if (qwenApiKey && (!regexCleanedTitle || regexCleanedTitle.length < 5)) {
      try {
        console.log('[Extract] ✓ Trying Qwen to clean title (regex fallback failed)...');
        const titleCleanResponse = await axios.post(
          `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`,
          {
            model: 'qwen-max',
            messages: [
              {
                role: 'system',
                content: `Extract only the core action + what needs to be done. Keep SHORT (3-8 words max). REMOVE dates, times, locations, postal codes. OUTPUT ONLY the title, nothing else.

Example: "Decorate Apartment For Party At 238857, Tomorrow 9am" → "Decorate Apartment For Party"`,
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
            timeout: 3000,
          }
        );

        const qwenTitle = titleCleanResponse.data?.choices?.[0]?.message?.content?.trim();
        if (qwenTitle && qwenTitle.length > 0 && qwenTitle.length < 100) {
          cleanedTitle = qwenTitle;
          console.log('[Extract] ✅ Qwen cleaned title:', cleanedTitle);
        }
      } catch (error) {
        console.warn('[Extract] Qwen title cleaning skipped (using regex):', error instanceof Error ? error.message : '');
        cleanedTitle = regexCleanedTitle;
      }
    } else if (regexCleanedTitle) {
      cleanedTitle = regexCleanedTitle;
      console.log('[Extract] ✓ Using regex-cleaned title:', cleanedTitle);
    }

    // Fallback: basic cleanup if Qwen not available
    if (cleanedTitle === title) {
      // Strategy: Take only the first sentence, then clean up any metadata within it
      let firstSentence = title.split(/[\.\!\?]/)[0]; // Get text before first punctuation mark

      cleanedTitle = firstSentence
        // Remove metadata at the end of the sentence (order matters!)
        .replace(/\s*,?\s*budget\s*[\d.$]*$/i, '') // Remove budget
        .replace(/\s*,?\s*\$\s*\d+$/i, '') // Remove $ amounts
        .replace(/\s+for\s+[\d.]+\s*(?:hours?|hrs?|h|mins?|m)$/i, '') // Remove "for X hours/minutes"
        // Remove time + location patterns like "on Saturday 2pm at Clementi"
        .replace(/\s+(?:on|every)\s+\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b(?:\s+\d{1,2})?(?::\d{2})?\s*(?:am|pm)?(?:\s+at\s+[\w\s]+)?$/i, '')
        // Remove just time patterns "at 2pm" or "at 2:30pm"
        .replace(/\s+(?:at)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m|p\.m)(?:\s+at\s+[\w\s]+)?$/i, '')
        // Remove street addresses like "at 32 Flora Drive"
        .replace(/\s+at\s+\d+\s+[\w\s]+(?:drive|street|road|avenue|lane|court|place|crescent|close).*$/i, '')
        // Remove area names like "at Clementi" or "at salon"
        .replace(/\s+at\s+\b(?:clementi|bedok|tampines|jurong|bukit|pasir ris|yishun|hougang|serangoon|punggol|ang mo kio|bishan|toa payoh|novena|newton|tiong bahru|outram|queenstown|tanjong pagar|orchard|dhoby ghaut|chinatown|marina|raffles|sentosa|changi|kranji|woodlands|sembawang|salon|home|office|workplace)\b.*$/i, '')
        .replace(/\s+\d{6}\b$/g, '') // Remove postal codes at end
        // Remove leading filler phrases
        .replace(/^(?:i\s+need\s+to|can\s+you|please|could\s+you|would\s+you|i\s+need|need\s+to)\s+/i, '')
        // Final cleanup
        .replace(/\s+/g, ' ')
        .replace(/[.,\s]+$/g, '')
        .trim();
    }

    // Final cleanup
    if (!cleanedTitle || cleanedTitle.length < 2) {
      cleanedTitle = input.split(/\s+/).slice(0, 5).join(' ').trim();
    }

    cleanedTitle = cleanedTitle && cleanedTitle.length > 1 ? cleanedTitle : 'Task';

    // Title case (allow up to 150 chars for full task description)
    cleanedTitle = cleanedTitle
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .substring(0, 150);

    title = cleanedTitle;
    console.log('[Extract] Final title:', title);

    // Fast keyword-based category detection (skip slow Qwen call)
    let category = 'homehelp'; // Default fallback
    const lowerInput = input.toLowerCase();

    // Map keywords to categories (order matters - check specific before general)
    // Check event/party FIRST (before creative-arts which includes "design")
    if (lowerInput.includes('event') || lowerInput.includes('party') || lowerInput.includes('decorate') || lowerInput.includes('decoration') || lowerInput.includes('setup') || lowerInput.includes('wedding') || lowerInput.includes('celebration')) {
      category = 'eventhelp';
    } else if (lowerInput.includes('social media') || lowerInput.includes('content') || lowerInput.includes('graphic') || lowerInput.includes('video') || lowerInput.includes('photo') || lowerInput.includes('photography') || lowerInput.includes('art') || lowerInput.includes('illustration') || lowerInput.includes('creative') || lowerInput.includes('design')) {
      category = 'creative-arts';
    } else if (lowerInput.includes('walk') || lowerInput.includes('dog') || lowerInput.includes('pet') || lowerInput.includes('cat')) {
      category = 'petcare';
    } else if (lowerInput.includes('cook') || lowerInput.includes('cooking') || lowerInput.includes('meal') || lowerInput.includes('lunch') || lowerInput.includes('dinner') || lowerInput.includes('breakfast') || lowerInput.includes('food') || lowerInput.includes('recipe') || lowerInput.includes('prepare')) {
      category = 'food-beverage';
    } else if (lowerInput.includes('babysit') || lowerInput.includes('childcare') || lowerInput.includes('tutor') || lowerInput.includes('child')) {
      category = 'childcare';
    } else if (lowerInput.includes('elderly') || lowerInput.includes('elder') || lowerInput.includes('grandmother') || lowerInput.includes('grandfather') || lowerInput.includes('senior')) {
      category = 'eldercare';
    } else if (lowerInput.includes('drive') || lowerInput.includes('airport') || lowerInput.includes('taxi') || lowerInput.includes('ride') || lowerInput.includes('travel')) {
      category = 'travel-mobility';
    } else if (lowerInput.includes('deliver') || lowerInput.includes('move') || lowerInput.includes('moving') || lowerInput.includes('moving boxes') || lowerInput.includes('transport')) {
      category = 'delivery-moving';
    } else if (lowerInput.includes('clean') || lowerInput.includes('laundry') || lowerInput.includes('house') || lowerInput.includes('wash') || lowerInput.includes('dishes') || lowerInput.includes('scrub') || lowerInput.includes('sweep') || lowerInput.includes('mop') || lowerInput.includes('vacuum') || lowerInput.includes('dust') || lowerInput.includes('tidy') || lowerInput.includes('organize')) {
      category = 'homehelp';
    } else if (lowerInput.includes('grocery') || lowerInput.includes('shopping') || lowerInput.includes('shop')) {
      category = 'shopping-errands';
    } else if (lowerInput.includes('tech') || lowerInput.includes('computer') || lowerInput.includes('wifi') || lowerInput.includes('device')) {
      category = 'tech-support';
    } else if (lowerInput.includes('data entry') || lowerInput.includes('spreadsheet') || lowerInput.includes('excel')) {
      category = 'data-entry';
    } else if (lowerInput.includes('makeup') || lowerInput.includes('hair') || lowerInput.includes('salon') || lowerInput.includes('beauty') || lowerInput.includes('massage') || lowerInput.includes('spa') || lowerInput.includes('manicure') || lowerInput.includes('pedicure')) {
      category = 'personal-care';
    } else if (lowerInput.includes('charity') || lowerInput.includes('donation') || lowerInput.includes('donate') || lowerInput.includes('volunteer') || lowerInput.includes('community') || lowerInput.includes('pack') || lowerInput.includes('box') || lowerInput.includes('boxes')) {
      category = 'charity-community';
    }

    console.log('[Extract] Category detected (keyword-based):', category);

    // If keyword matching gave default "homehelp", try Qwen AI for better detection
    if (category === 'homehelp' && process.env.QWEN_API_KEY) {
      try {
        console.log('[Extract] ✓ Using Qwen to detect category...');
        const categoryResponse = await axios.post(
          `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`,
          {
            model: 'qwen-max',
            messages: [
              {
                role: 'system',
                content: `You are a task category classifier. Classify the task into ONE category.

CATEGORIES:
- petcare: dog walking, pet care, cat care
- food-beverage: cooking, meal prep, food delivery
- childcare: babysitting, tutoring, childcare
- eldercare: caring for elderly, bringing to hospital/doctor, senior care
- travel-mobility: driving, taxi, airport, travel
- delivery-moving: moving boxes, delivery, transport
- homehelp: cleaning, laundry, housekeeping
- shopping-errands: grocery shopping, shopping
- tech-support: computer help, wifi, tech
- data-entry: spreadsheet, data entry, excel
- personal-care: makeup, hair, salon, beauty, massage
- creative-arts: social media, design, video, photography, writing

OUTPUT ONLY the category name, nothing else.`,
              },
              {
                role: 'user',
                content: input,
              },
            ],
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 3000,
          }
        );

        const qwenCategory = categoryResponse.data?.choices?.[0]?.message?.content?.trim().toLowerCase();
        if (qwenCategory && qwenCategory.length < 30) {
          category = qwenCategory;
          console.log('[Extract] ✅ Qwen detected category:', category);
        }
      } catch (error) {
        console.warn('[Extract] Qwen category detection failed, using keyword fallback:', error instanceof Error ? error.message : error);
      }
    }

    // Title is already cleaned up above - skip additional Qwen polishing (too slow)
    console.log('[Extract] Final title:', title);

    // Parse date - look for "tomorrow", "today", "later" (=today), "N days later/in", day names, explicit dates, or dates
    let date = '';

    // Month mapping for date parsing
    const monthMap: Record<string, number> = {
      january: 1, jan: 1,
      february: 2, feb: 2,
      march: 3, mar: 3,
      april: 4, apr: 4,
      may: 5,
      june: 6, jun: 6,
      july: 7, jul: 7,
      august: 8, aug: 8,
      september: 9, sep: 9,
      october: 10, oct: 10,
      november: 11, nov: 11,
      december: 12, dec: 12
    };

    // Check for explicit dates first: "8 july", "8 july 2026", "july 8", "july 8 2026"
    const explicitDateMatch = input.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+(\d{4}))?/i);
    if (explicitDateMatch) {
      const day = parseInt(explicitDateMatch[1]);
      const monthStr = explicitDateMatch[2].toLowerCase();
      const year = explicitDateMatch[3] ? parseInt(explicitDateMatch[3]) : new Date().getFullYear();
      const month = monthMap[monthStr];
      if (month && day >= 1 && day <= 31) {
        // Use local date without timezone conversion
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        date = dateStr;
        console.log('[Extract] Date from explicit date pattern:', day, monthStr, year, 'parsed to:', date);
      }
    }

    // Check for "N days later" or "in N days" pattern
    if (!date) {
      const daysMatch = input.match(/(?:in|after)\s+(\d+)\s*days?(?:\s+later)?/i);
      if (daysMatch) {
        const daysToAdd = parseInt(daysMatch[1]);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysToAdd);
        date = futureDate.toISOString().split('T')[0];
        console.log('[Extract] Date from "in/after N days":', date);
      }
    }

    if (!date && /tomorrow/i.test(input)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
      console.log('[Extract] Date from "tomorrow":', date);
    }

    if (!date && /today|later/i.test(input)) {
      // "later" also means today
      date = new Date().toISOString().split('T')[0];
      console.log('[Extract] Date from "today/later":', date);
    }

    if (!date) {
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
      }
    }

    if (!date) {
      console.log('[Extract] No date pattern matched in:', input);
      // If no explicit date mentioned, check if it's today or use today as default
      // Don't auto-default - let user decide in form if truly no date given
      date = '';
      console.log('[Extract] No date pattern found, leaving empty for user to fill');
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

    // Use Mapbox Geocoding + URA boundaries for address/area determination
    let area = detectedArea || '';
    let fullAddress = 'Singapore';
    let needsAreaConfirmation = false;

    if (postalCode && postalCode.length === 6) {
      try {
        const addressData = await lookupAddress(postalCode);

        if (addressData) {
          fullAddress = addressData.formatted_address || `Singapore ${postalCode}`;
          area = addressData.area || 'Unable to classify';
          console.log(`[Extract] ✅ Address lookup success via ${addressData.provider}: ${area}, ${fullAddress}`);
        } else {
          // Unable to verify - ask user to enter manually
          fullAddress = `Singapore ${postalCode}`;
          area = 'Unable to verify';
          needsAreaConfirmation = true;
          console.log(`[Extract] ⚠️ Unable to verify postal code ${postalCode}, user manual entry needed`);
        }
      } catch (err) {
        console.warn(`[Extract] Address lookup error: ${err instanceof Error ? err.message : String(err)}`);
        fullAddress = `Singapore ${postalCode}`;
        area = area || 'Unable to verify';
        needsAreaConfirmation = true;
      }
    } else if (!detectedArea) {
      console.log('[Extract] No postal code or area detected');
      area = 'Unable to verify';
      fullAddress = 'Singapore';
    } else {
      fullAddress = detectedArea;
    }

    console.log('[Extract] Final - area:', area, 'fullAddress:', fullAddress);


    // Suggest relevant skills based on category and title keywords
    let suggestedSkills: string[] = [];

    // Build keyword-based suggestions (works even without Qwen)
    const categorySkillMap: Record<string, string[]> = {
      'eventhelp': ['Event Planning', 'Interior Design', 'Decoration', 'Vendor Coordination'],
      'petcare': ['Pet Care', 'Dog Handling', 'Pet Grooming', 'Animal Health'],
      'childcare': ['Childcare', 'CPR/First Aid', 'Child Development', 'Education'],
      'eldercare': ['Elder Care', 'Patient Care', 'Compassion', 'Health Awareness'],
      'homehelp': ['Cleaning', 'Organization', 'Maintenance', 'Problem Solving'],
      'food-beverage': ['Cooking', 'Food Safety', 'Meal Planning', 'Nutrition'],
      'travel-mobility': ['Navigation', 'Driving', 'Customer Service', 'Reliability'],
      'delivery-moving': ['Physical Fitness', 'Organization', 'Driving', 'Customer Service'],
      'creative-arts': ['Design', 'Creativity', 'Visual Communication', 'Software Skills'],
      'shopping-errands': ['Organization', 'Attention to Detail', 'Communication', 'Time Management'],
    };

    const baseSkills = categorySkillMap[category] || ['Reliability', 'Communication', 'Attention to Detail'];

    // Add title-specific skills
    const titleLower = title.toLowerCase();

    if (titleLower.includes('math') || titleLower.includes('tutor')) {
      suggestedSkills.push('Math Expertise');
    }
    if (titleLower.includes('english') || titleLower.includes('language')) {
      suggestedSkills.push('Language Skills');
    }
    if (titleLower.includes('plumb') || titleLower.includes('tap') || titleLower.includes('pipe')) {
      suggestedSkills.push('Plumbing');
    }
    if (titleLower.includes('electric') || titleLower.includes('wire')) {
      suggestedSkills.push('Electrical Work');
    }
    if (titleLower.includes('deep clean') || titleLower.includes('spring clean')) {
      suggestedSkills.push('Deep Cleaning');
    }
    if (titleLower.includes('groom') || titleLower.includes('pet')) {
      suggestedSkills.push('Pet Grooming');
    }
    if (titleLower.includes('hair') || titleLower.includes('salon') || titleLower.includes('cut')) {
      suggestedSkills.push('Hair Styling');
    }

    // Add 2-3 skills from category base list
    for (const skill of baseSkills) {
      if (!suggestedSkills.includes(skill) && suggestedSkills.length < 4) {
        suggestedSkills.push(skill);
      }
    }

    console.log('[Extract] Suggested skills (fallback):', suggestedSkills);

    // Extract certifications needed based on category and title
    let suggestedCertifications: string[] = [];

    const categoryCertifications: Record<string, string[]> = {
      'childcare': ['Childcare Certification', 'First Aid/CPR', 'Child Protection'],
      'eldercare': ['Elder Care Certification', 'Health & Safety', 'Patient Care'],
      'petcare': ['Animal Care Certificate', 'Pet First Aid'],
      'food-beverage': ['Food Hygiene', 'Food Handling Certificate'],
      'travel-mobility': ['Driving License', 'Vehicle Insurance'],
    };

    const titleLowerCert = title.toLowerCase();

    // Add title-specific certifications
    if (titleLowerCert.includes('tutor') || titleLowerCert.includes('teach')) {
      suggestedCertifications.push('Teaching Certification');
    }
    if (titleLowerCert.includes('babysit') || titleLowerCert.includes('childcare')) {
      suggestedCertifications.push('CPR/First Aid');
    }
    if (titleLowerCert.includes('elderly') || titleLowerCert.includes('elder')) {
      suggestedCertifications.push('Elder Care Certification');
    }
    if (titleLowerCert.includes('plumb')) {
      suggestedCertifications.push('Plumbing License');
    }
    if (titleLowerCert.includes('electric')) {
      suggestedCertifications.push('Electrical License');
    }

    // Add category-based certifications
    const baseCerts = categoryCertifications[category] || [];
    for (const cert of baseCerts) {
      if (!suggestedCertifications.includes(cert) && suggestedCertifications.length < 2) {
        suggestedCertifications.push(cert);
      }
    }

    console.log('[Extract] Suggested certifications:', suggestedCertifications);

    // Extract recurring pattern from input (e.g., "every 2 weeks", "weekly", "monthly")
    let isRecurring = false;
    let repeatEvery = 1;
    let repeatUnit: 'day' | 'week' | 'month' = 'week';
    let occurrences = 1;

    const recurringPatterns = [
      { pattern: /every\s+(\d+)\s+weeks?/i, unit: 'week' as const },
      { pattern: /every\s+(\d+)\s+days?/i, unit: 'day' as const },
      { pattern: /every\s+(\d+)\s+months?/i, unit: 'month' as const },
      { pattern: /weekly/i, unit: 'week' as const, every: 1 },
      { pattern: /daily/i, unit: 'day' as const, every: 1 },
      { pattern: /monthly/i, unit: 'month' as const, every: 1 },
      { pattern: /bi-weekly|biweekly|every\s+other\s+week/i, unit: 'week' as const, every: 2 },
      { pattern: /fortnightly/i, unit: 'week' as const, every: 2 },
    ];

    const occurrencePatterns = [
      { pattern: /for\s+(\d+)\s+(?:weeks?|days?|months?|times?|sessions?|occurrences?)/i },
      { pattern: /(\d+)\s+(?:weeks?|days?|months?|times?|sessions?|occurrences?)$/i },
    ];

    const lowerInputForRecurring = input.toLowerCase();

    for (const rec of recurringPatterns) {
      const match = lowerInputForRecurring.match(rec.pattern);
      if (match) {
        isRecurring = true;
        repeatUnit = rec.unit;
        repeatEvery = rec.every || parseInt(match[1], 10) || 1;
        console.log(`[Extract] Detected recurring: every ${repeatEvery} ${repeatUnit}(s)`);
        break;
      }
    }

    if (isRecurring) {
      for (const occ of occurrencePatterns) {
        const match = lowerInputForRecurring.match(occ.pattern);
        if (match) {
          occurrences = parseInt(match[1], 10);
          console.log(`[Extract] Detected occurrences: ${occurrences}`);
          break;
        }
      }
    }

    // Use Qwen to generate smart, task-specific tips for the description field
    let description = '';

    if (qwenApiKey) {
      try {
        console.log('[Extract] ✓ Using Qwen to generate task-specific tips...');
        const tipsResponse = await axios.post(
          `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`,
          {
            model: 'qwen-max',
            messages: [
              {
                role: 'system',
                content: `You are a helpful task description assistant. Given a task title, generate a SHORT and PRACTICAL tip that guides the doer on what details to include.

RULES:
1. Keep it SHORT (1-2 sentences max, under 120 chars)
2. Be SPECIFIC to the task title, not generic
3. Ask for ACTIONABLE details only (what matters for doing the task)
4. Be warm and helpful, not robotic
5. Focus on WHAT information is needed, not generic instructions

EXAMPLES:
- Title: "Decorate Apartment For Party" → "Let me know party size, theme/style, and which rooms to decorate. Do you have specific colors or decorations in mind?"
- Title: "Walk My Dog" → "Tell me about your dog's size, temperament, and if there are any health issues or areas to avoid."
- Title: "Clean My House" → "Which areas need most attention? Do you prefer eco-friendly products or have any cleaning preferences?"
- Title: "Fix Leaky Kitchen Tap" → "Describe the issue in detail - is it dripping constantly or leaking under the sink? Any previous repair attempts?"
- Title: "Tutor My Daughter P6 Math" → "What's her current level and which topics need focus? Do you have specific materials or exams to prepare for?"
- Title: "Babysit 2 Kids Ages 3-5" → "Any dietary restrictions, allergies, or bedtime routines I should know about? What activities do they enjoy?"

Output ONLY the tip (1-2 sentences), nothing else.`,
              },
              {
                role: 'user',
                content: `Task: "${title}"`,
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

        const tipsText = tipsResponse.data?.choices?.[0]?.message?.content?.trim();
        if (tipsText && tipsText.length > 0 && tipsText.length < 250) {
          description = tipsText;
          console.log('[Extract] ✅ Qwen generated tips:', description);
        }
      } catch (error) {
        console.warn('[Extract] Qwen tips generation failed, using fallback:', error instanceof Error ? error.message : error);
      }
    }

    // Fallback if Qwen not available or failed
    if (!description) {
      const titleLowercase = title.toLowerCase();

      // Task-specific fallback tips
      if (titleLowercase.includes('decorate') && titleLowercase.includes('party')) {
        description = `Need: party size, theme/colors, which rooms, and any rental constraints?`;
      } else if (titleLowercase.includes('hair') || titleLowercase.includes('salon') || titleLowercase.includes('cut')) {
        description = `Need: hair type, desired length/style, face shape, and previous color?`;
      } else if (titleLowercase.includes('deep clean') || titleLowercase.includes('spring clean')) {
        description = `Need: sq footage, which rooms prioritized, inside cabinets/fridge, eco-friendly?`;
      } else if (titleLowercase.includes('office') && titleLowercase.includes('clean')) {
        description = `Need: size, how many rooms, high-touch areas, eco-friendly products?`;
      } else if (titleLowercase.includes('clean') && titleLowercase.includes('house')) {
        description = `Need: rooms prioritized, deep areas (behind furniture), pet-friendly products?`;
      } else if (titleLowercase.includes('walk') && (titleLowercase.includes('dog') || titleLowercase.includes('pet'))) {
        description = `Need: dog size/breed, temperament with strangers, areas to avoid, health issues?`;
      } else if (titleLowercase.includes('pet') && titleLowercase.includes('care')) {
        description = `Need: pet type/size, medical conditions, diet, favorite toys, anxiety triggers?`;
      } else if (titleLowercase.includes('babysit') && (titleLowercase.includes('twins') || titleLowercase.includes('ages'))) {
        description = `Need: nap times, food allergies, screen time, emergency contacts, bedtime?`;
      } else if (titleLowercase.includes('babysit') || titleLowercase.includes('childcare')) {
        description = `Need: child age(s), allergies, bedtime routine, favorite activities, screen time?`;
      } else if (titleLowercase.includes('tutor') && titleLowercase.includes('math')) {
        description = `Need: student level, weaknesses, exam date, learning pace, materials?`;
      } else if (titleLowercase.includes('tutor') || titleLowercase.includes('teach')) {
        description = `Need: subject, student level, weak areas, exam coming, teaching style?`;
      } else if (titleLowercase.includes('fix') && titleLowercase.includes('tap')) {
        description = `Need: dripping or spraying? Under-sink leaks? Faucet type? Previous repairs?`;
      } else if (titleLowercase.includes('repair') && titleLowercase.includes('washing')) {
        description = `Need: error codes shown? Sounds/smells? Repair history? Budget for parts?`;
      } else if (titleLowercase.includes('repair') || titleLowercase.includes('fix')) {
        description = `Need: what's broken exactly? When stopped working? Repair history? Budget?`;
      } else if (titleLowercase.includes('elderly') || titleLowercase.includes('elder')) {
        description = `Need: mobility level, medications to manage, meals to prep, activities?`;
      } else if (titleLowercase.includes('deliver') && titleLowercase.includes('fragile')) {
        description = `Need: item description, weight/size, destination, time window, insurance?`;
      } else if (titleLowercase.includes('deliver') || titleLowercase.includes('delivery')) {
        description = `Need: item type, weight/size, pickup location, destination, time window?`;
      } else if (titleLowercase.includes('move') || titleLowercase.includes('moving')) {
        description = `Need: how many rooms/items, fragile items, packing help, destination floor?`;
      } else if (titleLowercase.includes('shop') && titleLowercase.includes('grocery')) {
        description = `Need: stores to visit, dietary restrictions/allergies, budget, brands?`;
      } else if (titleLowercase.includes('shop') || titleLowercase.includes('grocery')) {
        description = `Need: specific items list, stores, budget limit, dietary restrictions?`;
      } else if (titleLowercase.includes('design') || titleLowercase.includes('logo')) {
        description = `Need: style/mood, brand colors, target audience, deadline, revision rounds?`;
      } else {
        // Generic by category with specific prompts
        const categoryDescriptions: Record<string, string> = {
          'homehelp': 'Need: which areas/rooms, materials available, allergies/sensitivities?',
          'petcare': 'Need: pet type/size/age, health issues, diet, temperament?',
          'delivery': 'Need: what item, weight/size, pickup location, destination, timeframe?',
          'eventhelp': 'Need: party size, theme/style, which rooms, budget for decorations?',
          'childcare': 'Need: child age, allergies, bedtime, activities, emergency contacts?',
          'eldercare': 'Need: mobility level, medications, meal prep, preferred activities?',
          'wellness': 'Need: specific wellness goal, health conditions, availability, budget?',
          'food-beverage': 'Need: guest count, dietary restrictions, cuisine, serving style?',
          'travel-mobility': 'Need: destination, timeframe, luggage amount, accessibility needs?',
          'creative-arts': 'Need: style preference, target audience, brand colors, deadline?',
        };
        description = categoryDescriptions[category] || `Need: more details about what's required?`;
      }
    }

    res.json({
      success: true,
      data: {
        title,
        description,
        location: area || '', // Use area as location (from postal code lookup)
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
        isRecurring,
        repeatEvery,
        repeatUnit,
        occurrences,
        suggestedSkills,
        suggestedCertifications,
        needsAreaConfirmation, // Flag to ask user to confirm area if OneMap failed
      },
    });
  } catch (error) {
    console.error('[Extract] Fatal error:', error instanceof Error ? error.stack : String(error));
    res.status(500).json({ error: 'Failed to extract', details: error instanceof Error ? error.message : String(error) });
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
        reason: (moderationResult.details as any)?.reason || '',
      },
    });
  } catch (error) {
    console.error('Content filter error:', error);
    res.status(500).json({ error: 'Failed to filter' });
  }
});

// POST /api/ai/moderate-image - server-side profile photo moderation.
// Auth required so the server-held API key can't be used as a free vision API.
router.post('/moderate-image', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image (base64 data URI) required' });
    }
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(image)) {
      return res.status(400).json({ error: 'Unsupported image format' });
    }
    if (image.length > 8_000_000) {
      return res.status(413).json({ error: 'Image too large' });
    }

    const qwenApiKey = process.env.QWEN_API_KEY;
    if (!qwenApiKey) {
      console.warn('[ModerateImage] QWEN_API_KEY not set — skipping image moderation');
      return res.json({ success: true, data: { approved: true, checked: false, reason: '' } });
    }

    const response = await axios.post(
      `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`.replace('/v1//chat', '/v1/chat'),
      {
        model: 'qwen-vl-plus',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image } },
              {
                type: 'text',
                text: 'You are moderating a profile photo for a community errand marketplace in Singapore. Reject ONLY if it clearly contains nudity or sexual content, graphic violence or gore, hate symbols, weapons, or illegal drugs. Ordinary photos of people, pets, scenery, objects, cartoons or avatars are perfectly fine. Reply with ONLY valid JSON, no prose: {"approved": true or false, "reason": "one short sentence if rejected, otherwise empty"}',
              },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${qwenApiKey}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );

    const text = response.data?.choices?.[0]?.message?.content?.trim() || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.approved === 'boolean') {
        console.log('[ModerateImage] approved:', parsed.approved, parsed.reason || '');
        return res.json({
          success: true,
          data: { approved: parsed.approved, checked: true, reason: parsed.reason || '' },
        });
      }
    }

    // Unparseable reply — fail open, but mark it as unchecked rather than pretending it passed
    console.warn('[ModerateImage] Unparseable model reply, allowing:', text.slice(0, 120));
    return res.json({ success: true, data: { approved: true, checked: false, reason: '' } });
  } catch (error: any) {
    console.error('[ModerateImage] error:', error?.message);
    // Fail open — never block a legitimate upload because the service errored
    return res.json({ success: true, data: { approved: true, checked: false, reason: '' } });
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

    if (!title) {
      console.warn('[Suggestions] Missing required field: title');
      return res.status(400).json({ error: 'Title required' });
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

    // Simple spell-correction patterns for common typos
    // Includes both word replacements and regex patterns for double letters
    const commonCorrections: Record<string, string> = {
      'mu ': 'my ',
      'yu ': 'you ',
      'teh ': 'the ',
      'recieve': 'receive',
      'occured': 'occurred',
      'seperate': 'separate',
      'definately': 'definitely',
      'recomend': 'recommend',
      'begining': 'beginning',
      'adress': 'address',
      'suceed': 'succeed',
      'excelent': 'excellent',
      'occassion': 'occasion',
      'untill': 'until',
      'wich': 'which',
      'wiht': 'with',
      'taht': 'that',
      'thier': 'their',
      'becuase': 'because',
      'accomodate': 'accommodate',
      'goverment': 'government',
      'sentance': 'sentence',
      'foriegn': 'foreign',
      'neccessary': 'necessary',
      'resturant': 'restaurant',
      'writting': 'writing',
      'studing': 'studying',
      'bussiness': 'business',
    };

    // Regex patterns for common double-letter typos and single-letter mistakes
    const doubleLetterCorrections: Array<[RegExp, string]> = [
      [/\bturorr\b/gi, 'tutor'],
      [/\btutorr\b/gi, 'tutor'],
      [/\btutory\b/gi, 'tutor'],
      [/\btutro\b/gi, 'tutor'],
      [/\bclenaing\b/gi, 'cleaning'],
      [/\bclening\b/gi, 'cleaning'],
      [/\bhelpp\b/gi, 'help'],
      [/\bmovving\b/gi, 'moving'],
    ];

    // Spell-check the title first
    let correctedTitle = title;
    let hasCorrections = false;

    if (title.trim().length > 0) {
      // Try Qwen first if API key is available
      if (qwenApiKey) {
        try {
          console.log('[Suggestions] Spell-checking title with Qwen:', title);
          const spellCheckResponse = await axios.post(
            `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`.replace('/v1//chat', '/v1/chat'),
            {
              model: 'qwen-max',
              messages: [
                {
                  role: 'user',
                  content: `You are a spelling and grammar corrector. Check the following task title for spelling errors and typos. If there are errors, correct them. If there are no errors, return the title unchanged.\n\nIMPORTANT: Return ONLY the corrected title, nothing else. No explanations, no quotes.\n\nTitle: "${title}"`,
                },
              ],
            },
            {
              headers: {
                'Authorization': `Bearer ${qwenApiKey}`,
                'X-DashScope-AsyncRequest': 'false',
                'Content-Type': 'application/json',
              },
              timeout: 2000,
            }
          );

          let correctionText = spellCheckResponse.data?.choices?.[0]?.message?.content?.trim() || title;

          // Validate Qwen's correction - if it changed too much, reject it
          // Compare word counts: if too different, use pattern matching instead
          const originalWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          const correctedWords = correctionText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          const wordCountDiff = Math.abs(originalWords.length - correctedWords.length);

          if (wordCountDiff > 1) {
            console.log('[Suggestions] ⚠️ Qwen correction too aggressive (word count diff=' + wordCountDiff + '), rejecting');
            correctionText = title; // Reject it and use pattern matching instead
          }

          if (correctionText && correctionText !== title) {
            console.log('[Suggestions] ✅ Title corrected with Qwen from "' + title + '" to "' + correctionText + '"');
            correctedTitle = correctionText;
            hasCorrections = true;
          } else {
            correctedTitle = title;
          }
        } catch (spellErr) {
          console.warn('[Suggestions] Qwen spell-check failed, falling back to pattern matching:', spellErr instanceof Error ? spellErr.message : String(spellErr));
          // Fall through to pattern matching
        }
      }

      // If no Qwen correction or Qwen failed, use pattern matching
      if (!hasCorrections) {
        let patternCorrected = title;

        // Check common word corrections first
        for (const [typo, correct] of Object.entries(commonCorrections)) {
          const regex = new RegExp('\\b' + typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
          if (regex.test(patternCorrected)) {
            patternCorrected = patternCorrected.replace(regex, correct);
            hasCorrections = true;
          }
        }

        // Check double-letter patterns
        if (!hasCorrections) {
          for (const [pattern, replacement] of doubleLetterCorrections) {
            if (pattern.test(patternCorrected)) {
              patternCorrected = patternCorrected.replace(pattern, replacement);
              hasCorrections = true;
              break;
            }
          }
        }

        if (hasCorrections) {
          console.log('[Suggestions] ✅ Title corrected with pattern matching from "' + title + '" to "' + patternCorrected + '"');
          correctedTitle = patternCorrected;
        }
      }
    }

    // NOW detect category - AFTER spell-check so we use correctedTitle
    let detectedCategory = categoryMap[category];

    // If no category provided, try to detect from corrected title keywords
    if (!detectedCategory) {
      const titleLower = correctedTitle.toLowerCase();

      // Keyword-based category detection - check childcare/education FIRST (most specific)
      if (titleLower.includes('tutor') || titleLower.includes('teach') || titleLower.includes('lesson') ||
          titleLower.includes('babysit') || titleLower.includes('nanny') || titleLower.includes('childcare') ||
          titleLower.includes('child') || titleLower.includes('kid')) {
        detectedCategory = 'childcare';
      } else if (titleLower.includes('walk') || titleLower.includes('pet') || titleLower.includes('dog') || titleLower.includes('cat')) {
        detectedCategory = 'petcare';
      } else if (titleLower.includes('move') || titleLower.includes('deliver') || titleLower.includes('transport')) {
        detectedCategory = 'delivery';
      } else if (titleLower.includes('elder') || titleLower.includes('senior')) {
        detectedCategory = 'eldercare';
      } else if (titleLower.includes('event') || titleLower.includes('party') || titleLower.includes('wedding')) {
        detectedCategory = 'eventhelp';
      } else if (titleLower.includes('tech') || titleLower.includes('computer') || titleLower.includes('software')) {
        detectedCategory = 'tech-support';
      } else if (titleLower.includes('data') || titleLower.includes('entry') || titleLower.includes('spreadsheet')) {
        detectedCategory = 'data-entry';
      } else if (titleLower.includes('clean') || titleLower.includes('repair') || titleLower.includes('fix') || titleLower.includes('wash')) {
        detectedCategory = 'homehelp';
      } else {
        detectedCategory = 'homehelp'; // Default fallback
      }

      console.log('[Suggestions] Category detected from corrected title:', titleLower, '→', detectedCategory);
    } else {
      console.log('[Suggestions] Using provided category:', category, '→', detectedCategory);
    }

    // Enhanced skill map - more specific to task titles when possible
    const titleKeywordSkillMap: Record<string, Record<string, string[]>> = {
      'childcare': {
        'tutor': ['Teaching Ability', 'Subject Expertise', 'Patience', 'Communication'],
        'babysit': ['Child Safety Awareness', 'Communication', 'Patience', 'Activity Planning'],
        'nanny': ['Child Care Experience', 'Responsibility', 'Communication', 'Patience'],
        'default': ['Child Safety Awareness', 'Communication', 'Patience', 'Activity Planning'],
      },
      'homehelp': {
        'clean': ['Attention to Detail', 'Time Management', 'Physical Stamina', 'Organization'],
        'organiz': ['Organization', 'Attention to Detail', 'Time Management', 'Communication'],
        'repair': ['Problem-solving', 'Technical Skills', 'Attention to Detail', 'Reliability'],
        'paint': ['Attention to Detail', 'Physical Stamina', 'Precision', 'Technical Skills'],
        'default': ['Attention to Detail', 'Time Management', 'Physical Stamina', 'Problem-solving'],
      },
      'petcare': {
        'walk': ['Physical Fitness', 'Animal Care Experience', 'Reliability', 'Communication'],
        'sit': ['Animal Care Experience', 'Patience', 'Responsibility', 'Communication'],
        'groom': ['Animal Care Experience', 'Attention to Detail', 'Physical Fitness', 'Communication'],
        'default': ['Animal Care Experience', 'Patience', 'Physical Fitness', 'Communication'],
      },
      'delivery': {
        'move': ['Physical Strength', 'Problem-solving', 'Reliability', 'Teamwork'],
        'deliver': ['Navigation Skills', 'Reliability', 'Customer Service', 'Physical Fitness'],
        'transport': ['Reliability', 'Navigation Skills', 'Physical Fitness', 'Customer Service'],
        'default': ['Reliability', 'Navigation Skills', 'Physical Fitness', 'Customer Service'],
      },
      'eldercare': {
        'care': ['Patience', 'Communication Skills', 'Physical Care Experience', 'Empathy'],
        'companion': ['Communication Skills', 'Empathy', 'Patience', 'Listening Skills'],
        'help': ['Patience', 'Communication Skills', 'Physical Care Experience', 'Empathy'],
        'default': ['Patience', 'Communication Skills', 'Physical Care Experience', 'Empathy'],
      },
    };

    // Parallel calls to Qwen for skills, description, and notes - using corrected title
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

    // Keyword-based certification suggestions for more specific tasks
    const titleKeywordCertMap: Record<string, Record<string, { required: string[], optional: string[] }>> = {
      'childcare': {
        'tutor': {
          required: ['Teaching Certification', 'Subject Expertise'],
          optional: ['TESOL Certification', 'Special Education Training']
        },
        'babysit': {
          required: [],
          optional: ['CPR Certification', 'First Aid Certification', 'Background Check', 'Child Care License']
        },
        'nanny': {
          required: ['Child Care License'],
          optional: ['CPR Certification', 'First Aid Certification', 'Background Check']
        },
        'default': {
          required: ['Child Care License'],
          optional: ['CPR Certification', 'First Aid Certification', 'Background Check']
        }
      },
      'homehelp': {
        'clean': {
          required: [],
          optional: ['Cleaning Certification', 'Safety Training', 'Chemical Handling Certification']
        },
        'repair': {
          required: [],
          optional: ['Handyman License', 'Safety Training', 'Electrical Certification']
        },
        'default': {
          required: [],
          optional: ['Cleaning Certification', 'Safety Training', 'Chemical Handling Certification']
        }
      }
    };

    const certificationMap: Record<string, { required: string[], optional: string[] }> = {
      'eldercare': {
        required: ['Caregiver Certification'],
        optional: ['CPR Certification', 'First Aid Certification', 'Dementia Care Training']
      },
      'childcare': {
        required: ['Child Care License'],
        optional: ['CPR Certification', 'First Aid Certification', 'Background Check']
      },
      'homehelp': {
        required: [],
        optional: ['Cleaning Certification', 'Safety Training', 'Chemical Handling Certification']
      },
      'petcare': {
        required: [],
        optional: ['Pet Care Certification', 'Animal CPR', 'Veterinary Assistant Training']
      },
      'delivery': {
        required: ['Valid Driver License'],
        optional: ['Vehicle Insurance', 'Defensive Driving Course']
      },
      'eventhelp': {
        required: [],
        optional: ['Event Management Certificate', 'Safety Training']
      },
      'tech-support': {
        required: ['Technical Certification'],
        optional: ['CompTIA A+', 'Microsoft Certified', 'Apple Certified']
      },
      'data-entry': {
        required: [],
        optional: ['Data Entry Certification', 'Excel Certification']
      },
      'admin-business': {
        required: [],
        optional: ['Microsoft Office Certification', 'Administrative Assistant Certification']
      },
      'creative-arts': {
        required: [],
        optional: ['Design Certification', 'Professional Portfolio']
      }
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
    console.log('[Suggestions] Making Qwen API calls...');
    const [skillsResult, descriptionResult, notesResult, certsResult] = await Promise.allSettled([
      qwenApiKey ? axios.post(
        `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`.replace('/v1//chat', '/v1/chat'),
        {
          model: 'qwen-max',
          messages: [
            {
              role: 'user',
              content: `You are a skills assessment expert. Given a task, list 4-5 specific skills required to complete it successfully. Return ONLY the skills as a comma-separated list. Be specific to THIS task, not generic.\n\nTask: "${correctedTitle}"\nCategory: ${detectedCategory}\nWhat specific skills are required?`,
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
        `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`.replace('/v1//chat', '/v1/chat'),
        {
          model: 'qwen-max',
          messages: [
            {
              role: 'user',
              content: `You are a task description expert. Write a clear, specific task description that helps doers understand exactly what work is needed. Include: (1) What specifically needs to be done, (2) What the doer should bring/know, (3) Expected outcome. Keep it under 180 characters. Be direct and specific, not generic.\n\nTask: "${correctedTitle}"\nCategory: ${detectedCategory}\nDate: ${date || 'TBD'}\nTime: ${time || 'TBD'}\n\nWrite a clear description of what this task involves and what doers should expect.`,
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
        `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`.replace('/v1//chat', '/v1/chat'),
        {
          model: 'qwen-max',
          messages: [
            {
              role: 'user',
              content: `You are a task screening expert. Generate 2-3 specific, practical questions the task poster should ask potential doers. Focus on: (1) Experience/qualifications needed, (2) Safety or quality concerns, (3) Logistical requirements. Use action-oriented language like "Ask doer about..." or "Verify...". Keep under 220 characters. Be specific to this task type.\n\nTask: "${correctedTitle}"\nCategory: ${detectedCategory}\nWhat important questions should be asked to qualified doers for this task?`,
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
        `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`.replace('/v1//chat', '/v1/chat'),
        {
          model: 'qwen-max',
          messages: [
            {
              role: 'user',
              content: `You are a certification and licensing expert for a Singapore task marketplace. For the task below, list ONLY real, widely-recognised certifications, licences, or formal training that are genuinely relevant. Use Singapore-recognised names where they apply (examples: "Standard First Aid", "CPR + AED Certification", "SFA Food Handler Certificate", "WSQ Healthcare Support", "Class 3 Driving Licence", "Licensed Electrical Worker", "NEA Cleaning Business Licence").\n\nStrict rules:\n- Do NOT invent certifications. If you are unsure a certification really exists, omit it.\n- Do NOT list skills, personality traits, or generic abilities — only formal certifications, licences, or accredited training.\n- Most everyday errands need NONE — in that case return empty arrays.\n- "required" = legally or safety mandatory to do this task; "optional" = builds trust but not mandatory.\n- Maximum 3 items per list.\n\nReturn ONLY valid JSON, no prose or explanation: {"required": ["..."], "optional": ["..."]}\n\nTask: "${correctedTitle}"\nCategory: ${detectedCategory}`,
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
    ]);

    // Process results
    let skills: string[] = [];
    let suggestedDescription = '';
    let notes = '';

    if (skillsResult.status === 'fulfilled') {
      // OpenAI compatible response format: choices[0].message.content
      const skillsText = skillsResult.value.data?.choices?.[0]?.message?.content?.trim() || '';
      if (skillsText) {
        skills = skillsText.split(',').map(s => s.trim()).filter(s => s && s.length > 0);
        console.log('[Qwen] ✅ Generated skills:', skills);
      }
    } else {
      console.warn('[Qwen] Skills generation failed:', skillsResult.reason instanceof Error ? skillsResult.reason.message : JSON.stringify(skillsResult.reason));
    }

    if (descriptionResult.status === 'fulfilled') {
      const aiText = descriptionResult.value.data?.choices?.[0]?.message?.content || '';
      if (aiText && aiText.trim().length > 0) {
        suggestedDescription = aiText.substring(0, 180).trim();
        console.log('[Qwen] ✅ Description generated:', suggestedDescription);
      }
    } else {
      console.warn('[Qwen] Description generation failed:', descriptionResult.reason instanceof Error ? descriptionResult.reason.message : JSON.stringify(descriptionResult.reason));
    }

    if (notesResult.status === 'fulfilled') {
      const aiNotes = notesResult.value.data?.choices?.[0]?.message?.content || '';
      if (aiNotes && aiNotes.trim().length > 0) {
        notes = aiNotes.substring(0, 220).trim();
        console.log('[Qwen] ✅ Notes/questions generated:', notes);
      }
    } else {
      console.warn('[Qwen] Notes generation failed');
    }

    // Fallback to basic skills if Qwen fails - use title-specific skills if available
    if (skills.length === 0) {
      const categorySkills = titleKeywordSkillMap[detectedCategory];
      if (categorySkills) {
        // Try to match keywords in the corrected title
        const titleLower = correctedTitle.toLowerCase();
        for (const [keyword, keywordSkills] of Object.entries(categorySkills)) {
          if (keyword !== 'default' && titleLower.includes(keyword)) {
            skills = keywordSkills;
            console.log('[Suggestions] Using keyword-matched skills for', keyword, ':', skills);
            break;
          }
        }
      }

      // If still no match, use default skills
      if (skills.length === 0) {
        skills = (titleKeywordSkillMap[detectedCategory]?.default) || skillMap[detectedCategory] || ['Problem-solving', 'Communication', 'Reliability'];
        console.log('[Suggestions] Using fallback skills for', detectedCategory, ':', skills);
      }
    }

    // Fallback if Qwen not used - generate tips specific to the corrected title
    if (!suggestedDescription) {
      const titleLower = correctedTitle.toLowerCase();

      // Generate contextual tips based on category and keywords
      if (detectedCategory === 'childcare' && titleLower.includes('tutor')) {
        suggestedDescription = 'Tutoring help for child. Specify subject(s), grade level, time needed, and learning goals.';
      } else if (detectedCategory === 'homehelp' && titleLower.includes('clean')) {
        suggestedDescription = 'Professional cleaning service. Specify areas (bedroom, kitchen, bathroom) and condition.';
      } else if (detectedCategory === 'petcare' && titleLower.includes('walk')) {
        suggestedDescription = 'Dog walking service. Specify pet type, size, behavior, and walk duration/frequency.';
      } else if (detectedCategory === 'delivery' && titleLower.includes('move')) {
        suggestedDescription = 'Moving/delivery help. Specify items, quantity, size, weight, and destination.';
      } else {
        suggestedDescription = descriptionSuggestions[detectedCategory] || 'Describe what needs to be done, what doers should expect, and any special requirements.';
      }
      console.log('[Suggestions] Using contextual description:', suggestedDescription);
    }

    // Fallback if Qwen not used - generate practical notes based on category
    if (!notes) {
      const titleLower = correctedTitle.toLowerCase();

      if (detectedCategory === 'childcare') {
        notes = 'Ask doer: Experience with this age group? Any certifications? Background check? References?';
      } else if (detectedCategory === 'homehelp' && titleLower.includes('clean')) {
        notes = 'Ask doer: Own cleaning supplies or expect to be provided? Availability? References?';
      } else if (detectedCategory === 'petcare') {
        notes = 'Ask doer: Experience with this pet type? Comfortable with [pet behavior]? Insurance?';
      } else if (detectedCategory === 'delivery') {
        notes = 'Ask doer: Vehicle type? Can handle fragile items? Insurance? Availability?';
      } else {
        notes = notesSuggestions[detectedCategory] || 'Add important questions or requirements for potential doers.';
      }
      console.log('[Suggestions] Using contextual notes:', notes);
    }

    // AI-generated certifications (real, task-specific). Parse the strict JSON the
    // model was asked for; only trust it when it yields at least one real cert.
    let aiCertifications: { required: string[]; optional: string[] } | null = null;
    if (certsResult.status === 'fulfilled') {
      try {
        const raw = certsResult.value.data?.choices?.[0]?.message?.content?.trim() || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const clean = (arr: any): string[] =>
            Array.isArray(arr)
              ? arr.map((s: any) => String(s).trim()).filter((s: string) => s.length > 1 && s.length < 60).slice(0, 3)
              : [];
          const req = clean(parsed.required);
          const opt = clean(parsed.optional);
          if (req.length > 0 || opt.length > 0) {
            aiCertifications = { required: req, optional: opt };
            console.log('[Qwen] ✅ Generated certifications:', aiCertifications);
          } else {
            console.log('[Qwen] Certifications: AI says none needed for this task');
          }
        }
      } catch (e) {
        console.warn('[Qwen] Certification parse failed, using keyword fallback:', e instanceof Error ? e.message : '');
      }
    } else {
      console.warn('[Qwen] Certification generation failed:', certsResult.reason instanceof Error ? certsResult.reason.message : JSON.stringify(certsResult.reason));
    }

    // Get certifications for this category - use title-specific if available
    let certifications = { required: [] as string[], optional: [] as string[] };

    const categoryCerts = titleKeywordCertMap[detectedCategory];
    if (aiCertifications) {
      // Prefer real AI-suggested certifications when available
      certifications = aiCertifications;
      console.log('[Suggestions] Using AI-generated certifications');
    } else if (categoryCerts) {
      // Try to match keywords in the corrected title
      const titleLower = correctedTitle.toLowerCase();
      for (const [keyword, keywordCerts] of Object.entries(categoryCerts)) {
        if (keyword !== 'default' && titleLower.includes(keyword)) {
          certifications = keywordCerts;
          console.log('[Suggestions] Using keyword-matched certifications for', keyword);
          break;
        }
      }

      // If still no match, use default for this category
      if (certifications.required.length === 0 && certifications.optional.length === 0) {
        certifications = categoryCerts.default || certificationMap[detectedCategory] || { required: [], optional: [] };
        console.log('[Suggestions] Using default category certifications');
      }
    } else {
      // Fall back to general certification map
      certifications = certificationMap[detectedCategory] || { required: [], optional: [] };
    }

    // Ensure all response fields have valid values
    const responseData = {
      category: String(detectedCategory || 'homehelp'),
      description: String(suggestedDescription || 'Provide details about your task.'),
      notes: String(notes || 'Share any special requirements with doers.'),
      skills: Array.isArray(skills) ? skills : [],
      certifications: certifications,
      correctedTitle: String(correctedTitle || title),
      hasCorrections: hasCorrections,
    };

    console.log('[Suggestions] ✅ SUCCESS - Returning response');
    console.log('[Suggestions] Category:', responseData.category);
    console.log('[Suggestions] Description length:', responseData.description.length);
    console.log('[Suggestions] Notes length:', responseData.notes.length);
    console.log('[Suggestions] Skills count:', responseData.skills.length);
    console.log('[Suggestions] Certifications:', responseData.certifications);

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
          certifications: { required: [], optional: [] },
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
        `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`,
        {
          model: 'qwen-max',
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

      const analysisText = response.data?.choices?.[0]?.message?.content?.trim();
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
        `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`,
        {
          model: 'qwen-max',
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

      const analysisText = response.data?.choices?.[0]?.message?.content?.trim();
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
    const { user_preferences, user_history, user_role } = req.body;
    let { available_tasks } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!available_tasks || available_tasks.length === 0) {
      return res.status(400).json({ error: 'No tasks available' });
    }

    // The candidate list arrives from the client, so it cannot be trusted to
    // have been filtered. A screened doer must never be recommended work their
    // account is barred from — they could not offer on it anyway, and being
    // shown it repeatedly is its own kind of answer about their record.
    if (user_role === 'doer') {
      const restricted = await getRestrictedSlugs(userId);
      if (restricted.length > 0) {
        available_tasks = available_tasks.filter((t: any) => !restricted.includes(t?.category));
        if (available_tasks.length === 0) {
          return res.json({
            success: true,
            data: { suggestions: [], message: 'No matching errands available right now.' },
          });
        }
      }
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
        `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`,
        {
          model: 'qwen-max',
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

      const suggestionsText = response.data?.choices?.[0]?.message?.content?.trim();
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

/**
 * POST /api/ai/generate — general text generation for admin tools.
 *
 * The admin comms screens (email campaigns, blog articles, event reminders,
 * hero banners, recognition) each called dashscope.aliyuncs.com DIRECTLY from
 * the browser with `Bearer ${VITE_QWEN_API_KEY}`. Three of them used
 * `process.env`, which does not exist in a browser, so they threw
 * "process is not defined" and the feature was simply dead. The rest worked
 * only because no key was ever set — the moment one was, Vite would have baked
 * it into the JS bundle and shipped it to every visitor.
 *
 * This is the one server-side door those screens go through instead. The key
 * never leaves the server.
 */
router.post('/generate', authMiddleware, requireAdmin(['admin', 'super-admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, temperature, maxTokens } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A prompt is required.' });
    }
    // Generous but bounded — these are long marketing prompts, not essays
    if (prompt.length > 12000) {
      return res.status(400).json({ error: 'That prompt is too long. Please shorten it.' });
    }

    const { QwenAI } = await import('../services/qwenService.js');
    const text = await QwenAI.call([{ role: 'user', content: prompt }], {
      temperature: typeof temperature === 'number' ? temperature : 0.8,
      maxTokens: typeof maxTokens === 'number' ? Math.min(maxTokens, 4000) : 1500,
    });

    if (!text) {
      return res.status(502).json({ error: 'The AI service returned nothing. Please try again.' });
    }

    res.json({ success: true, data: { text } });
  } catch (error: any) {
    console.error('[AI] generate error:', error?.response?.data || error?.message || error);
    res.status(502).json({ error: 'The AI service is unavailable right now. Please try again shortly.' });
  }
});

/**
 * POST /api/ai/generate-image — real text-to-image, several variants to choose from.
 */
router.post('/generate-image', authMiddleware, requireAdmin(['admin', 'super-admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, count, size } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Describe the image you want.' });
    }

    const { generateImages } = await import('../services/imageGeneration.js');
    const images = await generateImages({
      prompt: prompt.trim(),
      count: Number(count) || 3,
      size,
      userId: parseInt(req.userId || '0', 10) || null,
    });

    if (images.length === 0) {
      return res.status(502).json({ error: 'The image service did not return anything. Please try again.' });
    }

    res.json({ success: true, data: { images } });
  } catch (error: any) {
    console.error('[AI] generate-image error:', error?.response?.data || error?.message || error);
    res.status(502).json({ error: 'Could not generate images right now. Please try again shortly.' });
  }
});

// GET /api/ai/images/:id — serve a stored image. Public: these end up in emails
// and on banners, where an Authorization header is not possible.
router.get('/images/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT data_uri FROM generated_images WHERE id = $1', [parseInt(req.params.id, 10)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' });

    const dataUri: string = result.rows[0].data_uri;
    const match = dataUri.match(/^data:(image\/[a-z+]+);base64,(.*)$/);
    if (!match) return res.status(500).json({ error: 'Stored image is unreadable' });

    res.setHeader('Content-Type', match[1]);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    console.error('[AI] serve image error:', error);
    res.status(500).json({ error: 'Could not load that image' });
  }
});

export default router;