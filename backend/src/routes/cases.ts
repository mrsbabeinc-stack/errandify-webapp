import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const router = Router();

// Every route below was PUBLIC — anyone could create, read, resolve or comment
// on any case without logging in, on a router mounted as "Admin case management".
const adminOnly: any = [authMiddleware, requireAdmin(['admin', 'super-admin', 'support_l2', 'support_l3'])];

// (extractUserId removed — authMiddleware now handles this, and it also
// enforces bans and suspensions, which the local helper did not.)

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
const generateAIRecommendation = (caseType: string, tags: string[], description: string): { recommendation: string; confidence: number; reasoning: string } => {
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
const autoTagDescription = (description: string): string[] => {
  const tags: string[] = [];
  const descLower = description.toLowerCase();

  Object.entries(AUTO_TAGS).forEach(([category, keywords]) => {
    if (keywords.some(keyword => descLower.includes(keyword))) {
      tags.push(category);
    }
  });

  return tags.length > 0 ? tags : ['other'];
};

// POST /api/cases - Create a new case
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      case_type,
      severity,
      complainant_user_id,
      respondent_user_id,
      errand_id,
      subject,
      description
    } = req.body;

    // Cases and disputes are split by money.
    //
    // Anything where someone wants funds moved — a contested payment, a refund,
    // work quality, a cancellation fee — belongs in the dispute system, which
    // holds the payment, gets Hana's proposal, runs the appeal window and
    // settles. Letting those in here would create a second, weaker path to the
    // same outcome and leave the money untouched.
    if (MONEY_CASE_TYPES.has(case_type)) {
      return res.status(400).json({
        error:
          "This one is about payment, so it belongs in a dispute — that way the money is held safely while it's sorted out. The report form routes these automatically; if you are seeing this, the client sent it to the wrong place.",
        redirectTo: 'dispute',
        errandId: errand_id || null,
      });
    }

    if (!REST_CASE_TYPES.has(case_type)) {
      return res.status(400).json({ error: 'Unknown case type.' });
    }

    // The complainant is whoever is logged in — never taken from the body, or
    // anyone could file a case as someone else. The respondent is derived from
    // the errand, which also stops a user naming an unrelated person.
    const complainantId = userId;
    let respondentId: number | null = null;

    if (errand_id) {
      const parties = await db.query(
        `SELECT e.asker_id, ab.doer_id
           FROM errands e
           LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
          WHERE e.id = $1`,
        [errand_id]
      );
      const p = parties.rows[0];
      if (p) {
        respondentId = Number(p.asker_id) === complainantId ? p.doer_id : p.asker_id;
      }
    }

    // Not every case has a counterparty — an app bug is between the user and us
    if (!case_type || !subject || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Auto-tag based on description
    const autoTags = autoTagDescription(description);

    // Generate AI recommendation based on case type
    const aiRec = generateAIRecommendation(case_type, autoTags, description);

    // Insert case
    const result = await db.query(
      `INSERT INTO cases (
        case_type, severity, status, complainant_user_id, respondent_user_id,
        errand_id, subject, description, tags, ai_recommendation, ai_confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        case_type,
        severity || 'medium',
        'open',
        complainantId,
        respondentId,
        errand_id || null,
        subject,
        description,
        autoTags,
        JSON.stringify(aiRec),
        aiRec.confidence
      ]
    );

    const caseRecord = result.rows[0];

    res.status(201).json({
      success: true,
      // case_id is the human-facing reference the toast shows ("CASE-000002").
      // It was set by the trigger but never returned, so the confirmation read
      // "Case  created" with a gap where the reference should be.
      case_id: caseRecord.case_id,
      case: {
        id: caseRecord.id,
        case_id: caseRecord.case_id,
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
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// GET /api/cases - List all cases
router.get('/', adminOnly, async (req: AuthRequest, res: Response) => {
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
    const params: any[] = [];

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
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Failed to get cases' });
  }
});

// GET /api/cases/:id - Get single case with messages
// GET /api/cases/my-cases — the cases this person raised.
//
// This route did not exist. The frontend called it, '/:id' matched with
// id="my-cases", and the handler 500'd trying to parse that as a number.
// It must stay ABOVE '/:id' or Express will swallow it again.
router.get('/my-cases', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const result = await db.query(
      `SELECT c.id, c.case_id, c.case_type, c.severity, c.status, c.subject,
              c.description, c.created_at, c.resolved_at, c.final_decision,
              e.formatted_id, e.title AS errand_title
         FROM cases c
         LEFT JOIN errands e ON e.id = c.errand_id
        WHERE c.complainant_user_id = $1 OR c.respondent_user_id = $1
        ORDER BY c.created_at DESC
        LIMIT 100`,
      [userId]
    );
    res.json({ success: true, cases: result.rows });
  } catch (error) {
    console.error('[Cases] my-cases error:', error);
    res.status(500).json({ error: 'Could not load your cases' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const caseResult = await db.query(
      `SELECT * FROM cases WHERE id = $1`,
      [id]
    );

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseRecord = caseResult.rows[0];

    // Get case messages
    const messagesResult = await db.query(
      `SELECT id, sender_id, message_type, content, created_at
       FROM case_messages WHERE case_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      case: {
        ...caseRecord,
        ai_recommendation: caseRecord.ai_recommendation ? JSON.parse(caseRecord.ai_recommendation) : null
      },
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Failed to get case' });
  }
});

