import { config } from '../config.js';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Simple mock email service for development
// In production, use SendGrid, Mailgun, or similar

export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    const { to, subject, html, text } = data;

    // Development: just log
    if (config.nodeEnv === 'development') {
      console.log('[Email] (Dev Mode - Not Sent)');
      console.log('  To:', to);
      console.log('  Subject:', subject);
      console.log('  Body:', text || html.substring(0, 100) + '...');
      return true;
    }

    // Production: use actual email service
    // TODO: implement sendViaSendGrid and sendViaMailgun
    console.warn('[Email] Email service not fully implemented');
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

async function sendViaMailgun(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();

    form.append('from', `${config.email.fromName} <${config.email.fromEmail}>`);
    form.append('to', to);
    form.append('subject', subject);
    form.append('html', html);
    if (text) {
      form.append('text', text);
    }

    const response = await fetch(
      `https://api.mailgun.net/v3/${config.email.mailgunDomain}/messages`,
      {
        method: 'POST',
        auth: `api:${config.email.mailgunApiKey}`,
        body: form as any,
      }
    );

    if (!response.ok) {
      console.error('[Mailgun] Error:', response.statusText);
      return false;
    }

    console.log('[Mailgun] Email sent successfully to', to);
    return true;
  } catch (error) {
    console.error('[Mailgun] Error:', error);
    return false;
  }
}

async function sendViaMailgunSimple(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.mailgun.net/v3/${config.email.mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`api:${config.email.mailgunApiKey}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          from: `${config.email.fromName} <${config.email.fromEmail}>`,
          to: to,
          subject: subject,
          html: html,
          text: text || '',
        }).toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Mailgun] Error:', error);
      return false;
    }

    console.log('[Mailgun] Email sent successfully to', to);
    return true;
  } catch (error) {
    console.error('[Mailgun] Error:', error);
    return false;
  }
}

export { sendViaMailgunSimple as sendViaMailgun };

// Dispute email templates

export async function sendDisputeRaisedEmail(
  toEmail: string,
  userName: string,
  errandTitle: string,
  issueType: string,
  disputeId: number
): Promise<boolean> {
  const subject = `⚖️ Dispute Raised: ${errandTitle}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #d97706; margin: 0;">⚖️ Dispute Raised</h2>
      </div>

      <p>Hi ${userName},</p>

      <p>A dispute has been raised for your task: <strong>${errandTitle}</strong></p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Issue Type:</strong> ${issueType}
        </p>
      </div>

      <h3 style="color: #1f2937; margin-top: 20px;">What happens next:</h3>
      <ul style="color: #555; line-height: 1.8;">
        <li>Our team reviews the dispute within 24 hours</li>
        <li>You can provide additional evidence in the dispute system</li>
        <li>Payment is securely held during review</li>
        <li>You'll be notified of the decision</li>
      </ul>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #666;">
          <a href="${process.env.APP_URL || 'https://errandify.sg'}/disputes/${disputeId}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Dispute Details
          </a>
        </p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Thanks for being part of our kampung. We're here to help! 🌸
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

      <p style="color: #999; font-size: 12px; margin: 0;">
        Errandify Support • support@errandify.sg<br />
        This is an automated message, please do not reply.
      </p>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text: `Dispute Raised: ${errandTitle}\n\nA dispute has been raised for your task. Our team will review it within 24 hours.\n\nView more details at: ${process.env.APP_URL || 'https://errandify.sg'}/disputes/${disputeId}`,
  });
}

export async function sendDisputeResolvedEmail(
  toEmail: string,
  userName: string,
  errandTitle: string,
  decision: string,
  decisionMessage: string,
  disputeId: number
): Promise<boolean> {
  const subject = `✅ Dispute Resolved: ${errandTitle}`;

  const decisionColor = decision === 'approved' ? '#10b981' : decision === 'rejected' ? '#ef4444' : '#f59e0b';
  const decisionEmoji = decision === 'approved' ? '✅' : decision === 'rejected' ? '💵' : '🤝';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: ${decisionColor}; margin: 0;">${decisionEmoji} Dispute Resolved</h2>
      </div>

      <p>Hi ${userName},</p>

      <p>Your dispute for <strong>${errandTitle}</strong> has been resolved.</p>

      <div style="background-color: ${decisionColor}15; border-left: 4px solid ${decisionColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1f2937;">
          <strong>Decision:</strong> ${decisionMessage}
        </p>
      </div>

      <h3 style="color: #1f2937; margin-top: 20px;">What happens next:</h3>
      <ul style="color: #555; line-height: 1.8;">
        <li>Payment will be processed according to the decision</li>
        <li>You'll see the update in your errand details</li>
        <li>If you disagree, you may appeal within 48 hours</li>
      </ul>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #666;">
          <a href="${process.env.APP_URL || 'https://errandify.sg'}/disputes/${disputeId}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Full Details
          </a>
        </p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Thanks for your patience! 🌸
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

      <p style="color: #999; font-size: 12px; margin: 0;">
        Errandify Support • support@errandify.sg<br />
        This is an automated message, please do not reply.
      </p>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text: `Dispute Resolved: ${errandTitle}\n\nYour dispute has been resolved.\n\nDecision: ${decisionMessage}\n\nView more details at: ${process.env.APP_URL || 'https://errandify.sg'}/disputes/${disputeId}`,
  });
}
