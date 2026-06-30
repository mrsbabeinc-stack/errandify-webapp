import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import db from '../db.js';

// Routes that don't require safety declaration
const PUBLIC_ROUTES = [
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/singpass-callback',
  '/api/safety/declare',
  '/api/safety/status',
  '/api/users/me',
  '/api/health',
];

// Routes that require safety declaration to be completed
const PROTECTED_ROUTES_PATTERNS = [
  /^\/api\/errands\/.*/,
  /^\/api\/bids\/.*/,
  /^\/api\/chat\/.*/,
  /^\/api\/messages\/.*/,
  /^\/api\/ratings\/.*/,
  /^\/api\/dashboard\/.*/,
  /^\/api\/browse\/.*/,
];

export async function getSafetyDeclaration(userId: number) {
  try {
    const result = await db.query(
      `SELECT
        declares_no_convictions,
        accepts_vulnerable_care_standards,
        understands_emergency_protocols,
        respects_privacy,
        understands_honesty_consequences,
        fully_accepted,
        accepted_at
       FROM safety_declarations
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[Safety] Error fetching declaration:', error);
    return null;
  }
}

export async function checkVulnerableAccess(userId: number): Promise<boolean> {
  try {
    const result = await db.query(
      'SELECT can_access_vulnerable_categories FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.can_access_vulnerable_categories || false;
  } catch (error) {
    console.error('[Safety] Error checking vulnerable access:', error);
    return false;
  }
}

export async function enforceSafetyDeclaration(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Skip for public routes
    if (PUBLIC_ROUTES.includes(req.path)) {
      return next();
    }

    // Skip for non-authenticated requests
    if (!req.userId) {
      return next();
    }

    const userId = parseInt(req.userId, 10);

    // Check if this is a protected route
    const isProtectedRoute = PROTECTED_ROUTES_PATTERNS.some(pattern =>
      pattern.test(req.path)
    );

    if (!isProtectedRoute) {
      return next();
    }

    // Get safety declaration
    const declaration = await getSafetyDeclaration(userId);

    // If no declaration exists or not fully accepted, block access
    if (!declaration || !declaration.fully_accepted) {
      console.log(`[Safety] User ${userId} attempted access without completing declaration`);
      return res.status(403).json({
        error: 'Safety declaration required',
        code: 'SAFETY_DECLARATION_REQUIRED',
        redirect: '/before-you-get-started',
      });
    }

    // Proceed to next middleware
    next();
  } catch (error) {
    console.error('[Safety] Middleware error:', error);
    return res.status(500).json({ error: 'Safety check failed' });
  }
}

// Check if category requires special access
export function isVulnerableCategory(category: string): boolean {
  const vulnerableCategories = [
    'eldercare-healthcare',
    'childcare-education',
    'personal-care',
    'mental-health',
    'disability-support',
    'domestic-care',
  ];

  return vulnerableCategories.includes(category.toLowerCase());
}

// Enforce vulnerable category access
export async function enforceVulnerableAccess(
  userId: number,
  category: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!isVulnerableCategory(category)) {
    return { allowed: true };
  }

  const hasAccess = await checkVulnerableAccess(userId);

  if (!hasAccess) {
    return {
      allowed: false,
      reason: 'You do not have access to vulnerable care categories. Special authorization required.',
    };
  }

  return { allowed: true };
}
