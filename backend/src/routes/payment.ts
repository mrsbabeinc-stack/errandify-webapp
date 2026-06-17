import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Dummy Stripe payment method store (in production, this would be in Stripe)
interface DummyPaymentMethod {
  id: string;
  userId: number;
  type: 'card';
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  default: boolean;
}

const paymentMethods: Map<number, DummyPaymentMethod[]> = new Map();

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

    // Check if user has a payment method
    const userMethods = paymentMethods.get(userId) || [];
    if (userMethods.length === 0) {
      return res.status(400).json({ error: 'No payment method on file' });
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

export default router;