// POST /api/cases/:id/resolve - Resolve a case
router.post('/:id/resolve', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { final_decision, refund_amount, notes } = req.body;

    if (!final_decision) {
      return res.status(400).json({ error: 'final_decision required' });
    }

    // Update case
    const result = await db.query(
      `UPDATE cases SET
        status = 'closed',
        final_decision = $1,
        refund_amount = $2,
        resolved_at = CURRENT_TIMESTAMP,
        staff_assigned_to = $3
      WHERE id = $4
      RETURNING *`,
      [final_decision, refund_amount || 0, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseRecord = result.rows[0];

    // If refund amount > 0, create transaction
    if (refund_amount && refund_amount > 0) {
      await db.query(
        `INSERT INTO transactions (
          user_id, transaction_type, amount, description, status
        ) VALUES ($1, $2, $3, $4, $5)`,
        [caseRecord.complainant_user_id, 'refund', refund_amount, `Case #${id} refund`, 'completed']
      );
    }

    // Add resolution message
    if (notes) {
      await db.query(
        `INSERT INTO case_messages (case_id, sender_id, message_type, content)
         VALUES ($1, $2, $3, $4)`,
        [id, userId, 'resolution', notes]
      );
    }

    res.json({
      success: true,
      case: caseRecord,
      message: 'Case resolved successfully'
    });
  } catch (error) {
    console.error('Resolve case error:', error);
    res.status(500).json({ error: 'Failed to resolve case' });
  }
});

// POST /api/cases/:id/message - Add message to case
router.post('/:id/message', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { content, message_type = 'comment' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content required' });
    }

    const result = await db.query(
      `INSERT INTO case_messages (case_id, sender_id, message_type, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, message_type, content]
    );

    res.status(201).json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// GET /api/cases/stats/summary - Case statistics
router.get('/stats/summary', adminOnly, async (req: AuthRequest, res: Response) => {
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
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// PATCH /api/cases/:id - Update case status or resolution
router.patch('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const {
      status,
      resolution_type,
      compensation_amount,
      fee_assignment,
      resolution_notes,
      resolved_at
    } = req.body;

    // Build the update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
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
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

// POST /api/cases/demo/create-samples - Create sample test cases (dev only)
router.post('/demo/create-samples', adminOnly, async (req: AuthRequest, res: Response) => {
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

      const result = await db.query(
        `INSERT INTO cases (
          case_type, severity, status, complainant_user_id, respondent_user_id,
          errand_id, subject, description, tags, ai_recommendation, ai_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
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
        ]
      );

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
  } catch (error) {
    console.error('Create sample cases error:', error);
    res.status(500).json({ error: 'Failed to create sample cases' });
  }
});

