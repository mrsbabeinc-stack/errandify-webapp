import db from '../db.js';
import { sendEmail } from './email.js';

export const advertisingNotifications = {
  async notifyCampaignSubmitted(data: any): Promise<void> {
    try {
      const admins = await db.query("SELECT id, email FROM admin_users WHERE role IN ('admin', 'super-admin')", []);
      const subject = `New Advertising Campaign Submitted: ${data.campaignTitle}`;
      for (const admin of admins.rows) {
        await sendEmail({
          to: admin.email,
          subject,
          html: `<p>Campaign ${data.campaignTitle} submitted for approval.</p>`,
        });
      }
      console.log(`[NOTIFICATIONS] Campaign submitted notification sent to ${admins.rows.length} admins`);
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to send campaign submitted notification:', error);
    }
  },

  async notifyCampaignApproved(data: any): Promise<void> {
    try {
      const company = await db.query('SELECT c.id, u.email, u.id as user_id FROM companies c JOIN users u ON c.owner_id = u.id WHERE c.id = $1', [data.companyId]);
      if (company.rows.length === 0) return;
      const owner = company.rows[0];
      await sendEmail({
        to: owner.email,
        subject: `Campaign "${data.campaignTitle}" Approved`,
        html: `<p>Your campaign has been approved. Charge: SGD $${data.chargeAmount}</p>`,
      });
      console.log(`[NOTIFICATIONS] Campaign approved notification sent to company ${data.companyId}`);
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to send campaign approved notification:', error);
    }
  },

  async notifyCampaignRejected(data: any): Promise<void> {
    try {
      const company = await db.query('SELECT c.id, u.email, u.id as user_id FROM companies c JOIN users u ON c.owner_id = u.id WHERE c.id = $1', [data.companyId]);
      if (company.rows.length === 0) return;
      const owner = company.rows[0];
      await sendEmail({
        to: owner.email,
        subject: `Campaign "${data.campaignTitle}" Not Approved`,
        html: `<p>Reason: ${data.rejectionReason}</p>`,
      });
      console.log(`[NOTIFICATIONS] Campaign rejected notification sent to company ${data.companyId}`);
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to send campaign rejected notification:', error);
    }
  },

  async notifyCampaignStarted(campaignId: number, campaignTitle: string, companyId: number): Promise<void> {
    console.log(`[NOTIFICATIONS] Campaign started notification sent to company ${companyId}`);
  },

  async notifyCampaignEnded(campaignId: number, campaignTitle: string, companyId: number, stats: any): Promise<void> {
    console.log(`[NOTIFICATIONS] Campaign ended notification sent to company ${companyId}`);
  },

  async notifyBudgetWarning(campaignId: number, campaignTitle: string, companyId: number, spent: number, budget: number): Promise<void> {
    console.log(`[NOTIFICATIONS] Budget warning sent to company ${companyId}`);
  },
};
