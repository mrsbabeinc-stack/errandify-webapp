import axios from 'axios';

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
  // Sexual content
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

    // For borderline cases, call Qwen
    if (basicCheck.flags.length > 0) {
      try {
        const response = await axios.post(
          `${process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com'}/api/v1/services/aigc/text-generation/generation`,
          {
            model: 'qwen-long',
            input: {
              messages: [
                {
                  role: 'user',
                  content: `Analyze this errand posting for safety issues.

Title: "${title}"
Description: "${description}"
Notes: "${notes}"

Check for:
1. Spam or phishing
2. Inappropriate/offensive language
3. Misleading claims
4. Safety concerns

Respond with JSON: {"is_safe": boolean, "issues": [list issues], "confidence": 0-1}`,
                },
              ],
            },
            parameters: {
              result_format: 'text',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const qwenResult = response.data?.output?.text;
        if (qwenResult) {
          try {
            const parsed = JSON.parse(qwenResult);
            return {
              is_safe: parsed.is_safe,
              issues: {
                spam: parsed.issues.includes('spam'),
                inappropriate: parsed.issues.includes('inappropriate'),
                misleading: parsed.issues.includes('misleading'),
              },
              confidence: parsed.confidence,
              flags: parsed.issues,
              details: {
                qwen_result: parsed,
                basic_check: basicCheck,
              },
            };
          } catch (parseErr) {
            console.error('Failed to parse Qwen response:', parseErr);
          }
        }
      } catch (qwenErr) {
        console.error('Qwen moderation check failed:', qwenErr);
        // Fall back to basic check
      }
    }

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
