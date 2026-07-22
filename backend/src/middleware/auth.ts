import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import db from '../db.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: Record<string, any> & {
    id: string;
    email: string;
  };
}

// Update user's last active timestamp (fire and forget, don't block)
export const updateUserActivity = async (userId: string) => {
  try {
    await db.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [userId]);
  } catch (error) {
    console.warn('[Auth] Failed to update user activity:', error);
  }
};

// Check if user is online (active in last 5 minutes)
export const isUserOnline = (lastActiveAt: Date | string): boolean => {
  const lastActive = new Date(lastActiveAt);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return lastActive > fiveMinutesAgo;
};

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Support demo tokens for testing (demo-token-1, demo-token-2, etc.)
    if (token.startsWith('demo-token-')) {
      const userId = token.replace('demo-token-', '');
      req.userId = userId;
      req.user = { id: userId, email: `user${userId}@demo.com` };
      updateUserActivity(userId);
      next();
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };

    // Enforce bans/suspensions. Without this a banned user keeps working with
    // their existing token until it expires, which makes the ban meaningless.
    try {
      const s = await db.query('SELECT status FROM users WHERE id = $1', [decoded.userId]);
      const status = s.rows[0]?.status;
      if (status === 'banned' || status === 'suspended') {
        console.warn('[Auth] Blocked request from', status, 'user', decoded.userId);
        return res.status(403).json({
          error: status === 'banned'
            ? 'Your account has been banned. Contact support if you believe this is a mistake.'
            : 'Your account is suspended. Contact support for help.',
          accountStatus: status,
        });
      }
    } catch (dbErr) {
      // Fail open on a DB hiccup — don't lock everyone out of the app
      console.error('[Auth] Status check failed, allowing request:', dbErr instanceof Error ? dbErr.message : dbErr);
    }

    req.userId = decoded.userId;
    req.user = { id: decoded.userId, email: decoded.email };

    // Update activity (async, don't wait)
    updateUserActivity(decoded.userId);

    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * DB-backed admin/staff guard. Must run AFTER authMiddleware (uses req.userId).
 * The JWT does not carry the role, so we look it up. Blocks privilege-escalation
 * on admin/back-office endpoints.
 *
 * @param allowed roles permitted (default: admin + L2/L3 support staff)
 */
export const requireAdmin = (
  allowed: string[] = ['admin', 'super-admin', 'support_l2', 'support_l3']
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized: Please log in' });
      }
      const result = await db.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      const role = result.rows[0]?.role;
      if (!role || !allowed.includes(role)) {
        console.warn('[Auth] Admin action denied for user', req.userId, 'role:', role);
        return res.status(403).json({ error: 'Access denied: staff/admin only' });
      }
      next();
    } catch (err) {
      console.error('[Auth] requireAdmin check failed:', err instanceof Error ? err.message : err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};
