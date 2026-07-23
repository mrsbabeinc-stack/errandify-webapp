import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import db from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { generateFormattedUserId } from '../utils/idFormatter.js';
import * as singpass from '../services/singpass.js';
import { sendCriticalEmail } from '../services/emailNotifications.js';
import { awardReferralPoints, JOIN_BONUS_EP } from '../services/referralService.js';

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

// Helper: Generate User ID (SG-[4-RANDOM]-[LAST-4-OF-NRIC])
function generateUserId(nric: string): string {
  // Get last 4 characters of NRIC
  const last4 = nric.slice(-4).toUpperCase();
  // Generate 4 random alphanumeric characters
  const random4 = crypto.randomBytes(4).toString('hex').substring(0, 4).toUpperCase();
  return `SG-${random4}-${last4}`;
}

// Helper: Generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/auth/singpass-authorize - Redirect to SingPass login
router.get('/singpass-authorize', async (req: Request, res: Response) => {
  try {
    // state and nonce must survive until the callback, so they go in an
    // httpOnly cookie rather than back to the browser as JSON — the whole point
    // of state is that an attacker cannot supply it.
    const { state, nonce } = singpass.makeStateAndNonce();
    const authorizationUrl = await singpass.buildAuthorizeUrl({ state, nonce });

    res.cookie('sp_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000 });
    res.cookie('sp_nonce', nonce, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000 });

    res.json({ success: true, redirectUrl: authorizationUrl });
  } catch (error) {
    console.error('[Auth] SingPass authorization error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// POST /api/auth/singpass-callback - Handle SingPass OAuth callback
router.post('/singpass-callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    console.log('[Auth] Processing SingPass callback...');

    let singpassData;

    // Check if this is a mock code from the simulator (for testing)
    if (code.includes('singpass_auth_code')) {
      // For simulator: return mock data based on code
      // In real app, this would validate the code and exchange it for user data
      console.log('[Auth] Mock SingPass code detected - using simulator data');

      singpassData = {
        sub: 'S1234567A', // NRIC
        nric: 'S1234567A',
        name: 'John Lee',
        email: 'john.lee@example.com',
        phone_number: '+6581234567',
        birthdate: '1990-01-15',
        address: '123 Clementi Ave 3, Singapore 129957',
        nationality: 'Singapore',
        gender: 'M', // M for Male, F for Female
      };
    } else {
      // Real Singpass. state proves the callback belongs to a flow we started;
      // nonce proves the id_token is not a replay.
      const cookieState = (req as any).cookies?.sp_state;
      const cookieNonce = (req as any).cookies?.sp_nonce;
      if (!cookieState || cookieState !== req.body.state) {
        return res.status(400).json({ error: 'That sign-in link has expired. Please try again.' });
      }
      const identity = await singpass.exchangeCode(code, cookieNonce);

      res.clearCookie('sp_state');
      res.clearCookie('sp_nonce');

      // Singpass Login returns identity only. Name, email and mobile come from
      // the person filling in their profile, not from this token.
      singpassData = {
        nric: identity.uinfin,
        nricHash: singpass.hashUinfin(identity.uinfin),
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
      } as any;
    }

    console.log('[Auth] SingPass data received:', {
      nric: singpassData.nric ? singpassData.nric.substring(0, 5) + '...' : 'N/A',
      name: singpassData.name,
      email: singpassData.email,
    });

    // Return data to frontend for signup/login
    res.json({
      success: true,
      data: singpassData,
    });
  } catch (error) {
    console.error('[Auth] SingPass callback error:', error);
    res.status(500).json({
      error: 'SingPass verification failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Signup: New SingPass-verified flow with criminal screening
router.post('/signup', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const { nric, displayName, email, phone, role, singpassVerified, singpassId, gender, ref } = req.body;

    // Validate required fields
    if (!nric || !displayName || !email || !phone) {
      return res.status(400).json({
        error: 'nric, displayName, email, and phone required',
      });
    }

    // Check if user already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE nric_hash = $1',
      [hashNric(nric)]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this NRIC' });
    }

    await client.query('BEGIN');

    // Insert new user with SingPass verification
    const referralCode = generateReferralCode();
    const userId = generateUserId(nric);
    const referredBy = ref || null; // Track who referred this user

    // Insert temporarily to get the database-assigned ID, then update with formatted ID
    const tempResult = await client.query(
      `INSERT INTO users (
        user_id, nric_hash, display_name, email, mobile, singpass_id, gender,
        font_size_pref, language_pref, role, kyc_status, referral_code, referred_by,
        screening_completed, screening_completed_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING id, user_id, display_name, email, mobile, role, criminal_conviction`,
      [
        userId,
        hashNric(nric),
        displayName,
        email,
        phone,
        singpassId,
        gender || null,
        16, // Default font size
        'en', // Default language
        role || 'asker',
        singpassVerified ? 'verified' : 'pending',
        referralCode,
        referredBy,
        true, // screening_completed
      ]
    );

    const newUserId = tempResult.rows[0].id;
    const formattedUserId = generateFormattedUserId(singpassId || nric);

    // Update with formatted user ID
    const result = await client.query(
      `UPDATE users SET formatted_user_id = $1 WHERE id = $2
       RETURNING id, user_id, display_name, email, mobile, role, criminal_conviction, formatted_user_id`,
      [formattedUserId, newUserId]
    );

    const user = result.rows[0];

    // AUTO-TRACK REFERRAL: If user signed up via referral code
    if (ref) {
      try {
        // Find referrer by referral code
        const referrerResult = await client.query(
          'SELECT id FROM users WHERE referral_code = $1',
          [ref]
        );

        if (referrerResult.rows.length > 0) {
          const referrerId = referrerResult.rows[0].id;

          // Insert referral tracking
          await client.query(
            `INSERT INTO referral_tracking
             (referrer_id, referred_user_id, referral_code, status)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING`,
            [referrerId, newUserId, ref, 'joined']
          );

          // One payer for both bonuses. This block used to repeat all three
          // writes — referral_rewards, errandify_points, ep_transactions —
          // that referralService.awardReferralPoints already does, and the two
          // copies had already drifted apart in the transaction reason.
          const joinBonus = JOIN_BONUS_EP;
          await awardReferralPoints(
            client, referrerId, joinBonus, 'join', `${displayName} signed up`
          );

          console.log(`[Referral] User ${newUserId} signed up via code ${ref}. Referrer ${referrerId} awarded ${joinBonus} EP`);

          // Send referral join email to referrer
          sendCriticalEmail(referrerId, 'referral_join', {
            newUserName: displayName,
            pointsAwarded: joinBonus
          }).catch(err => {
            console.error('[Email] Failed to send referral_join email:', err);
            // Don't fail the signup if email fails
          });

          // ...and in-app, matching the first-errand bonus. Email alone meant
          // the join bonus was invisible to anyone who does not read email.
          import('../utils/notificationHelper.js')
            .then(({ sendNotification }) => sendNotification({
              userId: referrerId,
              type: 'referral_bonus',
              title: `+${joinBonus} EP — someone joined on your invite`,
              message: `${displayName} signed up using your referral code. That's ${joinBonus} Errandify Points for you.`,
            }))
            .catch(err => console.error('[Referral] Join notification failed:', err));
        }
      } catch (refError) {
        // Don't fail signup if referral tracking fails - log and continue
        console.error('Referral tracking error during signup:', refError);
      }
    }

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Log signup with SingPass
    console.log(`[Auth] New user signup via SingPass: ${user.id} (${user.display_name})`);

    res.status(201).json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user.id,
          userId: user.user_id,
          formattedUserId: user.formatted_user_id,
          displayName: user.display_name,
          email: user.email,
          phone: user.mobile,
          role: user.role,
          hasConviction: user.criminal_conviction,
        },
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  } finally {
    client.release();
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
      'SELECT id, display_name, mobile, role, formatted_user_id FROM users WHERE mobile = $1',
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
          formattedUserId: user.formatted_user_id,
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
// SingPass is compulsory — every real account is created from a verified
// SingPass identity with an nric_hash. This route fabricates a singpass_id for
// local testing, so it must never exist in production or it becomes a way to
// get an account without verifying anything.
router.post('/demo-login', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { account } = req.body;
    console.log('[Auth] Demo login attempt:', account);

    if (!account) {
      console.log('[Auth] No account provided');
      return res.status(400).json({ error: 'Account required' });
    }

    // Demo account mapping with gender, bio, and certificates
    const demoAccounts: Record<string, { mobile: string; email: string; name: string; nric: string; defaultRole: string; gender?: string; bio?: string; certificates?: Array<{ title: string }> }> = {
      sarah: {
        mobile: '98765432',
        email: 'sarah.tan@example.com',
        name: 'Sarah Tan',
        nric: 'S1234567A',
        defaultRole: 'doer',
        gender: 'F',
        bio: 'Experienced cleaner with 5 years of professional experience. Reliable, trustworthy, and detail-oriented!',
        certificates: [
          { title: 'Childcare Certificate 1' }
        ]
      },
      john: {
        mobile: '87654321',
        email: 'john.lee@example.com',
        name: 'John Lee',
        nric: 'S7654321B',
        defaultRole: 'doer',
        gender: 'M',
        bio: 'Handyman specialist - plumbing, electrical, and general repairs. Fast turnaround, quality work!',
        certificates: [
          { title: 'Licensed Plumber - BCA Singapore' }
        ]
      },
      admin: {
        mobile: '+6581234567',
        email: 'admin@errandify.test',
        name: 'Admin User',
        nric: 'admin_test_hash_9999999999999999999999999999999999999999',
        defaultRole: 'admin',
        gender: 'M',
        bio: 'System Administrator'
      },
      'support_l2': {
        mobile: '+6582234567',
        email: 'support-l2@errandify.test',
        name: 'Support L2 Agent',
        nric: 'support_l2_test_hash_88888888888888888888888888888888888888',
        defaultRole: 'support_l2',
        gender: 'F',
        bio: 'L2 Support Agent - Dispute Resolution'
      },
      'support_l3': {
        mobile: '+6583234567',
        email: 'support-l3@errandify.test',
        name: 'Support L3 Senior',
        nric: 'support_l3_test_hash_77777777777777777777777777777777777777',
        defaultRole: 'support_l3',
        gender: 'M',
        bio: 'L3 Senior Staff - Final Appeals'
      },
      alice: {
        mobile: '91234567',
        email: 'alice.ng@example.com',
        name: 'Alice Ng',
        nric: 'S2345678C',
        defaultRole: 'asker',
        gender: 'F',
        bio: 'Busy professional looking for help with daily tasks'
      },
      bob: {
        mobile: '92345678',
        email: 'bob.wong@example.com',
        name: 'Bob Wong',
        nric: 'S3456789D',
        defaultRole: 'asker',
        gender: 'M',
        bio: 'Need help with household chores and errands'
      },
      demo_owner: {
        mobile: '+6590000001',
        email: 'demo.owner@errandify.ai',
        name: 'Demo Owner',
        nric: 'hash_demo_owner',
        defaultRole: 'asker',
        gender: 'M',
        bio: 'Demo Company Owner - Can manage staff and post tasks'
      },
      demo_manager: {
        mobile: '+6590000002',
        email: 'demo.manager@errandify.ai',
        name: 'Demo Manager',
        nric: 'hash_+6590000002',
        defaultRole: 'asker',
        gender: 'M',
        bio: 'Demo Company Manager - Can allocate tasks and approve reviews'
      },
      demo_staff1: {
        mobile: '+6590000003',
        email: 'demo.staff1@errandify.ai',
        name: 'Demo Staff 1',
        nric: 'hash_+6590000003',
        defaultRole: 'doer',
        gender: 'M',
        bio: 'Demo Company Staff - Executes assigned tasks'
      },
      demo_staff2: {
        mobile: '+6590000004',
        email: 'demo.staff2@errandify.ai',
        name: 'Demo Staff 2',
        nric: 'hash_+6590000004',
        defaultRole: 'doer',
        gender: 'F',
        bio: 'Demo Company Staff - Executes assigned tasks'
      }
    };

    const demoUser = demoAccounts[account.toLowerCase()];
    if (!demoUser) {
      console.log('[Auth] Invalid demo account:', account);
      return res.status(400).json({ error: 'Invalid demo account' });
    }
    console.log('[Auth] Demo user found:', demoUser.name);

    // Check if user exists, if not create them
    let result = await db.query(
      'SELECT id, display_name, mobile, role, chas_card_color, formatted_user_id FROM users WHERE mobile = $1',
      [demoUser.mobile]
    );

    let user;
    if (result.rows.length === 0) {
      // Create demo user with CHAS data
      const referralCode = generateReferralCode();
      const singpassId = 'S' + Math.random().toString().substring(2, 9) + Math.random().toString(36).substring(2, 3).toUpperCase();
      const formattedUserId = generateFormattedUserId(singpassId);

      const createResult = await db.query(
        `INSERT INTO users (
          nric_hash, display_name, email, mobile, address, singpass_id, formatted_user_id, gender, bio, certificates,
          font_size_pref, language_pref, role, kyc_status, referral_code,
          chas_card_color
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, display_name, email, mobile, role, chas_card_color, formatted_user_id, gender, bio, certificates`,
        [
          hashNric(demoUser.nric),
          demoUser.name,
          demoUser.email,
          demoUser.mobile,
          '123 Demo Street, Singapore 123456',
          singpassId,
          formattedUserId,
          demoUser.gender || 'M',
          demoUser.bio || '',
          JSON.stringify(demoUser.certificates || []),
          16,
          'en',
          demoUser.defaultRole,
          'verified',
          referralCode,
          'none',
        ]
      );
      user = createResult.rows[0];
    } else {
      // User exists - update display name AND role to ensure correct demo user
      const updateResult = await db.query(
        'UPDATE users SET display_name = $1, role = $2 WHERE mobile = $3 RETURNING id, display_name, mobile, role, chas_card_color, formatted_user_id',
        [demoUser.name, demoUser.defaultRole, demoUser.mobile]
      );
      user = updateResult.rows[0];
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
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          formattedUserId: user.formatted_user_id,
          chasCardColor: user.chas_card_color,
        },
      },
    });
  } catch (error) {
    console.error('[Auth] Demo login error:', error);
    res.status(500).json({ error: String(error) });
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

// Switch user role (admin toggle)
router.post('/switch-role', async (req: Request, res: Response) => {
  try {
    // Get user ID from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, config.jwtSecret);
    const userId = decoded.userId;

    const { role } = req.body;
    const validRoles = ['asker', 'doer', 'admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Get user and check if they have this role
    const userResult = await db.query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // For now, allow admin role for demo accounts
    if (role === 'admin' && user.role !== 'admin' && user.role !== 'support_l2' && user.role !== 'support_l3') {
      return res.status(403).json({ error: `You don't have the ${role} role` });
    }

    // Determine redirect URL based on role
    const redirectUrl = role === 'admin' ? '/admin/dashboard' :
                        role === 'doer' ? '/mydoer' :
                        '/myerrand';

    res.json({
      success: true,
      current_role: role,
      redirect_url: redirectUrl,
      message: `Switched to ${role} mode`
    });
  } catch (error) {
    console.error('Role switch error:', error);
    res.status(500).json({ error: 'Failed to switch role' });
  }
});

export default router;
