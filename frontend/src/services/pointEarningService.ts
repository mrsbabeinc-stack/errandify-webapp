/**
 * Point Earning Service
 * Handles all point earning logic based on configured rules
 */

export interface PointAwardRequest {
  userId: string;
  actionType: string;
  ruleId: number;
  metadata: Record<string, any>;
}

export interface PointAward {
  id: string;
  userId: string;
  points: number;
  ruleId: number;
  actionType: string;
  description: string;
  timestamp: Date;
  expiryDate?: Date;
  status: 'awarded' | 'pending' | 'cancelled';
  metadata: Record<string, any>;
}

export interface ErrandData {
  id: string;
  amount: number;
  askerRating?: number;
  doerRating?: number;
  status: 'completed' | 'pending' | 'cancelled';
  askerId: string;
  doerId: string;
}

export interface ReferralData {
  referrerId: string;
  refereeId: string;
  referralType: 'individual' | 'company';
  registrationDate: Date;
  kycStatus?: 'verified' | 'pending' | 'rejected';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  firstErrandCompleted?: boolean;
}

export interface UserData {
  id: string;
  email: string;
  kycStatus?: 'verified' | 'pending' | 'rejected';
  accountType: 'individual' | 'company';
  currentPoints: number;
}

/**
 * RULE 1: High Rating Bonus
 * Awards points when user receives 4-5 star rating
 */
export class HighRatingBonusRule {
  private pointsConfig = {
    asker4Star: 10,
    asker5Star: 20,
    doer4Star: 15,
    doer5Star: 25
  };

  setPointsConfig(config: Record<string, number>) {
    this.pointsConfig = { ...this.pointsConfig, ...config };
  }

  /**
   * Validate if rating qualifies for bonus
   */
  validateConditions(errand: ErrandData, ratedUser: 'asker' | 'doer'): boolean {
    // Rating must be for a completed errand
    if (errand.status !== 'completed') {
      return false;
    }

    // Get appropriate rating
    const rating = ratedUser === 'asker' ? errand.askerRating : errand.doerRating;

    // Rating must be 4 or 5 stars
    if (!rating || rating < 4 || rating > 5) {
      return false;
    }

    // Reward points are granted to the rated user based on star level
    return true;
  }

  /**
   * Calculate points to award
   */
  calculatePoints(errand: ErrandData, ratedUser: 'asker' | 'doer'): number {
    const rating = ratedUser === 'asker' ? errand.askerRating : errand.doerRating;
    const key = `${ratedUser}${rating}Star` as keyof typeof this.pointsConfig;
    return this.pointsConfig[key] || 0;
  }

  /**
   * Award high rating bonus points
   */
  awardPoints(errand: ErrandData, ratedUser: 'asker' | 'doer'): PointAward | null {
    // Validate conditions
    if (!this.validateConditions(errand, ratedUser)) {
      return null;
    }

    // Calculate points
    const points = this.calculatePoints(errand, ratedUser);

    // Determine which user receives the award
    const userId = ratedUser === 'asker' ? errand.askerId : errand.doerId;
    const rating = ratedUser === 'asker' ? errand.askerRating : errand.doerRating;

    return {
      id: `award_${Date.now()}_${userId}`,
      userId,
      points,
      ruleId: 1,
      actionType: 'High Rating',
      description: `Received ${rating}-star rating on errand #${errand.id}`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'awarded',
      metadata: {
        errandId: errand.id,
        rating,
        ratedUser,
        errandAmount: errand.amount
      }
    };
  }
}

/**
 * RULE 2: Referral - First Errand
 * Awards points when referred user completes their first errand
 */
export class ReferralFirstErrandRule {
  private pointsConfig = {
    referrer: 150,
    referee: 50
  };

  setPointsConfig(config: Record<string, number>) {
    this.pointsConfig = { ...this.pointsConfig, ...config };
  }

  /**
   * Validate if referral first errand qualifies for bonus
   */
  validateConditions(referral: ReferralData, errand: ErrandData): boolean {
    // User must be successfully registered through valid referral
    if (!referral.refereeId || !referral.referrerId) {
      return false;
    }

    // Referred user must complete their first errand (Asker or Doer role)
    if (errand.status !== 'completed') {
      return false;
    }

    // Errand must be marked as Completed
    const isRefereeInvolved =
      errand.askerId === referral.refereeId ||
      errand.doerId === referral.refereeId;

    if (!isRefereeInvolved) {
      return false;
    }

    // Reward is granted only once per referred user
    // (This would be checked in the backend database)

    return true;
  }

