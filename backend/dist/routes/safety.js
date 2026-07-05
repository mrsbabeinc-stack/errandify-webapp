import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { getUserSafetyFlags, resolveSafetyFlag, checkUserBehaviorPattern, submitVulnerabilityReport, } from '../services/safetyScreening.js';
const router = Router();
// Public endpoints
/**
 * GET /api/safety/resources
 * Get all safety resources (hotlines, support services)
 */
router.get('/resources', async (req, res) => {
    try {
        const result = await db.query(`SELECT id, title, category, phone, email, url, hours, description, region, languages
       FROM safety_resources
       WHERE active = true
       ORDER BY category, title`, []);
        res.json({
            success: true,
            data: {
                resources: result.rows.map((row) => ({
                    id: row.id,
                    title: row.title,
                    category: row.category,
                    phone: row.phone,
                    email: row.email,
                    url: row.url,
                    hours: row.hours,
                    description: row.description,
                    region: row.region,
                    languages: row.languages,
                })),
            },
        });
    }
    catch (error) {
        console.error('Error fetching safety resources:', error);
        res.status(500).json({ error: 'Failed to fetch safety resources' });
    }
});
/**
 * POST /api/safety/report
 * Submit anonymous vulnerability report
 */
router.post('/report', async (req, res) => {
    try {
        const { reportType, description, relatedErrandId, relatedUserId, contactPhone, contactEmail, severity } = req.body;
        if (!reportType || !description) {
            return res.status(400).json({ error: 'reportType and description required' });
        }
        const reportId = await submitVulnerabilityReport(reportType, description, relatedErrandId, relatedUserId, contactPhone, contactEmail, severity);
        res.json({
            success: true,
            message: 'Report submitted successfully. Support team will review within 24 hours.',
            data: { reportId },
        });
    }
    catch (error) {
        console.error('Error submitting vulnerability report:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});
// Authenticated user endpoints
/**
 * POST /api/safety/pause-account
 * User temporarily pauses their account
 */
router.post('/pause-account', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        await db.query('UPDATE users SET account_paused = true, paused_at = NOW() WHERE id = $1', [userId]);
        res.json({
            success: true,
            message: 'Your account has been paused. Your jobs will not be visible to others.',
        });
    }
    catch (error) {
        console.error('Error pausing account:', error);
        res.status(500).json({ error: 'Failed to pause account' });
    }
});
/**
 * POST /api/safety/resume-account
 * User resumes their paused account
 */
router.post('/resume-account', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        await db.query('UPDATE users SET account_paused = false, paused_at = NULL WHERE id = $1', [userId]);
        res.json({
            success: true,
            message: 'Your account has been resumed. Your jobs are now visible.',
        });
    }
    catch (error) {
        console.error('Error resuming account:', error);
        res.status(500).json({ error: 'Failed to resume account' });
    }
});
/**
 * GET /api/safety/account-status
 * Check if user's account is paused
 */
router.get('/account-status', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const result = await db.query('SELECT account_paused, paused_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            data: {
                isPaused: result.rows[0].account_paused,
                pausedAt: result.rows[0].paused_at,
            },
        });
    }
    catch (error) {
        console.error('Error fetching account status:', error);
        res.status(500).json({ error: 'Failed to fetch account status' });
    }
});
// Support team endpoints
/**
 * GET /api/safety/flags
 * Get all safety flags (support team only)
 */
router.get('/flags', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        // Check if user is support staff (TODO: implement role-based access)
        const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only support staff can access this' });
        }
        const { severity, status } = req.query;
        let query = 'SELECT * FROM safety_flags WHERE 1=1';
        const params = [];
        if (severity) {
            query += ` AND severity = $${params.length + 1}`;
            params.push(severity);
        }
        if (status) {
            query += ` AND (resolved_at IS ${status === 'unresolved' ? 'NULL' : 'NOT NULL'})`;
        }
        query += ' ORDER BY reported_at DESC LIMIT 100';
        const result = await db.query(query, params);
        res.json({
            success: true,
            data: {
                flags: result.rows.map((row) => ({
                    id: row.id,
                    errandId: row.errand_id,
                    userId: row.user_id,
                    flagType: row.flag_type,
                    severity: row.severity,
                    aiConfidence: row.ai_confidence,
                    description: row.description,
                    markers: JSON.parse(row.markers),
                    reportedAt: row.reported_at,
                    resolvedAt: row.resolved_at,
                    resolutionType: row.resolution_type,
                    notes: row.notes,
                })),
            },
        });
    }
    catch (error) {
        console.error('Error fetching safety flags:', error);
        res.status(500).json({ error: 'Failed to fetch flags' });
    }
});
/**
 * POST /api/safety/flags/:flagId/resolve
 * Support team resolves a flag
 */
router.post('/flags/:flagId/resolve', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const { flagId } = req.params;
        const { resolutionType, notes } = req.body;
        // Verify user is support staff
        const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only support staff can resolve flags' });
        }
        await resolveSafetyFlag(parseInt(flagId), resolutionType, notes || '');
        res.json({
            success: true,
            message: 'Flag resolved',
        });
    }
    catch (error) {
        console.error('Error resolving flag:', error);
        res.status(500).json({ error: 'Failed to resolve flag' });
    }
});
/**
 * GET /api/safety/user/:userId/flags
 * Get all flags for a specific user (support team)
 */
router.get('/user/:userId/flags', authMiddleware, async (req, res) => {
    try {
        const requesterId = parseInt(req.userId || '0', 10);
        const { userId } = req.params;
        // Verify requester is support staff
        const requesterResult = await db.query('SELECT role FROM users WHERE id = $1', [requesterId]);
        if (requesterResult.rows.length === 0 || requesterResult.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only support staff can access this' });
        }
        const flags = await getUserSafetyFlags(parseInt(userId));
        res.json({
            success: true,
            data: { flags },
        });
    }
    catch (error) {
        console.error('Error fetching user flags:', error);
        res.status(500).json({ error: 'Failed to fetch user flags' });
    }
});
/**
 * GET /api/safety/user/:userId/behavior-pattern
 * Check user behavior pattern for trafficking risk (support team)
 */
router.get('/user/:userId/behavior-pattern', authMiddleware, async (req, res) => {
    try {
        const requesterId = parseInt(req.userId || '0', 10);
        const { userId } = req.params;
        // Verify requester is support staff
        const requesterResult = await db.query('SELECT role FROM users WHERE id = $1', [requesterId]);
        if (requesterResult.rows.length === 0 || requesterResult.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only support staff can access this' });
        }
        const pattern = await checkUserBehaviorPattern(parseInt(userId));
        res.json({
            success: true,
            data: pattern,
        });
    }
    catch (error) {
        console.error('Error checking user behavior pattern:', error);
        res.status(500).json({ error: 'Failed to check behavior pattern' });
    }
});
export default router;
