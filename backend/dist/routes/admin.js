import express from 'express';
import { query } from '../db';
const router = express.Router();
// Middleware: Check if admin
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super-admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
// ============================================
// TIER 1: OPERATIONS
// ============================================
// CREATE ADMIN USER
router.post('/admins', isAdmin, async (req, res) => {
    try {
        const { email, name, role, twoFactorEnabled } = req.body;
        if (!email || !name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await query('INSERT INTO admin_users (email, name, role, two_factor_enabled, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [email, name, role, twoFactorEnabled ? 1 : 0, 'active']);
        res.status(201).json({ id: result.insertId, email, name, role, twoFactorEnabled, status: 'active' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create admin' });
    }
});
// GET ALL ADMINS
router.get('/admins', isAdmin, async (req, res) => {
    try {
        const admins = await query('SELECT id, email, name, role, status, last_login, two_factor_enabled FROM admin_users ORDER BY created_at DESC');
        res.json(admins);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});
// DELETE ADMIN
router.delete('/admins/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM admin_users WHERE id = ?', [id]);
        res.json({ message: 'Admin deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});
// TOGGLE 2FA
router.patch('/admins/:id/2fa', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;
        await query('UPDATE admin_users SET two_factor_enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
        res.json({ message: '2FA toggled successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update 2FA' });
    }
});
// ============================================
// USER MANAGEMENT
// ============================================
// SUSPEND USER
router.post('/users/:userId/suspend', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        if (!reason)
            return res.status(400).json({ error: 'Suspension reason required' });
        await query('UPDATE users SET status = ?, suspension_reason = ?, suspended_at = NOW() WHERE id = ?', ['suspended', reason, userId]);
        res.json({ message: 'User suspended successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to suspend user' });
    }
});
// BAN USER
router.post('/users/:userId/ban', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        if (!reason)
            return res.status(400).json({ error: 'Ban reason required' });
        await query('UPDATE users SET status = ?, ban_reason = ?, banned_at = NOW() WHERE id = ?', ['banned', reason, userId]);
        res.json({ message: 'User banned successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to ban user' });
    }
});
// RESTORE USER
router.post('/users/:userId/restore', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        await query('UPDATE users SET status = ?, suspension_reason = NULL, ban_reason = NULL WHERE id = ?', ['active', userId]);
        res.json({ message: 'User restored successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to restore user' });
    }
});
// CHANGE USER TIER
router.patch('/users/:userId/tier', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { tier } = req.body;
        if (!['new', 'trusted', 'vip'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        await query('UPDATE users SET tier = ? WHERE id = ?', [tier, userId]);
        res.json({ message: 'User tier updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user tier' });
    }
});
// ============================================
// PAYMENT MANAGEMENT
// ============================================
// PROCESS REFUND
router.post('/payments/:transactionId/refund', isAdmin, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { reason, amount } = req.body;
        if (!reason)
            return res.status(400).json({ error: 'Refund reason required' });
        await query('INSERT INTO payment_refunds (transaction_id, amount, reason, admin_id, created_at) VALUES (?, ?, ?, ?, NOW())', [transactionId, amount, reason, req.user?.id]);
        await query('UPDATE payments SET status = ?, refunded_at = NOW() WHERE id = ?', ['refunded', transactionId]);
        res.json({ message: 'Refund processed successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process refund' });
    }
});
// RETRY FAILED PAYMENT
router.post('/payments/:transactionId/retry', isAdmin, async (req, res) => {
    try {
        const { transactionId } = req.params;
        await query('UPDATE payments SET status = ?, retry_count = retry_count + 1 WHERE id = ?', ['pending', transactionId]);
        res.json({ message: 'Payment retry initiated' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retry payment' });
    }
});
// ============================================
// ERRAND MANAGEMENT
// ============================================
// CANCEL ERRAND WITH COMPENSATION
router.post('/errands/:errandId/cancel', isAdmin, async (req, res) => {
    try {
        const { errandId } = req.params;
        const { reason, compensationAmount } = req.body;
        if (!reason)
            return res.status(400).json({ error: 'Cancellation reason required' });
        await query('UPDATE errands SET status = ?, cancellation_reason = ?, cancelled_at = NOW() WHERE id = ?', ['cancelled', reason, errandId]);
        if (compensationAmount > 0) {
            await query('INSERT INTO admin_compensation (errand_id, amount, reason, admin_id, created_at) VALUES (?, ?, ?, ?, NOW())', [errandId, compensationAmount, reason, req.user?.id]);
        }
        res.json({ message: 'Errand cancelled with compensation issued' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to cancel errand' });
    }
});
// REASSIGN ERRAND
router.patch('/errands/:errandId/reassign', isAdmin, async (req, res) => {
    try {
        const { errandId } = req.params;
        const { newDoerId } = req.body;
        if (!newDoerId)
            return res.status(400).json({ error: 'New doer ID required' });
        await query('UPDATE errands SET assigned_to = ? WHERE id = ?', [newDoerId, errandId]);
        res.json({ message: 'Errand reassigned successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reassign errand' });
    }
});
// EXTEND DEADLINE
router.patch('/errands/:errandId/extend', isAdmin, async (req, res) => {
    try {
        const { errandId } = req.params;
        const { newDeadline } = req.body;
        if (!newDeadline)
            return res.status(400).json({ error: 'New deadline required' });
        await query('UPDATE errands SET deadline = ? WHERE id = ?', [newDeadline, errandId]);
        res.json({ message: 'Errand deadline extended' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to extend deadline' });
    }
});
// FORCE MARK COMPLETE
router.post('/errands/:errandId/complete', isAdmin, async (req, res) => {
    try {
        const { errandId } = req.params;
        await query('UPDATE errands SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', errandId]);
        res.json({ message: 'Errand marked as completed' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark errand complete' });
    }
});
// ============================================
// TIER 2: CONFIGURATION
// ============================================
// ADD STAFF TO COMPANY
router.post('/companies/:companyId/staff', isAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { name, email, role } = req.body;
        if (!name || !email || !role)
            return res.status(400).json({ error: 'Missing required fields' });
        const result = await query('INSERT INTO company_staff (company_id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [companyId, name, email, role, 'active']);
        res.status(201).json({ id: result.insertId, name, email, role });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add staff' });
    }
});
// REMOVE STAFF
router.delete('/companies/:companyId/staff/:staffId', isAdmin, async (req, res) => {
    try {
        const { companyId, staffId } = req.params;
        await query('DELETE FROM company_staff WHERE id = ? AND company_id = ?', [staffId, companyId]);
        res.json({ message: 'Staff member removed' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove staff' });
    }
});
// GENERATE API KEY
router.post('/companies/:companyId/api-keys', isAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { name } = req.body;
        const apiKey = `sk_live_${Math.random().toString(36).substr(2, 20)}`;
        const result = await query('INSERT INTO api_keys (company_id, name, key, status, created_at) VALUES (?, ?, ?, ?, NOW())', [companyId, name, apiKey, 'active']);
        res.status(201).json({ id: result.insertId, name, key: apiKey });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});
// REVOKE API KEY
router.patch('/api-keys/:keyId/revoke', isAdmin, async (req, res) => {
    try {
        const { keyId } = req.params;
        await query('UPDATE api_keys SET status = ? WHERE id = ?', ['revoked', keyId]);
        res.json({ message: 'API key revoked' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
});
// CREATE WEBHOOK
router.post('/companies/:companyId/webhooks', isAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { url, events } = req.body;
        if (!url || !events || events.length === 0)
            return res.status(400).json({ error: 'URL and events required' });
        const result = await query('INSERT INTO webhooks (company_id, url, events, status, created_at) VALUES (?, ?, ?, ?, NOW())', [companyId, url, JSON.stringify(events), 'active']);
        res.status(201).json({ id: result.insertId, url, events });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});
// TOGGLE WEBHOOK
router.patch('/webhooks/:webhookId/toggle', isAdmin, async (req, res) => {
    try {
        const { webhookId } = req.params;
        const webhook = await query('SELECT status FROM webhooks WHERE id = ?', [webhookId]);
        const newStatus = webhook[0]?.status === 'active' ? 'inactive' : 'active';
        await query('UPDATE webhooks SET status = ? WHERE id = ?', [newStatus, webhookId]);
        res.json({ message: 'Webhook status updated' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to toggle webhook' });
    }
});
// DELETE WEBHOOK
router.delete('/webhooks/:webhookId', isAdmin, async (req, res) => {
    try {
        const { webhookId } = req.params;
        await query('DELETE FROM webhooks WHERE id = ?', [webhookId]);
        res.json({ message: 'Webhook deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});
// TOGGLE FEATURE FLAG
router.patch('/feature-flags/:flagId', isAdmin, async (req, res) => {
    try {
        const { flagId } = req.params;
        const { enabled } = req.body;
        await query('UPDATE feature_flags SET enabled = ?, updated_at = NOW() WHERE id = ?', [enabled ? 1 : 0, flagId]);
        res.json({ message: 'Feature flag updated' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update feature flag' });
    }
});
// UPDATE ROLLOUT
router.patch('/feature-flags/:flagId/rollout', isAdmin, async (req, res) => {
    try {
        const { flagId } = req.params;
        const { percentage } = req.body;
        if (percentage < 0 || percentage > 100)
            return res.status(400).json({ error: 'Percentage must be 0-100' });
        await query('UPDATE feature_flags SET rollout_percentage = ?, updated_at = NOW() WHERE id = ?', [percentage, flagId]);
        res.json({ message: 'Rollout percentage updated' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update rollout' });
    }
});
// ADD HOLIDAY
router.post('/holidays', isAdmin, async (req, res) => {
    try {
        const { date, name, country } = req.body;
        if (!date || !name)
            return res.status(400).json({ error: 'Date and name required' });
        const result = await query('INSERT INTO holidays (date, name, country, created_at) VALUES (?, ?, ?, NOW())', [date, name, country || 'SG']);
        res.status(201).json({ id: result.insertId, date, name, country });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add holiday' });
    }
});
// DELETE HOLIDAY
router.delete('/holidays/:holidayId', isAdmin, async (req, res) => {
    try {
        const { holidayId } = req.params;
        await query('DELETE FROM holidays WHERE id = ?', [holidayId]);
        res.json({ message: 'Holiday deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
});
// GET AUDIT LOGS
router.get('/audit-logs', isAdmin, async (req, res) => {
    try {
        const logs = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
// PROCESS GDPR REQUEST
router.post('/gdpr-requests/:requestId/process', isAdmin, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;
        if (!['pending', 'processing', 'completed', 'denied'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        await query('UPDATE gdpr_requests SET status = ?, updated_at = NOW() WHERE id = ?', [status, requestId]);
        res.json({ message: 'GDPR request updated' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process GDPR request' });
    }
});
// CREATE ALERT RULE
router.post('/alert-rules', isAdmin, async (req, res) => {
    try {
        const { name, condition, threshold, channels } = req.body;
        if (!name || !condition || !channels || channels.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await query('INSERT INTO alert_rules (name, condition, threshold, channels, enabled, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [name, condition, threshold, JSON.stringify(channels), 1]);
        res.status(201).json({ id: result.insertId, name, condition, threshold, channels });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create alert rule' });
    }
});
// TOGGLE ALERT RULE
router.patch('/alert-rules/:ruleId', isAdmin, async (req, res) => {
    try {
        const { ruleId } = req.params;
        const { enabled } = req.body;
        await query('UPDATE alert_rules SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, ruleId]);
        res.json({ message: 'Alert rule updated' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update alert rule' });
    }
});
// CREATE EMAIL CAMPAIGN
router.post('/campaigns/email', isAdmin, async (req, res) => {
    try {
        const { name, subject, recipientCount } = req.body;
        if (!name || !subject)
            return res.status(400).json({ error: 'Name and subject required' });
        const result = await query('INSERT INTO email_campaigns (name, subject, recipient_count, status, created_at) VALUES (?, ?, ?, ?, NOW())', [name, subject, recipientCount, 'draft']);
        res.status(201).json({ id: result.insertId, name, subject, status: 'draft' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create email campaign' });
    }
});
// SEND NOTIFICATION
router.post('/notifications/send', isAdmin, async (req, res) => {
    try {
        const { title, message, type, targetAudience } = req.body;
        if (!title || !message)
            return res.status(400).json({ error: 'Title and message required' });
        const result = await query('INSERT INTO notifications (title, message, type, target_audience, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [title, message, type, targetAudience, 'scheduled']);
        res.status(201).json({ id: result.insertId, title, message });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send notification' });
    }
});
// CREATE EVENT REMINDER
router.post('/event-reminders', isAdmin, async (req, res) => {
    try {
        const { eventName, description, scheduledDate, reminderTiming } = req.body;
        if (!eventName || !scheduledDate)
            return res.status(400).json({ error: 'Event name and date required' });
        const result = await query('INSERT INTO event_reminders (event_name, description, scheduled_date, reminder_timing, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [eventName, description, scheduledDate, reminderTiming, 'active']);
        res.status(201).json({ id: result.insertId, eventName, scheduledDate });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create event reminder' });
    }
});
// CREATE BLOG ARTICLE
router.post('/blog/articles', isAdmin, async (req, res) => {
    try {
        const { title, author, category, content } = req.body;
        if (!title || !author)
            return res.status(400).json({ error: 'Title and author required' });
        const result = await query('INSERT INTO blog_articles (title, author, category, content, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [title, author, category, content, 'draft']);
        res.status(201).json({ id: result.insertId, title, author, status: 'draft' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create article' });
    }
});
// AWARD RECOGNITION
router.post('/recognition/award', isAdmin, async (req, res) => {
    try {
        const { userId, award, reason } = req.body;
        if (!userId || !award)
            return res.status(400).json({ error: 'User ID and award required' });
        const result = await query('INSERT INTO recognitions (user_id, award, reason, visibility, awarded_at) VALUES (?, ?, ?, ?, NOW())', [userId, award, reason, 'public']);
        res.status(201).json({ id: result.insertId, award });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to award recognition' });
    }
});
// CREATE HERO BANNER
router.post('/banners/hero', isAdmin, async (req, res) => {
    try {
        const { title, subtitle, ctaText, ctaLink, displayLocation } = req.body;
        if (!title || !ctaText)
            return res.status(400).json({ error: 'Title and CTA text required' });
        const result = await query('INSERT INTO hero_banners (title, subtitle, cta_text, cta_link, display_location, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [title, subtitle, ctaText, ctaLink, displayLocation, 'scheduled']);
        res.status(201).json({ id: result.insertId, title });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create banner' });
    }
});
export default router;
