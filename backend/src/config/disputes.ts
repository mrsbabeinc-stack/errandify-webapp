/**
 * Dispute Resolution Configuration
 * All values are configurable and can be updated later
 */

export const disputeConfig = {
  // ============================================
  // TIMING CONFIGURATION (in seconds)
  // ============================================
  timing: {
    // 48-hour window for disputes after completion
    disputeWindow: 48 * 60 * 60,

    // 24h appeal window after an admin decision.
    //
    // This was 7 days here while the code hardcoded 12h in three places and
    // never read the config. 24h is the compromise: 12h expires overnight and
    // costs someone their right to object, 7 days holds funds too long for a
    // $50 errand. Settlement is blocked until this window closes, which is what
    // makes "released, then appealed" impossible.
    appealWindow: 24 * 60 * 60,

    // Admin must review within 24 hours
    adminReviewTimeout: 24 * 60 * 60,

    // Payment auto-releases after 48h if no dispute
    autoReleaseTimeout: 48 * 60 * 60,
  },

  // ============================================
  // AI CONFIDENCE THRESHOLDS
  // ============================================
  aiThresholds: {
    // >80% confidence = auto-resolve (no human needed)
    autoResolveThreshold: 0.80,

    // 50-80% confidence = human review (AI recommends)
    humanReviewThreshold: 0.50,

    // Safety concerns always escalate immediately
    safetyEscalateThreshold: 0.95,
  },

  // ============================================
  // CANCELLATION PENALTIES (Configurable Later)
  // ============================================
  cancellationPenalties: {
    // More than 4 hours before job start
    moreThan4Hours: {
      percentage: 0,
      description: 'free',
      label: 'No penalty',
    },
    // Between 2-4 hours
    between2And4Hours: {
      percentage: 20,
      description: '20%',
      label: '20% cancellation fee',
    },
    // Less than 2 hours
    lessThan2Hours: {
      percentage: 50,
      description: '50%',
      label: '50% cancellation fee',
    },
    // After job already started
    afterStarted: {
      percentage: 100,
      description: '100%',
      label: 'Full payment penalty',
    },
  },

  // ============================================
  // PAYMENT SPLIT CONFIGURATION
  // ============================================
  paymentSplit: {
    // Default partial payment split (50/50)
    defaultPartialSplitPercentage: 0.5,

    // Minimum payment to doer (prevents $0 payments)
    minimumDoerPayment: 5,

    // Maximum payment to doer
    maximumDoerPayment: 9999,
  },

  // ============================================
  // STRIPE FEE HANDLING (Configurable Later)
  // ============================================
  stripeFeeLogic: {
    // Options: 'asker' | 'doer' | 'platform'
    // 'asker': Asker always pays fee
    // 'doer': Doer responsible for fee if they cancel
    // 'platform': Platform absorbs all Stripe fees
    bearerLogic: 'asker', // DEFAULT: asker bears fee (can change later)

    // Stripe fee percentage (2.9% + $0.30)
    stripeFeePercentage: 0.029,
    stripeFeeFixed: 0.30,

    // Calculate total fee for amount
    calculateStripeFee: (amount: number): number => {
      const percentage = amount * 0.029;
      const fixed = 0.30;
      return Math.round((percentage + fixed) * 100) / 100;
    },
  },

  // ============================================
  // DISPUTE TYPES & OPTIONS
  // ============================================
  disputeTypes: {
    doer: [
      {
        value: 'asker_unavailable',
        label: '👻 Asker Unavailable',
        description: 'Asker wasn\'t home or didn\'t respond',
      },
      {
        value: 'asker_changed_scope',
        label: '🔄 Scope Changed',
        description: 'Job requirements changed mid-work',
      },
      {
        value: 'access_denied',
        label: '🔐 Access Denied',
        description: 'Couldn\'t access location or materials',
      },
      {
        value: 'materials_not_provided',
        label: '📦 Materials Missing',
        description: 'Asker didn\'t provide required materials',
      },
      {
        value: 'asker_unresponsive',
        label: '📵 Unresponsive',
        description: 'Asker wouldn\'t answer calls/messages',
      },
      {
        value: 'accident',
        label: '⚠️ Accident/Injury',
        description: 'I got injured or accident occurred',
        escalate: true,
      },
      {
        value: 'quarrel',
        label: '🚨 Quarrel/Conflict',
        description: 'Disagreement or hostile behavior',
        escalate: true,
      },
      {
        value: 'other',
        label: '❓ Other',
        description: 'Something else prevented completion',
      },
    ],
    asker: [
      {
        value: 'not_completed',
        label: '❌ Work Not Completed',
        description: 'Doer didn\'t finish the work',
      },
      {
        value: 'poor_quality',
        label: '⚠️ Poor Quality',
        description: 'Work done but below standard',
      },
      {
        value: 'partially_done',
        label: '📋 Partially Done',
        description: 'Incomplete work delivered',
      },
      {
        value: 'materials_wasted',
        label: '🗑️ Materials Wasted',
        description: 'Doer wasted materials/resources',
      },
      {
        value: 'accident',
        label: '⚠️ Accident/Damage',
        description: 'Doer caused damage or injury',
        escalate: true,
      },
      {
        value: 'quarrel',
        label: '🚨 Quarrel/Conflict',
        description: 'Disagreement or hostile behavior',
        escalate: true,
      },
      {
        value: 'safety_issue',
        label: '🔴 Safety Issue',
        description: 'Work created safety problems',
        escalate: true,
      },
      {
        value: 'other',
        label: '❓ Other',
        description: 'Something else went wrong',
      },
    ],
  },

  // ============================================
  // AI SAFETY KEYWORDS & PATTERNS
  // ============================================
  safetyKeywords: {
    critical: [
      // Threats
      'i\'ll destroy', 'i\'ll hurt', 'i\'ll sue', 'i\'ll kill', 'i\'ll harm',
      'blackmail', 'unless you pay more', 'extort',
      'threatened', 'threatened you', 'will expose', 'do what i say',
      'or else', 'or i\'ll', 'coerce',
      // Rude/hostile
      'you piece of', 'you\'re garbage', 'you\'re worthless', 'f*** you',
      'i\'ll beat', 'i\'ll fight', 'let\'s fight', 'come fight me',
      // Quarrel/conflict indicators
      'we fought', 'we quarreled', 'we had a fight', 'got into a fight',
      'attacked me', 'hit me', 'pushed me', 'grabbed me',
    ],
    high: [
      // Demanding/aggressive
      'refuse to pay', 'never pay', 'demanding refund', 'threatening legal',
      'i demand', 'you must', 'you will',
      // Hostile language
      'ruined', 'useless', 'scam', 'fraud', 'criminal', 'liar',
      'disrespectful', 'rude', 'insulting', 'humiliated', 'degraded',
      'accident happened', 'got injured', 'was hurt', 'injured me',
      'damaged my', 'broke my', 'destroyed my',
    ],
    medium: [
      // Conflict
      'unacceptable', 'disgusting', 'horrible', 'worst', 'never again',
      'reported to', 'warned everyone', 'told my friends',
      'angry', 'upset', 'frustrated', 'disappointed',
      'argument', 'disagreed', 'didn\'t agree',
    ],
  },

  // ============================================
  // DECISION RECOMMENDATIONS
  // ============================================
  decisions: {
    FULL_PAYMENT: 'full_payment',
    PARTIAL_PAYMENT: 'partial_payment',
    REFUND: 'refund',
    ESCALATE: 'escalate',
  },

  // ============================================
  // ROUTING RULES
  // ============================================
  routing: {
    // Safety alert = immediate escalation (no auto-resolve)
    safetyEscalateImmediately: true,

    // High confidence cases can auto-resolve
    autoResolveHighConfidence: true,

    // Medium confidence needs human review
    requireHumanForMediumConfidence: true,

    // Low confidence always needs human
    requireHumanForLowConfidence: true,
  },

  // ============================================
  // EVIDENCE REQUIREMENTS
  // ============================================
  evidenceRequirements: {
    // For "Asker Prevented Completion" disputes
    askerPrevented: {
      gpsRequired: true,
      photosRequired: true,
      photosMinimum: 1,
      chatHistoryRequired: true,
      waitTimeRequired: true,
      descriptionMinimumWords: 50,
    },

    // For quality disputes
    qualityIssue: {
      gpsRequired: false,
      photosRequired: true,
      photosMinimum: 1,
      chatHistoryRequired: false,
      waitTimeRequired: false,
      descriptionMinimumWords: 30,
    },

    // For safety concerns
    safetyConcern: {
      gpsRequired: false,
      photosRequired: true,
      photosMinimum: 1,
      chatHistoryRequired: false,
      waitTimeRequired: false,
      descriptionMinimumWords: 50,
    },
  },

  // ============================================
  // NOTIFICATION SETTINGS
  // ============================================
  notifications: {
    // Send to both parties
    notifyBothParties: true,

    // Channels
    channels: {
      inApp: true,
      email: true,
      sms: false, // Can enable later
      push: false, // Can enable later
    },

    // Timing
    sendImmediately: true,
    batchNotifications: false,
  },

  // ============================================
  // REPUTATION & RESTRICTIONS
  // ============================================
  reputation: {
    // Track disputes per user
    trackDisputeHistory: true,

    // Restrict repeat cancellers
    restrictRepeatCancellers: true,
    cancelRestrictionThreshold: 3, // After 3 cancellations
    cancelRestrictionDuration: 7 * 24 * 60 * 60, // 7 days

    // Restrict repeat disputants
    restrictRepeatDisputers: true,
    disputeRestrictionThreshold: 5, // After 5 disputes
    disputeRestrictionDuration: 30 * 24 * 60 * 60, // 30 days

    // Impact on ratings
    negativeDisputeImpact: true,
    disputeRatingPenalty: 0.1, // 0.1 star deduction
  },

  // ============================================
  // ADMIN WORKFLOW
  // ============================================
  admin: {
    // Show AI recommendation
    showAIRecommendation: true,

    // Require notes for override
    requireNotesForOverride: true,

    // Auto-generate messages
    autoGenerateMessages: true,

    // Request more info capability
    canRequestMoreInfo: true,
    moreInfoTimeout: 24 * 60 * 60, // 24 hours to respond
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTimeRemaining(
  startTime: Date,
  windowSeconds: number
): number {
  const elapsed = (Date.now() - startTime.getTime()) / 1000;
  const remaining = windowSeconds - elapsed;
  return Math.max(0, remaining);
}

export function isHighConfidence(score: number): boolean {
  return score >= disputeConfig.aiThresholds.autoResolveThreshold;
}

export function isMediumConfidence(score: number): boolean {
  return (
    score >= disputeConfig.aiThresholds.humanReviewThreshold &&
    score < disputeConfig.aiThresholds.autoResolveThreshold
  );
}

export function isLowConfidence(score: number): boolean {
  return score < disputeConfig.aiThresholds.humanReviewThreshold;
}

export function shouldAutoResolve(score: number, hasSafetyConcern: boolean): boolean {
  if (hasSafetyConcern) return false; // Safety always escalates
  return isHighConfidence(score) && disputeConfig.routing.autoResolveHighConfidence;
}

export function shouldEscalateImmediately(hasSafetyConcern: boolean, severity?: string): boolean {
  if (!hasSafetyConcern) return false;
  return severity === 'critical' || severity === 'high';
}

export function getCancellationPenalty(minutesBeforeStart: number): {
  percentage: number;
  description: string;
  label: string;
} {
  const hoursBeforeStart = minutesBeforeStart / 60;

  if (hoursBeforeStart > 4) {
    return disputeConfig.cancellationPenalties.moreThan4Hours;
  } else if (hoursBeforeStart >= 2) {
    return disputeConfig.cancellationPenalties.between2And4Hours;
  } else if (hoursBeforeStart > 0) {
    return disputeConfig.cancellationPenalties.lessThan2Hours;
  } else {
    return disputeConfig.cancellationPenalties.afterStarted;
  }
}
