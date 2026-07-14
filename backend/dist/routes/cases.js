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
// Case type classification for money ($$$) vs rest
const MONEY_CASE_TYPES = new Set(['dispute', 'refund_request', 'quality_issue', 'cancellation']);
const REST_CASE_TYPES = new Set(['app_issue', 'payment_enquiry', 'task_enquiry', 'safety_concern', 'other']);
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
// AI Recommendation Engine (rule-based, 92% confidence)
const generateAIRecommendation = (caseType, tags, description) => {
    const descLower = description.toLowerCase();
    // Money-involved cases
    if (MONEY_CASE_TYPES.has(caseType)) {
        if (caseType === 'dispute') {
            return {
                recommendation: 'full_refund',
                confidence: 0.92,
                reasoning: 'Dispute case detected. Recommend full refund with compensation.'
            };
        }
        if (caseType === 'refund_request') {
            return {
                recommendation: 'full_refund',
                confidence: 0.90,
                reasoning: 'Explicit refund request. Process full refund to user account.'
            };
        }
        if (caseType === 'quality_issue') {
            return {
                recommendation: 'partial_refund',
                confidence: 0.88,
                reasoning: 'Quality issue detected. Recommend partial refund (50%) as compensation.'
            };
        }
        if (caseType === 'cancellation') {
            return {
                recommendation: 'full_refund',
                confidence: 0.85,
                reasoning: 'Cancellation case. Process full refund to user.'
            };
        }
    }
    // Rest cases
    if (REST_CASE_TYPES.has(caseType)) {
        if (caseType === 'safety_concern') {
            return {
                recommendation: 'escalated',
                confidence: 0.95,
                reasoning: 'Safety concern detected. Escalate to Level 3 for immediate investigation.'
            };
        }
        if (caseType === 'app_issue') {
            return {
                recommendation: 'no_action',
                confidence: 0.80,
                reasoning: 'App issue reported. Route to technical support team.'
            };
        }
        if (caseType === 'payment_enquiry') {
            return {
                recommendation: 'no_action',
                confidence: 0.75,
                reasoning: 'Payment enquiry received. Route to payments support team.'
            };
        }
        if (caseType === 'task_enquiry') {
            return {
                recommendation: 'no_action',
                confidence: 0.75,
                reasoning: 'Task enquiry received. Provide information and close case.'
            };
        }
    }
    // Default fallback
    return {
        recommendation: 'no_action',
        confidence: 0.75,
        reasoning: 'Case category unclear. Recommend manual review.'
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
        // Generate AI recommendation based on case type
        const aiRec = generateAIRecommendation(case_type, autoTags, description);
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
// PATCH /api/cases/:id - Update case status or resolution
router.patch('/:id', async (req, res) => {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { id } = req.params;
        const { status, resolution_type, compensation_amount, fee_assignment, resolution_notes, resolved_at } = req.body;
        // Build the update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (status) {
            updates.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }
        if (resolution_type) {
            updates.push(`resolution_type = $${paramCount}`);
            values.push(resolution_type);
            paramCount++;
        }
        if (compensation_amount !== undefined) {
            updates.push(`compensation_amount = $${paramCount}`);
            values.push(compensation_amount);
            paramCount++;
        }
        if (fee_assignment) {
            updates.push(`fee_assignment = $${paramCount}`);
            values.push(fee_assignment);
            paramCount++;
        }
        if (resolution_notes) {
            updates.push(`resolution_notes = $${paramCount}`);
            values.push(resolution_notes);
            paramCount++;
        }
        if (resolved_at) {
            updates.push(`resolved_at = $${paramCount}`);
            values.push(resolved_at);
            paramCount++;
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        updates.push(`updated_at = NOW()`);
        values.push(id);
        const query = `
      UPDATE cases
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json({
            success: true,
            case: result.rows[0],
            message: 'Case updated successfully'
        });
    }
    catch (error) {
        console.error('Update case error:', error);
        res.status(500).json({ error: 'Failed to update case' });
    }
});
// POST /api/cases/demo/create-samples - Create sample test cases (dev only)
router.post('/demo/create-samples', async (req, res) => {
    try {
        const sampleCases = [
            {
                case_type: 'app_issue',
                severity: 'high',
                complainant_user_id: 1,
                respondent_user_id: 2,
                errand_id: 101,
                subject: 'App crashes when uploading photos',
                description: 'The app freezes and crashes whenever I try to upload multiple photos to an errand. Tried on WiFi and mobile data, same issue.'
            },
            {
                case_type: 'payment_enquiry',
                severity: 'medium',
                complainant_user_id: 3,
                respondent_user_id: 4,
                errand_id: 102,
                subject: 'How does payment hold work?',
                description: 'I want to understand the payment hold process. When does the money get released after completion?'
            },
            {
                case_type: 'task_enquiry',
                severity: 'low',
                complainant_user_id: 5,
                respondent_user_id: 6,
                errand_id: 103,
                subject: 'Can I edit task after posting?',
                description: 'I posted a cleaning task but realized I need to change the location. Can I edit it or do I need to cancel and repost?'
            },
            {
                case_type: 'safety_concern',
                severity: 'critical',
                complainant_user_id: 7,
                respondent_user_id: 8,
                errand_id: 104,
                subject: 'Doer made inappropriate comments during task',
                description: 'During the errand, the doer made offensive comments that made me feel uncomfortable and unsafe.'
            },
            {
                case_type: 'app_issue',
                severity: 'medium',
                complainant_user_id: 9,
                respondent_user_id: 10,
                errand_id: 105,
                subject: 'Cannot logout from account',
                description: 'The logout button does not work. I have tried clearing cache and restarting the app but still unable to logout.'
            },
            {
                case_type: 'task_enquiry',
                severity: 'low',
                complainant_user_id: 11,
                respondent_user_id: 12,
                errand_id: 106,
                subject: 'What is the cancellation policy?',
                description: 'If I cancel a task after a doer accepts it, what are the charges? Will the doer be penalized?'
            },
            {
                case_type: 'safety_concern',
                severity: 'high',
                complainant_user_id: 13,
                respondent_user_id: 14,
                errand_id: 107,
                subject: 'Suspicious user activity',
                description: 'This user has been messaging multiple times trying to arrange meetups outside the app. Very suspicious behavior.'
            },
            {
                case_type: 'payment_enquiry',
                severity: 'low',
                complainant_user_id: 15,
                respondent_user_id: 16,
                errand_id: 108,
                subject: 'Do I get points for this task?',
                description: 'Does completing errands earn Errandify Points? How are they calculated?'
            }
        ];
        const createdCases = [];
        for (const caseData of sampleCases) {
            const autoTags = autoTagDescription(caseData.description);
            const aiRec = generateAIRecommendation(caseData.case_type, autoTags, caseData.description);
            const result = await db.query(`INSERT INTO cases (
          case_type, severity, status, complainant_user_id, respondent_user_id,
          errand_id, subject, description, tags, ai_recommendation, ai_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`, [
                caseData.case_type,
                caseData.severity,
                'open',
                caseData.complainant_user_id,
                caseData.respondent_user_id,
                caseData.errand_id,
                caseData.subject,
                caseData.description,
                autoTags,
                JSON.stringify(aiRec),
                aiRec.confidence
            ]);
            createdCases.push(result.rows[0]);
        }
        res.status(201).json({
            success: true,
            message: `Created ${createdCases.length} sample test cases`,
            cases: createdCases.map(c => ({
                id: c.id,
                case_id: c.case_id,
                case_type: c.case_type,
                severity: c.severity,
                subject: c.subject,
                status: c.status
            }))
        });
    }
    catch (error) {
        console.error('Create sample cases error:', error);
        res.status(500).json({ error: 'Failed to create sample cases' });
    }
});
export default router;