/**
 * Cases <-> disputes.
 *
 * A case and a dispute are related when they concern the same errand; there is
 * no join column between the two tables and none is added here, because
 * errand_id already expresses exactly that relationship on both sides.
 *
 * Callers pass the human reference (CASE-000123) rather than the numeric id —
 * that is what the admin tables render and hold — so both forms are accepted.
 */
async function resolveCase(idOrCaseId: string) {
  const numeric = /^\d+$/.test(idOrCaseId);
  const result = await db.query(
    numeric ? 'SELECT * FROM cases WHERE id = $1' : 'SELECT * FROM cases WHERE case_id = $1',
    [numeric ? parseInt(idOrCaseId, 10) : idOrCaseId]
  );
  return result.rows[0] || null;
}

/** GET /api/cases/:id/disputes — disputes raised over this case's errand. */
router.get('/:id/disputes', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const c = await resolveCase(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found' });

    // A case with no errand cannot have a related dispute; return empty rather
    // than matching every dispute whose errand_id is also null.
    if (!c.errand_id) return res.json({ success: true, data: [] });

    const result = await db.query(
      `SELECT d.id, d.errand_id, d.status, d.reason, d.dispute_type, d.priority,
              d.created_at, d.resolved_at, d.resolution,
              d.settlement_doer_amount, d.settlement_asker_amount,
              e.title AS errand_title,
              COALESCE(u.alias, u.display_name) AS raised_by_name
         FROM disputes d
         LEFT JOIN errands e ON e.id = d.errand_id
         LEFT JOIN users u ON u.id = d.raised_by_id
        WHERE d.errand_id = $1
        ORDER BY d.created_at DESC`,
      [c.errand_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Cases] Linked disputes fetch failed:', error);
    res.status(500).json({ error: 'Could not load linked disputes' });
  }
});

/**
 * POST /api/cases/:id/resolve-from-dispute — close a case using the verdict
 * already reached on its dispute.
 *
 * This records the dispute's outcome against the case; it does not move money.
 * Settlement is the dispute module's job and has already happened by the time
 * this is called — duplicating it here would risk paying twice.
 */
router.post('/:id/resolve-from-dispute', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const c = await resolveCase(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found' });

    const { dispute_id, resolution_type, doer_amount, asker_amount, notes } = req.body || {};
    const KINDS = ['full_payment', 'split', 'full_refund', 'escalate'];
    if (!KINDS.includes(resolution_type)) {
      return res.status(400).json({ error: 'Unknown resolution type' });
    }

    if (dispute_id) {
      const d = await db.query('SELECT id, errand_id FROM disputes WHERE id = $1', [dispute_id]);
      if (d.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });
      // The dispute must concern the same errand, or this would let one case be
      // closed using an unrelated dispute's verdict.
      if (c.errand_id && d.rows[0].errand_id !== c.errand_id) {
        return res.status(409).json({ error: 'That dispute is not about this case\'s errand' });
      }
    }

    // Escalation is not a resolution — the case stays open and under review.
    const nextStatus = resolution_type === 'escalate' ? 'escalated' : 'resolved';
    const decision = [resolution_type, notes].filter(Boolean).join(' — ');

    const updated = await db.query(
      `UPDATE cases
          SET status = $1::varchar,
              final_decision = $2::text,
              refund_amount = COALESCE($3::numeric, refund_amount),
              resolved_at = CASE WHEN $1::varchar = 'resolved' THEN NOW() ELSE resolved_at END,
              updated_at = NOW()
        WHERE id = $4
        RETURNING id, case_id, status, final_decision, refund_amount, resolved_at`,
      [nextStatus, decision, asker_amount ?? null, c.id]
    );

    console.log('[Cases]', updated.rows[0].case_id, 'closed from dispute', dispute_id, '->', nextStatus);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Cases] Resolve-from-dispute failed:', error);
    res.status(500).json({ error: 'Could not update the case' });
  }
});

export default router;
