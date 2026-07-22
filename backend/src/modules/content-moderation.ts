import axios from 'axios';
import { QWEN_API_BASE } from '../config/aiRegion.js';

export interface ModerationResult {
  is_safe: boolean;
  issues: {
    spam: boolean;
    inappropriate: boolean;
    misleading: boolean;
  };
  confidence: number;
  flags: string[];
  details: Record<string, any>;
}

const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|lottery|prize money|free money|click here)\b/i,
  /([a-z0-9]{30,})/i, // Long strings of random chars
  /((https?|ftp):\/\/[^\s]+){3,}/i, // Multiple URLs
  /\b(click|buy|subscribe)\b.*\b(now|here|link)\b/i,
  // SQL Injection patterns
  /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b|\b--\b|\b;\b)/i,
  // XSS patterns
  /(<script|<iframe|<img|<svg|javascript:|onerror=|onload=|onclick=)/i,
  // Command injection
  /(\$\(|`|&&|\|\||;\s*rm|\bwget\b|\bcurl\b)/i,
  // Spam repetition
  /(.)\1{10,}/i, // Same character repeated 10+ times
  // Excessive URLs and phone numbers
  /((\d{3}[-.\s]?){2}\d{4})/g, // Multiple phone numbers
];

const PHISHING_KEYWORDS = [
  'verify account',
  'confirm password',
  'update payment',
  'urgent action',
  'click here immediately',
  'your account has been',
  'suspended',
  'limited access',
  'unusual activity',
  'confirm identity',
  'bank',
  'paypal',
  'amazon',
  'apple id',
];

const INAPPROPRIATE_WORDS = [
  'scam',
  'fraud',
  'racist',
  'sexist',
  'harassment',
  'abuse',
  'threat',
  'violence',
  // Sexual content (explicit sex work, hookups, sexual acts)
  'sex',
  'porn',
  'xxx',
  'nude',
  'naked',
  'sexual',
  'escort',
  'prostitut',
  'explicit',
  'orgy',
  '3some',
  'threesome',
  'foursome',
  'one night stand',
  'hookup',
  'hook up',
  'booty call',
  'fwb',
  'fuck buddy',
  'quickie',
  'blowjob',
  'handjob',
  'cumshot',
  'creampie',
  'masturbat',
  'dildo',
  'vibrator',
  'sex toy',
  'sexy',
  'horny',
  'arousal',
  // Illegal activities
  'drug',
  'cocaine',
  'heroin',
  'meth',
  'marijuana',
  'weed',
  'illegal',
  'theft',
  'steal',
  'rob',
  'burglary',
  'hacking',
  'malware',
  'bomb',
  'weapon',
  'gun',
  'knife',
  'hitman',
  'assassin',
  'counterfeit',
  'fake',
  'forge',
  'money laundering',
  'blackmail',
  'extortion',
  'kidnap',
  'ransom',
  'slavery',
  'trafficking',
  'child',
  'minor',
  'underage',
  'pedophil',
  'beastiality',
  'zoophil',
  'necrophil',
];

const MISLEADING_PATTERNS = [
  /\b(guaranteed|100% success|never fails|risk-free)\b/i,
  /\$[0-9]{4,}/i, // Unusually high budget without context
  /\b(asap|urgent|emergency)\b.*\b(free|cheap)\b/i,
];

const ADDRESS_PATTERNS = [
  /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|close|cl|crescent|cres|way|park|gardens|gdns|terrace|t|hill|boulevard|blvd|plaza|court|ct|square|sq|circle|mews|grove|row|hall|gate|place|pk|walk|rise|view|chase|end|green|heights|house|pavilion)\b.*\d+/i,
  /\b\d{1,4}\s+(a|b|c|d)?\s+\w+\s+(street|avenue|road|drive|lane|close|way)/i,
  /\b(blk|block)\s+\d+/i, // Block numbers (common in Singapore addresses)
  /\b\d{6}\b/, // 6-digit postal codes
];

export function performBasicModerationCheck(
  title: string,
  description: string = '',
  notes: string = '',
  budget?: number
): ModerationResult {
  const fullText = `${title} ${description} ${notes}`.toLowerCase();
  console.log('[Moderation] Checking text:', fullText);

  const issues = {
    spam: false,
    inappropriate: false,
    misleading: false,
  };
  const flags: string[] = [];

  // Check for spam, injection attacks, and malicious patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(fullText)) {
      issues.spam = true;
      flags.push('spam_detected');
      console.log('[Moderation] Spam detected');
      break;
    }
  }

  // Check for phishing attempts
  for (const keyword of PHISHING_KEYWORDS) {
    if (fullText.includes(keyword.toLowerCase())) {
      issues.inappropriate = true;
      flags.push('phishing_attempt');
      console.log('[Moderation] Phishing detected:', keyword);
      break;
    }
  }

  // Check for inappropriate language
  for (const word of INAPPROPRIATE_WORDS) {
    if (fullText.includes(word)) {
      issues.inappropriate = true;
      flags.push('inappropriate_language');
      console.log('[Moderation] Inappropriate word detected:', word);
      break;
    }
  }

  // Check for misleading content
  for (const pattern of MISLEADING_PATTERNS) {
    if (pattern.test(fullText)) {
      issues.misleading = true;
      flags.push('misleading_content');
      break;
    }
  }

  // Check for addresses in description (should be in address field, not description)
  for (const pattern of ADDRESS_PATTERNS) {
    if (pattern.test(description.toLowerCase())) {
      issues.inappropriate = true;
      flags.push('address_in_description');
      console.log('[Moderation] Address detected in description');
      break;
    }
  }

  // Budget sanity check
  if (budget && budget > 10000) {
    flags.push('unusually_high_budget');
  }

  // Title too short
  if (title.length < 5) {
    flags.push('title_too_short');
  }

  // Title too long
  if (title.length > 100) {
    flags.push('title_too_long');
  }

  const hasSeriousIssue = issues.spam || issues.inappropriate;
  const confidence = hasSeriousIssue ? 0.95 : (flags.length > 0 ? 0.6 : 0.05);
  const isSafe = !hasSeriousIssue && flags.length < 3;

  console.log('[Moderation] Result - is_safe:', isSafe, 'hasSeriousIssue:', hasSeriousIssue, 'issues:', issues, 'flags:', flags);

  return {
    is_safe: isSafe,
    issues,
    confidence,
    flags,
    details: {
      title_length: title.length,
      description_length: description.length,
      budget,
      flags_triggered: flags,
    },
  };
}

export async function checkContentWithQwen(
  title: string,
  description: string = '',
  notes: string = ''
): Promise<ModerationResult> {
  try {
    const basicCheck = performBasicModerationCheck(title, description, notes);

    // If basic check found serious issues, return early
    if (basicCheck.issues.spam || basicCheck.issues.inappropriate) {
      return basicCheck;
    }

    // Always run AI moderation for nuanced content the keyword lists can't catch.
    // Uses the working Qwen config (QWEN_API_KEY + compatible-mode), same as suggestions.
    const qwenApiKey = process.env.QWEN_API_KEY;
    if (qwenApiKey) {
      try {
        const response = await axios.post(
          `${process.env.QWEN_API_BASE || QWEN_API_BASE}/chat/completions`.replace('/v1//chat', '/v1/chat'),
          {
            model: 'qwen-max',
            messages: [
              {
                role: 'user',
                content: `You are a content safety moderator for a Singapore errand marketplace where neighbours help each other with everyday tasks. Decide whether this posting is appropriate to publish.

Flag as UNSAFE if it involves any of: illegal activity or requests, drugs or weapons, sexual or adult services, violence or harm to people or animals, harassment, hate or discrimination, scams / phishing / money-laundering, or clearly offensive language.
Treat normal everyday errands (cleaning, delivery, tutoring, pet care, repairs, moving, shopping, eldercare, admin) as SAFE.

Return ONLY JSON, no prose: {"is_safe": boolean, "category": "short reason keyword or none", "reason": "one short sentence the user will read explaining why"}

Title: "${title}"
Description: "${description}"
Notes: "${notes}"`,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${qwenApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 4000,
          }
        );

        const text = response.data?.choices?.[0]?.message?.content?.trim() || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (typeof parsed.is_safe === 'boolean') {
            const category = String(parsed.category || '').toLowerCase();
            return {
              is_safe: parsed.is_safe,
              issues: {
                spam: /spam|phish|scam/.test(category),
                inappropriate: !parsed.is_safe,
                misleading: /mislead/.test(category),
              },
              confidence: 0.9,
              flags: parsed.is_safe ? [] : [category || 'inappropriate_content'],
              details: { qwen_result: parsed, basic_check: basicCheck, reason: parsed.reason || '' },
            };
          }
        }
        console.warn('[Moderation] Qwen returned unparseable result, using keyword fallback');
      } catch (qwenErr) {
        console.error('[Moderation] Qwen check failed, using keyword fallback:', qwenErr instanceof Error ? qwenErr.message : qwenErr);
      }
    }

    // Fall back to keyword-based result if AI is unavailable
    return basicCheck;
  } catch (error) {
    console.error('Content moderation error:', error);
    // Default to safe if error
    return {
      is_safe: true,
      issues: { spam: false, inappropriate: false, misleading: false },
      confidence: 0,
      flags: ['moderation_check_failed'],
      details: { error: 'moderation_unavailable' },
    };
  }
}
