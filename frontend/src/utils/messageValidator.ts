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
  sexualContent: /porn|xxx|cock|pussy|dick|vagina|horny|aroused|masturbat|cum|prostitut|escort|onlyfans|sleep with|spend the night|intimate|private time|pay for sex|call girl|sex worker|adult entertainer|outcall|incall|orgy|gangbang|threesome|dildo|vibrator|orgasm|blow job|blowjob|hand job|handjob|foreplay|penetrat|bondage|bdsm|fetish|kink|nudes|sext|camgirl|stripper|lap dance|body rub|happy ending|ending service|special service|extra service|vip service|release|tantric|nuru|yoni|sensual|full service|gfe|companionship|mistress|dominatrix|domina|sub|submissive|dom|master|slave|whip|spank|dungeon/gi,

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

  // SPECIAL CHECK: "massage" + sexual service terms = block (sex work detection)
  const hasMassage = /massage/i.test(content);
  const hasHappyEnding = /happy ending|ending service|special service|extra service|vip service|sexual|penetrat|orgasm|release/i.test(content);
  if (hasMassage && hasHappyEnding) {
    result.errors.push('❌ Sexual services not allowed. Keep messages task-focused.');
    result.isValid = false;
    return result;
  }

  // SPECIAL CHECK: "sex" + "party/gathering/event/meet/group/farm" = block
  const hasSex = /sex|s3x|sx|s\*x|s#x|s@x|f\*ck|fxxx|f\*\*\*|fk|fcuk/i.test(content);
  const hasIllicitContext = /party|gathering|event|meet|group|farm|trade|business|operation|house|den|ring/i.test(content);
  if (hasSex && hasIllicitContext) {
    result.errors.push('❌ Sexual content not allowed. Keep messages task-focused.');
    result.isValid = false;
    return result;
  }

  // SPECIAL CHECK: Advanced obfuscation detection
  // Strategy: Check for letters with ANY characters between them
  const lowerContent = content.toLowerCase();

  // Create flexible patterns that allow ANY chars between key letters
  // f[any]ck, s[any]x, c[any]ck, fxx, sxx, etc.
  const obfuscationPatterns = [
    /f[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]*c[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]*k/i, // fuck variants (fck, f*ck, fcgk)
    /f[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]{2,}k/i, // fxx, fxxx, fyyk variants
    /s[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]*x/i, // sex variants
    /c[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]*ck/i, // cock variants
    /p[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]*rn/i, // porn variants
    /s[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]*xt/i, // sext variants
    /d[a-z0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]*g/i, // drug variants
  ];

  const hasObfuscation = obfuscationPatterns.some(pattern => pattern.test(lowerContent));

  if (hasObfuscation) {
    result.errors.push('❌ Message contains inappropriate content. Keep messages professional and task-focused.');
    result.isValid = false;
    return result;
  }

  // SPECIAL CHECK: Code words and hidden meanings - remove numbers from phrase checking
  // Remove numbers from content to catch obfuscated phrases like "over9" = "over"
  const cleanedPhrase = lowerContent.replace(/[0-9@!#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]+/g, ' ');

  // Remove LOL, SUP, WYD - too many false positives for casual greetings
  const codeWords = /\bzzz\b|\bz+\b(?=.*together)|lets.*together(?!.*work|.*help|.*study)|lets.*sleep|lets.*lay(?!.*floor|.*down for task)|together.*tonight|come.*my.*place|your.*place|come.*over|after.*time|one night stand|casual sex|hookup|booty call|fwb|friends with benefits|no strings attached|nsa|quick fix|quick meet|weekend getaway|getaway|fun time|good time|party time|lets party|lets have fun|dtf|bwc|bbc|gwm|ddf|pd|pw|bb|blow.*someone|blow me|blow job/i.test(cleanedPhrase);

  // Special check: LOL only in context with other suspicious phrases
  const hasLOL = /\blol\b/i.test(cleanedPhrase);
  const hasSuspiciousContext = /tonight|tonight|horny|hookup|come over|your place|my place|dtf|fwb|nsa|casual|quick|getaway|party/i.test(cleanedPhrase);
  const lolInSuspiciousContext = hasLOL && hasSuspiciousContext;

  const suggestiveContext = /\bzzz\b.*\btogether\b|\bcome\b.*\bover\b|\byour\b.*\bplace\b|\bmy\b.*\bplace\b|\bone\b.*\bnight\b.*\bstand\b|\bdtf\b|\bblow\b.*\bsomeone\b|\bblow\b.*\bme\b/i.test(cleanedPhrase); // "zzz together", "come over", "your place", "one night stand", "dtf", "blow someone" = sexual codes

  if (codeWords || suggestiveContext || lolInSuspiciousContext) {
    result.errors.push('❌ Message contains inappropriate content. Keep messages task-focused and professional.');
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

  // Check for inappropriate content using match (avoids .test() g flag state issue)
  if (content.match(INAPPROPRIATE_PATTERNS.profanity)) {
    result.errors.push('❌ Profanity not allowed. Keep messages professional.');
    result.isValid = false;
  }

  if (content.match(INAPPROPRIATE_PATTERNS.threats)) {
    result.errors.push('❌ Threatening language not allowed.');
    result.isValid = false;
  }

  if (content.match(INAPPROPRIATE_PATTERNS.harassment)) {
    result.errors.push('❌ Disrespectful/harassing language not allowed.');
    result.isValid = false;
  }

  if (content.match(INAPPROPRIATE_PATTERNS.sexualContent)) {
    result.errors.push('❌ Sexual content not allowed. Keep messages task-focused.');
    result.isValid = false;
  }

  if (content.match(INAPPROPRIATE_PATTERNS.drugs)) {
    result.errors.push('❌ References to illegal drugs not allowed.');
    result.isValid = false;
  }

  if (content.match(INAPPROPRIATE_PATTERNS.violence)) {
    result.errors.push('❌ Violent/abusive content not allowed.');
    result.isValid = false;
  }

  if (content.match(INAPPROPRIATE_PATTERNS.gambling)) {
    result.errors.push('❌ Gambling and betting references not allowed.');
    result.isValid = false;
  }

  if (content.match(INAPPROPRIATE_PATTERNS.scam)) {
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

IMPORTANT: Block ANY mention of:
1. DRUGS - Any illegal drug reference (weed, cocaine, heroin, etc.) = AUTO BLOCK
2. SEX/PROSTITUTION - Sexual services or adult content = AUTO BLOCK
3. GAMBLING - Betting, casinos, poker, lotteries = AUTO BLOCK
4. SCAMS - Crypto, forex, MLM, wire transfers, pyramid schemes = AUTO BLOCK
5. VIOLENCE/THREATS - Any violence, threats, or harmful intent = AUTO BLOCK

These categories should NEVER be allowed - even in casual context.

✅ ALLOW:
- Task-related questions and discussions
- Professional help requests
- Location mentions (hotel for cleaning, restaurant for delivery, etc.)
- Normal business communication
- Legitimate service questions

Context-sensitive blocks:
- 'Can you help clean my hotel?' = ALLOW (work request)
- 'Want to meet at a hotel?' = BLOCK (romantic intent)
- 'How do I set up a business?' = ALLOW (legitimate)
- 'Want to join my investment opportunity?' = BLOCK (MLM/scam)

HARD BLOCKS (automatic, zero tolerance):
- Any drug mention = BLOCK
- Any gambling mention = BLOCK
- Any sexual services mention = BLOCK
- Any obvious scam language = BLOCK
- Any violence/threats = BLOCK

Respond with ONLY JSON:
{
  "isAppropriate": boolean,
  "reason": "brief reason if blocking",
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
