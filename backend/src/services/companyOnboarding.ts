import db from '../db.js';
import { sendEmail } from './email.js';

/**
 * Company onboarding notifications.
 *
 * A company's signup is only COMPLETE once Errandify approves its ACRA
 * verification — until then it cannot post errands or make offers. These
 * messages are what tell the company it's now open for business (or what to fix).
 */

interface CompanyRecipient {
  companyId: number;
  companyName: string;
  userId: number;
  email: string | null;
  displayName: string | null;
}

/** Owner + manager of a company, with their emails. */
async function getCompanyRecipients(companyId: number): Promise<CompanyRecipient[]> {
  const r = await db.query(
    `SELECT c.id AS company_id, c.company_name, u.id AS user_id, u.email, u.display_name
       FROM companies c
       JOIN users u ON u.id IN (c.owner_user_id, c.manager_user_id)
      WHERE c.id = $1`,
    [companyId]
  );
  return r.rows.map((row: any) => ({
    companyId: row.company_id,
    companyName: row.company_name,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
  }));
}

/** In-app notification on the company's own feed. */
async function addCompanyNotification(
  companyId: number,
  userId: number,
  type: string,
  title: string,
  message: string
) {
  await db.query(
    `INSERT INTO company_notifications
       (company_id, recipient_user_id, notification_type, title, message, is_read)
     VALUES ($1, $2, $3, $4, $5, FALSE)`,
    [companyId, userId, type, title, message]
  );
}

const shell = (companyName: string, body: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#FFF7F1;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #F2E0D2;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#FF8A57,#FF6B35);padding:20px 24px;color:#fff;">
      <div style="font-size:13px;opacity:.9;">Errandify for Business</div>
      <div style="font-size:20px;font-weight:800;letter-spacing:-.02em;margin-top:2px;">${companyName}</div>
    </div>
    <div style="padding:24px;color:#4A3221;line-height:1.6;font-size:15px;">${body}</div>
    <div style="padding:14px 24px;border-top:1px solid #F2E0D2;color:#A8907C;font-size:12px;">
      Errandify · neighbours helping neighbours
    </div>
  </div>
</div>`;

/**
 * Approved — signup is now complete. Tells them what they can do and what's next.
 */
export async function sendCompanyApprovedNotice(companyId: number): Promise<void> {
  try {
    const recipients = await getCompanyRecipients(companyId);
    if (recipients.length === 0) return;

    const companyName = recipients[0].companyName;

    const body = `
      <p style="margin:0 0 14px;"><b>You're verified — your company account is now live.</b></p>
      <p style="margin:0 0 18px;">We checked your ACRA Business Profile against your SingPass details. Everything matched, so ${companyName} is open for business on Errandify.</p>

      <div style="background:#E2F3EF;border-radius:12px;padding:14px 16px;margin:0 0 18px;">
        <div style="font-weight:750;color:#1B7D6C;margin-bottom:8px;">What you can do now</div>
        <ul style="margin:0;padding-left:18px;color:#4A3221;">
          <li style="margin-bottom:5px;"><b>Post errands as your company</b> — separate from your personal account</li>
          <li style="margin-bottom:5px;"><b>Browse the marketplace</b> and make offers on work you can take</li>
          <li style="margin-bottom:5px;"><b>Allocate confirmed jobs to your staff</b></li>
          <li><b>Use your ad credits</b> to get seen by more neighbours</li>
        </ul>
      </div>

      <div style="background:#FDF0D8;border-radius:12px;padding:14px 16px;margin:0 0 18px;">
        <div style="font-weight:750;color:#8A6210;margin-bottom:8px;">Next: two things to set up</div>
        <ol style="margin:0;padding-left:18px;color:#4A3221;">
          <li style="margin-bottom:5px;"><b>Finish your payout setup with Stripe.</b> You can post and offer right away, but payments can't reach you until Stripe's checks are done. Do this before your first job completes.</li>
          <li><b>Add your staff.</b> Invite them by NRIC — they sign up with SingPass first, then you tag them to ${companyName}.</li>
        </ol>
      </div>

      <p style="margin:0 0 6px;color:#806350;font-size:14px;">Your “Verified business” badge now shows on your errands and offers, so neighbours know you're a real company.</p>
    `;

    for (const r of recipients) {
      await addCompanyNotification(
        companyId,
        r.userId,
        'company_verified',
        'Your company is verified',
        `${companyName} is verified and can now post errands, make offers and allocate work to staff. Next: finish your Stripe payout setup and add your staff.`
      );

      if (r.email) {
        await sendEmail({
          to: r.email,
          subject: `${companyName} is verified — you're ready to go`,
          html: shell(companyName, body),
        });
      }
    }

    console.log('[Onboarding] Approval notice sent for company', companyId, 'to', recipients.length, 'recipient(s)');
  } catch (error) {
    // Never let a notification failure undo an approval that already happened
    console.error('[Onboarding] Approval notice failed for company', companyId, error);
  }
}

/**
 * Rejected — tell them plainly what to fix so they can resubmit.
 */
export async function sendCompanyRejectedNotice(companyId: number, reason: string): Promise<void> {
  try {
    const recipients = await getCompanyRecipients(companyId);
    if (recipients.length === 0) return;

    const companyName = recipients[0].companyName;

    const body = `
      <p style="margin:0 0 14px;"><b>We couldn't verify ${companyName} yet.</b></p>
      <div style="background:#FCE9E6;border-radius:12px;padding:14px 16px;margin:0 0 18px;">
        <div style="font-weight:750;color:#A8392A;margin-bottom:6px;">What needs fixing</div>
        <div style="color:#4A3221;">${reason}</div>
      </div>
      <p style="margin:0 0 14px;">Sort that out and send a new ACRA Business Profile from <b>Company Profile</b> in your dashboard. Profiles must be dated within the last 6 months.</p>
      <p style="margin:0;color:#806350;font-size:14px;">Your account stays as it is in the meantime — you just can't post errands or make offers until verification passes.</p>
    `;

    for (const r of recipients) {
      await addCompanyNotification(
        companyId,
        r.userId,
        'company_verification_rejected',
        'Verification needs attention',
        `We couldn't verify ${companyName}: ${reason} Submit an updated ACRA Business Profile to try again.`
      );

      if (r.email) {
        await sendEmail({
          to: r.email,
          subject: `Action needed to verify ${companyName}`,
          html: shell(companyName, body),
        });
      }
    }

    console.log('[Onboarding] Rejection notice sent for company', companyId);
  } catch (error) {
    console.error('[Onboarding] Rejection notice failed for company', companyId, error);
  }
}
