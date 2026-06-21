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
