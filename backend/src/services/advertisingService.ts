import db from '../db.js';
import Stripe from 'stripe';
import { campaignModel, performanceModel, scheduleModel } from '../models/Campaign.js';
import { advertisingNotifications } from './advertisingNotifications.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export const advertisingService = {
  async approveCampaign(campaignId: number, adminId: number, adminNotes?: string): Promise<any> {
    const campaign = await campaignModel.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'submitted') throw new Error('Only submitted campaigns can be approved');

    try {
      const companyResult = await db.query('SELECT c.*, u.email as owner_email FROM companies c JOIN users u ON c.owner_id = u.id WHERE c.id = $1', [campaign.company_id]);
      if (companyResult.rows.length === 0) throw new Error('Company not found');
      const company = companyResult.rows[0];

      let stripeChargeId = `test_charge_${campaignId}_${Date.now()}`;
      
      await db.query(`INSERT INTO payment_holds_status (transaction_id, amount, status, hold_reason, created_at) VALUES ($1, $2, $3, $4, NOW())`, [`campaign_${campaignId}`, campaign.budget, 'held', `Advertising campaign hold: ${campaign.title}`]);
      
      await campaignModel.update(campaignId, {
        status: 'approved',
        stripe_charge_id: stripeChargeId,
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes,
      });

      await scheduleModel.create(campaignId, campaign.starts_at, 'start');
      await scheduleModel.create(campaignId, campaign.ends_at, 'end');

      await advertisingNotifications.notifyCampaignApproved({
        companyId: campaign.company_id,
        companyName: company.name,
        campaignId,
        campaignTitle: campaign.title,
        chargeAmount: campaign.budget,
      });

      return { success: true, campaignId, status: 'approved', stripeChargeId, message: `Campaign approved and payment of SGD $${campaign.budget.toFixed(2)} has been charged` };
    } catch (error) {
      console.error('[ADVERTISING] Campaign approval failed:', error);
      throw error;
    }
  },

  async rejectCampaign(campaignId: number, adminId: number, rejectionReason: string): Promise<any> {
    const campaign = await campaignModel.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    await campaignModel.update(campaignId, { status: 'rejected', rejection_reason: rejectionReason, admin_notes: rejectionReason });

    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [campaign.company_id]);
    const companyName = companyResult.rows[0]?.name || 'Unknown';

    await advertisingNotifications.notifyCampaignRejected({
      companyId: campaign.company_id,
      companyName,
      campaignId,
      campaignTitle: campaign.title,
      rejectionReason,
    });

    return { success: true, campaignId, status: 'rejected', rejectionReason, message: 'Campaign rejected and company notified' };
  },

  async startCampaign(campaignId: number): Promise<void> {
    const campaign = await campaignModel.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    await campaignModel.update(campaignId, { status: 'live' });

    const placements = ['homepage_banner', 'browse_sidebar', 'email_newsletter', 'company_profile'];
    for (const placement of placements) {
      await db.query(`INSERT INTO ad_placements (campaign_id, placement_type, impressions, clicks, created_at, updated_at) VALUES ($1, $2, 0, 0, NOW(), NOW())`, [campaignId, placement]);
    }

    await advertisingNotifications.notifyCampaignStarted(campaignId, campaign.title, campaign.company_id);
    console.log(`[ADVERTISING] Campaign ${campaignId} started and is now live`);
  },

  async endCampaign(campaignId: number): Promise<void> {
    const campaign = await campaignModel.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    await campaignModel.update(campaignId, { status: 'expired' });

    const performanceResult = await db.query(`SELECT SUM(impressions) as total_impressions, SUM(clicks) as total_clicks, SUM(spend) as total_spend FROM campaign_performance WHERE campaign_id = $1`, [campaignId]);
    const stats = performanceResult.rows[0] || { total_impressions: 0, total_clicks: 0, total_spend: 0 };

    await db.query(`UPDATE payment_holds_status SET status = 'released', released_at = NOW() WHERE transaction_id = $1`, [`campaign_${campaignId}`]);

    const finalStats = {
      totalImpressions: parseInt(stats.total_impressions) || 0,
      totalClicks: parseInt(stats.total_clicks) || 0,
      totalSpend: parseFloat(stats.total_spend) || 0,
      ctr: stats.total_impressions > 0 ? ((stats.total_clicks / stats.total_impressions) * 100) : 0,
    };

    await advertisingNotifications.notifyCampaignEnded(campaignId, campaign.title, campaign.company_id, finalStats);
    console.log(`[ADVERTISING] Campaign ${campaignId} ended. Final stats:`, finalStats);
  },

  async pauseCampaign(campaignId: number): Promise<void> {
    const campaign = await campaignModel.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'live') throw new Error('Only live campaigns can be paused');
    await campaignModel.update(campaignId, { status: 'paused' });
  },

  async resumeCampaign(campaignId: number): Promise<void> {
    const campaign = await campaignModel.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'paused') throw new Error('Only paused campaigns can be resumed');
    if (new Date(campaign.ends_at) < new Date()) throw new Error('Campaign end date has passed');
    await campaignModel.update(campaignId, { status: 'live' });
  },

  async generateMockPerformance(): Promise<void> {
    try {
      const activeCampaigns = await campaignModel.getActiveCampaigns();
      for (const campaign of activeCampaigns) {
        const baseImpressions = Math.floor(Math.random() * 500) + 100;
        const ctr = Math.random() * 0.1 + 0.02;
        const clicks = Math.floor(baseImpressions * ctr);
        const dailySpend = (campaign.budget / campaign.duration_days) * (0.8 + Math.random() * 0.4);
        const today = new Date().toISOString().split('T')[0];
        await performanceModel.upsert(campaign.id, today, baseImpressions, clicks, dailySpend);
        const totalSpentResult = await db.query('SELECT COALESCE(SUM(spend), 0) as total_spend FROM campaign_performance WHERE campaign_id = $1', [campaign.id]);
        const totalSpent = parseFloat(totalSpentResult.rows[0]?.total_spend) || 0;
        await campaignModel.update(campaign.id, { spent: totalSpent });
        if (totalSpent > campaign.budget * 0.8 && totalSpent < campaign.budget * 0.85) {
          await advertisingNotifications.notifyBudgetWarning(campaign.id, campaign.title, campaign.company_id, totalSpent, campaign.budget);
        }
        console.log(`[ADVERTISING] Generated mock data for campaign ${campaign.id}: ${baseImpressions} impressions, ${clicks} clicks`);
      }
    } catch (error) {
      console.error('[ADVERTISING] Failed to generate mock performance:', error);
    }
  },
};
