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
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${config.email.mailgunApiKey}`).toString('base64')}`,
        },
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

// Comprehensive dispute decision email with verdict reasoning & logic
export async function sendDisputeDecisionEmail(
  toEmail: string,
  userName: string,
  errandTitle: string,
  budget: number,
  userRole: 'doer' | 'asker',
  decision: {
    verdict: 'full_payment' | 'partial_payment' | 'refund' | 'escalated';
    doerAmount: number;
    askerAmount: number;
    reasoning: string;
    logic: string;
    confidence: number;
    decisionType: 'auto_resolved' | 'human_reviewed' | 'escalated';
    adminNotes?: string;
  },
  disputeId: number
): Promise<boolean> {
  const verdictEmoji = {
    full_payment: '✅ Full Payment',
    partial_payment: '🤝 Split Payment',
    refund: '💵 Refunded',
    escalated: '⏳ Escalated for Review'
  };

  const verdictColor = {
    full_payment: '#10b981',
    partial_payment: '#f59e0b',
    refund: '#ef4444',
    escalated: '#6366f1'
  };

  const verdictDescription = {
    full_payment: userRole === 'doer'
      ? `Full payment of SGD $${decision.doerAmount.toFixed(2)} approved`
      : `Refund of SGD $${decision.askerAmount.toFixed(2)} approved`,
    partial_payment: userRole === 'doer'
      ? `Partial payment of SGD $${decision.doerAmount.toFixed(2)} approved (50% of budget)`
      : `Partial refund of SGD $${decision.askerAmount.toFixed(2)} approved (50% of budget)`,
    refund: userRole === 'doer'
      ? `No payment approved (full refund to other party)`
      : `Full refund of SGD $${decision.askerAmount.toFixed(2)} approved`,
    escalated: `Case requires further review by senior admin`
  };

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; color: #1f2937;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
        <h1 style="color: ${verdictColor[decision.verdict]}; margin: 0; font-size: 24px;">
          ${verdictEmoji[decision.verdict]}
        </h1>
        <p style="color: #666; margin: 10px 0 0 0;">Dispute #${disputeId}</p>
      </div>

      <!-- Greeting -->
      <p style="font-size: 16px; margin: 0 0 20px 0;">
        Hi ${userName},
      </p>

      <!-- Errand Summary -->
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
          <strong>Errand:</strong> ${errandTitle}
        </p>
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>Original Budget:</strong> SGD $${budget.toFixed(2)}
        </p>
      </div>

      <!-- VERDICT SECTION -->
      <div style="background-color: ${verdictColor[decision.verdict]}15; border-left: 5px solid ${verdictColor[decision.verdict]}; padding: 20px; margin: 25px 0; border-radius: 6px;">
        <h2 style="color: ${verdictColor[decision.verdict]}; margin: 0 0 15px 0; font-size: 18px;">
          📋 Dispute Resolution
        </h2>
        <p style="margin: 0; font-size: 15px; color: #1f2937; font-weight: 500;">
          ${verdictDescription[decision.verdict]}
        </p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">
          ${decision.decisionType === 'auto_resolved'
            ? '✓ Resolved automatically based on strong evidence'
            : decision.decisionType === 'human_reviewed'
            ? '✓ Reviewed and decided by Errandify team'
            : '⏳ Escalated for senior admin review'}
        </p>
      </div>

      <!-- REASONING SECTION -->
      <div style="background-color: #fafbff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e7ff;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">
          📋 How We Reached This Decision
        </h3>

        <p style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937; line-height: 1.6;">
          <strong>Logic:</strong><br>
          ${decision.logic.replace(/\n/g, '<br>')}
        </p>

        <p style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937; line-height: 1.6;">
          <strong>Our Reasoning:</strong><br>
          ${decision.reasoning.replace(/\n/g, '<br>')}
        </p>

        <div style="background-color: white; padding: 12px; border-radius: 6px; margin-top: 12px; border-left: 3px solid #6366f1;">
          <p style="margin: 0; font-size: 13px; color: #666;">
            <strong>Confidence Level:</strong> ${(decision.confidence * 100).toFixed(0)}%
          </p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
            Higher confidence means stronger evidence supporting this decision
          </p>
        </div>
      </div>

      ${decision.adminNotes ? `
      <!-- ADMIN NOTES SECTION -->
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">
          📝 Additional Notes from Admin
        </h4>
        <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.6;">
          ${decision.adminNotes.replace(/\n/g, '<br>')}
        </p>
      </div>
      ` : ''}

      <!-- NEXT STEPS -->
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
        <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 16px;">
          ✓ What Happens Next
        </h3>
        <ol style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 1.8;">
          <li>Payment will be processed within 24-48 hours</li>
          <li>You'll receive a notification when payment arrives</li>
          <li>The errand will be marked as completed/resolved</li>
          <li>You have 48 hours to appeal if you disagree</li>
        </ol>
      </div>

      <!-- APPEAL INFO -->
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #ef4444;">
        <h4 style="color: #991b1b; margin: 0 0 8px 0; font-size: 14px;">
          📞 Disagree With This Decision?
        </h4>
        <p style="margin: 0; font-size: 13px; color: #7f1d1d;">
          You can appeal within 48 hours by visiting the dispute details page. Your appeal will be reviewed by a senior admin.
        </p>
      </div>

      <!-- CTA BUTTON -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || 'https://errandify.sg'}/disputes/${disputeId}"
           style="background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
          View Full Dispute Details
        </a>
      </div>

      <!-- FOOTER -->
      <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          We believe in fair, transparent decisions.<br>
          If you have questions, our support team is here to help.
        </p>
        <p style="color: #999; font-size: 11px; margin: 15px 0 0 0;">
          Errandify Support • support@errandify.sg<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `⚖️ Dispute Resolved: ${verdictEmoji[decision.verdict]} - ${errandTitle}`,
    html,
    text: `
DISPUTE DECISION NOTICE

Errand: ${errandTitle}
Budget: SGD $${budget.toFixed(2)}
Verdict: ${verdictEmoji[decision.verdict]}

DECISION:
${verdictDescription[decision.verdict]}

REASONING:
${decision.reasoning}

LOGIC:
${decision.logic}

Confidence: ${(decision.confidence * 100).toFixed(0)}%

${decision.adminNotes ? `ADMIN NOTES:\n${decision.adminNotes}\n` : ''}

NEXT STEPS:
1. Payment will be processed within 24-48 hours
2. You'll receive a notification when payment arrives
3. You have 48 hours to appeal if you disagree

View full details: ${process.env.APP_URL || 'https://errandify.sg'}/disputes/${disputeId}

Errandify Support
support@errandify.sg
    `.trim()
  });
}
