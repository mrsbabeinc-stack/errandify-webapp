import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import db from '../db.js';
// Update user's last active timestamp (fire and forget, don't block)
export const updateUserActivity = async (userId) => {
    try {
        await db.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [userId]);
    }
    catch (error) {
        console.warn('[Auth] Failed to update user activity:', error);
    }
};
// Check if user is online (active in last 5 minutes)
export const isUserOnline = (lastActiveAt) => {
    const lastActive = new Date(lastActiveAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActive > fiveMinutesAgo;
};
export const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, config.jwtSecret);
        req.userId = decoded.userId;
        req.user = { id: decoded.userId, email: decoded.email };
        // Update activity (async, don't wait)
        updateUserActivity(decoded.userId);
        next();
    }
    catch (error) {
        console.error('[Auth] Token verification failed:', error instanceof Error ? error.message : error);
        res.status(401).json({ error: 'Invalid token' });
    }
};
