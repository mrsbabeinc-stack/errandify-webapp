import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/email.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  templateEventConfirmation,
  templateEventReminder7Days,
  templateEventReminder24Hours,
  templateEventReminder1Hour,
  templateEventReminderDayOf
} from '../templates/emailTemplates';

const router = Router();

/**
 * NOT CURRENTLY MOUNTED — index.ts has `// app.use('/api/email', emailRoutes)`
 * behind a TODO, so none of this is reachable today.
 *
 * The guard is here anyway because of what happens when that line is
 * uncommented: every route below sends Errandify-branded email to whatever
 * address arrives in `req.body.email`. Unmounted and unguarded, that is one
 * edit away from an open mail relay usable for phishing from this domain.
 *
 * Whoever mounts this should also rate-limit it — auth stops strangers, not a
 * logged-in account sending thousands.
 */
router.use(authMiddleware);

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

/**
 * Send "no offers yet" reminder email
 * POST /api/email/send-no-offers-reminder
 */
router.post('/send-no-offers-reminder', async (req: Request, res: Response) => {
  try {
    const { email, errandTitle, errandId } = req.body;

    if (!email || !errandTitle) {
      return res.status(400).json({
        success: false,
        error: 'Email and errand title are required',
      });
    }

    const userName = (req as any).user?.display_name || 'Friend';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-top: 0;">📢 No Offers Yet for Your Task</h2>
          <p style="color: #666; font-size: 14px;">Hi ${userName},</p>

          <p style="color: #666; line-height: 1.6;">
            Your task <strong>"${errandTitle}"</strong> hasn't received any offers yet. Here are some tips to attract doers:
          </p>

          <ul style="color: #666; line-height: 1.8;">
            <li><strong>Increase the budget:</strong> A slightly higher budget attracts more doers</li>
            <li><strong>Add more details:</strong> The more specific you are, the more confident doers feel</li>
            <li><strong>Be flexible:</strong> If the timeline allows, extending the deadline can help</li>
            <li><strong>Use clear language:</strong> Make sure your task description is easy to understand</li>
          </ul>

          <div style="margin: 20px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/errand/${errandId}/edit"
               style="background: #8B5A2B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Edit Your Task
            </a>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Keep your task active and doers will keep bidding!
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `💡 Tips to Get Offers for "${errandTitle}"`,
      html: htmlContent,
    });

    res.json({
      success: true,
      message: 'No offers reminder sent',
    });
  } catch (error: any) {
    console.error('Failed to send no offers reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

/**
 * Send "errand starting soon" reminder email
 * POST /api/email/send-errand-start-reminder
 */
router.post('/send-errand-start-reminder', async (req: Request, res: Response) => {
  try {
    const { email, errandTitle, errandId, timeUntilStart } = req.body;

    if (!email || !errandTitle) {
      return res.status(400).json({
        success: false,
        error: 'Email and errand title are required',
      });
    }

    const userName = (req as any).user?.display_name || 'Friend';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800;">
          <h2 style="color: #333; margin-top: 0;">⏰ Your Task is Starting Soon!</h2>
          <p style="color: #666; font-size: 14px;">Hi ${userName},</p>

          <p style="color: #333; line-height: 1.6; font-size: 16px;">
            Your task <strong>"${errandTitle}"</strong> is starting <strong>${timeUntilStart}</strong>.
            Make sure you and your doer are ready to go!
          </p>

          <div style="background: #fff; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333;"><strong>Quick Checklist:</strong></p>
            <ul style="color: #666; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Confirm you have the doer's contact information</li>
              <li>Double-check the location and time details</li>
              <li>Have any materials or access ready if needed</li>
            </ul>
          </div>

          <div style="margin: 20px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/errand/${errandId}"
               style="background: #8B5A2B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Task Details
            </a>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Good luck with your task!
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `⏰ Reminder: "${errandTitle}" is Starting ${timeUntilStart}`,
      html: htmlContent,
    });

    res.json({
      success: true,
      message: 'Errand start reminder sent',
    });
  } catch (error: any) {
    console.error('Failed to send errand start reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

export default router;
