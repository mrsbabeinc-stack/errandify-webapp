import { useNotificationToast } from '../context/NotificationContext';

export function useToastNotifications() {
  const { addToast } = useNotificationToast();

  const showNewOfferToast = (doerName: string, amount: number, errandId: number) => {
    addToast({
      type: 'info',
      title: '💰 New Offer',
      body: `${doerName} offered $${amount} for your errand`,
      icon: '💰',
      actionLabel: 'View',
      actionUrl: `/errands/${errandId}`,
      duration: 5000,
    });
  };

  const showNewMessageToast = (senderName: string, errandId: number, preview: string) => {
    addToast({
      type: 'info',
      title: '💬 New Message',
      body: `${senderName}: ${preview}`,
      icon: '💬',
      actionLabel: 'Open Chat',
      actionUrl: `/errand/${errandId}`,
      duration: 5000,
    });
  };

  const showOfferAcceptedToast = (errandTitle: string, errandId: number) => {
    addToast({
      type: 'success',
      title: '✅ Offer Accepted',
      body: `Your offer for "${errandTitle}" was accepted!`,
      icon: '✅',
      actionLabel: 'View',
      actionUrl: `/errands/${errandId}`,
      duration: 5000,
    });
  };

  const showOfferRejectedToast = (errandTitle: string) => {
    addToast({
      type: 'warning',
      title: '❌ Offer Not Selected',
      body: `Your offer for "${errandTitle}" wasn't chosen. Keep trying!`,
      icon: '❌',
      duration: 5000,
    });
  };

  const showJobStartedToast = (errandTitle: string, errandId: number) => {
    addToast({
      type: 'success',
      title: '⏱️ Job Started',
      body: `You've started "${errandTitle}"`,
      icon: '⏱️',
      actionLabel: 'View Details',
      actionUrl: `/errands/${errandId}`,
      duration: 5000,
    });
  };

  const showJobCompletedToast = (errandTitle: string, errandId: number) => {
    addToast({
      type: 'success',
      title: '✨ Job Completed',
      body: `You've completed "${errandTitle}". Waiting for review!`,
      icon: '✨',
      actionLabel: 'View',
      actionUrl: `/errands/${errandId}`,
      duration: 5000,
    });
  };

  const showCompletionReceivedToast = (doerName: string, errandId: number) => {
    addToast({
      type: 'info',
      title: '📸 Completion Received',
      body: `${doerName} submitted their work. Time to review!`,
      icon: '📸',
      actionLabel: 'Review',
      actionUrl: `/review-completion/${errandId}`,
      duration: 5000,
    });
  };

  const showPaymentReleasedToast = (amount: number) => {
    addToast({
      type: 'success',
      title: '💸 Payment Released',
      body: `SGD $${amount} has been paid to your account`,
      icon: '💸',
      duration: 5000,
    });
  };

  const showRatingReceivedToast = (ratingName: string, rating: number, errandId: number) => {
    addToast({
      type: 'success',
      title: `⭐ Rating Received`,
      body: `${ratingName} gave you ${rating} stars!`,
      icon: '⭐',
      actionLabel: 'View',
      actionUrl: `/errands/${errandId}`,
      duration: 5000,
    });
  };

  const showDisputeRaisedToast = (errandTitle: string, errandId: number) => {
    addToast({
      type: 'warning',
      title: '⚠️ Dispute Raised',
      body: `A dispute was raised for "${errandTitle}"`,
      icon: '⚠️',
      actionLabel: 'View',
      actionUrl: `/errands/${errandId}`,
      duration: 5000,
    });
  };

  const showErrandCancelledToast = (errandTitle: string) => {
    addToast({
      type: 'warning',
      title: '🚫 Errand Cancelled',
      body: `"${errandTitle}" was cancelled`,
      icon: '🚫',
      duration: 5000,
    });
  };

  const showErrandStartReminderToast = (errandTitle: string, timeUntilStart: string, errandId: number) => {
    addToast({
      type: 'warning',
      title: '⏰ Errand Starting Soon',
      body: `"${errandTitle}" is starting ${timeUntilStart}. Get ready!`,
      icon: '⏰',
      actionLabel: 'View Details',
      actionUrl: `/errands/${errandId}`,
      duration: 7000,
    });
  };

  const showNoOffersReminderToast = (errandTitle: string, errandId: number) => {
    addToast({
      type: 'info',
      title: '📢 No Offers Yet',
      body: `"${errandTitle}" hasn't received any offers. Consider adjusting the budget or description.`,
      icon: '📢',
      actionLabel: 'Edit Errand',
      actionUrl: `/errand/${errandId}/edit`,
      duration: 6000,
    });
  };

  const showPotentialDoersReminderToast = (errandTitle: string, offerCount: number, errandId: number) => {
    addToast({
      type: 'info',
      title: '👥 Still Searching',
      body: `Only ${offerCount} doer interested in "${errandTitle}". More may come!`,
      icon: '👥',
      actionLabel: 'View Offers',
      actionUrl: `/errands/${errandId}`,
      duration: 6000,
    });
  };

  return {
    showNewOfferToast,
    showNewMessageToast,
    showOfferAcceptedToast,
    showOfferRejectedToast,
    showJobStartedToast,
    showJobCompletedToast,
    showCompletionReceivedToast,
    showPaymentReleasedToast,
    showRatingReceivedToast,
    showDisputeRaisedToast,
    showErrandCancelledToast,
    showErrandStartReminderToast,
    showNoOffersReminderToast,
    showPotentialDoersReminderToast,
  };
}
