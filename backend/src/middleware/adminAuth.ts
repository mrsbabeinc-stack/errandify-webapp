import { Request, Response, NextFunction } from 'express';

// The Express.Request.user augmentation that used to live here has moved to
// middleware/auth.ts and been corrected to match what authMiddleware actually
// sets ({ id: string }, not { id: number }). The version here declared a shape
// nothing produced and conflicted with AuthRequest, which is what broke tsc for
// every route. These two guards are not imported anywhere — real admin gating
// goes through requireAdmin in auth.ts — but they are left compiling.

export const requireAdminRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Please log in' });
  }

  if (!req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  if (req.user.admin_access_level === 'suspended') {
    return res.status(403).json({ error: 'Admin access suspended' });
  }

  next();
};

export const checkAdminRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user.roles = req.user.roles || [];

  next();
};
