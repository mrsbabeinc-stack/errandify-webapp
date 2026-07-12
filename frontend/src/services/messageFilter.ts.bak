// Contact info detection and filtering
export class MessageFilter {
  // Patterns for phone numbers
  private phonePatterns = [
    /\b\d{8}\b/, // 8-digit numbers
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // XXX-XXX-XXXX
    /\+?\d{1,3}[-.\s]?\d{3,14}\b/, // International format
    /\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}\b/, // (XXX) XXX-XXXX
  ];

  // Patterns for emails
  private emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Patterns for social media handles
  private socialPatterns = [
    /@[a-zA-Z0-9_]+/, // @handle
    /(?:whatsapp|telegram|wechat|viber|signal)[-.\s]?[a-zA-Z0-9_./+-]+/gi,
  ];

  // Inappropriate language keywords (basic filter)
  private inappropriateKeywords = [
    'badword1',
    'badword2',
    // Add actual inappropriate words as needed
  ];

  /**
   * Check if message contains contact information
   */
  static containsContactInfo(text: string): {
    hasPhone: boolean;
    hasEmail: boolean;
    hasSocial: boolean;
    matched: string[];
  } {
    const filter = new MessageFilter();
    const matched: string[] = [];

    // Check phones
    const phones = text.match(new RegExp(filter.phonePatterns.map(p => p.source).join('|'), 'g')) || [];
    const hasPhone = phones.length > 0;
    matched.push(...phones);

    // Check emails
    const emails = text.match(filter.emailPattern) || [];
    const hasEmail = emails.length > 0;
    matched.push(...emails);

    // Check social
    const social = text.match(new RegExp(filter.socialPatterns.map(p => p.source).join('|'), 'g')) || [];
    const hasSocial = social.length > 0;
    matched.push(...social);

    return { hasPhone, hasEmail, hasSocial, matched };
  }

  /**
   * Remove or mask contact information
   */
  static removeContactInfo(text: string): string {
    let cleaned = text;
    const filter = new MessageFilter();

    // Remove emails
    cleaned = cleaned.replace(filter.emailPattern, '[email hidden]');

    // Remove phone numbers
    filter.phonePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '[phone hidden]');
    });

    // Remove social media
    filter.socialPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '[social hidden]');
    });

    return cleaned;
  }

  /**
   * Check message appropriateness (basic)
   */
  static checkLanguageAppropriate(text: string): {
    isAppropriate: boolean;
    issues: string[];
  } {
    const filter = new MessageFilter();
    const issues: string[] = [];

    // Check for inappropriate keywords
    const lowerText = text.toLowerCase();
    filter.inappropriateKeywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        issues.push(`Potentially inappropriate language detected: "${keyword}"`);
      }
    });

    // Check for excessive caps (more than 50% caps)
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    if (capsCount > text.length * 0.5 && text.length > 10) {
      issues.push('Message contains excessive capital letters');
    }

    // Check for repetitive characters (spammy)
    if (/(.)\1{4,}/.test(text)) {
      issues.push('Message contains repetitive characters');
    }

    return {
      isAppropriate: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate and clean message for sending
   */
  static validateMessage(text: string): {
    valid: boolean;
    cleaned: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let cleaned = text;

    // Check contact info
    const contact = this.containsContactInfo(text);
    if (contact.matched.length > 0) {
      warnings.push(
        `Contact information detected (${contact.matched.join(', ')}). This will be hidden for safety.`
      );
      cleaned = this.removeContactInfo(text);
    }

    // Check language
    const language = this.checkLanguageAppropriate(text);
    if (!language.isAppropriate) {
      warnings.push(...language.issues);
    }

    return {
      valid: warnings.length === 0,
      cleaned,
      warnings,
    };
  }
}
