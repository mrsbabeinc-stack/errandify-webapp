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

// Patterns for inappropriate content - BALANCED (comprehensive but avoiding false positives)
const INAPPROPRIATE_PATTERNS = {
  // HARD BLOCKS - Zero tolerance, no context needed
  profanity: /damn|shit|crap|bloody|fuck|ass|bitch|bastard|hell|piss/gi,
  threats: /kill|hurt|violence|attack|harm|rape|murder|die|dead|threat/gi,
  harassment: /stupid|idiot|moron|dumb|fool|retard|loser|pathetic/gi,

  // SEXUAL - Explicit terms only (avoid innocent words like "massage" alone)
  sexualContent: /porn|pornography|xxx|cock|pussy|dick|vagina|anus|asshole|horny|aroused|masturbat|cum|sperm|swallow|prostitut|escort|onlyfans|sleep with|spend the night|intimate|private time|pay for sex|call girl|sex worker|adult entertainer|outcall|incall|orgy|gangbang|threesome|dildo|vibrator|orgasm|blow job|blowjob|hand job|handjob|foreplay|penetrat|bondage|bdsm|fetish|kink|nudes|sext|camgirl|stripper|lap dance|body rub|happy ending|ending service|special service|extra service|vip service|release|tantric|nuru|yoni|sensual|full service|gfe|companionship|mistress|dominatrix|domina|sub|submissive|dom|master|slave|whip|spank|dungeon|facial|creampie|squirt|ejacul|rimjob|deepthroat|incest|cuckold|milf|cougar|gilf|twink|femdom|humiliation|watersport|scat|bestiality|zoophilia|pedophil|child|minor|teen|barely|loli|shota|hentai|anime|nude|naked|breasts|boobs|tits|ass|butt|cumshot|bukake|gangbang|glory hole|handjob|handy|bj|hj|gag|gape|prolapse|fisting|pegging|strapon|gangbang|double penetrat|dp|anal|prostate|escort|prostitut|john|trick|pimp|madam|brothel|cathouse|red light|live cam|webcam|peepshow|booth|tokens|tips|vip|private show|raffle|auction|rating|tribute|findom|financial domin/gi,

  // DRUGS - Specific drug names (not words like "high" which has context)
  drugs: /cocaine|heroin|meth|weed|cannabis|marijuana|acid|lsd|mdma|ecstasy|crack|fentanyl|opium|morphine|codeine|tramadol|oxycodon|percocet|vicodin|xanax|valium|ketamine|pcp|shrooms|psilocybin|hash|hashish|thc|cannabinoid|dealer|supplier|inject|snort|shoot|stoned|trip/gi,

  // VIOLENCE - Serious terms only
  violence: /rape|abuse|assault|torture|molest|incest|pedophil/gi,

  // GAMBLING - Specific terms
  gambling: /poker|blackjack|roulette|casino|betting|gamble|wager|jackpot|slot|lottery|bet money/gi,

  // SCAMS - Obvious fraud terms
  scam: /bitcoin|crypto|forex|mlm|pyramid|scheme|wire transfer|western union|money gram|nigerian|sweepstakes|get rich|pay me first|advance payment/gi,
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

  // For task chat - let Qwen AI handle content moderation
  // Only do basic validation for contact sharing
  const lowerContent = content.toLowerCase();

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

  // For task chat - let Qwen AI handle all content moderation
  // Pattern validation is too strict for normal conversation

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
            content: `You are a content moderation expert for a task/errand marketplace chat. Be LENIENT - allow normal conversation between doer and asker.

HARD BLOCKS ONLY (zero tolerance):
1. DRUGS - Illegal drug references (cocaine, heroin, weed, meth, etc.)
2. SEX WORK - Sexual services or prostitution offers
3. VIOLENCE - Threats, violence, or harm
4. SCAMS - Crypto investment, forex, MLM, wire transfers, pyramid schemes

✅ ALLOW:
- Task coordination ("when?", "what time?", "where?")
- Greetings ("hello", "hi", "hey")
- Questions about the job
- Price discussion
- Status updates
- Casual chat and emoji
- Location/address mentions for work

Respond with JSON:
{
  "isAppropriate": boolean,
  "reason": "reason only if blocking",
  "confidence": number 0-1
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
