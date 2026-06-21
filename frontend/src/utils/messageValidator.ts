// Message validation and content moderation utilities with AI

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  aiModeration?: {
    isAppropriate: boolean;
    reason: string;
    confidence: number;
  };
}

// Patterns to detect contact information
const CONTACT_PATTERNS = {
  email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
  phone: /(\+?[1-9]\d{1,14}|0[0-9]{9,10})/g,
  whatsapp: /whatsapp|wa\.|what'?s ?app/gi,
  telegram: /telegram|@[a-zA-Z0-9_]{5,}|t\.me/gi,
  wechat: /wechat|we chat|微信/gi,
  url: /(https?:\/\/[^\s]+|www\.[^\s]+)/gi,
};

// Patterns for inappropriate content - COMPREHENSIVE
const INAPPROPRIATE_PATTERNS = {
  profanity: /damn|shit|crap|bloody|fuck|ass|bitch|bastard|hell|piss/gi,
  threats: /kill|hurt|violence|attack|harm|rape|murder|die|dead/gi,
  harassment: /stupid|idiot|moron|dumb|fool|retard|loser|pathetic/gi,
  sexualContent: /sex|porn|naked|nude|xxx|sexual|cock|pussy|dick|vagina|breast|gay|lesbian|horny|aroused|masturbat|cum/gi,
  drugs: /cocaine|heroin|meth|weed|cannabis|marijuana|acid|lsd|mdma|ecstasy|crack|fentanyl/gi,
  violence: /rape|abuse|assault|torture|molest|incest|pedophil|child abuse/gi,
  scam: /bitcoin|crypto|investment|forex|mlm|pyramid|scheme|urgent|wire transfer|western union|money gram/gi,
};

// Blocked file types
const BLOCKED_EXTENSIONS = ['vcf', 'vcard', 'ics', 'contact', 'csv'];

export const validateMessage = (content: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!content || content.trim().length === 0) {
    result.errors.push('Message cannot be empty');
    result.isValid = false;
    return result;
  }

  // Check for contact information
  if (CONTACT_PATTERNS.email.test(content)) {
    result.errors.push('❌ Cannot share email addresses. Use Errandify messaging instead.');
    result.isValid = false;
  }

  if (CONTACT_PATTERNS.phone.test(content)) {
    result.errors.push('❌ Cannot share phone numbers. Use Errandify messaging instead.');
    result.isValid = false;
  }

  if (CONTACT_PATTERNS.whatsapp.test(content)) {
    result.errors.push('❌ Cannot share WhatsApp contacts. Use Errandify messaging instead.');
    result.isValid = false;
  }

  if (CONTACT_PATTERNS.telegram.test(content)) {
    result.errors.push('❌ Cannot share Telegram contacts. Use Errandify messaging instead.');
    result.isValid = false;
  }

  if (CONTACT_PATTERNS.wechat.test(content)) {
    result.errors.push('❌ Cannot share WeChat contacts. Use Errandify messaging instead.');
    result.isValid = false;
  }

  if (CONTACT_PATTERNS.url.test(content)) {
    result.warnings.push('⚠️ Links should only point to relevant resources. Suspicious links may be flagged.');
  }

  // Check for inappropriate content
  if (INAPPROPRIATE_PATTERNS.profanity.test(content)) {
    result.errors.push('❌ Profanity not allowed. Keep messages professional.');
    result.isValid = false;
  }

  if (INAPPROPRIATE_PATTERNS.threats.test(content)) {
    result.errors.push('❌ Threatening language not allowed.');
    result.isValid = false;
  }

  if (INAPPROPRIATE_PATTERNS.harassment.test(content)) {
    result.errors.push('❌ Disrespectful/harassing language not allowed.');
    result.isValid = false;
  }

  if (INAPPROPRIATE_PATTERNS.sexualContent.test(content)) {
    result.errors.push('❌ Sexual content not allowed. Keep messages task-focused.');
    result.isValid = false;
  }

  if (INAPPROPRIATE_PATTERNS.drugs.test(content)) {
    result.errors.push('❌ References to illegal drugs not allowed.');
    result.isValid = false;
  }

  if (INAPPROPRIATE_PATTERNS.violence.test(content)) {
    result.errors.push('❌ Violent/abusive content not allowed.');
    result.isValid = false;
  }

  if (INAPPROPRIATE_PATTERNS.scam.test(content)) {
    result.errors.push('❌ Scam/fraudulent content not allowed.');
    result.isValid = false;
  }

  // Check message length
  if (content.length > 5000) {
    result.warnings.push('⚠️ Message is very long (5000+ characters). Consider breaking it up.');
  }

  // Check for excessive repetition
  if (/(.)\1{10,}/.test(content)) {
    result.suggestions.push('💡 Excessive character repetition detected. Did you mean something else?');
  }

  // Basic spell check patterns
  if (/teh |woudl|coulkd|shoudl/.test(content)) {
    result.suggestions.push('💡 Possible spelling error detected. Review your message.');
  }

  return result;
};

