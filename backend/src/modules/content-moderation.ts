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
];

const MISLEADING_PATTERNS = [
  /\b(guaranteed|100% success|never fails|risk-free)\b/i,
  /\$[0-9]{4,}/i, // Unusually high budget without context
  /\b(asap|urgent|emergency)\b.*\b(free|cheap)\b/i,
];

export function performBasicModerationCheck(
  title: string,
  description: string = '',
  budget?: number
): ModerationResult {
  const fullText = `${title} ${description}`.toLowerCase();
  const issues = {
    spam: false,
    inappropriate: false,
    misleading: false,
  };
  const flags: string[] = [];

  // Check for spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(fullText)) {
      issues.spam = true;
      flags.push('spam_detected');
      break;
    }
  }

  // Check for inappropriate language
  for (const word of INAPPROPRIATE_WORDS) {
    if (fullText.includes(word)) {
      issues.inappropriate = true;
      flags.push('inappropriate_language');
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

  return {
    is_safe: !hasSeriousIssue && flags.length < 3,
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
  description: string = ''
): Promise<ModerationResult> {
  try {
    const basicCheck = performBasicModerationCheck(title, description);

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
