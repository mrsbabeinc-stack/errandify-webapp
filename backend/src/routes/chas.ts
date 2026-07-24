import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';

const router = Router();

// CHAS Card Color Reference
interface CHASCardInfo {
  color: 'blue' | 'green' | 'none';
  incomeLimit: string;
  subsidy: string;
  eligible: boolean;
}

const chasCardInfo: Record<string, CHASCardInfo> = {
  blue: {
    color: 'blue',
    incomeLimit: 'Monthly household income ≤ $1,900',
    subsidy: 'Higher subsidies (75-100%)',
    eligible: true,
  },
  green: {
    color: 'green',
    incomeLimit: 'Monthly household income ≤ $3,900',
    subsidy: 'Standard subsidies (50-75%)',
    eligible: true,
  },
  none: {
    color: 'none',
    incomeLimit: 'Not eligible or no CHAS card',
    subsidy: 'No subsidies',
    eligible: false,
  },
};

// GET user's CHAS status
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const result = await db.query(
      'SELECT chas_card_color, chas_verified, chas_verified_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const chasColor = user.chas_card_color || 'none';

    res.json({
      success: true,
      data: {
        chasCardColor: chasColor,
        chasVerified: user.chas_verified,
        chasVerifiedAt: user.chas_verified_at,
        chasInfo: chasCardInfo[chasColor],
      },
    });
  } catch (error: any) {
    console.error('CHAS profile error:', error);
    res.status(500).json({ error: 'Failed to fetch CHAS profile' });
  }
});

// POST CHAS verification - Manual selection
router.post('/verify-manual', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { chasCardColor } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!userId) return res.status(400).json({ error: 'User ID required' });
    if (!chasCardColor || !chasCardInfo[chasCardColor]) {
      return res.status(400).json({ error: 'Invalid CHAS card color' });
    }

    // Update user's CHAS status
    await db.query(
      `UPDATE users
       SET chas_card_color = $1,
           chas_verified = true,
           chas_verified_at = NOW()
       WHERE id = $2`,
      [chasCardColor, userId]
    );

    console.log(`[CHAS] User ${userId} manually verified with ${chasCardColor} card`);

    res.json({
      success: true,
      data: {
        chasCardColor,
        chasVerified: true,
        message: `CHAS ${chasCardColor.toUpperCase()} card confirmed`,
        chasInfo: chasCardInfo[chasCardColor],
      },
    });
  } catch (error: any) {
    console.error('CHAS verification error:', error);
    res.status(500).json({ error: 'Failed to verify CHAS card' });
  }
});

// POST CHAS verification via API (MOH integration - Future)
router.post('/verify-api', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { nric, apiKey } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!userId) return res.status(400).json({ error: 'User ID required' });
    if (!nric) return res.status(400).json({ error: 'NRIC required for API verification' });

    // TODO: Implement actual MOH CHAS API call when credentials available
    // For now, return template showing how it would work

    console.log(`[CHAS] API verification requested for NRIC: ${nric.substring(0, 4)}****`);

    // Placeholder response
    const mockChasColor = 'blue'; // In production, this would come from MOH API

    // Update database with API-verified CHAS status
    await db.query(
      `UPDATE users
       SET chas_card_color = $1,
           chas_verified = true,
           chas_verified_at = NOW()
       WHERE id = $2`,
      [mockChasColor, userId]
    );

    res.json({
      success: true,
      data: {
        chasCardColor: mockChasColor,
        chasVerified: true,
        verificationMethod: 'api',
        message: 'CHAS status verified via MOH API',
        chasInfo: chasCardInfo[mockChasColor],
      },
    });
  } catch (error: any) {
    console.error('CHAS API verification error:', error);
    res.status(500).json({ error: 'Failed to verify CHAS card via API' });
  }
});

// DELETE CHAS verification (user can opt-out)
router.delete('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    await db.query(
      `UPDATE users
       SET chas_card_color = 'none',
           chas_verified = false,
           chas_verified_at = NULL
       WHERE id = $1`,
      [userId]
    );

    console.log(`[CHAS] User ${userId} removed CHAS card information`);

    res.json({
      success: true,
      message: 'CHAS card information removed',
    });
  } catch (error: any) {
    console.error('CHAS deletion error:', error);
    res.status(500).json({ error: 'Failed to remove CHAS card information' });
  }
});

// Check CHAS eligibility for pricing/benefits
router.get('/eligibility/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      'SELECT chas_card_color, chas_verified FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const chasColor = user.chas_card_color || 'none';
    const isEligible = user.chas_verified && chasCardInfo[chasColor]?.eligible;

    res.json({
      success: true,
      data: {
        userId,
        chasCardColor: chasColor,
        isEligible,
        benefits: isEligible ? {
          discountPercentage: chasColor === 'blue' ? 25 : 15,
          message: `Eligible for ${chasColor === 'blue' ? '25%' : '15%'} discount as CHAS ${chasColor.toUpperCase()} cardholder`,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('CHAS eligibility check error:', error);
    res.status(500).json({ error: 'Failed to check CHAS eligibility' });
  }
});

// Get CHAS card info reference
router.get('/card-info', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: chasCardInfo,
  });
});

export default router;
