import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/email.js';
import {
  templateEventConfirmation,
  templateEventReminder7Days,
  templateEventReminder24Hours,
  templateEventReminder1Hour,
  templateEventReminderDayOf
} from '../templates/emailTemplates';

const router = Router();

/**
 * Send event confirmation email
 * POST /api/email/send-event-confirmation
 */
router.post('/send-event-confirmation', async (req: Request, res: Response) => {
  try {
    const { email, eventTitle, eventDate, eventTime, eventLocation, eventDescription } = req.body;

    if (!email || !eventTitle) {
      return res.status(400).json({
        success: false,
        error: 'Email and event title are required',
      });
    }

    // Get user name from token if available
    const user = (req as any).user;
    const userName = user?.display_name || 'Community Member';

    // Generate email template
    const htmlContent = templateEventConfirmation(
      userName,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      eventDescription
    );

    // Send email
    await sendEmail({
      to: email,
      subject: `✅ Event Confirmed: ${eventTitle}`,
      html: htmlContent,
    });

    res.json({
      success: true,
      message: 'Event confirmation email sent',
    });
  } catch (error: any) {
    console.error('Failed to send event confirmation email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

/**
 * Send event reminder - 7 days before
 * POST /api/email/send-event-reminder-7days
 */
router.post('/send-event-reminder-7days', async (req: Request, res: Response) => {
  try {
    const { email, eventTitle, eventDate, eventTime, eventLocation, eventLink, agenda, preparation } = req.body;

    if (!email || !eventTitle) {
      return res.status(400).json({
        success: false,
        error: 'Email and event title are required',
      });
    }

    const user = (req as any).user;
    const userName = user?.display_name || 'Community Member';

    const htmlContent = templateEventReminder7Days(
      userName,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      eventLink,
      agenda,
      preparation
    );

    await sendEmail({
      to: email,
      subject: `📅 Mark Your Calendar: ${eventTitle} in 7 Days!`,
      html: htmlContent,
    });

    res.json({
      success: true,
      message: 'Event reminder (7 days) sent',
    });
  } catch (error: any) {
    console.error('Failed to send event reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

/**
 * Send event reminder - 24 hours before
 * POST /api/email/send-event-reminder-24hours
 */
router.post('/send-event-reminder-24hours', async (req: Request, res: Response) => {
  try {
    const { email, eventTitle, eventDate, eventTime, eventLocation, eventLink, agenda } = req.body;

    if (!email || !eventTitle) {
      return res.status(400).json({
        success: false,
        error: 'Email and event title are required',
      });
    }

    const user = (req as any).user;
    const userName = user?.display_name || 'Community Member';

    const htmlContent = templateEventReminder24Hours(
      userName,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      eventLink,
      agenda
    );

    await sendEmail({
      to: email,
      subject: `🎯 Reminder: ${eventTitle} Tomorrow!`,
      html: htmlContent,
    });

    res.json({
      success: true,
      message: 'Event reminder (24 hours) sent',
    });
  } catch (error: any) {
    console.error('Failed to send event reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

/**
 * Send event reminder - 1 hour before
 * POST /api/email/send-event-reminder-1hour
 */
router.post('/send-event-reminder-1hour', async (req: Request, res: Response) => {
  try {
    const { email, eventTitle, eventTime, eventLocation, eventLink } = req.body;

    if (!email || !eventTitle) {
      return res.status(400).json({
        success: false,
        error: 'Email and event title are required',
      });
    }

    const user = (req as any).user;
    const userName = user?.display_name || 'Community Member';

    const htmlContent = templateEventReminder1Hour(
      userName,
      eventTitle,
      eventTime,
      eventLocation,
      eventLink
    );

    await sendEmail({
      to: email,
      subject: `⏰ ${eventTitle} Starting in 1 Hour!`,
      html: htmlContent,
    });

    res.json({
      success: true,
      message: 'Event reminder (1 hour) sent',
    });
  } catch (error: any) {
    console.error('Failed to send event reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

/**
 * Send event reminder - Day of (morning)
 * POST /api/email/send-event-reminder-dayof
 */
router.post('/send-event-reminder-dayof', async (req: Request, res: Response) => {
  try {
    const { email, eventTitle, eventDate, eventTime, eventLocation, eventLink, agenda } = req.body;

    if (!email || !eventTitle) {
      return res.status(400).json({
        success: false,
        error: 'Email and event title are required',
      });
    }

    const user = (req as any).user;
    const userName = user?.display_name || 'Community Member';

    const htmlContent = templateEventReminderDayOf(
      userName,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      eventLink,
      agenda
    );

    await sendEmail({
      to: email,
      subject: `✨ ${eventTitle} is Happening Today!`,
      html: htmlContent,
    });

    res.json({
      success: true,
      message: 'Event reminder (day-of) sent',
    });
  } catch (error: any) {
    console.error('Failed to send event reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

export default router;
