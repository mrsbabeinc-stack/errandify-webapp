import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const router = Router();

// Mock login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role required' });
    }

    // TODO: Add database lookup and proper authentication
    const userId = `user_${Date.now()}`;
    const token = jwt.sign(
      { userId, email, role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        accessToken: token,
        user: { id: userId, email, role },
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// SingPass login endpoint (when USE_SINGPASS is true)
router.post('/singpass/login', (req: Request, res: Response) => {
  if (!config.singpass.useSingpass) {
    return res.status(400).json({ error: 'SingPass not enabled' });
  }

  // TODO: Implement SingPass OAuth flow
  res.status(501).json({ error: 'SingPass integration not yet implemented' });
});

export default router;
