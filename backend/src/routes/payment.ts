import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { stripeService } from '../services/stripe.js';
import { resolvePayoutRecipient, canReleasePayment } from '../utils/payoutRecipient.js';

const router = Router();

// GET /api/payment/methods - Get user's payment methods
router.get('/methods', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const methods = paymentMethods.get(userId) || [];

    res.json({
      success: true,
      data: methods.map(m => ({
        id: m.id,
        type: m.type,
        last4: m.last4,
        brand: m.brand,
        expiryMonth: m.expiryMonth,
        expiryYear: m.expiryYear,
        isDefault: m.default,
      })),
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// POST /api/payment/add-method - Add a payment method (dummy)
router.post('/add-method', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { cardNumber, expiryMonth, expiryYear, cvc } = req.body;

    if (!cardNumber || !expiryMonth || !expiryYear) {
      return res.status(400).json({ error: 'Card details required' });
    }

    const dummyPaymentMethod: DummyPaymentMethod = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'card',
      last4: cardNumber.slice(-4),
      brand: cardNumber.startsWith('4') ? 'visa' : cardNumber.startsWith('5') ? 'mastercard' : 'unknown',
      expiryMonth,
      expiryYear,
      default: true,
    };

    if (!paymentMethods.has(userId)) {
      paymentMethods.set(userId, []);
    }

    const userMethods = paymentMethods.get(userId) || [];
    // Set others to non-default
    userMethods.forEach(m => (m.default = false));
    userMethods.push(dummyPaymentMethod);

    res.status(201).json({
      success: true,
      data: {
        id: dummyPaymentMethod.id,
        type: dummyPaymentMethod.type,
        last4: dummyPaymentMethod.last4,
        brand: dummyPaymentMethod.brand,
        isDefault: dummyPaymentMethod.default,
      },
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

// The dummy /create-intent and /confirm handlers that used to sit here have
// been removed.
//
// They were defined BEFORE the real Stripe implementations further down this
// file, and Express matches the first route it finds — so every payment call
// hit a mock that fabricated ids like `pi_${Date.now()}_${Math.random()}` and
// always reported success. That is why no money was ever collected while the
// UI told people "Payment is held safely".
//
// The real implementations below are now reachable. They have NOT been
// exercised against Stripe from this machine (no outbound access), so treat
// the first live run as untested.

// POST /api/payment/create-intent - Create Stripe payment intent
router.post('/create-intent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { amount, taskId, doerId } = req.body;

    if (!amount || !taskId || !doerId) {
      return res.status(400).json({ error: 'amount, taskId, and doerId required' });
    }

    console.log(`[Payment] Creating payment intent: $${amount} for task ${taskId}`);

    const { clientSecret, intentId } = await stripeService.createPaymentIntent(amount, taskId, doerId);

    res.json({
      success: true,
      data: {
        clientSecret,
        intentId,
        amount,
      },
    });
  } catch (error) {
    console.error('[Payment] Create intent error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/payment/confirm - Confirm Stripe payment
router.post('/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    console.log(`[Payment] Confirming payment: ${intentId}`);

    const result = await stripeService.confirmPayment(intentId);

    // Update database: mark payment as confirmed
    if (result.taskId && result.doerId) {
      try {
        await db.query(
          `UPDATE task_payments SET stripe_intent_id = $1, status = 'completed', confirmed_at = NOW()
           WHERE errand_id = $2`,
          [intentId, result.taskId]
        );
      } catch (dbError) {
        console.warn('[Payment] Failed to update database:', dbError);
        // Don't fail - payment was successful even if DB update fails
      }
    }

    res.json({
      success: true,
      data: {
        intentId,
        amount: result.amount,
        taskId: result.taskId,
      },
    });
  } catch (error) {
    console.error('[Payment] Confirm error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/payment/refund - Refund a payment
router.post('/refund', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId, reason } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    console.log(`[Payment] Refunding payment: ${intentId}`);

    const result = await stripeService.refundPayment(intentId, reason || 'requested_by_customer');

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Payment] Refund error:', error);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
});

// POST /api/payment/payout - Create payout to doer
router.post('/payout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.body;
    const userId = req.userId;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    // Only the asker who posted the errand may release its payment.
    if (!(await canReleasePayment(taskId, userId || 0))) {
      return res.status(403).json({ error: 'Only the neighbour who posted this errand can release its payment' });
    }

    // Recipient AND amount are resolved from the accepted offer. They used to be
    // read from the request body, which let a caller pay any Stripe account any
    // amount. Company offers pay the company, not the staff member.
    const payee = await resolvePayoutRecipient(taskId);
    if (!payee.ok) {
      return res.status(payee.status || 409).json({ error: payee.error, kind: payee.kind });
    }

    const stripeAccountId = payee.stripeAccountId as string;
    const amount = payee.amount as number;

    console.log(
      `[Payment] Releasing $${amount} for errand ${taskId} to ${payee.kind} ${payee.recipientName} (${stripeAccountId})`
    );

    const result = await stripeService.createPayout(stripeAccountId, amount, taskId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Payment] Payout error:', error);
    res.status(500).json({ error: 'Failed to create payout' });
  }
});

// POST /api/payment/save-bank-details - Save user's bank account details
router.post('/save-bank-details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { bankName, accountHolder, accountNumber } = req.body;

    if (!bankName || !accountHolder || !accountNumber) {
      return res.status(400).json({ error: 'bankName, accountHolder, and accountNumber required' });
    }

    // Validate bank account format (basic validation)
    if (accountNumber.length < 8) {
      return res.status(400).json({ error: 'Invalid account number format' });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save or update bank details
    const updateQuery = `
      UPDATE users
      SET
        bank_name = $1,
        account_holder = $2,
        account_number = $3,
        bank_verified = false,
        updated_at = NOW()
      WHERE id = $4
      RETURNING
        id,
        bank_name,
        account_holder,
        account_number,
        bank_verified
    `;

    const result = await db.query(updateQuery, [bankName, accountHolder, accountNumber, userId]);

    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to save bank details' });
    }

    const bankDetails = result.rows[0];

    res.json({
      success: true,
      data: {
        id: bankDetails.id,
        bankName: bankDetails.bank_name,
        accountHolder: bankDetails.account_holder,
        accountNumber: `****${bankDetails.account_number.slice(-4)}`,
        verified: bankDetails.bank_verified,
        message: 'Bank details saved. Verification pending.',
      },
    });
  } catch (error) {
    console.error('[Payment] Save bank details error:', error);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
});

// GET /api/payment/bank-details - Get user's bank account details
router.get('/bank-details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT
        bank_name,
        account_holder,
        account_number,
        bank_verified
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const details = result.rows[0];

    res.json({
      success: true,
      data: {
        bankName: details.bank_name || null,
        accountHolder: details.account_holder || null,
        accountNumber: details.account_number ? `****${details.account_number.slice(-4)}` : null,
        verified: details.bank_verified || false,
      },
    });
  } catch (error) {
    console.error('[Payment] Get bank details error:', error);
    res.status(500).json({ error: 'Failed to fetch bank details' });
  }
});

// POST /api/payment/verify-bank - Verify bank account (2-step verification)
router.post('/verify-bank', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    // In production, this would check with Stripe Connect or your bank API
    // For now, we'll verify with a simple code (in real world: SMS/email code)
    // Stripe Connect handles this automatically
    const isValid = verificationCode === '000000'; // Demo code

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await db.query(
      'UPDATE users SET bank_verified = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        verified: true,
        message: 'Bank account verified successfully! 🎉',
      },
    });
  } catch (error) {
    console.error('[Payment] Verify bank error:', error);
    res.status(500).json({ error: 'Failed to verify bank account' });
  }
});

