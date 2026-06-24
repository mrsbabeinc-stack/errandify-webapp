import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { stripeService } from '../services/stripe.js';

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

// POST /api/payment/create-intent - Create Stripe PaymentIntent (dummy)
router.post('/create-intent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, bidId } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!amount || !bidId) {
      return res.status(400).json({ error: 'amount and bidId required' });
    }

    // Auto-create dummy payment method if none exists
    let userMethods = paymentMethods.get(userId) || [];
    if (userMethods.length === 0) {
      const dummyPaymentMethod: DummyPaymentMethod = {
        id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        default: true,
      };
      userMethods = [dummyPaymentMethod];
      paymentMethods.set(userId, userMethods);
    }

    const dummyIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'sgd',
      status: 'requires_confirmation',
      client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
      capture_method: 'manual',
    };

    res.json({
      success: true,
      data: dummyIntent,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// POST /api/payment/confirm - Confirm payment and capture (dummy)
router.post('/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId, paymentMethodId } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    // Dummy confirmation - always succeeds
    res.json({
      success: true,
      data: {
        intentId,
        status: 'succeeded',
        message: 'Payment confirmed and amount held in escrow',
      },
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
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

export default router;
