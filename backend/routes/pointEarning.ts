/**
 * Point Earning Routes
 * Backend API endpoints for point earning rules and calculations
 */

import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Mock database - replace with actual database in production
const pointAwards: any[] = [];
const pointRules: any[] = [
  {
    id: 1,
    name: 'High Rating Bonus',
    actionType: 'High Rating',
    active: true,
    pointsConfig: {
      asker4Star: 10,
      asker5Star: 20,
      doer4Star: 15,
      doer5Star: 25
    },
    lastUpdated: new Date(),
    updatedBy: 'admin'
  },
  {
    id: 2,
    name: 'Referral - First Errand',
    actionType: 'Referral - First Errand',
    active: true,
    pointsConfig: {
      referrer: 150,
      referee: 50
    },
    lastUpdated: new Date(),
    updatedBy: 'admin'
  },
  {
    id: 3,
    name: 'Errand Completion',
    actionType: 'Errand Completion',
    active: true,
    pointsConfig: {
      askerRate: 5.0,
      doerRate: 5.0
    },
    lastUpdated: new Date(),
    updatedBy: 'admin'
  },
  {
    id: 4,
    name: 'Referral - Sign Up',
    actionType: 'Referral - Sign up',
    active: true,
    pointsConfig: {
      individualSignup: 50,
      companySignup: 100
    },
    lastUpdated: new Date(),
    updatedBy: 'admin'
  }
];

/**
 * GET /api/point-earning/rules
 * Get all point earning rules
 */
router.get('/rules', authenticateToken, (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: pointRules,
      count: pointRules.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch point earning rules',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/point-earning/rules/:ruleId
 * Get specific point earning rule
 */
router.get('/rules/:ruleId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = pointRules.find(r => r.id === parseInt(ruleId));

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch point earning rule',
      error: (error as Error).message
    });
  }
});

/**
 * PUT /api/point-earning/rules/:ruleId
 * Update point earning rule
 */
