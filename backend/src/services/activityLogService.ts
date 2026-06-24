import db from '../db.js';

export const activityLogService = {
  async logActivity(
    errandId: number,
    activityType: string,
    actorId: number | null,
    actorName: string,
    actorRole: 'asker' | 'doer',
    details?: Record<string, any>
  ) {
    try {
      await db.query(
        `INSERT INTO errand_activity_log (errand_id, activity_type, actor_id, actor_name, actor_role, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          errandId,
          activityType,
          actorId,
          actorName,
          actorRole,
          details ? JSON.stringify(details) : null,
        ]
      );
      console.log(`[ActivityLog] Logged ${activityType} for errand ${errandId}`);
    } catch (error) {
      console.error(`[ActivityLog] Failed to log activity:`, error);
      // Don't throw - logging shouldn't break the main flow
    }
  },

  async logPosted(errandId: number, askerName: string, askerId: number) {
    await this.logActivity(errandId, 'posted', askerId, askerName, 'asker');
  },

  async logBidPlaced(errandId: number, doerName: string, doerId: number, amount: number) {
    await this.logActivity(errandId, 'bid_placed', doerId, doerName, 'doer', { amount });
  },

  async logBidAccepted(errandId: number, askerName: string, askerId: number) {
    await this.logActivity(errandId, 'bid_accepted', askerId, askerName, 'asker');
  },

  async logBidRejected(errandId: number, doerName: string, doerId: number) {
    await this.logActivity(errandId, 'bid_rejected', doerId, doerName, 'doer');
  },

  async logConfirmed(errandId: number) {
    await this.logActivity(errandId, 'confirmed', null, 'System', 'asker');
  },

  async logStarted(errandId: number, doerName: string, doerId: number) {
    await this.logActivity(errandId, 'started', doerId, doerName, 'doer');
  },

  async logCompleted(errandId: number, doerName: string, doerId: number, details?: Record<string, any>) {
    await this.logActivity(errandId, 'completed', doerId, doerName, 'doer', details);
  },

  async logReviewSubmitted(errandId: number, askerName: string, askerId: number, review: string) {
    await this.logActivity(errandId, 'review_submitted', askerId, askerName, 'asker', { review });
  },

  async logRatingSubmitted(errandId: number, actorName: string, actorId: number, actorRole: 'asker' | 'doer', rating: number) {
    await this.logActivity(errandId, 'rating_submitted', actorId, actorName, actorRole, { rating });
  },

  async logChangesRequested(errandId: number, askerName: string, askerId: number, reason: string) {
    await this.logActivity(errandId, 'changes_requested', askerId, askerName, 'asker', { reason });
  },

  async logDisputeRaised(errandId: number, raisedByName: string, raisedById: number, raisedByRole: 'asker' | 'doer') {
    await this.logActivity(errandId, 'dispute_raised', raisedById, raisedByName, raisedByRole);
  },

  async logDisputeResolved(errandId: number, resolution: string) {
    await this.logActivity(errandId, 'dispute_resolved', null, 'Admin', 'asker', { resolution });
  },
};
