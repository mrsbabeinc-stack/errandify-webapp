import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { analyzeDisputeWithAI, escalateDispute, createDispute, holdPayment, releaseHeldPayment, getDisputeStatus, } from '../services/disputeResolutionService.js';
import { notifyDisputeRaised, notifyDisputeResolved, } from './notifications.js';
import { sendDisputeRaisedEmail, sendDisputeResolvedEmail, } from '../services/email.js';
const router = Router();
// POST /api/disputes - Create a new dispute
router.post('/', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const { errandId, type, description, evidence } = req.body;
        if (!errandId || !type || !description) {
            return res.status(400).json({ error: 'errandId, type, description required' });
        }
        // Get errand details for notifications
        const errandResult = await db.query(`SELECT id, title, asker_id, doer_id FROM errands WHERE id = $1`, [parseInt(errandId)]);
        if (errandResult.rows.length === 0) {
            return res.status(404).json({ error: 'Errand not found' });
        }
        const errand = errandResult.rows[0];
        // Create dispute
        const result = await createDispute({
            errandId: parseInt(errandId),
            filedByUserId: userId,
            type: type,
            description,
            evidence,
        });
        if (!result.success) {
            return res.status(500).json({ error: 'Failed to create dispute' });
        }
        // Hold payment during dispute
        await holdPayment(parseInt(errandId), `Dispute #${result.disputeId} filed`);
        // Determine who filed the dispute and who should be notified
        const isAskerFiling = userId === errand.asker_id;
        const otherPartyId = isAskerFiling ? errand.doer_id : errand.asker_id;
        // Get user details for notifications and emails
        const userResult = await db.query(`SELECT name, email FROM users WHERE id = $1`, [userId]);
        const userName = userResult.rows[0]?.name || 'A user';
        const userEmail = userResult.rows[0]?.email;
        // Get other party details
        const otherPartyResult = await db.query(`SELECT name, email FROM users WHERE id = $1`, [otherPartyId]);
        const otherPartyName = otherPartyResult.rows[0]?.name || 'A user';
        const otherPartyEmail = otherPartyResult.rows[0]?.email;
        // Get issue type label
        const issueTypeLabel = type === 'work_not_completed' ? 'Work Not Completed'
            : type === 'low_quality' ? 'Low Quality'
                : type === 'payment_not_released' ? 'Payment Issue'
                    : type === 'safety_concern' ? 'Safety Concern'
                        : 'Other';
        // Notify the other party
        try {
            await notifyDisputeRaised(otherPartyId, userName, `#${result.disputeId}`, errand.title);
        }
        catch (notifyErr) {
            console.warn('[Disputes] Failed to notify other party:', notifyErr);
        }
        // Notify the filing party (confirmation)
        try {
            await notifyDisputeRaised(userId, 'Errandify Team', `#${result.disputeId}`, errand.title);
        }
        catch (notifyErr) {
            console.warn('[Disputes] Failed to notify filing party:', notifyErr);
        }
        // Send emails
        try {
            if (otherPartyEmail) {
                await sendDisputeRaisedEmail(otherPartyEmail, otherPartyName, errand.title, issueTypeLabel, result.disputeId);
            }
            if (userEmail) {
                await sendDisputeRaisedEmail(userEmail, userName, errand.title, issueTypeLabel, result.disputeId);
            }
        }
        catch (emailErr) {
            console.warn('[Disputes] Failed to send emails:', emailErr);
            // Don't fail the dispute creation if emails fail
        }
        res.status(201).json({
            success: true,
            disputeId: result.disputeId,
        });
    }
    catch (error) {
        console.error('[Disputes] Create error:', error);
        res.status(500).json({ error: 'Dispute creation failed' });
    }
});
// GET /api/disputes/:id - Get dispute status
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const status = await getDisputeStatus(parseInt(id));
        if (!status) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        res.json({ dispute: status });
    }
    catch (error) {
        console.error('[Disputes] Status error:', error);
        res.status(500).json({ error: 'Failed to fetch dispute' });
    }
});
// GET /api/disputes/:id/analysis - Get AI analysis (Level 2)
router.get('/:id/analysis', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const analysis = await analyzeDisputeWithAI(parseInt(id));
        res.json({ analysis });
    }
    catch (error) {
        console.error('[Disputes] Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});
// POST /api/disputes/:id/escalate - Escalate to Level 3
router.post('/:id/escalate', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, priority } = req.body;
        const result = await escalateDispute(parseInt(id), notes, priority || 'normal');
        if (!result.success) {
            return res.status(500).json({ error: 'Escalation failed' });
        }
        res.json({ success: true, data: result.data });
    }
    catch (error) {
        console.error('[Disputes] Escalation error:', error);
        res.status(500).json({ error: 'Escalation failed' });
    }
});
// POST /api/disputes/:id/resolve - Resolve dispute (admin only)
router.post('/:id/resolve', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, notes, releasePayment: shouldRelease } = req.body;
        // Get dispute and errand details before updating
        const disputeResult = await db.query(`SELECT d.id, d.errand_id, e.title, e.asker_id, e.doer_id
       FROM disputes d
       JOIN errands e ON d.errand_id = e.id
       WHERE d.id = $1`, [parseInt(id)]);
        if (disputeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        const dispute = disputeResult.rows[0];
        // Update dispute
        const result = await db.query(`UPDATE disputes
       SET status = 'resolved', resolution = $1, resolution_notes = $2, resolved_at = NOW()
       WHERE id = $3
       RETURNING id, errand_id, resolution`, [resolution, notes, parseInt(id)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        // Release payment if approved
        if (shouldRelease && resolution === 'approved') {
            await releaseHeldPayment(dispute.errand_id);
        }
        // Map resolution to user-friendly decision message
        const decisionMap = {
            'approved': 'Payment released to doer',
            'rejected': 'Refund issued to asker',
            'partial': 'Payment split between parties',
        };
        const decisionMessage = decisionMap[resolution] || 'Dispute resolved';
        // Get user details for emails
        const askerResult = await db.query(`SELECT name, email FROM users WHERE id = $1`, [dispute.asker_id]);
        const askerName = askerResult.rows[0]?.name || 'A user';
        const askerEmail = askerResult.rows[0]?.email;
        const doerResult = await db.query(`SELECT name, email FROM users WHERE id = $1`, [dispute.doer_id]);
        const doerName = doerResult.rows[0]?.name || 'A user';
        const doerEmail = doerResult.rows[0]?.email;
        // Notify both parties
        try {
            await notifyDisputeResolved(dispute.asker_id, dispute.title, decisionMessage, `#${dispute.id}`);
            await notifyDisputeResolved(dispute.doer_id, dispute.title, decisionMessage, `#${dispute.id}`);
        }
        catch (notifyErr) {
            console.warn('[Disputes] Failed to send resolution notifications:', notifyErr);
        }
        // Send resolution emails
        try {
            if (askerEmail) {
                await sendDisputeResolvedEmail(askerEmail, askerName, dispute.title, resolution, decisionMessage, dispute.id);
            }
            if (doerEmail) {
                await sendDisputeResolvedEmail(doerEmail, doerName, dispute.title, resolution, decisionMessage, dispute.id);
            }
        }
        catch (emailErr) {
            console.warn('[Disputes] Failed to send resolution emails:', emailErr);
            // Don't fail the resolution if emails fail
        }
        res.json({ success: true, dispute: result.rows[0] });
    }
    catch (error) {
        console.error('[Disputes] Resolve error:', error);
        res.status(500).json({ error: 'Resolution failed' });
    }
});
// POST /api/disputes/:id/defense - Defendant submits response
router.post('/:id/defense', authMiddleware, async (req, res) => {
    try {
        const disputeId = parseInt(req.params.id);
        const userId = parseInt(req.userId || '0', 10);
        const { response, evidence } = req.body;
        if (!response || response.trim().length < 20) {
            return res.status(400).json({ error: 'Response must be at least 20 characters' });
        }
        // Verify this user is the defendant
        const dispute = await db.query(`SELECT id, defendant_user_id, response_deadline, response_status FROM disputes WHERE id = $1`, [disputeId]);
        if (dispute.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        const d = dispute.rows[0];
        if (d.defendant_user_id !== userId) {
            return res.status(403).json({ error: 'Only the defendant can submit a defense' });
        }
        if (d.response_status !== 'pending') {
            return res.status(400).json({ error: 'Defense response already submitted or forfeited' });
        }
        if (new Date() > new Date(d.response_deadline)) {
            // Mark as forfeited
            await db.query(`UPDATE disputes SET response_status = 'forfeited', response_submitted_at = NOW() WHERE id = $1`, [disputeId]);
            return res.status(400).json({ error: 'Response deadline has passed. Forfeited right to respond.' });
        }
        // Store defendant's response
        await db.query(`UPDATE disputes
       SET defendant_response = $1, defendant_response_evidence = $2, response_status = 'received', response_submitted_at = NOW()
       WHERE id = $3`, [response, evidence ? JSON.stringify(evidence) : null, disputeId]);
        // Update defense request
        await db.query(`UPDATE dispute_defense_requests SET response_received = true, response_received_at = NOW() WHERE dispute_id = $1`, [disputeId]);
        console.log(`[Disputes] Defense response submitted for dispute ${disputeId}`);
        res.json({ success: true, message: 'Defense response submitted successfully' });
    }
    catch (error) {
        console.error('[Disputes] Defense submission error:', error);
        res.status(500).json({ error: 'Failed to submit defense response' });
    }
});
// ============ 3-DAY RESOLUTION SYSTEM ENDPOINTS ============
// POST /api/disputes/:id/request-extension - Request extension (max 1 × 12h)
router.post('/:id/request-extension', authMiddleware, async (req, res) => {
    try {
        const disputeId = parseInt(req.params.id);
        const { reason } = req.body;
        const dispute = await db.query(`SELECT id, status, response_deadline, created_at FROM disputes WHERE id = $1`, [disputeId]);
        if (dispute.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        const d = dispute.rows[0];
        const now = new Date();
        const autoResolveTime = new Date(d.created_at.getTime() + 48 * 60 * 60 * 1000); // T+48h
        if (now > new Date(d.response_deadline)) {
            return res.status(400).json({ error: 'Response deadline has passed' });
        }
        // Mark extension requested
        await db.query(`UPDATE disputes SET extension_requested = true, extension_reason = $1 WHERE id = $2`, [reason, disputeId]);
        res.json({
            success: true,
            message: 'Extension request submitted. Admin will review within 30 minutes.',
            hoursUntilAutoResolve: Math.round((autoResolveTime.getTime() - now.getTime()) / (1000 * 60 * 60)),
        });
    }
    catch (error) {
        console.error('[Disputes] Extension request error:', error);
        res.status(500).json({ error: 'Failed to request extension' });
    }
});
// POST /api/disputes/:id/approve-extension (admin only)
router.post('/:id/approve-extension', authMiddleware, async (req, res) => {
    try {
        const disputeId = parseInt(req.params.id);
        const dispute = await db.query(`SELECT id, response_deadline FROM disputes WHERE id = $1`, [disputeId]);
        if (dispute.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        const currentDeadline = new Date(dispute.rows[0].response_deadline);
        const newDeadline = new Date(currentDeadline.getTime() + 12 * 60 * 60 * 1000); // +12h
        await db.query(`UPDATE disputes
       SET response_deadline = $1, extension_approved_at = NOW(), extension_approved = true
       WHERE id = $2`, [newDeadline, disputeId]);
        res.json({
            success: true,
            message: 'Extension approved. New deadline: +12 hours.',
            newDeadline: newDeadline.toISOString(),
        });
    }
    catch (error) {
        console.error('[Disputes] Extension approval error:', error);
        res.status(500).json({ error: 'Failed to approve extension' });
    }
});
// POST /api/disputes/:id/deny-extension (admin only)
router.post('/:id/deny-extension', authMiddleware, async (req, res) => {
    try {
        const disputeId = parseInt(req.params.id);
        const { reason } = req.body;
        await db.query(`UPDATE disputes
       SET extension_denied_at = NOW(), extension_requested = false
       WHERE id = $1`, [disputeId]);
        res.json({
            success: true,
            message: 'Extension denied. Original deadline remains.',
        });
    }
    catch (error) {
        console.error('[Disputes] Extension denial error:', error);
        res.status(500).json({ error: 'Failed to deny extension' });
    }
});
// POST /api/disputes/:id/verdict (admin only - before T+48h)
router.post('/:id/verdict', authMiddleware, async (req, res) => {
    try {
        const disputeId = parseInt(req.params.id);
        const { decision, doerAmount, companyAmount, reasoning } = req.body;
        if (!['APPROVE_DOER', 'APPROVE_COMPANY', 'PARTIAL_SPLIT'].includes(decision)) {
            return res.status(400).json({ error: 'Invalid decision type' });
        }
        const result = await db.query(`UPDATE disputes
       SET status = 'VERDICT_ISSUED',
           verdict_issued_at = NOW(),
           verdict_decision = $1,
           verdict_doer_amount = $2,
           verdict_company_amount = $3,
           verdict_reasoning = $4
       WHERE id = $5
       RETURNING *`, [decision, doerAmount, companyAmount, reasoning, disputeId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        res.json({
            success: true,
            message: `Verdict issued: ${decision}. Parties have 12 hours to appeal.`,
            dispute: result.rows[0],
            appealDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        });
    }
    catch (error) {
        console.error('[Disputes] Verdict error:', error);
        res.status(500).json({ error: 'Failed to issue verdict' });
    }
});
// POST /api/disputes/:id/appeal (within 12h of verdict: T+48h to T+60h)
router.post('/:id/appeal', authMiddleware, async (req, res) => {
    try {
        const disputeId = parseInt(req.params.id);
        const { reason } = req.body;
        const dispute = await db.query(`SELECT id, status, verdict_issued_at FROM disputes WHERE id = $1`, [disputeId]);
        if (dispute.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        const d = dispute.rows[0];
        if (d.status !== 'VERDICT_ISSUED') {
            return res.status(400).json({ error: 'Can only appeal after verdict issued' });
        }
        const verdictTime = new Date(d.verdict_issued_at);
        const appealWindow = new Date(verdictTime.getTime() + 12 * 60 * 60 * 1000);
        if (new Date() > appealWindow) {
            return res.status(400).json({ error: 'Appeal window has closed (12 hours only)' });
        }
        await db.query(`UPDATE disputes
       SET status = 'APPEALED',
           appeal_submitted_at = NOW(),
           appeal_reason = $1
       WHERE id = $2`, [reason, disputeId]);
        res.json({
            success: true,
            message: 'Appeal submitted. Admin will review within 12 hours.',
            timeRemaining: Math.round((appealWindow.getTime() - new Date().getTime()) / (1000 * 60)) + ' minutes',
        });
    }
    catch (error) {
        console.error('[Disputes] Appeal submission error:', error);
        res.status(500).json({ error: 'Failed to submit appeal' });
    }
});
// POST /api/disputes/:id/resolve-appeal (admin only - by T+60h)
router.post('/:id/resolve-appeal', authMiddleware, async (req, res) => {
    try {
        const disputeId = parseInt(req.params.id);
        const { decision, reasoning, newDoerAmount, newCompanyAmount } = req.body;
        if (!['UPHELD', 'OVERTURNED', 'MODIFIED'].includes(decision)) {
            return res.status(400).json({ error: 'Invalid appeal decision' });
        }
        const dispute = await db.query(`SELECT id, verdict_doer_amount, verdict_company_amount, verdict_issued_at
       FROM disputes WHERE id = $1`, [disputeId]);
        if (dispute.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        const d = dispute.rows[0];
        let finalDoerAmount = d.verdict_doer_amount;
        let finalCompanyAmount = d.verdict_company_amount;
        if (decision === 'OVERTURNED') {
            finalDoerAmount = d.verdict_company_amount;
            finalCompanyAmount = d.verdict_doer_amount;
        }
        else if (decision === 'MODIFIED') {
            finalDoerAmount = newDoerAmount || d.verdict_doer_amount;
            finalCompanyAmount = newCompanyAmount || d.verdict_company_amount;
        }
        const result = await db.query(`UPDATE disputes
       SET status = 'CLOSED',
           appeal_reviewed_at = NOW(),
           appeal_final_decision = $1,
           appeal_final_reasoning = $2,
           verdict_doer_amount = $3,
           verdict_company_amount = $4,
           closed_at = NOW()
       WHERE id = $5
       RETURNING *`, [decision, reasoning, finalDoerAmount, finalCompanyAmount, disputeId]);
        res.json({
            success: true,
            message: `Appeal ${decision}. Final decision: Doer: $${finalDoerAmount}, Company: $${finalCompanyAmount}. NO FURTHER APPEALS.`,
            dispute: result.rows[0],
        });
    }
    catch (error) {
        console.error('[Disputes] Appeal resolution error:', error);
        res.status(500).json({ error: 'Failed to resolve appeal' });
    }
});
// GET /api/disputes - List disputes (admin only)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, priority, limit } = req.query;
        let query = 'SELECT * FROM disputes WHERE 1=1';
        const params = [];
        if (status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(status);
        }
        if (priority) {
            query += ` AND priority = $${params.length + 1}`;
            params.push(priority);
        }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit) || 50);
        const result = await db.query(query, params);
        res.json({ disputes: result.rows, count: result.rows.length });
    }
    catch (error) {
        console.error('[Disputes] List error:', error);
        res.status(500).json({ error: 'Failed to list disputes' });
    }
});
// ============ EVIDENCE SUBMISSION ENDPOINTS ============
// POST /api/disputes/:id/evidence - Submit evidence anytime during investigation (T+0 to T+48h)
router.post('/:id/evidence', authMiddleware, async (req, res) => {
    try {
        const disputeId = Number(req.params.id);
        const userId = req.user?.id;
        const userType = req.user?.type === 'doer' ? 'doer' : 'company_staff';
        // TODO: Handle multipart file uploads from req.files
        const evidenceFiles = req.files ? Object.values(req.files).flat() : [];
        if (evidenceFiles.length === 0) {
            return res.status(400).json({ error: 'At least one evidence file required' });
        }
        // Validate file sizes (max 50MB each)
        for (const file of evidenceFiles) {
            if (file.size > 50 * 1024 * 1024) {
                return res.status(400).json({
                    error: `File ${file.name} exceeds 50MB limit`,
                });
            }
        }
        const createdEvidence = await DisputeService.submitEvidence(disputeId, userId, userType, evidenceFiles.map((f) => ({
            type: this.getFileType(f.mimetype),
            name: f.originalname,
            size: f.size,
            mimeType: f.mimetype,
            content: f.mimetype?.startsWith('text/') ? f.buffer.toString() : undefined,
        })));
        res.json({
            success: true,
            message: `${createdEvidence.length} evidence file(s) submitted successfully`,
            evidence: createdEvidence.map((e) => ({
                id: e.id,
                type: e.type,
                fileName: e.fileName,
                size: e.originalSize,
                uploadedAt: e.uploadedAt,
                aiStatus: e.aiAnalysisStatus,
            })),
        });
    }
    catch (error) {
        console.error('[Disputes] Evidence submission error:', error);
        res.status(400).json({ error: error.message || 'Failed to submit evidence' });
    }
});
// GET /api/disputes/:id/evidence - Get all evidence for dispute
router.get('/:id/evidence', authMiddleware, async (req, res) => {
    try {
        const disputeId = Number(req.params.id);
        const { party } = req.query; // Optional filter: 'doer' | 'company'
        let evidence;
        if (party === 'doer' || party === 'company') {
            evidence = await DisputeService.getEvidenceByParty(disputeId, party);
        }
        else {
            evidence = await DisputeService.getAllEvidence(disputeId);
        }
        res.json({
            success: true,
            count: evidence.length,
            evidence: evidence.map((e) => ({
                id: e.id,
                submittedBy: e.submittedBy,
                type: e.type,
                fileName: e.fileName,
                size: e.originalSize,
                compressedSize: e.compressedSize,
                isCompressed: e.isCompressed,
                uploadedAt: e.uploadedAt,
                aiStatus: e.aiAnalysisStatus,
                aiConfidence: e.aiConfidence,
                aiVerdictHint: e.aiVerdictHint,
                url: e.compressedUrl || e.originalUrl,
            })),
        });
    }
    catch (error) {
        console.error('[Disputes] Get evidence error:', error);
        res.status(400).json({ error: error.message });
    }
});
// GET /api/disputes/:id/evidence/:evidenceId - Get single evidence details
router.get('/:id/evidence/:evidenceId', authMiddleware, async (req, res) => {
    try {
        const disputeId = Number(req.params.id);
        const evidenceId = Number(req.params.evidenceId);
        // TODO: Fetch from database
        res.json({
            success: true,
            message: 'Evidence details endpoint - TODO',
        });
    }
    catch (error) {
        console.error('[Disputes] Get evidence detail error:', error);
        res.status(400).json({ error: error.message });
    }
});
// DELETE /api/disputes/:id/evidence/:evidenceId - Delete evidence before T+48h
router.delete('/:id/evidence/:evidenceId', authMiddleware, async (req, res) => {
    try {
        const evidenceId = Number(req.params.evidenceId);
        // TODO: Allow deletion only by submitter and before T+48h
        res.json({
            success: true,
            message: 'Evidence deleted - TODO',
        });
    }
    catch (error) {
        console.error('[Disputes] Delete evidence error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Helper to determine file type from MIME type
function getFileType(mimeType) {
    if (mimeType?.startsWith('image/'))
        return 'photo';
    if (mimeType?.startsWith('video/'))
        return 'video';
    return 'text';
}
export default router;
