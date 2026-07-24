import { QwenAI } from './qwenService.js';
import db from '../db.js';

export interface ModerationResult {
  status: 'approved' | 'flagged' | 'blocked';
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

// Blocked keywords for content moderation
const BLOCKED_KEYWORDS = {
  sexual: ['sex', 'xxx', 'porn', 'nude', 'adult', 'erotic', 'foreplay', 'penetration', 'orgasm', 'bdsm', 'fetish', 'dildo', 'vibrator', 'masturb', 'prostitut', 'escort', 'sex-work', 'hooker', 'gigolo', 'sexual', 'intercourse'],
  violence: ['kill', 'murder', 'bomb', 'gun', 'knife', 'stab', 'shoot', 'violence', 'assault', 'rape', 'abuse', 'torture', 'hit', 'punch', 'maim', 'lynch', 'execute', 'destroy'],
  hate: ['racist', 'homophobic', 'transphobic', 'sexist', 'misogyn', 'hate', 'bigot', 'faggot', 'slur', 'ethnic', 'inferior', 'subhuman', 'supremac'],
};

// Suspicious patterns for detecting off-platform activity & contact info
const SUSPICIOUS_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  /(?:phone|tel|call|whatsapp|telegram|signal|wechat|line|viber|kakao)[\s:]*[\+\d\s\(\)-]{7,}/i, // Phone + messenger
  /\b(?:hp|handphone|mobile|cell|tel)[\s:]*[\+\d\s\(\)-]{7,}\b/i, // HP/Mobile number
  /\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/, // Phone pattern XXX-XXXX-XXXX
  /\b\d{8,11}\b/, // 8-11 digit phone number
  /(?:linkedin|linkedin\.com|instagram|facebook|twitter|snapchat)[\s:/]*[@\w]+/i, // Social profiles
  /(?:namecard|name\s+card|business\s+card|card\s+image|contact\s+image|contact\s+card)/i, // Contact/namecard
  /(?:meeting|paying|chat|contact|msg|message)(?:\s+outside|\s+off\s+app|elsewhere|private|here)/i, // Off-app requests
  /\$\d+\s*(?:cash|direct|transfer|bank)/i, // Direct payment
  /(?:address|apt|unit|block|street)[\s:]*[\w\s\d\-#,\.]+(?:singapore|sg|postal)/i, // Personal address
];

export async function moderateContent(
  content: string,
  context: 'task_description' | 'chat_message' | 'review' = 'task_description'
): Promise<ModerationResult> {
  try {
    // Layer 1: Keyword blocking (instant)
    const lowerContent = content.toLowerCase();

    for (const category in BLOCKED_KEYWORDS) {
      const keywords = BLOCKED_KEYWORDS[category as keyof typeof BLOCKED_KEYWORDS];
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) {
          return {
            status: 'blocked',
            reason: `Contains prohibited ${category} content`,
            severity: 'high',
          };
        }
      }
    }

    // Layer 2: Pattern matching (instant)
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        return {
          status: 'flagged',
          reason: 'Suspicious pattern detected (off-platform contact attempt)',
          severity: 'high',
        };
      }
    }

    // Layer 3: Qwen AI sentiment analysis (async, but quick)
    try {
      const aiResponse = await QwenAI.call([
          {
            role: 'user',
            content: `Analyze content safety (${context}): "${content.substring(0, 500)}"

Return JSON: {"toxicity": 0.0-1.0, "isScam": true/false, "isCoercion": true/false, "isSexual": true/false, "reason": ""}`,
          },
        ]);

      let aiResult: any = { toxicity: 0, isScam: false, isCoercion: false, isSexual: false };
      try {
        aiResult = JSON.parse(aiResponse);
      } catch (e) {
        console.warn('[Moderation] Failed to parse AI response');
      }

      if (aiResult.toxicity > 0.7) {
        return {
          status: 'flagged',
          reason: 'High toxicity detected',
          severity: 'high',
        };
      }

      if (aiResult.isScam || aiResult.isCoercion) {
        return {
          status: 'blocked',
          reason: aiResult.isScam ? 'Fraud detected' : 'Coercion detected',
          severity: 'high',
        };
      }

      if (aiResult.isSexual) {
        return {
          status: 'blocked',
          reason: 'Sexual content prohibited',
          severity: 'high',
        };
      }
    } catch (aiError) {
      console.error('[Moderation] AI analysis failed:', aiError);
      // Continue without AI analysis
    }

    return { status: 'approved' };
  } catch (error) {
    console.error('[Moderation] Error:', error);
    return { status: 'approved' }; // Fail safe: approve on error
  }
}

