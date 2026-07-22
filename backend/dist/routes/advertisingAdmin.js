import express from 'express';
import { campaignModel } from '../models/Campaign.js';
import { advertisingService } from '../services/advertisingService.js';
const router = express.Router();
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super-admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
router.get('/campaigns', isAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        const campaigns = status ? await campaignModel.getByStatus(status) : await campaignModel.getPendingForApproval();
        res.json({ success: true, campaigns, total: campaigns.length });
    }
    catch (error) {
        console.error('[ADMIN_ADVERTISING] Campaign fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});
router.get('/campaigns/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        res.json({ success: true, campaign });
    }
    catch (error) {
        console.error('[ADMIN_ADVERTISING] Campaign fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});
router.post('/approve', isAdmin, async (req, res) => {
    try {
        const { campaign_id, admin_notes } = req.body;
        if (!campaign_id) {
            return res.status(400).json({ error: 'campaign_id required' });
        }
        const result = await advertisingService.approveCampaign(campaign_id, req.user.id, admin_notes);
        res.json(result);
    }
    catch (error) {
        console.error('[ADMIN_ADVERTISING] Campaign approval failed:', error);
        if (error.message.includes('Stripe')) {
            return res.status(402).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Failed to approve campaign' });
    }
});
router.post('/reject', isAdmin, async (req, res) => {
    try {
        const { campaign_id, rejection_reason } = req.body;
        if (!campaign_id || !rejection_reason) {
            return res.status(400).json({ error: 'campaign_id and rejection_reason required' });
        }
        if (rejection_reason.length < 10) {
            return res.status(400).json({ error: 'Rejection reason must be at least 10 characters' });
        }
        const result = await advertisingService.rejectCampaign(campaign_id, req.user.id, rejection_reason);
        res.json(result);
    }
    catch (error) {
        console.error('[ADMIN_ADVERTISING] Campaign rejection failed:', error);
        res.status(500).json({ error: error.message || 'Failed to reject campaign' });
    }
});
router.post('/campaigns/:id/pause', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (campaign.status !== 'live') {
            return res.status(400).json({ error: 'Only live campaigns can be paused' });
        }
        await campaignModel.update(parseInt(id), { status: 'paused' });
        res.json({ success: true, message: 'Campaign paused by admin' });
    }
    catch (error) {
        console.error('[ADMIN_ADVERTISING] Campaign pause failed:', error);
        res.status(500).json({ error: 'Failed to pause campaign' });
    }
});
router.post('/campaigns/:id/end', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (!['live', 'approved', 'paused'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Cannot end campaign in current status' });
        }
        await advertisingService.endCampaign(parseInt(id));
        res.json({ success: true, message: 'Campaign ended' });
    }
    catch (error) {
        console.error('[ADMIN_ADVERTISING] Campaign end failed:', error);
        res.status(500).json({ error: error.message || 'Failed to end campaign' });
    }
});
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const db = (await import('../db.js')).default;
        const statusStats = await db.query(`SELECT status, COUNT(*) as count, SUM(budget) as total_budget, SUM(spent) as total_spent FROM campaigns GROUP BY status`, []);
        const revenueStats = await db.query(`SELECT COUNT(*) as total_campaigns, SUM(budget) as total_revenue, AVG(budget) as avg_campaign_budget, COUNT(CASE WHEN status = 'live' THEN 1 END) as active_campaigns FROM campaigns WHERE status != 'draft'`, []);
        res.json({ success: true, stats: { byStatus: statusStats.rows, revenue: revenueStats.rows[0] } });
    }
    catch (error) {
        console.error('[ADMIN_ADVERTISING] Stats fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
export default router;
