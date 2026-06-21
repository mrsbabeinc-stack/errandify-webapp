import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/email';
import { templateEventConfirmation } from '../templates/emailTemplates';

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

export default router;