  /**
   * Award points to both referrer and referee
   */
  awardPoints(referral: ReferralData, errand: ErrandData): PointAward[] {
    // Validate conditions
    if (!this.validateConditions(referral, errand)) {
      return [];
    }

    const awards: PointAward[] = [];

    // Award to referrer
    awards.push({
      id: `award_${Date.now()}_referrer`,
      userId: referral.referrerId,
      points: this.pointsConfig.referrer,
      ruleId: 2,
      actionType: 'Referral - First Errand',
      description: `Referred user completed their first errand (#${errand.id})`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        refereeId: referral.refereeId,
        errandId: errand.id,
        role: 'referrer'
      }
    });

    // Award to referee
    awards.push({
      id: `award_${Date.now()}_referee`,
      userId: referral.refereeId,
      points: this.pointsConfig.referee,
      ruleId: 2,
      actionType: 'Referral - First Errand',
      description: `Completed your first errand through referral (#${errand.id})`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        referrerId: referral.referrerId,
        errandId: errand.id,
        role: 'referee'
      }
    });

    return awards;
  }
}

/**
 * RULE 3: Errand Completion
 * Awards points based on errand amount × point rate
 */
export class ErrandCompletionRule {
  private pointsConfig = {
    askerRate: 5.0, // Points per dollar for asker
    doerRate: 5.0   // Points per dollar for doer
  };

  setPointsConfig(config: Record<string, number>) {
    this.pointsConfig = { ...this.pointsConfig, ...config };
  }

  /**
   * Validate if errand completion qualifies for points
   */
  validateConditions(errand: ErrandData): boolean {
    // Both Doer & Asker must have confirmed errand is closed
    if (errand.status !== 'completed') {
      return false;
    }

    // Errand amount must be valid
    if (!errand.amount || errand.amount <= 0) {
      return false;
    }

    // Errand status must be updated to Closed
    return true;
  }

  /**
   * Calculate points based on formula: Points = Errand Amount × Point Rate
   */
  calculatePoints(errandAmount: number, userRole: 'asker' | 'doer'): number {
    const rate = userRole === 'asker'
      ? this.pointsConfig.askerRate
      : this.pointsConfig.doerRate;

    // Calculate and round to 2 decimal places
    return Math.round(errandAmount * rate * 100) / 100;
  }

  /**
   * Award points to both asker and doer
   */
  awardPoints(errand: ErrandData): PointAward[] {
    // Validate conditions
    if (!this.validateConditions(errand)) {
      return [];
    }

    const awards: PointAward[] = [];

    // Award to asker
    const askerPoints = this.calculatePoints(errand.amount, 'asker');
    awards.push({
      id: `award_${Date.now()}_asker`,
      userId: errand.askerId,
      points: askerPoints,
      ruleId: 3,
      actionType: 'Errand Completion',
      description: `Completed errand #${errand.id} (Amount: $${errand.amount})`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        errandId: errand.id,
        errandAmount: errand.amount,
        pointRate: this.pointsConfig.askerRate,
        userRole: 'asker'
      }
    });

    // Award to doer
    const doerPoints = this.calculatePoints(errand.amount, 'doer');
    awards.push({
      id: `award_${Date.now()}_doer`,
      userId: errand.doerId,
      points: doerPoints,
      ruleId: 3,
      actionType: 'Errand Completion',
      description: `Completed errand #${errand.id} (Amount: $${errand.amount})`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        errandId: errand.id,
        errandAmount: errand.amount,
        pointRate: this.pointsConfig.doerRate,
        userRole: 'doer'
      }
    });

    return awards;
  }
}

/**
 * RULE 4: Referral - Sign Up
 * Awards points for Individual or Company signup through referral
 */
export class ReferralSignUpRule {
  private pointsConfig = {
    individualSignup: 50,
    companySIgnup: 100
  };

  setPointsConfig(config: Record<string, number>) {
    this.pointsConfig = { ...this.pointsConfig, ...config };
  }

  /**
   * Validate Individual Signup conditions
   */
  validateIndividualSignup(referral: ReferralData, user: UserData): boolean {
    // User must register using valid Individual referral link/QR
    if (referral.referralType !== 'individual') {
      return false;
    }

    // Referral link type must match registration type
    if (user.accountType !== 'individual') {
      return false;
    }

    // User's KYC status must be Verified
    if (user.kycStatus !== 'verified') {
      return false;
    }

    // Referral reward has not been granted previously for this user
    // (This would be checked in the backend database)

    return true;
  }

  /**
   * Validate Company Signup conditions
   */
  validateCompanySignup(referral: ReferralData, user: UserData): boolean {
    // Company must register using valid Company referral link/QR
    if (referral.referralType !== 'company') {
      return false;
    }

    // Referral link type must match registration type
    if (user.accountType !== 'company') {
      return false;
    }

    // Company account status must be Approved
    if (referral.approvalStatus !== 'approved') {
      return false;
    }

    // Referral reward has not been granted previously for this company
    // (This would be checked in the backend database)

    return true;
  }

