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

// Suspicious patterns for detecting off-platform activity
const SUSPICIOUS_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email extraction
  /\b(?:WhatsApp|Telegram|Signal|WeChat|Line)(?:\s+|:)?[\+\d\s\(\)-]{7,}\b/i, // Messenger + contact
  /(?:meeting|paying|chat|contact|msg|message)(?:\s+outside|\s+off\s+app|elsewhere|private|here)/i, // Off-app requests
  /\$\d+\s*(?:cash|direct|transfer|bank)/i, // Direct payment outside platform
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
      const aiResponse = await QwenAI.call({
        model: 'qwen-turbo',
        messages: [
          {
            role: 'user',
            content: `Analyze content safety (${context}): "${content.substring(0, 500)}"

Return JSON: {"toxicity": 0.0-1.0, "isScam": true/false, "isCoercion": true/false, "isSexual": true/false, "reason": ""}`,
          },
        ],
      });

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
