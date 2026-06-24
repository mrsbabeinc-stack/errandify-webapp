import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

// Store mock payment intents in memory
const mockPaymentIntents: Record<string, any> = {};

// Mock Stripe: Create Payment Intent
router.post('/mock-create-intent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, taskId, doerId } = req.body;

    if (!amount || !taskId || !doerId) {
      return res.status(400).json({ error: 'amount, taskId, and doerId required' });
    }

    // Generate mock Stripe intent ID
    const intentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientSecret = `${intentId}_secret_${Math.random().toString(36).substr(2, 20)}`;

    // Store intent in memory
    mockPaymentIntents[intentId] = {
      id: intentId,
      clientSecret,
      amount: Math.round(amount * 100), // In cents
      currency: 'sgd',
      status: 'requires_payment_method',
      taskId,
      doerId,
      createdAt: new Date(),
      metadata: { taskId, doerId },
    };

    console.log(`[Mock Stripe] Created payment intent: ${intentId} for $${amount}`);

    res.json({
      success: true,
      message: 'Mock payment intent created',
      data: {
        clientSecret,
        intentId,
        amount,
        currency: 'sgd',
        testCards: {
          success: '4242 4242 4242 4242',
          decline: '4000 0000 0000 0002',
          cvc: 'any 3 digits',
          expiry: 'any future date',
        },
      },
    });
  } catch (error) {
    console.error('[Mock Stripe Create] Error:', error);
    res.status(500).json({ error: 'Mock payment intent creation failed' });
  }
});

// Mock Stripe: Confirm Payment
router.post('/mock-confirm-payment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId, cardToken } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    // Get mock intent
    const intent = mockPaymentIntents[intentId];

    if (!intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    // Simulate payment processing
    console.log(`[Mock Stripe] Processing payment: ${intentId}`);

    // Update intent status
    intent.status = 'succeeded';
    intent.chargeId = `ch_mock_${Date.now()}`;
    intent.confirmedAt = new Date();
    intent.cardLast4 = cardToken ? '4242' : '0002';

    console.log(`[Mock Stripe] Payment succeeded: ${intentId}`);

    res.json({
      success: true,
      message: 'Mock payment confirmed successfully',
      data: {
        intentId,
        status: 'succeeded',
        amount: intent.amount / 100,
        currency: 'sgd',
        chargeId: intent.chargeId,
        taskId: intent.taskId,
        doerId: intent.doerId,
        timestamp: intent.confirmedAt,
      },
    });
  } catch (error) {
    console.error('[Mock Stripe Confirm] Error:', error);
    res.status(500).json({ error: 'Mock payment confirmation failed' });
  }
});

// Mock Stripe: Process Refund
router.post('/mock-refund', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId, reason } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    const intent = mockPaymentIntents[intentId];

    if (!intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    // Generate mock refund ID
    const refundId = `re_mock_${Date.now()}`;

    // Update intent
    intent.status = 'refunded';
    intent.refundId = refundId;
    intent.refundedAt = new Date();
    intent.refundReason = reason || 'unknown';

    console.log(`[Mock Stripe] Refund processed: ${refundId} for intent ${intentId}`);

    res.json({
      success: true,
      message: 'Mock refund processed',
      data: {
        refundId,
        intentId,
        amount: intent.amount / 100,
        status: 'succeeded',
        reason: reason || 'unknown',
        timestamp: intent.refundedAt,
      },
    });
  } catch (error) {
    console.error('[Mock Stripe Refund] Error:', error);
    res.status(500).json({ error: 'Mock refund failed' });
  }
});

// Mock Stripe: Create Connected Account (for doer payouts)
router.post('/mock-create-account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doerId, email, name } = req.body;

    if (!doerId || !email) {
      return res.status(400).json({ error: 'doerId and email required' });
    }

    // Generate mock Stripe connected account ID
    const accountId = `acct_mock_${doerId}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[Mock Stripe] Created connected account: ${accountId} for doer ${doerId}`);

    res.json({
      success: true,
      message: 'Mock Stripe connected account created',
      data: {
        stripeAccountId: accountId,
        doerId,
        email,
        name,
        type: 'express',
        country: 'SG',
        status: 'active',
        testBankAccount: {
          accountNumber: '000123456789',
          routingNumber: '110000000',
          accountHolderName: name,
          country: 'SG',
        },
      },
    });
  } catch (error) {
    console.error('[Mock Stripe Account] Error:', error);
    res.status(500).json({ error: 'Mock account creation failed' });
  }
});

// Mock Stripe: Create Payout
router.post('/mock-payout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { stripeAccountId, amount, taskId } = req.body;

    if (!stripeAccountId || !amount || !taskId) {
      return res.status(400).json({ error: 'stripeAccountId, amount, and taskId required' });
    }

    // Generate mock payout ID
    const payoutId = `po_mock_${Date.now()}`;

    console.log(`[Mock Stripe] Created payout: ${payoutId} for account ${stripeAccountId}, amount: $${amount}`);

    res.json({
      success: true,
      message: 'Mock payout created',
      data: {
        payoutId,
        stripeAccountId,
        amount,
        currency: 'sgd',
        status: 'in_transit',
        taskId,
        estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        timeline: {
          created: new Date(),
          processing: 'Now',
          arrival: 'In 2 business days',
        },
      },
    });
  } catch (error) {
    console.error('[Mock Stripe Payout] Error:', error);
    res.status(500).json({ error: 'Mock payout creation failed' });
  }
});

// Get Mock Payment Intent Status
router.get('/mock-intent/:intentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { intentId } = req.params;

    const intent = mockPaymentIntents[intentId];

    if (!intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    res.json({
      success: true,
      data: intent,
    });
  } catch (error) {
    console.error('[Mock Get Intent] Error:', error);
    res.status(500).json({ error: 'Failed to get payment intent' });
  }
});

export default router;
