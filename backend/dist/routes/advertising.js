import express from 'express';
import db from '../db.js';
import { campaignModel, performanceModel } from '../models/Campaign.js';
import { advertisingNotifications } from '../services/advertisingNotifications.js';
const router = express.Router();
const isAuthenticated = (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};
router.post('/campaigns', isAuthenticated, async (req, res) => {
    try {
        const { company_id, title, description, image_url, budget, starts_at, ends_at } = req.body;
        if (!company_id || !title || !budget || !starts_at || !ends_at) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [company_id]);
        if (company.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Only company owner can create campaigns' });
        }
        const startDate = new Date(starts_at);
        const endDate = new Date(ends_at);
        const now = new Date();
        if (startDate <= now) {
            return res.status(400).json({ error: 'Start date must be in the future' });
        }
        if (endDate <= startDate) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }
        const campaign = await campaignModel.create(company_id, {
            title,
            description,
            image_url,
            budget: parseFloat(budget),
            starts_at,
            ends_at,
            created_by: req.user.id,
        });
        res.status(201).json({ success: true, campaign, message: 'Campaign created as draft' });
    }
    catch (error) {
        console.error('[ADVERTISING] Campaign creation failed:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});
router.get('/campaigns', isAuthenticated, async (req, res) => {
    try {
        const { company_id, status } = req.query;
        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [parseInt(company_id)]);
        if (company.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const filters = status ? { status } : undefined;
        const campaigns = await campaignModel.getByCompanyId(parseInt(company_id), filters);
        res.json({ success: true, campaigns, total: campaigns.length });
    }
    catch (error) {
        console.error('[ADVERTISING] Campaign fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});
router.put('/campaigns/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, budget, starts_at, ends_at } = req.body;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [campaign.company_id]);
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!['draft', 'rejected'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Cannot edit campaign in current status' });
        }
        const updates = {};
        if (title)
            updates.title = title;
        if (description)
            updates.description = description;
        if (image_url)
            updates.image_url = image_url;
        if (budget)
            updates.budget = parseFloat(budget);
        if (starts_at)
            updates.starts_at = starts_at;
        if (ends_at)
            updates.ends_at = ends_at;
        const updated = await campaignModel.update(parseInt(id), updates);
        res.json({ success: true, campaign: updated, message: 'Campaign updated' });
    }
    catch (error) {
        console.error('[ADVERTISING] Campaign update failed:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});
router.delete('/campaigns/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [campaign.company_id]);
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!['draft', 'rejected'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Cannot delete campaign in current status' });
        }
        await campaignModel.delete(parseInt(id));
        res.json({ success: true, message: 'Campaign deleted' });
    }
    catch (error) {
        console.error('[ADVERTISING] Campaign deletion failed:', error);
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
});
router.post('/submit', isAuthenticated, async (req, res) => {
    try {
        const { campaign_id } = req.body;
        if (!campaign_id) {
            return res.status(400).json({ error: 'campaign_id required' });
        }
        const campaign = await campaignModel.getById(campaign_id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await db.query('SELECT id, owner_id, name FROM companies WHERE id = $1', [campaign.company_id]);
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (campaign.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft campaigns can be submitted' });
        }
        if (!campaign.title || !campaign.image_url || !campaign.budget) {
            return res.status(400).json({ error: 'Campaign is missing required fields' });
        }
        const updated = await campaignModel.update(campaign_id, {
            status: 'submitted',
            submitted_at: new Date().toISOString(),
        });
        const companyName = company.rows[0].name;
        await advertisingNotifications.notifyCampaignSubmitted({
            companyId: campaign.company_id,
            companyName,
            campaignId: campaign_id,
            campaignTitle: campaign.title,
        });
        res.json({ success: true, campaign: updated, message: 'Campaign submitted for approval' });
    }
    catch (error) {
        console.error('[ADVERTISING] Campaign submission failed:', error);
        res.status(500).json({ error: 'Failed to submit campaign' });
    }
});
router.get('/campaigns/:id/performance', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [campaign.company_id]);
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const performance = await performanceModel.getByCampaignId(parseInt(id), start_date, end_date);
        const totals = {
            impressions: performance.reduce((sum, p) => sum + p.impressions, 0),
            clicks: performance.reduce((sum, p) => sum + p.clicks, 0),
            spend: performance.reduce((sum, p) => sum + p.spend, 0),
            avgCtr: performance.length > 0 ? (performance.reduce((sum, p) => sum + p.ctr, 0) / performance.length).toFixed(2) : 0,
        };
        res.json({ success: true, campaign_id: id, performance, totals });
    }
    catch (error) {
        console.error('[ADVERTISING] Performance fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch performance data' });
    }
});
router.post('/suggestions', isAuthenticated, async (req, res) => {
    try {
        const { company_id } = req.body;
        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [company_id]);
        if (company.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({
            success: true,
            suggestions: [
                { title: 'Homepage Banner Campaign', recommendedBudget: 300, expectedImpressionsRange: '2000-5000' },
                { title: 'Browse Sidebar Campaign', recommendedBudget: 200, expectedImpressionsRange: '1500-3500' },
                { title: 'Email Newsletter Campaign', recommendedBudget: 150, expectedImpressionsRange: '3000-8000' },
            ],
        });
    }
    catch (error) {
        console.error('[ADVERTISING] Suggestions fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});
router.post('/campaigns/:id/pause', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [campaign.company_id]);
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (campaign.status !== 'live') {
            return res.status(400).json({ error: 'Only live campaigns can be paused' });
        }
        await campaignModel.update(parseInt(id), { status: 'paused' });
        res.json({ success: true, message: 'Campaign paused' });
    }
    catch (error) {
        console.error('[ADVERTISING] Campaign pause failed:', error);
        res.status(500).json({ error: 'Failed to pause campaign' });
    }
});
router.post('/campaigns/:id/resume', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await campaignModel.getById(parseInt(id));
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await db.query('SELECT id, owner_id FROM companies WHERE id = $1', [campaign.company_id]);
        const isOwner = company.rows[0].owner_id === req.user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (campaign.status !== 'paused') {
            return res.status(400).json({ error: 'Only paused campaigns can be resumed' });
        }
        if (new Date(campaign.ends_at) < new Date()) {
            return res.status(400).json({ error: 'Campaign end date has passed' });
        }
        await campaignModel.update(parseInt(id), { status: 'live' });
        res.json({ success: true, message: 'Campaign resumed' });
    }
    catch (error) {
        console.error('[ADVERTISING] Campaign resume failed:', error);
        res.status(500).json({ error: 'Failed to resume campaign' });
    }
});
export default router;
