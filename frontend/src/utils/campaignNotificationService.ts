import axios from 'axios';

interface CampaignNotification {
  id: string;
  campaignName: string;
  subject: string;
  recipients: number;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: string;
  scheduledDate?: string;
}

export const campaignNotificationService = {
  // Send campaign creation notification to admins
  notifyCampaignCreated: async (campaign: CampaignNotification, token: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/campaign-created`,
        {
          campaignId: campaign.id,
          campaignName: campaign.campaignName,
          subject: campaign.subject,
          recipients: campaign.recipients,
          status: campaign.status,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('[Campaign] Notification sent for campaign:', campaign.id);
    } catch (error) {
      console.error('[Campaign] Failed to send creation notification:', error);
    }
  },

  // Send scheduled campaign reminder
  notifyScheduledCampaign: async (campaign: CampaignNotification, token: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/campaign-scheduled`,
        {
          campaignId: campaign.id,
          campaignName: campaign.campaignName,
          scheduledDate: campaign.scheduledDate,
          recipients: campaign.recipients,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('[Campaign] Scheduled notification sent for campaign:', campaign.id);
    } catch (error) {
      console.error('[Campaign] Failed to send scheduled notification:', error);
    }
  },

  // Send campaign sent confirmation
  notifyCampaignSent: async (campaign: CampaignNotification, token: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/campaign-sent`,
        {
          campaignId: campaign.id,
          campaignName: campaign.campaignName,
          recipients: campaign.recipients,
          subject: campaign.subject,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('[Campaign] Sent notification for campaign:', campaign.id);
    } catch (error) {
      console.error('[Campaign] Failed to send notification:', error);
    }
  },

  // Show local toast notifications
  showCampaignCreatedToast: () => {
    if (typeof window !== 'undefined' && window.toastr) {
      window.toastr?.success('Campaign created successfully! ✅', 'Email Campaign');
    }
  },

  showCampaignScheduledToast: (date: string) => {
    if (typeof window !== 'undefined' && window.toastr) {
      window.toastr?.info(`Campaign scheduled for ${date}`, 'Email Campaign');
    }
  },

  showCampaignSentToast: (recipients: number) => {
    if (typeof window !== 'undefined' && window.toastr) {
      window.toastr?.success(`Campaign sent to ${recipients.toLocaleString()} recipients! 📧`, 'Email Campaign');
    }
  },

  showCampaignDeletedToast: () => {
    if (typeof window !== 'undefined' && window.toastr) {
      window.toastr?.warning('Campaign deleted', 'Email Campaign');
    }
  },
};
