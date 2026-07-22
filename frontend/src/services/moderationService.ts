import axios from 'axios';

interface ModerationResult {
  flagged: boolean;
  reason?: string;
  category?: string;
  confidence?: number;
  action: 'approve' | 'flag' | 'reject';
}

/**
 * Qwen AI - Content moderation for MyKampung posts
 * Uses Qwen to detect: spam, scams, harassment, off-topic, quality issues
 */
const qwenModeration = async (text: string): Promise<ModerationResult> => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    console.log('[Qwen Moderation] Analyzing post...');

    // /api/moderation/qwen never existed. Because this service fails open on
    // error (see the catch below), every post was silently auto-approved and
    // nothing was ever moderated. /api/ai/content-filter is the real endpoint
    // and runs the same Qwen check server-side.
    const response = await axios.post(`${apiUrl}/api/ai/content-filter`, {
      title: text,
    });

    const result = response.data.data;

    if (!result.is_safe) {
      console.log('[Qwen Moderation] Post flagged:', result.reason);
      return {
        flagged: true,
        // `issues` comes back as an object keyed by issue type
        // ({ spam: true, inappropriate: false, ... }), not an array, so it is
        // reduced to the names that are actually true.
        reason:
          result.reason ||
          Object.entries(result.issues || {})
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join('; ') ||
          'Content flagged for review',
        category: (result.flags || [])[0],
        confidence: result.confidence,
        action: 'flag',
      };
    }

    console.log('[Qwen Moderation] Post approved');
    return {
      flagged: false,
      action: 'approve',
    };
  } catch (error) {
    console.error('[Qwen Moderation] Check failed:', error);
    // Fail open - don't block posts on API errors
    return { flagged: false, action: 'approve' };
  }
};

/**
 * Full moderation pipeline using only Qwen
 */
export const moderatePost = async (text: string): Promise<ModerationResult> => {
  console.log('[Moderation] Starting Qwen moderation check...');

  // Basic length check
  if (text.trim().length < 5) {
    return {
      flagged: true,
      reason: 'Post too short (minimum 5 characters)',
      category: 'quality',
      action: 'reject',
    };
  }

  if (text.trim().length > 5000) {
    return {
      flagged: true,
      reason: 'Post too long (maximum 5000 characters)',
      category: 'quality',
      action: 'reject',
    };
  }

  // Use Qwen for comprehensive moderation
  return await qwenModeration(text);
};

/**
 * Get moderation status for display
 */
export const getModerationStatus = (result: ModerationResult): string => {
  if (!result.flagged) return 'safe';
  if (result.action === 'reject') return 'rejected';
  return 'flagged';
};

/**
 * Get user-friendly message for moderation result
 */
export const getModerationMessage = (result: ModerationResult): string => {
  if (!result.flagged) return '';

  const messages: Record<string, string> = {
    spam: 'This post may contain spam or promotional content. Please avoid posting links or advertisements.',
    scam: 'This post may contain scam or fraudulent content.',
    harassment: 'This post contains harassment or harmful content. Please keep comments respectful.',
    safety: 'This post may violate community safety standards.',
    off_topic: 'This post is off-topic for MyKampung. Please keep posts related to Errandify and community.',
    quality: 'Post is too short or too long. Please write 5-5000 characters.',
    relevance: 'This post may not be relevant to MyKampung. Please ensure your post is related to Errandify community.',
  };

  return messages[result.category || 'spam'] || result.reason || 'This post violates community standards.';
};

export default {
  moderatePost,
  getModerationStatus,
  getModerationMessage,
};
