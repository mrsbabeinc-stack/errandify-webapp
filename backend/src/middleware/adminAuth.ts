import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        roles: string[];
        current_role: string;
        admin_access_level?: string;
      };
    }
  }
}

export const requireAdminRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Please log in' });
  }

  if (!req.user.roles.includes('admin')) {
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

  const hasAdminRole = req.user.roles.includes('admin');
  req.user.roles = req.user.roles || [];

  next();
};