// POST /api/payment/link-bank - Get Stripe onboarding link for bank setup
router.post('/link-bank', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'returnUrl required' });
    }

    // Get user info
    const userResult = await db.query(
      `SELECT id, stripe_account_id, email, display_name FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    let stripeAccountId = user.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!stripeAccountId) {
      console.log(`[Payment] Creating Stripe Connect account for user ${userId}`);
      const account = await stripeService.createConnectedAccount(userId, user.email, user.display_name);
      stripeAccountId = account.stripeAccountId;

      // Save stripe account ID
      await db.query(
        'UPDATE users SET stripe_account_id = $1 WHERE id = $2',
        [stripeAccountId, userId]
      );
    }

    // Create account link for onboarding
    console.log(`[Payment] Creating account link for user ${userId}`);
    const { url, expiresAt } = await stripeService.createAccountLink(stripeAccountId, returnUrl);

    res.json({
      success: true,
      data: {
        stripeAccountId,
        onboardingUrl: url,
        expiresAt,
        message: '🎉 Click the link to complete bank setup on Stripe. Takes 2-3 minutes!',
      },
    });
  } catch (error: any) {
    console.error('[Payment] Link bank error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create onboarding link',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/payment/stripe-account - Get user's Stripe Connect account status
router.get('/stripe-account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT stripe_account_id, bank_verified
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        stripeAccountId: user.stripe_account_id || null,
        bankVerified: user.bank_verified || false,
        ready: !!user.stripe_account_id && user.bank_verified,
      },
    });
  } catch (error) {
    console.error('[Payment] Get Stripe account error:', error);
    res.status(500).json({ error: 'Failed to get account status' });
  }
});

// POST /api/payment/create-intent - Create Stripe payment intent
router.post('/create-intent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { amount, taskId, doerId } = req.body;

    if (!amount || !taskId || !doerId) {
      return res.status(400).json({ error: 'amount, taskId, and doerId required' });
    }

    console.log(`[Payment] Creating payment intent: $${amount} for task ${taskId}`);

    const { clientSecret, intentId } = await stripeService.createPaymentIntent(amount, taskId, doerId);

    res.json({
      success: true,
      data: {
        clientSecret,
        intentId,
        amount,
      },
    });
  } catch (error) {
    console.error('[Payment] Create intent error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/payment/confirm - Confirm Stripe payment
router.post('/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    console.log(`[Payment] Confirming payment: ${intentId}`);

    const result = await stripeService.confirmPayment(intentId);

    // Update database: mark payment as confirmed
    if (result.taskId && result.doerId) {
      try {
        await db.query(
          `UPDATE task_payments SET stripe_intent_id = $1, status = 'completed', confirmed_at = NOW()
           WHERE errand_id = $2`,
          [intentId, result.taskId]
        );
      } catch (dbError) {
        console.warn('[Payment] Failed to update database:', dbError);
        // Don't fail - payment was successful even if DB update fails
      }
    }

    res.json({
      success: true,
      data: {
        intentId,
        amount: result.amount,
        taskId: result.taskId,
      },
    });
  } catch (error) {
    console.error('[Payment] Confirm error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/payment/refund - Refund a payment
router.post('/refund', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId, reason } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    console.log(`[Payment] Refunding payment: ${intentId}`);

    const result = await stripeService.refundPayment(intentId, reason || 'requested_by_customer');

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Payment] Refund error:', error);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
});

// POST /api/payment/payout - Create payout to doer
router.post('/payout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { stripeAccountId, amount, taskId } = req.body;

    if (!stripeAccountId || !amount || !taskId) {
      return res.status(400).json({ error: 'stripeAccountId, amount, and taskId required' });
    }

    console.log(`[Payment] Creating payout: $${amount} to account ${stripeAccountId}`);

    const result = await stripeService.createPayout(stripeAccountId, amount, taskId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Payment] Payout error:', error);
    res.status(500).json({ error: 'Failed to create payout' });
  }
});

// POST /api/payment/save-bank-details - Save user's bank account details
router.post('/save-bank-details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { bankName, accountHolder, accountNumber } = req.body;

    if (!bankName || !accountHolder || !accountNumber) {
      return res.status(400).json({ error: 'bankName, accountHolder, and accountNumber required' });
    }

    // Validate bank account format (basic validation)
    if (accountNumber.length < 8) {
      return res.status(400).json({ error: 'Invalid account number format' });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save or update bank details
    const updateQuery = `
      UPDATE users
      SET
        bank_name = $1,
        account_holder = $2,
        account_number = $3,
        bank_verified = false,
        updated_at = NOW()
      WHERE id = $4
      RETURNING
        id,
        bank_name,
        account_holder,
        account_number,
        bank_verified
    `;

    const result = await db.query(updateQuery, [bankName, accountHolder, accountNumber, userId]);

    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to save bank details' });
    }

    const bankDetails = result.rows[0];

    res.json({
      success: true,
      data: {
        id: bankDetails.id,
        bankName: bankDetails.bank_name,
        accountHolder: bankDetails.account_holder,
        accountNumber: `****${bankDetails.account_number.slice(-4)}`,
        verified: bankDetails.bank_verified,
        message: 'Bank details saved. Verification pending.',
      },
    });
  } catch (error) {
    console.error('[Payment] Save bank details error:', error);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
});

// GET /api/payment/bank-details - Get user's bank account details
router.get('/bank-details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT
        bank_name,
        account_holder,
        account_number,
        bank_verified
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const details = result.rows[0];

    res.json({
      success: true,
      data: {
        bankName: details.bank_name || null,
        accountHolder: details.account_holder || null,
        accountNumber: details.account_number ? `****${details.account_number.slice(-4)}` : null,
        verified: details.bank_verified || false,
      },
    });
  } catch (error) {
    console.error('[Payment] Get bank details error:', error);
    res.status(500).json({ error: 'Failed to fetch bank details' });
  }
});

// POST /api/payment/verify-bank - Verify bank account (2-step verification)
router.post('/verify-bank', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    // In production, this would check with Stripe Connect or your bank API
    // For now, we'll verify with a simple code (in real world: SMS/email code)
    // Stripe Connect handles this automatically
    const isValid = verificationCode === '000000'; // Demo code

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await db.query(
      'UPDATE users SET bank_verified = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        verified: true,
        message: 'Bank account verified successfully! 🎉',
      },
    });
  } catch (error) {
    console.error('[Payment] Verify bank error:', error);
    res.status(500).json({ error: 'Failed to verify bank account' });
  }
});

// POST /api/payment/link-bank - Get Stripe onboarding link for bank setup
router.post('/link-bank', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'returnUrl required' });
    }

    // Get user info
    const userResult = await db.query(
      `SELECT id, stripe_account_id, email, display_name FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    let stripeAccountId = user.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!stripeAccountId) {
      console.log(`[Payment] Creating Stripe Connect account for user ${userId}`);
      const account = await stripeService.createConnectedAccount(userId, user.email, user.display_name);
      stripeAccountId = account.stripeAccountId;

      // Save stripe account ID
      await db.query(
        'UPDATE users SET stripe_account_id = $1 WHERE id = $2',
        [stripeAccountId, userId]
      );
    }

    // Create account link for onboarding
    console.log(`[Payment] Creating account link for user ${userId}`);
    const { url, expiresAt } = await stripeService.createAccountLink(stripeAccountId, returnUrl);

    res.json({
      success: true,
      data: {
        stripeAccountId,
        onboardingUrl: url,
        expiresAt,
        message: '🎉 Click the link to complete bank setup on Stripe. Takes 2-3 minutes!',
      },
    });
  } catch (error: any) {
    console.error('[Payment] Link bank error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create onboarding link',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/payment/stripe-account - Get user's Stripe Connect account status
router.get('/stripe-account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT stripe_account_id, bank_verified
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        stripeAccountId: user.stripe_account_id || null,
        bankVerified: user.bank_verified || false,
        ready: !!user.stripe_account_id && user.bank_verified,
      },
    });
  } catch (error) {
    console.error('[Payment] Get Stripe account error:', error);
    res.status(500).json({ error: 'Failed to get account status' });
  }
});

export default router;