  /**
   * Award points for individual signup
   */
  awardIndividualSignup(referral: ReferralData, user: UserData): PointAward[] {
    // Validate conditions
    if (!this.validateIndividualSignup(referral, user)) {
      return [];
    }

    const awards: PointAward[] = [];
    const points = this.pointsConfig.individualSignup;

    // Award to referrer
    awards.push({
      id: `award_${Date.now()}_referrer`,
      userId: referral.referrerId,
      points,
      ruleId: 4,
      actionType: 'Referral - Sign up',
      description: `Referral signup: ${user.email} (Individual)`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        refereeId: referral.refereeId,
        referralType: 'individual',
        kycStatus: user.kycStatus,
        role: 'referrer'
      }
    });

    // Award to referee
    awards.push({
      id: `award_${Date.now()}_referee`,
      userId: referral.refereeId,
      points,
      ruleId: 4,
      actionType: 'Referral - Sign up',
      description: `Welcome bonus: Registered through referral (Individual)`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        referrerId: referral.referrerId,
        referralType: 'individual',
        kycStatus: user.kycStatus,
        role: 'referee'
      }
    });

    return awards;
  }

  /**
   * Award points for company signup
   */
  awardCompanySignup(referral: ReferralData, user: UserData): PointAward[] {
    // Validate conditions
    if (!this.validateCompanySignup(referral, user)) {
      return [];
    }

    const awards: PointAward[] = [];
    const points = this.pointsConfig.companySIgnup;

    // Award to referrer
    awards.push({
      id: `award_${Date.now()}_referrer`,
      userId: referral.referrerId,
      points,
      ruleId: 4,
      actionType: 'Referral - Sign up',
      description: `Company referral signup: ${user.email} (Approved)`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        refereeId: referral.refereeId,
        referralType: 'company',
        approvalStatus: referral.approvalStatus,
        role: 'referrer'
      }
    });

    // Award to referee
    awards.push({
      id: `award_${Date.now()}_referee`,
      userId: referral.refereeId,
      points,
      ruleId: 4,
      actionType: 'Referral - Sign up',
      description: `Welcome bonus: Company registered and approved`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        referrerId: referral.referrerId,
        referralType: 'company',
        approvalStatus: referral.approvalStatus,
        role: 'referee'
      }
    });

    return awards;
  }

  /**
   * Award points based on signup type
   */
  awardPoints(referral: ReferralData, user: UserData): PointAward[] {
    if (referral.referralType === 'individual') {
      return this.awardIndividualSignup(referral, user);
    } else if (referral.referralType === 'company') {
      return this.awardCompanySignup(referral, user);
    }
    return [];
  }
}

/**
 * Point Earning Engine
 * Master service that coordinates all point earning rules
 */
export class PointEarningEngine {
  private highRatingRule = new HighRatingBonusRule();
  private referralFirstErrandRule = new ReferralFirstErrandRule();
  private errandCompletionRule = new ErrandCompletionRule();
  private referralSignUpRule = new ReferralSignUpRule();

  /**
   * Process high rating bonus
   */
  processHighRatingBonus(errand: ErrandData, ratedUser: 'asker' | 'doer'): PointAward | null {
    return this.highRatingRule.awardPoints(errand, ratedUser);
  }

  /**
   * Process referral first errand bonus
   */
  processReferralFirstErrand(referral: ReferralData, errand: ErrandData): PointAward[] {
    return this.referralFirstErrandRule.awardPoints(referral, errand);
  }

  /**
   * Process errand completion points
   */
  processErrandCompletion(errand: ErrandData): PointAward[] {
    return this.errandCompletionRule.awardPoints(errand);
  }

  /**
   * Process referral signup bonus
   */
  processReferralSignup(referral: ReferralData, user: UserData): PointAward[] {
    return this.referralSignUpRule.awardPoints(referral, user);
  }

  /**
   * Update rule configuration
   */
  updateRuleConfig(ruleId: number, config: Record<string, number>) {
    switch (ruleId) {
      case 1:
        this.highRatingRule.setPointsConfig(config);
        break;
      case 2:
        this.referralFirstErrandRule.setPointsConfig(config);
        break;
      case 3:
        this.errandCompletionRule.setPointsConfig(config);
        break;
      case 4:
        this.referralSignUpRule.setPointsConfig(config);
        break;
    }
  }

  /**
   * Get all active rules configuration
   */
  getRulesConfig() {
    return {
      highRating: this.highRatingRule,
      referralFirstErrand: this.referralFirstErrandRule,
      errandCompletion: this.errandCompletionRule,
      referralSignup: this.referralSignUpRule
    };
  }
}

// Export singleton instance
export const pointEngine = new PointEarningEngine();
