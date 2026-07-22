import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import * as adCreditService from '../services/adCreditService.js';
import { getCompanySubscription, getTierConfig } from '../services/subscriptionService.js';
const router = Router();
// GET /api/ad-credits/balance - Get current month's ad credit balance
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const { company_id } = req.query;
        if (!company_id) {
            return res.status(400).json({ success: false, error: 'company_id required' });
        }
        const credits = await adCreditService.getCredits(parseInt(company_id));
        if (!credits) {
            return res.status(404).json({
                success: false,
                error: 'No ad credits allocated for this month'
            });
        }
        const subscription = await getCompanySubscription(parseInt(company_id));
        const tier = subscription ? await getTierConfig(subscription.current_tier) : null;
        const availableCents = credits.allocated_amount - credits.used_amount;
        res.json({
            success: true,
            data: {
                month: credits.month,
                allocated_sgd: (credits.allocated_amount / 100).toFixed(2),
                used_sgd: (credits.used_amount / 100).toFixed(2),
                available_sgd: (availableCents / 100).toFixed(2),
                usage_percentage: ((credits.used_amount / credits.allocated_amount) * 100).toFixed(1),
                expires_at: credits.expires_at,
                tier: subscription?.current_tier || 'free',
                tier_monthly_credit: tier ? `SGD $${(tier.ad_credit_monthly / 100).toFixed(2)}` : 'N/A'
            }
        });
    }
    catch (error) {
        console.error('Get ad credit balance error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch ad credit balance' });
    }
});
// GET /api/ad-credits/usage-history - Get usage history
router.get('/usage-history', authMiddleware, async (req, res) => {
    try {
        const { company_id, limit = '20' } = req.query;
        if (!company_id) {
            return res.status(400).json({ success: false, error: 'company_id required' });
        }
        const result = await db.query(`SELECT
        id,
        campaign_id,
        amount,
        action,
        created_at
       FROM ad_credit_usage_log
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [company_id, parseInt(limit)]);
        const history = result.rows.map((row) => ({
            id: row.id,
            campaign_id: row.campaign_id,
            amount_sgd: (row.amount / 100).toFixed(2),
            action: row.action,
            timestamp: new Date(row.created_at).toLocaleString()
        }));
        res.json({
            success: true,
            data: history,
            total: history.length
        });
    }
    catch (error) {
        console.error('Get usage history error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch usage history' });
    }
});
// GET /api/ad-credits/monthly-breakdown - Get monthly credit stats
router.get('/monthly-breakdown', authMiddleware, async (req, res) => {
    try {
        const { company_id, months = '6' } = req.query;
        if (!company_id) {
            return res.status(400).json({ success: false, error: 'company_id required' });
        }
        const result = await db.query(`SELECT
        month,
        allocated_amount,
        used_amount,
        expires_at
       FROM subscription_ad_credits
       WHERE company_id = $1
       ORDER BY expires_at DESC
       LIMIT $2`, [company_id, parseInt(months)]);
        const breakdown = result.rows.map((row) => ({
            month: row.month,
            allocated_sgd: (row.allocated_amount / 100).toFixed(2),
            used_sgd: (row.used_amount / 100).toFixed(2),
            remaining_sgd: ((row.allocated_amount - row.used_amount) / 100).toFixed(2),
            usage_percentage: ((row.used_amount / row.allocated_amount) * 100).toFixed(1),
            expires_at: new Date(row.expires_at).toLocaleDateString()
        }));
        res.json({
            success: true,
            data: breakdown,
            total_months: breakdown.length
        });
    }
    catch (error) {
        console.error('Get monthly breakdown error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch monthly breakdown' });
    }
});
// GET /api/ad-credits/campaigns-spending - Get spending by campaign
router.get('/campaigns-spending', authMiddleware, async (req, res) => {
    try {
        const { company_id } = req.query;
        if (!company_id) {
            return res.status(400).json({ success: false, error: 'company_id required' });
        }
        // Get campaigns and their budgets
        const result = await db.query(`SELECT
        c.id,
        c.title,
        c.budget,
        c.status,
        c.starts_at,
        c.approved_at
       FROM campaigns c
       WHERE c.company_id = $1
       AND c.status IN ('approved', 'live', 'paused', 'completed')
       ORDER BY c.approved_at DESC`, [company_id]);
        const spending = result.rows.map((row) => ({
            campaign_id: row.id,
            campaign_name: row.title,
            amount_sgd: row.budget.toFixed(2),
            status: row.status,
            approved_date: row.approved_at ? new Date(row.approved_at).toLocaleDateString() : 'N/A'
        }));
        const totalSpent = spending.reduce((sum, c) => sum + parseFloat(c.amount_sgd), 0);
        res.json({
            success: true,
            data: spending,
            summary: {
                total_campaigns: spending.length,
                total_spent_sgd: totalSpent.toFixed(2)
            }
        });
    }
    catch (error) {
        console.error('Get campaigns spending error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch campaigns spending' });
    }
});
// GET /api/ad-credits/alerts - Get credit usage alerts
router.get('/alerts', authMiddleware, async (req, res) => {
    try {
        const { company_id } = req.query;
        if (!company_id) {
            return res.status(400).json({ success: false, error: 'company_id required' });
        }
        const credits = await adCreditService.getCredits(parseInt(company_id));
        if (!credits) {
            return res.json({
                success: true,
                data: {
                    alerts: [],
                    critical: false,
                    message: 'No ad credits allocated. Subscribe to a plan to get advertising credits.'
                }
            });
        }
        const alerts = [];
        const usagePercentage = (credits.used_amount / credits.allocated_amount) * 100;
        // Alert if usage is high
        if (usagePercentage >= 90) {
            alerts.push({
                level: 'critical',
                message: `🚨 CRITICAL: ${usagePercentage.toFixed(1)}% of monthly ad credits used. Only SGD $${((credits.allocated_amount - credits.used_amount) / 100).toFixed(2)} remaining.`,
                action: 'Upgrade to next tier or wait for next month'
            });
        }
        else if (usagePercentage >= 75) {
            alerts.push({
                level: 'warning',
                message: `⚠️ WARNING: ${usagePercentage.toFixed(1)}% of monthly ad credits used. SGD $${((credits.allocated_amount - credits.used_amount) / 100).toFixed(2)} remaining.`,
                action: 'Consider planning campaigns carefully to avoid running out'
            });
        }
        else if (usagePercentage >= 50) {
            alerts.push({
                level: 'info',
                message: `ℹ️ INFO: Halfway through your ad credits for this month (${usagePercentage.toFixed(1)}% used).`,
                action: 'Monitor usage and plan for month end'
            });
        }
        // Alert if nearly expired
        const expiresAt = new Date(credits.expires_at);
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 3 && credits.allocated_amount - credits.used_amount > 0) {
            alerts.push({
                level: 'warning',
                message: `⏰ Your ad credits expire in ${daysUntilExpiry} day(s). Use them before they reset.`,
                action: 'Create campaigns before month ends'
            });
        }
        res.json({
            success: true,
            data: {
                alerts,
                critical: alerts.some(a => a.level === 'critical'),
                usage_percentage: usagePercentage.toFixed(1),
                remaining_sgd: ((credits.allocated_amount - credits.used_amount) / 100).toFixed(2),
                days_until_reset: daysUntilExpiry
            }
        });
    }
    catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
});
export default router;