export const validateImage = (file: File): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Check file type
  if (!file.type.startsWith('image/')) {
    result.errors.push('File must be an image');
    result.isValid = false;
    return result;
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    result.errors.push('Image size exceeds 10MB limit');
    result.isValid = false;
  }

  // Block namecard formats
  if (file.name.includes('contact') || file.name.includes('card')) {
    result.warnings.push('⚠️ Namecard/contact images should not be shared. Use Errandify profile instead.');
  }

  return result;
};

export const validateAudio = (blob: Blob): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Check file type
  if (!blob.type.startsWith('audio/')) {
    result.errors.push('File must be audio');
    result.isValid = false;
    return result;
  }

  // Check file size (max 25MB)
  const maxSize = 25 * 1024 * 1024;
  if (blob.size > maxSize) {
    result.errors.push('Audio file exceeds 25MB limit');
    result.isValid = false;
  }

  return result;
};

export const validateFileUpload = (file: File): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // Block namecard and contact formats
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    result.errors.push(`❌ ${extension.toUpperCase()} files (namecards/contacts) cannot be shared. Use Errandify profile instead.`);
    result.isValid = false;
  }

  return result;
};

export const getAutoCorrections = (text: string): Map<string, string> => {
  const corrections = new Map<string, string>([
    ['teh', 'the'],
    ['woudl', 'would'],
    ['coulkd', 'could'],
    ['shoudl', 'should'],
    ['recieve', 'receive'],
    ['occured', 'occurred'],
    ['untill', 'until'],
    ['doublicate', 'duplicate'],
  ]);

  return corrections;
};

// AI-based content moderation using Qwen
export const moderateWithAI = async (content: string): Promise<{
  isAppropriate: boolean;
  reason: string;
  confidence: number;
}> => {
  try {
    const apiKey = import.meta.env.VITE_QWEN_API_KEY;
    if (!apiKey) {
      console.warn('Qwen API key not configured, skipping AI moderation');
      return { isAppropriate: true, reason: '', confidence: 0 };
    }

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a content moderation expert for a task/errand marketplace. Your job is to determine if messages are appropriate.

IMPORTANT: Only block messages with CLEAR intent of inappropriate behavior. Avoid false positives.

✅ ALLOW:
- Task-related questions and discussions
- Professional help requests
- Location mentions (hotel, restaurant, etc.)
- Normal business communication
- Innocent questions about services

❌ BLOCK ONLY if:
- Clear sexual/romantic advances ('let's meet for sex', 'want to date', flirting)
- Explicit threats or violence
- Obvious scams (investment schemes, crypto, wire transfers)
- Serious harassment or abuse
- Spam or off-platform contact requests

Context matters:
- 'Can you clean my hotel room?' = ALLOW (work request)
- 'Let's go to a hotel together' = BLOCK (romantic intent)
- 'I need crypto investment help' = BLOCK (scam)
- 'What payment methods work?' = ALLOW (legitimate question)

Respond with ONLY JSON (no markdown, no explanation):
{
  "isAppropriate": boolean,
  "reason": "brief reason ONLY if blocking",
  "confidence": number 0-1 (only trust high confidence blocks)
}`,
          },
          {
            role: 'user',
            content: `Is this task message appropriate? "${content}"`,
          },
        ],
        temperature: 0.3,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      console.error('Qwen API error:', response.statusText);
      return { isAppropriate: true, reason: '', confidence: 0 };
    }

    const data = await response.json();
    const output = data.output?.text || '';

    // Extract JSON from response
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in Qwen response:', output);
      return { isAppropriate: true, reason: '', confidence: 0 };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      isAppropriate: result.isAppropriate !== false,
      reason: result.reason || '',
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('AI moderation error:', error);
    return { isAppropriate: true, reason: '', confidence: 0 };
  }
};
