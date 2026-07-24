import db from '../db.js';

export const activityLogService = {
  async logActivity(
    errandId: number | string,
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

  async logPosted(errandId: number | string, askerName: string, askerId: number, askerAlias?: string) {
    await this.logActivity(errandId, 'posted', askerId, askerName, 'asker', {
      alias: askerAlias || undefined
    });
  },

  async logBidPlaced(errandId: number | string, doerName: string, doerId: number, amount: number, offerId?: string, alias?: string) {
    await this.logActivity(errandId, 'bid_placed', doerId, doerName, 'doer', {
      amount,
      offerId: offerId || undefined,
      alias: alias || undefined
    });
  },

  async logBidAccepted(errandId: number | string, askerName: string, askerId: number, askerAlias?: string) {
    await this.logActivity(errandId, 'bid_accepted', askerId, askerName, 'asker', {
      alias: askerAlias || undefined
    });
  },

  async logBidRejected(errandId: number | string, doerName: string, doerId: number, doerAlias?: string) {
    await this.logActivity(errandId, 'bid_rejected', doerId, doerName, 'doer', {
      alias: doerAlias || undefined
    });
  },

  async logConfirmed(errandId: number | string) {
    await this.logActivity(errandId, 'confirmed', null, 'System', 'asker');
  },

  async logStarted(errandId: number | string, doerName: string, doerId: number, doerAlias?: string, errandFormattedId?: string) {
    await this.logActivity(errandId, 'started', doerId, doerName, 'doer', {
      alias: doerAlias || undefined,
      errandId: errandFormattedId || undefined
    });
  },

  async logCompleted(errandId: number | string, doerName: string, doerId: number, details?: Record<string, any>) {
    // Include errandId in details if not already present
    const completeDetails = {
      ...details,
      errandId: details?.errandId || undefined
    };
    await this.logActivity(errandId, 'completed', doerId, doerName, 'doer', completeDetails);
  },

  async logReviewSubmitted(errandId: number | string, askerName: string, askerId: number, review: string) {
    await this.logActivity(errandId, 'review_submitted', askerId, askerName, 'asker', { review });
  },

  async logRatingSubmitted(errandId: number | string, actorName: string, actorId: number, actorRole: 'asker' | 'doer', rating: number) {
    await this.logActivity(errandId, 'rating_submitted', actorId, actorName, actorRole, { rating });
  },

  async logChangesRequested(errandId: number | string, askerName: string, askerId: number, reason: string) {
    await this.logActivity(errandId, 'changes_requested', askerId, askerName, 'asker', { reason });
  },

  async logDisputeRaised(errandId: number | string, raisedByName: string, raisedById: number, raisedByRole: 'asker' | 'doer', reason?: string) {
    await this.logActivity(errandId, 'dispute_raised', raisedById, raisedByName, raisedByRole, { reason });
  },

  async logDisputeResolved(errandId: number | string, resolution: string) {
    await this.logActivity(errandId, 'dispute_resolved', null, 'Admin', 'asker', { resolution });
  },

  async logResubmitted(errandId: number | string, doerName: string, doerId: number, doerAlias?: string, errandFormattedId?: string) {
    await this.logActivity(errandId, 'resubmitted', doerId, doerName, 'doer', {
      alias: doerAlias || undefined,
      errandId: errandFormattedId || undefined
    });
  },

  async logClosed(errandId: number | string) {
    await this.logActivity(errandId, 'closed', null, 'System', 'asker');
  },

  async logPaymentReleased(errandId: number | string, doerName: string, doerId: number, amount?: number) {
    await this.logActivity(errandId, 'payment_released', doerId, doerName, 'doer', { amount });
  },

  async logRefunded(errandId: number | string, askerName: string, askerId: number, amount?: number) {
    await this.logActivity(errandId, 'refunded', askerId, askerName, 'asker', { amount });
  },

  async logCancelled(errandId: number | string, cancelledByName: string, cancelledById: number, cancelledByRole: 'asker' | 'doer', reason?: string) {
    await this.logActivity(errandId, 'cancelled', cancelledById, cancelledByName, cancelledByRole, { reason });
  },

  async logReopened(errandId: number | string, reopenedByName: string, reopenedById: number, reopenedByRole: 'asker' | 'doer') {
    await this.logActivity(errandId, 'reopened', reopenedById, reopenedByName, reopenedByRole);
  },
};
