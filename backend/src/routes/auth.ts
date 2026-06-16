import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

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
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
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

// SingPass login endpoint (when USE_SINGPASS is true)
router.post('/singpass/login', (req: Request, res: Response) => {
  if (!config.singpass.useSingpass) {
    return res
      .status(400)
      .json({ error: 'SingPass not enabled. Use mock signup/login.' });
  }

  // TODO: Implement SingPass OAuth flow
  res.status(501).json({ error: 'SingPass integration not yet implemented' });
});

export default router;
