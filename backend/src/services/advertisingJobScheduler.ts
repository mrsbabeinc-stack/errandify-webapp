import db from '../db.js';
import { scheduleModel } from '../models/Campaign.js';
import { advertisingService } from './advertisingService.js';

export const advertisingJobScheduler = {
  async checkAndExecuteSchedules(): Promise<void> {
    try {
      console.log('[AD_SCHEDULER] Checking for due schedule actions...');
      const pendingSchedules = await scheduleModel.getPending();
      console.log(`[AD_SCHEDULER] Found ${pendingSchedules.length} pending schedules`);
      for (const schedule of pendingSchedules) {
        try {
          if (schedule.action === 'start') {
            await advertisingService.startCampaign(schedule.campaign_id);
          } else if (schedule.action === 'end') {
            await advertisingService.endCampaign(schedule.campaign_id);
          }
          await scheduleModel.markExecuted(schedule.id);
        } catch (error) {
          console.error(`[AD_SCHEDULER] Error executing schedule ${schedule.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[AD_SCHEDULER] Schedule check failed:', error);
    }
  },

  async generateDailyPerformance(): Promise<void> {
    try {
      console.log('[AD_SCHEDULER] Generating daily performance data...');
      await advertisingService.generateMockPerformance();
      console.log('[AD_SCHEDULER] Daily performance generation complete');
    } catch (error) {
      console.error('[AD_SCHEDULER] Failed to generate daily performance:', error);
    }
  },

  async cleanupOldSchedules(): Promise<void> {
    try {
      console.log('[AD_SCHEDULER] Cleaning up old executed schedules...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await db.query(`DELETE FROM ad_schedules WHERE executed_at IS NOT NULL AND executed_at < $1`, [thirtyDaysAgo.toISOString()]);
      console.log(`[AD_SCHEDULER] Cleaned up old schedules`);
    } catch (error) {
      console.error('[AD_SCHEDULER] Cleanup failed:', error);
    }
  },

  async archiveExpiredCampaigns(): Promise<void> {
    try {
      console.log('[AD_SCHEDULER] Archiving expired campaigns...');
      const expiredResult = await db.query(`SELECT id FROM campaigns WHERE status IN ('live', 'approved') AND ends_at < NOW()`, []);
      for (const campaign of expiredResult.rows) {
        try {
          await advertisingService.endCampaign(campaign.id);
        } catch (error) {
          console.error(`[AD_SCHEDULER] Error archiving campaign ${campaign.id}:`, error);
        }
      }
      console.log(`[AD_SCHEDULER] Archived ${expiredResult.rows.length} expired campaigns`);
    } catch (error) {
      console.error('[AD_SCHEDULER] Archive failed:', error);
    }
  },
};