// Flag content for admin review
export async function flagContent(params: {
  contentType: 'task_description' | 'chat_message' | 'review';
  content: string;
  userId: number;
  errandId?: number;
  conversationId?: number;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}) {
  try {
    await db.query(
      `INSERT INTO flagged_content
       (content_type, content, flagged_by_user_id, errand_id, conversation_id, reason, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.contentType,
        params.content,
        params.userId,
        params.errandId || null,
        params.conversationId || null,
        params.reason,
        params.severity,
      ]
    );

    console.log(`[Moderation] Content flagged: ${params.contentType} - ${params.severity}`);
  } catch (error) {
    console.error('[Moderation] Error flagging content:', error);
  }
}

// Get all flagged content for admins
export async function getFlaggedContent(
  limit: number = 50,
  severity?: string,
  status?: string
) {
  try {
    let query = 'SELECT * FROM flagged_content WHERE 1=1';
    const params: any[] = [];

    if (severity) {
      query += ` AND severity = $${params.length + 1}`;
      params.push(severity);
    }

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Moderation] Error fetching flagged content:', error);
    return [];
  }
}

// Review flagged content (admin action)
export async function reviewFlaggedContent(
  contentId: number,
  decision: 'approved' | 'removed' | 'user_warned',
  notes?: string
) {
  try {
    const result = await db.query(
      `UPDATE flagged_content
       SET status = $1, reviewed_by_user_id = $2, reviewed_at = NOW(), review_notes = $3
       WHERE id = $4
       RETURNING *`,
      [decision, 0, notes || null, contentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    console.log(`[Moderation] Content ${contentId} reviewed: ${decision}`);
    return result.rows[0];
  } catch (error) {
    console.error('[Moderation] Error reviewing content:', error);
    return null;
  }
}

/**
 * Moderate uploaded photos for inappropriate content
 * Checks for nudity, violence, contact info, and other harmful content
 */
export async function moderatePhotoContent(
  photoUrl: string,
  context: 'job_completion' | 'profile_photo' = 'job_completion'
): Promise<ModerationResult> {
  try {
    console.log(`[PhotoModeration] Scanning ${context}: ${photoUrl.substring(0, 50)}...`);

    // Call Qwen AI for image analysis
    try {
      const aiResponse = await QwenAI.call([
          {
            role: 'user',
            content: `Analyze image for safety (${context}). Return JSON only:
{
  "hasInappropriate": boolean,
  "hasNudity": boolean,
  "hasViolence": boolean,
  "hasContactInfo": boolean,
  "hasPersonalData": boolean,
  "severity": "safe" | "warning" | "blocked",
  "reason": "string"
}

Image URL: ${photoUrl}`,
          },
        ]);

      let aiResult: any = {
        hasInappropriate: false,
        hasNudity: false,
        hasViolence: false,
        hasContactInfo: false,
        hasPersonalData: false,
        severity: 'safe',
        reason: '',
      };

      try {
        aiResult = JSON.parse(aiResponse);
      } catch (e) {
        console.warn('[PhotoModeration] Failed to parse AI response');
      }

      // Block if contains nudity, violence, or personal contact info
      if (aiResult.hasNudity) {
        return {
          status: 'blocked',
          reason: 'Photo contains inappropriate nudity',
          severity: 'high',
        };
      }

      if (aiResult.hasViolence) {
        return {
          status: 'blocked',
          reason: 'Photo contains violent or harmful content',
          severity: 'high',
        };
      }

      if (aiResult.hasContactInfo || aiResult.hasPersonalData) {
        return {
          status: 'blocked',
          reason: 'Photo contains contact information or personal data (phone, email, address, namecard, business card)',
          severity: 'high',
        };
      }

      if (aiResult.hasInappropriate || aiResult.severity === 'blocked') {
        return {
          status: 'blocked',
          reason: aiResult.reason || 'Photo contains inappropriate content',
          severity: 'high',
        };
      }

      if (aiResult.severity === 'warning') {
        return {
          status: 'flagged',
          reason: aiResult.reason || 'Photo flagged for review',
          severity: 'medium',
        };
      }

      return { status: 'approved' };
    } catch (aiError) {
      console.error('[PhotoModeration] AI analysis failed:', aiError);
      // Fail safe: flag for review on error
      return {
        status: 'flagged',
        reason: 'Photo requires manual review',
        severity: 'medium',
      };
    }
  } catch (error) {
    console.error('[PhotoModeration] Error:', error);
    // Fail safe: approve on non-AI errors
    return { status: 'approved' };
  }
}
