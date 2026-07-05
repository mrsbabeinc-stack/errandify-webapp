import db from '../db.js';
export const activityLogService = {
    async logActivity(errandId, activityType, actorId, actorName, actorRole, details) {
        try {
            await db.query(`INSERT INTO errand_activity_log (errand_id, activity_type, actor_id, actor_name, actor_role, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [
                errandId,
                activityType,
                actorId,
                actorName,
                actorRole,
                details ? JSON.stringify(details) : null,
            ]);
            console.log(`[ActivityLog] Logged ${activityType} for errand ${errandId}`);
        }
        catch (error) {
            console.error(`[ActivityLog] Failed to log activity:`, error);
            // Don't throw - logging shouldn't break the main flow
        }
    },
    async logPosted(errandId, askerName, askerId, askerAlias) {
        await this.logActivity(errandId, 'posted', askerId, askerName, 'asker', {
            alias: askerAlias || undefined
        });
    },
    async logBidPlaced(errandId, doerName, doerId, amount, offerId, alias) {
        await this.logActivity(errandId, 'bid_placed', doerId, doerName, 'doer', {
            amount,
            offerId: offerId || undefined,
            alias: alias || undefined
        });
    },
    async logBidAccepted(errandId, askerName, askerId, askerAlias) {
        await this.logActivity(errandId, 'bid_accepted', askerId, askerName, 'asker', {
            alias: askerAlias || undefined
        });
    },
    async logBidRejected(errandId, doerName, doerId, doerAlias) {
        await this.logActivity(errandId, 'bid_rejected', doerId, doerName, 'doer', {
            alias: doerAlias || undefined
        });
    },
    async logConfirmed(errandId) {
        await this.logActivity(errandId, 'confirmed', null, 'System', 'asker');
    },
    async logStarted(errandId, doerName, doerId, doerAlias, errandFormattedId) {
        await this.logActivity(errandId, 'started', doerId, doerName, 'doer', {
            alias: doerAlias || undefined,
            errandId: errandFormattedId || undefined
        });
    },
    async logCompleted(errandId, doerName, doerId, details) {
        // Include errandId in details if not already present
        const completeDetails = {
            ...details,
            errandId: details?.errandId || undefined
        };
        await this.logActivity(errandId, 'completed', doerId, doerName, 'doer', completeDetails);
    },
    async logReviewSubmitted(errandId, askerName, askerId, review) {
        await this.logActivity(errandId, 'review_submitted', askerId, askerName, 'asker', { review });
    },
    async logRatingSubmitted(errandId, actorName, actorId, actorRole, rating) {
        await this.logActivity(errandId, 'rating_submitted', actorId, actorName, actorRole, { rating });
    },
    async logChangesRequested(errandId, askerName, askerId, reason) {
        await this.logActivity(errandId, 'changes_requested', askerId, askerName, 'asker', { reason });
    },
    async logDisputeRaised(errandId, raisedByName, raisedById, raisedByRole, reason) {
        await this.logActivity(errandId, 'dispute_raised', raisedById, raisedByName, raisedByRole, { reason });
    },
    async logDisputeResolved(errandId, resolution) {
        await this.logActivity(errandId, 'dispute_resolved', null, 'Admin', 'asker', { resolution });
    },
    async logResubmitted(errandId, doerName, doerId, doerAlias, errandFormattedId) {
        await this.logActivity(errandId, 'resubmitted', doerId, doerName, 'doer', {
            alias: doerAlias || undefined,
            errandId: errandFormattedId || undefined
        });
    },
    async logClosed(errandId) {
        await this.logActivity(errandId, 'closed', null, 'System', 'asker');
    },
    async logPaymentReleased(errandId, doerName, doerId, amount) {
        await this.logActivity(errandId, 'payment_released', doerId, doerName, 'doer', { amount });
    },
    async logRefunded(errandId, askerName, askerId, amount) {
        await this.logActivity(errandId, 'refunded', askerId, askerName, 'asker', { amount });
    },
    async logCancelled(errandId, cancelledByName, cancelledById, cancelledByRole, reason) {
        await this.logActivity(errandId, 'cancelled', cancelledById, cancelledByName, cancelledByRole, { reason });
    },
    async logReopened(errandId, reopenedByName, reopenedById, reopenedByRole) {
        await this.logActivity(errandId, 'reopened', reopenedById, reopenedByName, reopenedByRole);
    },
};