router.put('/rules/:ruleId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { pointsConfig, active } = req.body;

    // Validate input
    if (!pointsConfig && active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    // Find and update rule
    const ruleIndex = pointRules.findIndex(r => r.id === parseInt(ruleId));

    if (ruleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    const updatedRule = {
      ...pointRules[ruleIndex],
      ...(pointsConfig && { pointsConfig }),
      ...(active !== undefined && { active }),
      lastUpdated: new Date(),
      updatedBy: (req as any).user?.username || 'admin'
    };

    pointRules[ruleIndex] = updatedRule;

    res.json({
      success: true,
      message: 'Rule updated successfully',
      data: updatedRule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update point earning rule',
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/point-earning/award/high-rating
 * Award high rating bonus points
 */
router.post('/award/high-rating', authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId, errandId, rating, errandAmount, ratedUser } = req.body;

    // Validate input
    if (!userId || !errandId || !rating || rating < 1 || rating > 5 || !['asker', 'doer'].includes(ratedUser)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters'
      });
    }

    // Get rule configuration
    const rule = pointRules.find(r => r.id === 1);
    if (!rule || !rule.active) {
      return res.status(400).json({
        success: false,
        message: 'High rating rule is not active'
      });
    }

    // Calculate points
    const pointKey = `${ratedUser}${rating}Star`;
    const points = rule.pointsConfig[pointKey] || 0;

    if (points === 0) {
      return res.status(400).json({
        success: false,
        message: 'No points configured for this rating'
      });
    }

    // Create award record
    const award = {
      id: `award_${Date.now()}_${userId}`,
      userId,
      points,
      ruleId: 1,
      actionType: 'High Rating',
      description: `Received ${rating}-star rating on errand #${errandId}`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        errandId,
        rating,
        ratedUser,
        errandAmount
      }
    };

    pointAwards.push(award);

    res.json({
      success: true,
      message: 'High rating bonus awarded',
      data: award
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to award high rating bonus',
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/point-earning/award/errand-completion
 * Award errand completion points
 */
router.post('/award/errand-completion', authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId, errandId, errandAmount, userRole } = req.body;

    // Validate input
    if (!userId || !errandId || !errandAmount || !['asker', 'doer'].includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters'
      });
    }

    // Get rule configuration
    const rule = pointRules.find(r => r.id === 3);
    if (!rule || !rule.active) {
      return res.status(400).json({
        success: false,
        message: 'Errand completion rule is not active'
      });
    }

    // Calculate points: Amount × Rate
    const rateKey = `${userRole}Rate`;
    const rate = rule.pointsConfig[rateKey] || 0;
    const points = Math.round(errandAmount * rate * 100) / 100;

    if (points === 0) {
      return res.status(400).json({
        success: false,
        message: 'No points calculated for this errand'
      });
    }

    // Create award record
    const award = {
      id: `award_${Date.now()}_${userId}`,
      userId,
      points,
      ruleId: 3,
      actionType: 'Errand Completion',
      description: `Completed errand #${errandId} (Amount: $${errandAmount})`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        errandId,
        errandAmount,
        pointRate: rate,
        userRole
      }
    };

    pointAwards.push(award);

    res.json({
      success: true,
      message: 'Errand completion points awarded',
      data: award
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to award errand completion points',
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/point-earning/award/referral-first-errand
 * Award referral first errand bonus
 */
router.post('/award/referral-first-errand', authenticateToken, (req: Request, res: Response) => {
  try {
    const { referrerId, refereeId, errandId } = req.body;

    // Validate input
    if (!referrerId || !refereeId || !errandId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters'
      });
    }

    // Get rule configuration
    const rule = pointRules.find(r => r.id === 2);
    if (!rule || !rule.active) {
      return res.status(400).json({
        success: false,
        message: 'Referral first errand rule is not active'
      });
    }

    const awards = [];

    // Award to referrer
    const referrerAward = {
      id: `award_${Date.now()}_referrer`,
      userId: referrerId,
      points: rule.pointsConfig.referrer,
      ruleId: 2,
      actionType: 'Referral - First Errand',
      description: `Referred user completed their first errand (#${errandId})`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        refereeId,
        errandId,
        role: 'referrer'
      }
    };
    awards.push(referrerAward);
    pointAwards.push(referrerAward);

    // Award to referee
    const refereeAward = {
      id: `award_${Date.now()}_referee`,
      userId: refereeId,
      points: rule.pointsConfig.referee,
      ruleId: 2,
      actionType: 'Referral - First Errand',
      description: `Completed your first errand through referral (#${errandId})`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        referrerId,
        errandId,
        role: 'referee'
      }
    };
    awards.push(refereeAward);
    pointAwards.push(refereeAward);

    res.json({
      success: true,
      message: 'Referral first errand bonus awarded',
      data: awards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to award referral first errand bonus',
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/point-earning/award/referral-signup
 * Award referral signup bonus
 */
router.post('/award/referral-signup', authenticateToken, (req: Request, res: Response) => {
  try {
    const { referrerId, refereeId, referralType, kycStatus, approvalStatus } = req.body;

    // Validate input
    if (!referrerId || !refereeId || !referralType || !['individual', 'company'].includes(referralType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters'
      });
    }

    // Get rule configuration
    const rule = pointRules.find(r => r.id === 4);
    if (!rule || !rule.active) {
      return res.status(400).json({
        success: false,
        message: 'Referral signup rule is not active'
      });
    }

    // Validate conditions based on type
    if (referralType === 'individual' && kycStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Individual referral requires verified KYC status'
      });
    }

    if (referralType === 'company' && approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Company referral requires approved status'
      });
    }

    const pointKey = referralType === 'individual' ? 'individualSignup' : 'companySignup';
    const points = rule.pointsConfig[pointKey];
    const awards = [];

    // Award to referrer
    const referrerAward = {
      id: `award_${Date.now()}_referrer`,
      userId: referrerId,
      points,
      ruleId: 4,
      actionType: 'Referral - Sign up',
      description: `${referralType.charAt(0).toUpperCase() + referralType.slice(1)} referral signup bonus`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        refereeId,
        referralType,
        kycStatus,
        approvalStatus,
        role: 'referrer'
      }
    };
    awards.push(referrerAward);
    pointAwards.push(referrerAward);

    // Award to referee
    const refereeAward = {
      id: `award_${Date.now()}_referee`,
      userId: refereeId,
      points,
      ruleId: 4,
      actionType: 'Referral - Sign up',
      description: `Welcome bonus: ${referralType} signup`,
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'awarded',
      metadata: {
        referrerId,
        referralType,
        kycStatus,
        approvalStatus,
        role: 'referee'
      }
    };
    awards.push(refereeAward);
    pointAwards.push(refereeAward);

    res.json({
      success: true,
      message: 'Referral signup bonus awarded',
      data: awards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to award referral signup bonus',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/point-earning/awards/user/:userId
 * Get user's point awards history
 */
router.get('/awards/user/:userId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userAwards = pointAwards.filter(a => a.userId === userId);

    res.json({
      success: true,
      data: userAwards,
      count: userAwards.length,
      totalPoints: userAwards.reduce((sum, a) => sum + a.points, 0)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user awards',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/point-earning/awards/errand/:errandId
 * Get awards for specific errand
 */
router.get('/awards/errand/:errandId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { errandId } = req.params;
    const errandAwards = pointAwards.filter(a => a.metadata?.errandId === errandId);

    res.json({
      success: true,
      data: errandAwards,
      count: errandAwards.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch errand awards',
      error: (error as Error).message
    });
  }
});

export default router;
