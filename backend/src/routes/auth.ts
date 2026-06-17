import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import db from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Mock OTP storage (in-memory, real SMS later)
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

// Helper: Hash NRIC with SHA256
function hashNric(nric: string): string {
  return crypto.createHash('sha256').update(nric).digest('hex');
}

// Helper: Generate referral code
function generateReferralCode(): string {
  return 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Helper: Generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Signup: Mock SingPass flow
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, age, nric, address, mobile, language, role } = req.body;

    if (!name || !nric || !mobile || !address) {
      return res.status(400).json({
        error: 'name, nric, mobile, and address required',
      });
    }

    // Check if user already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE nric_hash = $1',
      [hashNric(nric)]
    );

    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: 'User already exists with this NRIC' });
    }

    // Insert new user
    const referralCode = generateReferralCode();
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);

    const result = await db.query(
      `INSERT INTO users (
        nric_hash, display_name, mobile, dob, address,
        font_size_pref, language_pref, role, kyc_status, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, display_name, mobile, role`,
      [
        hashNric(nric),
        name,
        mobile,
        dob,
        address,
        age >= 50 ? 19 : 16,
        language || 'en',
        role || 'asker',
        'verified',
        referralCode,
      ]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, mobile: user.mobile, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user.id,
          name: user.display_name,
          mobile: user.mobile,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Request OTP for login
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ error: 'Mobile required' });
    }

    // Check if user exists
    const result = await db.query(
      'SELECT id FROM users WHERE mobile = $1',
      [mobile]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate and store OTP (valid for 10 minutes)
    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore[mobile] = { code: otp, expiresAt };

    // Console log for demo (real SMS in production)
    console.log(`📱 OTP for ${mobile}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent to mobile',
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Failed to request OTP' });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ error: 'Mobile and OTP required' });
    }

    // Check OTP validity
    const stored = otpStore[mobile];
    if (!stored || stored.code !== otp || stored.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Get user
    const result = await db.query(
      'SELECT id, display_name, mobile, role FROM users WHERE mobile = $1',
      [mobile]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Clean up OTP
    delete otpStore[mobile];

    // Generate token
    const token = jwt.sign(
      { userId: user.id, mobile: user.mobile, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user.id,
          name: user.display_name,
          mobile: user.mobile,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: any, res: Response) => {
  try {
    const result = await db.query(
      'SELECT id, display_name, mobile, role, language_pref FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.display_name,
        mobile: user.mobile,
        role: user.role,
        language: user.language_pref,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Debug: Get current OTP (development only)
router.get('/debug/otp/:mobile', (req: any, res: Response) => {
  const { mobile } = req.params;
  const stored = otpStore[mobile];
  if (stored && stored.expiresAt > Date.now()) {
    res.json({ otp: stored.code, expiresAt: new Date(stored.expiresAt) });
  } else {
    res.status(404).json({ error: 'No valid OTP for this mobile' });
  }
});

// Demo login - Quick access for testing
router.post('/demo-login', async (req: Request, res: Response) => {
  try {
    const { account } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Account required' });
    }

    // Demo account mapping
    const demoAccounts: Record<string, { mobile: string; name: string; nric: string }> = {
      sarah: { mobile: '98765432', name: 'Sarah Tan', nric: 'S1234567A' },
      john: { mobile: '87654321', name: 'John Lee', nric: 'S7654321B' },
    };

    const demoUser = demoAccounts[account.toLowerCase()];
    if (!demoUser) {
      return res.status(400).json({ error: 'Invalid demo account' });
    }

    // Check if user exists, if not create them
    let result = await db.query(
      'SELECT id, display_name, mobile, role FROM users WHERE mobile = $1',
      [demoUser.mobile]
    );

    let user;
    if (result.rows.length === 0) {
      // Create demo user
      const referralCode = generateReferralCode();
      const createResult = await db.query(
        `INSERT INTO users (
          nric_hash, display_name, mobile, address,
          font_size_pref, language_pref, role, kyc_status, referral_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, display_name, mobile, role`,
        [
          hashNric(demoUser.nric),
          demoUser.name,
          demoUser.mobile,
          '123 Demo Street, Singapore 123456',
          16,
          'en',
          'asker',
          'verified',
          referralCode,
        ]
      );
      user = createResult.rows[0];
    } else {
      user = result.rows[0];
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, mobile: user.mobile, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user.id,
          name: user.display_name,
          mobile: user.mobile,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed' });
  }
});

// SingPass login endpoint (when USE_SINGPASS is true)
router.post('/singpass/login', (req: any, res: Response) => {
  if (!config.singpass.useSingpass) {
    return res
      .status(400)
      .json({ error: 'SingPass not enabled. Use mock signup/login.' });
  }

  // TODO: Implement SingPass OAuth flow
  res.status(501).json({ error: 'SingPass integration not yet implemented' });
});

export default router;
