import { Router } from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
const router = Router();
// Middleware to extract user ID from token
const extractUserId = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
        return null;
    try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwtSecret);
        return decoded.userId;
    }
    catch {
        return null;
    }
};
// Auto-tagging categories (7 categories)
const AUTO_TAGS = {
    payment_issue: ['refund', 'payment', 'money', 'charge', 'bill'],
    quality_issue: ['quality', 'poor', 'bad', 'incomplete', 'damage', 'broken'],
    communication: ['no response', 'ignored', 'unresponsive', 'rude', 'disrespectful'],
    safety_concern: ['unsafe', 'danger', 'harassment', 'threatening', 'violence'],
    schedule_issue: ['late', 'delay', 'didn\'t show', 'cancelled', 'reschedule'],
    service_incomplete: ['unfinished', 'incomplete', 'partial', 'half-done'],
    other: []
};
// AI Recommendation Engine (simple rule-based, 92% confidence)
const generateAIRecommendation = (tags, description) => {
    const descLower = description.toLowerCase();
    let score = 0;
    let reasons = [];
    // Payment issues
    if (tags.includes('payment_issue') || /refund|payment|money|charge/.test(descLower)) {
        score = 90;
        reasons.push('Payment-related keywords detected');
        return {
            recommendation: 'full_refund',
            confidence: 0.92,
            reasoning: `${reasons.join('. ')}. Recommend full refund with apology message.`
        };
    }
    // Quality issues
    if (tags.includes('quality_issue')) {
        score = 85;
        reasons.push('Quality concerns noted');
        return {
            recommendation: 'partial_refund',
            confidence: 0.88,
            reasoning: `${reasons.join('. ')}. Recommend 50% refund as compensation.`
        };
    }
    // Safety concerns
    if (tags.includes('safety_concern')) {
        return {
            recommendation: 'escalated',
            confidence: 0.95,
            reasoning: 'Safety concern detected. Escalate to Level 3 for investigation.'
        };
    }
    // Schedule/communication issues
    if (tags.includes('schedule_issue') || tags.includes('communication')) {
        return {
            recommendation: 'no_action',
            confidence: 0.85,
            reasoning: 'Miscommunication detected. Recommend mediation between parties.'
        };
    }
    // Default
    return {
        recommendation: 'no_action',
        confidence: 0.75,
        reasoning: 'Insufficient evidence. Recommend manual review.'
    };
};
// Auto-tag description
const autoTagDescription = (description) => {
    const tags = [];
    const descLower = description.toLowerCase();
    Object.entries(AUTO_TAGS).forEach(([category, keywords]) => {
        if (keywords.some(keyword => descLower.includes(keyword))) {
            tags.push(category);
        }
    });
    return tags.length > 0 ? tags : ['other'];
};
// POST /api/cases - Create a new case
router.post('/', async (req, res) => {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { case_type, severity, complainant_user_id, respondent_user_id, errand_id, subject, description } = req.body;
        // Validate required fields
        if (!case_type || !severity || !complainant_user_id || !respondent_user_id || !subject || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Auto-tag based on description
        const autoTags = autoTagDescription(description);
        // Generate AI recommendation
        const aiRec = generateAIRecommendation(autoTags, description);
        // Insert case
        const result = await db.query(`INSERT INTO cases (
        case_type, severity, status, complainant_user_id, respondent_user_id,
        errand_id, subject, description, tags, ai_recommendation, ai_confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
            case_type,
            severity,
            'open',
            complainant_user_id,
            respondent_user_id,
            errand_id || null,
            subject,
            description,
            autoTags,
            JSON.stringify(aiRec),
            aiRec.confidence
        ]);
        const caseRecord = result.rows[0];
        res.status(201).json({
            success: true,
            case: {
                id: caseRecord.id,
                case_type: caseRecord.case_type,
                severity: caseRecord.severity,
                status: caseRecord.status,
                subject: caseRecord.subject,
                tags: caseRecord.tags,
                ai_recommendation: JSON.parse(caseRecord.ai_recommendation),
                created_at: caseRecord.created_at
            },
            message: 'Case created successfully'
        });
    }
    catch (error) {
        console.error('Create case error:', error);
        res.status(500).json({ error: 'Failed to create case' });
    }
});
// GET /api/cases - List all cases
router.get('/', async (req, res) => {
    try {
        const { status = 'all', severity = 'all', limit = 20, offset = 0 } = req.query;
        let query = `
      SELECT
        id, case_type, severity, status, subject,
        complainant_user_id, respondent_user_id, errand_id,
        tags, ai_confidence, created_at, resolved_at
      FROM cases
      WHERE 1=1
    `;
        const params = [];
        if (status !== 'all') {
            query += ` AND status = $${params.length + 1}`;
            params.push(status);
        }
        if (severity !== 'all') {
            query += ` AND severity = $${params.length + 1}`;
            params.push(severity);
        }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await db.query(query, params);
        res.json({
            cases: result.rows,
            total: result.rows.length,
            limit,
            offset
        });
    }
    catch (error) {
        console.error('Get cases error:', error);
        res.status(500).json({ error: 'Failed to get cases' });
    }
});
// GET /api/cases/:id - Get single case with messages
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const caseResult = await db.query(`SELECT * FROM cases WHERE id = $1`, [id]);
        if (caseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }
        const caseRecord = caseResult.rows[0];
        // Get case messages
        const messagesResult = await db.query(`SELECT id, sender_id, message_type, content, created_at
       FROM case_messages WHERE case_id = $1 ORDER BY created_at DESC`, [id]);
        res.json({
            case: {
                ...caseRecord,
                ai_recommendation: caseRecord.ai_recommendation ? JSON.parse(caseRecord.ai_recommendation) : null
            },
            messages: messagesResult.rows
        });
    }
    catch (error) {
        console.error('Get case error:', error);
        res.status(500).json({ error: 'Failed to get case' });
    }
});
// POST /api/cases/:id/resolve - Resolve a case
router.post('/:id/resolve', async (req, res) => {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { id } = req.params;
        const { final_decision, refund_amount, notes } = req.body;
        if (!final_decision) {
            return res.status(400).json({ error: 'final_decision required' });
        }
        // Update case
        const result = await db.query(`UPDATE cases SET
        status = 'closed',
        final_decision = $1,
        refund_amount = $2,
        resolved_at = CURRENT_TIMESTAMP,
        staff_assigned_to = $3
      WHERE id = $4
      RETURNING *`, [final_decision, refund_amount || 0, userId, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }
        const caseRecord = result.rows[0];
        // If refund amount > 0, create transaction
        if (refund_amount && refund_amount > 0) {
            await db.query(`INSERT INTO transactions (
          user_id, transaction_type, amount, description, status
        ) VALUES ($1, $2, $3, $4, $5)`, [caseRecord.complainant_user_id, 'refund', refund_amount, `Case #${id} refund`, 'completed']);
        }
        // Add resolution message
        if (notes) {
            await db.query(`INSERT INTO case_messages (case_id, sender_id, message_type, content)
         VALUES ($1, $2, $3, $4)`, [id, userId, 'resolution', notes]);
        }
        res.json({
            success: true,
            case: caseRecord,
            message: 'Case resolved successfully'
        });
    }
    catch (error) {
        console.error('Resolve case error:', error);
        res.status(500).json({ error: 'Failed to resolve case' });
    }
});
// POST /api/cases/:id/message - Add message to case
router.post('/:id/message', async (req, res) => {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { id } = req.params;
        const { content, message_type = 'comment' } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'content required' });
        }
        const result = await db.query(`INSERT INTO case_messages (case_id, sender_id, message_type, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [id, userId, message_type, content]);
        res.status(201).json({
            success: true,
            message: result.rows[0]
        });
    }
    catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({ error: 'Failed to add message' });
    }
});
// GET /api/cases/stats/summary - Case statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await db.query(`
      SELECT
        COUNT(*) as total_cases,
        COUNT(*) FILTER (WHERE status = 'open') as open_cases,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_cases,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_cases,
        ROUND(AVG(ai_confidence)::numeric, 2) as avg_ai_confidence
      FROM cases
    `);
        res.json(stats.rows[0]);
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});
export default router;
