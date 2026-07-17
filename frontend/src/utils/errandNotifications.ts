/**
 * Errand expiration notification utilities
 * Handles reminding askers and doers about expiring offers
 */

export interface ErrandExpirationCheck {
  isExpired: boolean;
  hoursUntilExpiry: number;
  isClosingToDeadline: boolean; // Within 24 hours
  isDaysAway: boolean; // More than 24 hours away
  message: string;
}

export const checkErrandExpiration = (deadline: string | undefined): ErrandExpirationCheck => {
  if (!deadline) {
    return {
      isExpired: false,
      hoursUntilExpiry: Infinity,
      isClosingToDeadline: false,
      isDaysAway: false,
      message: 'No deadline set',
    };
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const timeUntilExpiry = deadlineDate.getTime() - now.getTime();
  const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
  const daysUntilExpiry = hoursUntilExpiry / 24;

  if (hoursUntilExpiry < 0) {
    return {
      isExpired: true,
      hoursUntilExpiry: 0,
      isClosingToDeadline: false,
      isDaysAway: false,
      message: '⏰ EXPIRED - No longer accepting offers',
    };
  }

  if (hoursUntilExpiry < 24) {
    return {
      isExpired: false,
      hoursUntilExpiry,
      isClosingToDeadline: true,
      isDaysAway: false,
      message: `🚨 CLOSING SOON - ${Math.ceil(hoursUntilExpiry)} hours left to respond to offers`,
    };
  }

  return {
    isExpired: false,
    hoursUntilExpiry,
    isClosingToDeadline: false,
    isDaysAway: true,
    message: `📅 ${Math.floor(daysUntilExpiry)} days remaining to review offers`,
  };
};

/**
 * Get notification copy for asker (before expiration)
 */
export const getAskerPreExpirationNotification = (bidCount: number, hoursUntilExpiry: number) => {
  if (hoursUntilExpiry < 1) {
    return {
      title: '🚨 URGENT: Offers Expiring Soon!',
      body: `You have ${bidCount} offer${bidCount !== 1 ? 's' : ''} to review before they expire in less than 1 hour!`,
      urgency: 'critical',
    };
  }
  if (hoursUntilExpiry < 6) {
    return {
      title: '⚠️ Review Offers Now',
      body: `${bidCount} offer${bidCount !== 1 ? 's' : ''} waiting - Deadline in ${Math.ceil(hoursUntilExpiry)} hours`,
      urgency: 'high',
    };
  }
  if (hoursUntilExpiry < 24) {
    return {
      title: '📬 Don\'t forget to review offers',
      body: `You have ${bidCount} offer${bidCount !== 1 ? 's' : ''} to review before the deadline`,
      urgency: 'medium',
    };
  }

  return {
    title: '📋 Remember to review offers',
    body: `${bidCount} doer${bidCount !== 1 ? 's' : ''} have offered to help - Review and choose the best one!`,
    urgency: 'low',
  };
};

/**
 * Get notification copy for doers (after expiration)
 */
export const getDoerExpiredNotification = (errandTitle: string, askerName: string) => {
  return {
    title: '⏰ Offer Expired',
    body: `Your offer for "${errandTitle}" from ${askerName} has expired. The asker did not respond in time.`,
    urgency: 'info',
  };
};

/**
 * Get notification copy for asker (after offers expire)
 */
export const getAskerExpirationNotification = (bidCount: number, errandTitle: string) => {
  return {
    title: '⏳ Offers Expired',
    body: `${bidCount} offer${bidCount !== 1 ? 's' : ''} for "${errandTitle}" have expired. You can post again or contact interested doers directly.`,
    urgency: 'warning',
  };
};
