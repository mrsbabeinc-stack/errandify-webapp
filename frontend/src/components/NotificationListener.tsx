import { useEffect, useState, useRef } from 'react';
import { useToastNotifications } from '../hooks/useToastNotifications';
import axios from 'axios';

// The API serialises these camelCase (createdAt / read / relatedErrandId); the
// snake_case variants are kept optional because other callers still send them.
interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_errand_id?: number;
  relatedErrandId?: number;
  is_read?: boolean;
  read?: boolean;
  created_at?: string;
  createdAt?: string;
}

const notificationTime = (n: Notification): number =>
  new Date(n.createdAt ?? n.created_at ?? 0).getTime();

const notificationIsRead = (n: Notification): boolean => n.read ?? n.is_read ?? false;

interface Errand {
  id: number;
  title: string;
  deadline: string;
  status: string;
  asker_id: number;
  created_at?: string;
}

export default function NotificationListener() {
  const {
    showNewOfferToast,
    showNewMessageToast,
    showOfferAcceptedToast,
    showJobCompletedToast,
    showCompletionReceivedToast,
    showPaymentReleasedToast,
    showRatingReceivedToast,
    showErrandStartReminderToast,
    showNoOffersReminderToast,
    showPotentialDoersReminderToast,
  } = useToastNotifications();

  const [lastNotificationTime, setLastNotificationTime] = useState<number>(Date.now());
  const [shownReminders, setShownReminders] = useState<Set<number>>(new Set());
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendEmailReminder = async (token: string, type: 'no_offers' | 'start', errand: Errand, userEmail: string) => {
    try {
      const timeUntilStart = (() => {
        const now = new Date();
        const deadline = new Date(errand.deadline);
        const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil < 1
          ? `in ${Math.round(hoursUntil * 60)} minutes`
          : `in ${Math.round(hoursUntil)} hour${Math.round(hoursUntil) !== 1 ? 's' : ''}`;
      })();

      if (type === 'no_offers') {
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email/send-no-offers-reminder`,
          {
            email: userEmail,
            errandTitle: errand.title,
            errandId: errand.id,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('[Reminder] No offers email sent for errand:', errand.id);
      } else if (type === 'start') {
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email/send-errand-start-reminder`,
          {
            email: userEmail,
            errandTitle: errand.title,
            errandId: errand.id,
            timeUntilStart,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('[Reminder] Errand start email sent for errand:', errand.id);
      }
    } catch (error) {
      console.error('[Reminder] Failed to send email reminder:', error);
    }
  };

  const checkReminders = async (token: string) => {
    try {
      // Fetch user's errands to check for reminders
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?myOnly=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const errands = response.data.data || [];

      // Get current user's email
      const user = localStorage.getItem('user');
      const userEmail = user ? JSON.parse(user).email : '';

      errands.forEach((errand: Errand) => {
        // Skip if we already showed this reminder today
        if (shownReminders.has(errand.id)) {
          return;
        }

        const now = new Date();
        const deadline = new Date(errand.deadline);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Reminder 1: Errand starting soon (within 2 hours)
        if (errand.status === 'confirmed' && hoursUntilDeadline > 0 && hoursUntilDeadline <= 2) {
          const timeUntilStart = hoursUntilDeadline < 1
            ? `in ${Math.round(hoursUntilDeadline * 60)} minutes`
            : `in ${Math.round(hoursUntilDeadline)} hour${Math.round(hoursUntilDeadline) !== 1 ? 's' : ''}`;
          showErrandStartReminderToast(errand.title, timeUntilStart, errand.id);

          // Also send email reminder (works for both online and offline users)
          if (userEmail) {
            sendEmailReminder(token, 'start', errand, userEmail);
          }

          setShownReminders((prev) => new Set([...prev, errand.id]));
        }

        // Reminder 2: No offers received yet (after 6+ hours since posting)
        if (errand.status === 'open') {
          const createdAt = new Date(errand.created_at || now);
          const hoursSincePosted = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          if (hoursSincePosted >= 6) {
            showNoOffersReminderToast(errand.title, errand.id);

            // Also send email reminder (works for offline users especially)
            if (userEmail) {
              sendEmailReminder(token, 'no_offers', errand, userEmail);
            }

            setShownReminders((prev) => new Set([...prev, errand.id]));
          }
        }
      });
    } catch (error) {
      console.error('Failed to check reminders:', error);
    }
  };

  useEffect(() => {
    // Poll for new notifications every 10 seconds
    const pollNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // The endpoint returns { data: { notifications: [...] } }. This read
        // `response.data.data` as the array, which is an OBJECT, so it always
        // fell through to [] — no toast has ever fired.
        const payload = response.data?.data;
        const notifications: Notification[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.notifications)
            ? payload.notifications
            : [];

        // Only show toasts for NEW notifications (created after lastNotificationTime)
        notifications.forEach((notification) => {
          if (notificationTime(notification) > lastNotificationTime && !notificationIsRead(notification)) {
            handleNotification(notification);
          }
        });

        // Update last notification time
        if (notifications.length > 0) {
          const newestTime = Math.max(...notifications.map(notificationTime));
          setLastNotificationTime(newestTime);
        }

        // Check for reminders (errand start, no offers, etc.)
        await checkReminders(token);
      } catch (error) {
        console.error('Failed to poll notifications:', error);
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(pollNotifications, 10000);

    // Initial poll immediately
    pollNotifications();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [lastNotificationTime, shownReminders]);

  const handleNotification = (notification: Notification) => {
    const { type, message } = notification;
    const related_errand_id = notification.relatedErrandId ?? notification.related_errand_id;

    switch (type) {
      case 'bid_placed':
        // Extract doer name and amount from message
        const bidMatch = message.match(/(\w+) has placed an offer for \$(.+)/);
        if (bidMatch) {
          showNewOfferToast(bidMatch[1], parseFloat(bidMatch[2]), related_errand_id);
        }
        break;

      case 'message_received':
        // Extract sender name and preview from message
        const msgMatch = message.match(/(.+): (.+)/);
        if (msgMatch) {
          const preview = msgMatch[2].substring(0, 50);
          showNewMessageToast(msgMatch[1], related_errand_id, preview);
        }
        break;

      case 'bid_accepted':
        // Message format: "Your offer of $X for "Title" was accepted!"
        showOfferAcceptedToast(message, related_errand_id);
        break;

      case 'completion_submitted':
        // Extract doer name
        const doerMatch = message.match(/(\w+) submitted/);
        if (doerMatch) {
          showCompletionReceivedToast(doerMatch[1], related_errand_id);
        }
        break;

      case 'payment_released':
        // Extract amount from message
        const paymentMatch = message.match(/\$(.+)/);
        if (paymentMatch) {
          showPaymentReleasedToast(parseFloat(paymentMatch[1]));
        }
        break;

      case 'rating_submitted':
        // Extract rater name and rating
        const ratingMatch = message.match(/(\w+) gave you (\d+) stars/);
        if (ratingMatch) {
          showRatingReceivedToast(ratingMatch[1], parseInt(ratingMatch[2]), related_errand_id);
        }
        break;

      case 'job_started':
        showJobCompletedToast('Job started', related_errand_id);
        break;

      default:
        // Generic toast for other notification types
        console.log(`Notification type ${type} not handled for toast`);
    }
  };

  // This component doesn't render anything, just handles notifications
  return null;
}
