export const requireAdminRole = (req, res, next) => {
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
export const checkAdminRole = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hasAdminRole = req.user.roles.includes('admin');
    req.user.roles = req.user.roles || [];
    next();
};
