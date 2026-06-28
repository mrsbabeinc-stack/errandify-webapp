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
