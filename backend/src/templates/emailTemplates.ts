// Email HTML templates for Errandify notifications

export function templateBidAccepted(doerName: string, taskTitle: string, amount: number, taskId: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF7A29; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎯 Bid Accepted!</h1>
        </div>
        <div class="content">
          <p>Hi ${doerName},</p>
          <p>Great news! Your bid for <strong>"${taskTitle}"</strong> at <strong>$${amount}</strong> has been accepted!</p>

          <p><strong>Next step:</strong> Complete payment within 24 hours to start work.</p>
          <p style="color: #FF7A29; font-weight: bold;">⏱️ Deadline: 24 hours from now</p>

          <a href="http://localhost:5173/errand/${taskId}" class="button">Complete Payment Now</a>

          <p>Questions? Reply to this email or contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateTaskReopened(doerName: string, taskTitle: string, bidAmount: number, taskId: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF7A29; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎯 Task Available Again!</h1>
        </div>
        <div class="content">
          <p>Hi ${doerName},</p>
          <p>Good news! The previous doer cancelled. Your bid is back on!</p>

          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">"${taskTitle}"</p>
            <p style="margin: 5px 0; color: #666;">Your bid: <strong>$${bidAmount}</strong></p>
            <p style="margin: 5px 0; color: #999; font-size: 14px;">Limited time: 30 minutes</p>
          </div>

          <p style="color: #FF7A29; font-weight: bold;">⏱️ Act fast! Other doers may accept too.</p>

          <a href="http://localhost:5173/errand/${taskId}" class="button">Accept Now</a>

          <p>Questions? Reply to this email or contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templatePaymentReleased(doerName: string, amount: number, taskTitle: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .amount { font-size: 32px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
        .button { background-color: #28a745; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">💰 Payment Released!</h1>
        </div>
        <div class="content">
          <p>Hi ${doerName},</p>
          <p>Your payment for <strong>"${taskTitle}"</strong> has been released to your wallet!</p>

          <div class="amount">
            +$${amount}
          </div>

          <p>The amount is now available in your Errandify wallet. You can withdraw to your bank account anytime.</p>

          <a href="http://localhost:5173/settings/payout-settings" class="button">View Wallet</a>

          <p>Thanks for a job well done! 🙏</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateDailyDigest(userName: string, summary: any): string {
  const bidsList = (summary.bids || [])
    .map((bid: any) => `<li>${bid.doer} bid $${bid.amount} on "${bid.task}"</li>`)
    .join('');

  const messagesList = (summary.messages || [])
    .map((msg: any) => `<li>From ${msg.sender}: "${msg.preview}"</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF7A29; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .section { margin: 20px 0; }
        .section-title { font-weight: bold; color: #FF7A29; margin: 15px 0 10px 0; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📋 Your Errandify Summary</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Here's what happened on Errandify today:</p>

          ${bidsList ? `
            <div class="section">
              <p class="section-title">📌 New Bids (${summary.bids?.length || 0})</p>
              <ul>${bidsList}</ul>
            </div>
          ` : ''}

          ${messagesList ? `
            <div class="section">
              <p class="section-title">💬 Messages (${summary.messages?.length || 0})</p>
              <ul>${messagesList}</ul>
            </div>
          ` : ''}

          <a href="http://localhost:5173/home" class="button">View Dashboard</a>

          <p>You'll receive this summary daily at 9am. <a href="http://localhost:5173/settings/notifications" style="color: #FF7A29;">Customize frequency</a></p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Event Reminder Templates (7 days, 24 hours, 1 hour, day-of)

export function templateEventReminder7Days(
  userName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  eventLocation: string,
  eventLink?: string,
  agenda?: Array<{ time: string; title: string; duration: string }>,
  preparation?: string
): string {
  const agendaHtml = agenda && agenda.length > 0
    ? `
      <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin-top: 0; color: #333;">📋 Agenda</h4>
        <div style="font-size: 13px; line-height: 1.8; color: #555;">
          ${agenda.map(item => `
            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
              <span style="font-weight: bold; color: #FF7A29; min-width: 60px;">${item.time}</span>
              <span><strong>${item.title}</strong> (${item.duration})</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  const prepHtml = preparation
    ? `
      <div style="background-color: #fff9e6; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin: 15px 0;">
        <p style="margin-top: 0; font-weight: bold; color: #333;">🎒 How to Prepare</p>
        <p style="margin: 0; color: #666; font-size: 14px;">${preparation}</p>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF7A29 0%, #FF9C56 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 15px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📅 Mark Your Calendar!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>We're excited to remind you about an upcoming event you're attending:</p>

          <div style="background-color: white; border-left: 4px solid #FF7A29; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 10px 0; color: #333;">${eventTitle}</h2>
            <p style="margin: 5px 0; font-size: 14px;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>⏰ Time:</strong> ${eventTime}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>📍 Location:</strong> ${eventLocation}</p>
            ${eventLink ? `<p style="margin: 5px 0; font-size: 14px;"><strong>🔗 Join Online:</strong> <a href="${eventLink}" style="color: #FF7A29; text-decoration: none;">${eventLink}</a></p>` : ''}
          </div>

          ${agendaHtml}
          ${prepHtml}

          <a href="http://localhost:5173/my-kampung" class="button">View Event Details</a>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">You'll receive another reminder 24 hours before the event starts.</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateEventReminder24Hours(
  userName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  eventLocation: string,
  eventLink?: string,
  agenda?: Array<{ time: string; title: string; duration: string }>,
  preparation?: string
): string {
  const agendaHtml = agenda && agenda.length > 0
    ? `
      <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin-top: 0; color: #333;">📋 Today's Agenda</h4>
        <div style="font-size: 13px; line-height: 1.8; color: #555;">
          ${agenda.map(item => `
            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
              <span style="font-weight: bold; color: #FF7A29; min-width: 60px;">${item.time}</span>
              <span><strong>${item.title}</strong> (${item.duration})</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF7A29 0%, #FF9C56 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 15px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎯 Event Tomorrow!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p style="font-size: 16px; color: #FF7A29; font-weight: bold;">Don't forget! Your event starts tomorrow!</p>

          <div style="background-color: white; border-left: 4px solid #FF7A29; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 10px 0; color: #333;">${eventTitle}</h2>
            <p style="margin: 5px 0; font-size: 14px;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>⏰ Time:</strong> ${eventTime}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>📍 Location:</strong> ${eventLocation}</p>
            ${eventLink ? `<p style="margin: 5px 0; font-size: 14px;"><strong>🔗 Join Online:</strong> <a href="${eventLink}" style="color: #FF7A29; text-decoration: none;">${eventLink}</a></p>` : ''}
          </div>

          ${agendaHtml}

          <a href="http://localhost:5173/my-kampung" class="button">Join Event</a>

          <p style="color: #999; font-size: 12px;">Reminder: The event starts in 24 hours. See you there! 🎉</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateEventReminder1Hour(
  userName: string,
  eventTitle: string,
  eventTime: string,
  eventLocation: string,
  eventLink?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF7A29 0%, #FF9C56 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 15px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        .urgent { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⏰ Event Starting in 1 Hour!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>

          <div class="urgent">
            <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 16px; color: #856404;">🚀 Get Ready! Your event starts in 1 hour</p>
            <p style="margin: 0; color: #856404;"><strong>${eventTitle}</strong> • ${eventTime} • ${eventLocation}</p>
          </div>

          ${eventLink ? `
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">🔗 Click below to join online:</p>
              <a href="${eventLink}" class="button" style="background-color: #4CAF50;">Join Now</a>
            </div>
          ` : ''}

          <p style="font-size: 14px; color: #666;">
            📋 <strong>Quick reminder:</strong> Make sure you have everything you need and join a few minutes early to avoid missing anything.
          </p>

          <a href="http://localhost:5173/my-kampung" class="button">View Event</a>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateEventReminderDayOf(
  userName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  eventLocation: string,
  eventLink?: string,
  agenda?: Array<{ time: string; title: string; duration: string }>
): string {
  const agendaHtml = agenda && agenda.length > 0
    ? `
      <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin-top: 0; color: #333;">📋 What's Happening Today</h4>
        <div style="font-size: 13px; line-height: 1.8; color: #555;">
          ${agenda.map(item => `
            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
              <span style="font-weight: bold; color: #FF7A29; min-width: 60px;">${item.time}</span>
              <span><strong>${item.title}</strong> (${item.duration})</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF7A29 0%, #FF9C56 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 15px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✨ Good Morning! Event Today!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p style="font-size: 16px; color: #FF7A29; font-weight: bold;">🎉 Today's the day! Your event is happening now!</p>

          <div style="background-color: white; border-left: 4px solid #FF7A29; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 10px 0; color: #333;">${eventTitle}</h2>
            <p style="margin: 5px 0; font-size: 14px;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>⏰ Time:</strong> ${eventTime}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>📍 Location:</strong> ${eventLocation}</p>
            ${eventLink ? `<p style="margin: 5px 0; font-size: 14px;"><strong>🔗 Join Online:</strong> <a href="${eventLink}" style="color: #FF7A29; text-decoration: none;">${eventLink}</a></p>` : ''}
          </div>

          ${agendaHtml}

          <a href="http://localhost:5173/my-kampung" class="button">Go to Event</a>

          <p style="color: #999; font-size: 12px; text-align: center;">See you soon! We can't wait to see you there. 🚀</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateEventConfirmation(userName: string, eventTitle: string, eventDate: string, eventTime: string, eventLocation: string, eventDescription: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF7A29 0%, #FF9C56 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .event-details { background-color: white; border-left: 4px solid #FF7A29; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .detail-row { display: flex; align-items: center; margin: 10px 0; font-size: 14px; }
        .detail-icon { margin-right: 10px; font-size: 18px; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Event Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>You're all set! Your spot for <strong>"${eventTitle}"</strong> is confirmed. See you there!</p>

          <div class="event-details">
            <h3 style="margin-top: 0; color: #333;">${eventTitle}</h3>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span>${eventDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span>${eventTime}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📍</span>
              <span>${eventLocation}</span>
            </div>
            <div style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #666; font-size: 13px;">${eventDescription}</p>
            </div>
          </div>

          <p style="background-color: #e8f4f8; padding: 12px; border-radius: 4px; color: #333;">
            💡 <strong>Tip:</strong> Add this event to your calendar so you don't forget!
          </p>

          <a href="http://localhost:5173/home" class="button">View Event Details</a>

          <p>Questions? Reply to this email or contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templatePaymentReminder(userName: string, taskTitle: string, hoursLeft: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ffc107; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .button { background-color: #ffc107; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⏰ Payment Expires Soon!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>

          <div class="warning">
            <p style="margin: 0; font-weight: bold;">⏱️ ${hoursLeft} hours left to complete payment</p>
            <p style="margin: 10px 0 0 0; color: #856404;">If you don't pay, the doer will be released and you'll need to find someone else.</p>
          </div>

          <p>Task: <strong>"${taskTitle}"</strong></p>

          <a href="http://localhost:5173/home" class="button">Complete Payment Now</a>

          <p>Questions? Reply to this email or contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateReferralJoin(referrerName: string, newUserName: string, pointsAwarded: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF7A29; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .points { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">👤 New Referral Joined!</h1>
        </div>
        <div class="content">
          <p>Hi ${referrerName},</p>
          <p>Great news! <strong>${newUserName}</strong> just signed up on Errandify using your referral link!</p>
          <div class="points">
            <p style="margin: 0; color: #155724;"><strong>You earned +${pointsAwarded} Errandify Points! 🎉</strong></p>
            <p style="margin: 10px 0 0 0; color: #155724; font-size: 14px;">Earn +150 EP more when ${newUserName} completes their first job</p>
          </div>
          <a href="http://localhost:5173/my-referrals" class="button">View Your Referrals</a>
          <p style="color: #666; font-size: 14px;">Keep sharing your referral link to earn more points and help your friends earn money on Errandify!</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateFirstJobBonus(referrerName: string, newUserName: string, pointsAwarded: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .milestone { background-color: #ffeaa7; border-left: 4px solid #fdcb6e; padding: 15px; margin: 20px 0; }
        .button { background-color: #28a745; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🌟 First Job Milestone!</h1>
        </div>
        <div class="content">
          <p>Hi ${referrerName},</p>
          <p><strong>${newUserName}</strong> just completed their first job on Errandify! 🎉</p>
          <div class="milestone">
            <p style="margin: 0; color: #2d3436;"><strong>Activation Bonus: +${pointsAwarded} Errandify Points!</strong></p>
            <p style="margin: 10px 0 0 0; color: #2d3436; font-size: 14px;">Earn +100 EP more when they reach 10 completed jobs</p>
          </div>
          <p style="color: #666; font-size: 14px;">Your referral is on their way to becoming a trusted community member. Keep supporting them by referring more friends!</p>
          <a href="http://localhost:5173/my-referrals" class="button">View Your Referrals</a>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateRatingReceived(doerName: string, raterName: string, rating: number, taskTitle: string, pointsAwarded: number): string {
  const ratingStars = '⭐'.repeat(Math.round(rating));
  const celebration = rating === 5 ? '🎉' : rating >= 4 ? '👍' : '✨';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF7A29; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .rating { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .button { background-color: #FF7A29; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${celebration} New Review!</h1>
        </div>
        <div class="content">
          <p>Hi ${doerName},</p>
          <p><strong>${raterName}</strong> just rated your work on <strong>"${taskTitle}"</strong>!</p>
          <div class="rating">
            <p style="margin: 0; color: #856404;"><strong>Rating: ${ratingStars} (${Math.round(rating)}/5)</strong></p>
            <p style="margin: 10px 0 0 0; color: #856404; font-weight: bold;">You earned +${pointsAwarded} Errandify Points!</p>
          </div>
          <p style="color: #666; font-size: 14px;">Every great review helps build your reputation. Keep up the excellent work!</p>
          <a href="http://localhost:5173/my-account" class="button">View Your Profile</a>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function templateRatingReminder(doerName: string, askerName: string, taskTitle: string, taskId: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FFB347 0%, #FF8C42 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #fff; padding: 30px 20px; border-radius: 0 0 8px 8px; border: 1px solid #f0f0f0; }
        .reminder-box { background: linear-gradient(135deg, #FFF8E7 0%, #FFE5CC 100%); border-left: 4px solid #FF8C42; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .stars { font-size: 32px; text-align: center; margin: 15px 0; }
        .button { background: linear-gradient(135deg, #FF8C42 0%, #FF7A29 100%); color: white; padding: 14px 32px; border-radius: 24px; text-decoration: none; display: inline-block; margin: 20px auto; text-align: center; font-weight: bold; }
        .button-container { text-align: center; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        .emoji { font-size: 40px; text-align: center; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">💫 Don't Forget!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Rate your neighbor and earn +5 Errandify Points</p>
        </div>
        <div class="content">
          <p>Hi ${doerName},</p>
          <p style="font-size: 16px;">You completed <strong>"${taskTitle}"</strong> with <strong>${askerName}</strong>. Now it's time to rate their experience as an asker! 🎯</p>

          <div class="reminder-box">
            <div class="emoji">⭐</div>
            <p style="margin: 10px 0; text-align: center; color: #856404;"><strong>Share your honest feedback</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #856404; text-align: center;">Your rating helps build trust in our community and earns you <strong>+5 bonus points!</strong></p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">It only takes 30 seconds and really matters to ${askerName}. Let's keep Errandify a place where neighbors trust each other! 💙</p>

          <div class="button-container">
            <a href="http://localhost:5173/errand/${taskId}" class="button">Rate ${askerName} Now</a>
          </div>

          <p style="color: #999; font-size: 13px; margin-top: 30px; text-align: center;">You can rate anytime, but the sooner you do, the sooner payments settle and everyone's happy!</p>
        </div>
        <div class="footer">
          <p>© 2026 Errandify. All rights reserved.</p>
          <p><a href="http://localhost:5173/settings/notifications" style="color: #999; text-decoration: none;">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
