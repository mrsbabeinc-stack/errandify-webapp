import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const router = Router();

// Mock SingPass Login - Simulates real SingPass flow for testing
router.post('/mock-singpass-login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Mock user validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Simulate SingPass returning user data
    const mockUsers: Record<string, any> = {
      'owner@test.com': {
        id: 1,
        nric: '0123456789DEF',
        displayName: 'Rumah Emas Owner',
        email: 'owner@rumahemas.sg',
        phone: '+6565123456',
        role: 'company_owner',
      },
      'asker@test.com': {
        id: 2,
        nric: '1234567890ABC',
        displayName: 'Sarah Tan',
        email: 'abc@gmail.com',
        phone: '+6581234567',
        role: 'asker',
      },
      'doer@test.com': {
        id: 2,
        nric: '0987654321XYZ',
        displayName: 'Sarah Tan',
        email: 'abc@gmail.com',
        phone: '+6587654321',
        role: 'doer',
      },
    };

    const user = mockUsers[email] || mockUsers['asker@test.com'];

    if (!user) {
      // Create new user on first login
      const newUserId = Object.keys(mockUsers).length + 1;
      const newUser = {
        id: newUserId,
        nric: `NRIC${newUserId.toString().padStart(10, '0')}ABC`,
        displayName: email.split('@')[0],
        email,
        phone: '+65' + Math.random().toString().substring(2, 10),
        role: 'asker',
      };

      mockUsers[email] = newUser;

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'New account created via SingPass',
        data: {
          user: newUser,
          token,
        },
      });
    }

    // Existing user login
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful via mock SingPass',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('[Mock Auth] Error:', error);
    res.status(500).json({ error: 'Mock login failed' });
  }
});

// Mock SingPass OAuth callback - Simulates real SingPass OAuth flow
router.get('/mock-singpass-callback', (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    // Simulate SingPass OAuth redirect
    const mockSingPassData = {
      sub: '1234567890ABC', // NRIC
      name: 'John Lee',
      email: 'john@example.com',
      phone_number: '+6581234567',
      birthdate: '1990-01-01',
    };

    // In real flow, frontend would send this to backend callback endpoint
    res.json({
      success: true,
      message: 'Mock SingPass OAuth simulation',
      data: {
        code: code || 'mock_auth_code_12345',
        state: state || 'mock_state_12345',
        userData: mockSingPassData,
        nextStep: 'POST to /api/auth/singpass-callback with code',
      },
    });
  } catch (error) {
    console.error('[Mock SingPass Callback] Error:', error);
    res.status(500).json({ error: 'Mock callback failed' });
  }
});

export default router;
