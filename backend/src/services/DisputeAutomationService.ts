// Dispute Automation Service - 3-Day Timeline Management
// Handles reminders, auto-resolution, payment processing
import db from '../db.js';
import { addHours } from 'date-fns';

export class DisputeAutomationService {
  // Run reminder checks every 30 minutes
  static async checkAndSendReminders() {
    const now = new Date();

    // REMINDER 1: T+24h (email only)
    await this.handleReminder1();

    // REMINDER 2: T+36h (SMS + Email + Push)
    await this.handleReminder2();

    // Auto-resolve at T+48h
    await this.handleAutoResolution();

    console.log('[DisputeAutomation] Checks completed at', now.toISOString());
  }

  // Reminder 1 at T+24h
  private static async handleReminder1() {
    const targetTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // T+24h ago

    const result = await db.query(
      `SELECT d.id, d.response_deadline, u.email, u.name
       FROM disputes d
       JOIN users u ON d.defendant_user_id = u.id
       WHERE d.status = 'OPEN'
       AND d.first_reminder_sent_at IS NULL
       AND d.created_at <= $1`,
      [targetTime]
    );

    for (const row of result.rows) {
      await db.query(
        `UPDATE disputes SET first_reminder_sent_at = NOW() WHERE id = $1`,
        [row.id]
      );

      // TODO: Send email
      console.log(`[Reminder1] Sent to ${row.email} for dispute ${row.id}`);
    }
  }

  // Reminder 2 at T+36h (URGENT)
  private static async handleReminder2() {
    const targetTime = new Date(Date.now() - 36 * 60 * 60 * 1000); // T+36h ago

    const result = await db.query(
      `SELECT d.id, d.response_deadline, u.email, u.name, u.phone
       FROM disputes d
       JOIN users u ON d.defendant_user_id = u.id
       WHERE d.status = 'OPEN'
       AND d.second_reminder_sent_at IS NULL
       AND d.created_at <= $1`,
      [targetTime]
    );

    for (const row of result.rows) {
      await db.query(
        `UPDATE disputes SET second_reminder_sent_at = NOW() WHERE id = $1`,
        [row.id]
      );

      // TODO: Send SMS (urgent)
      // TODO: Send Email (urgent)
      // TODO: Send Push notification

      console.log(`[Reminder2] Sent URGENT reminder to ${row.email} for dispute ${row.id}`);
    }
  }

  // Auto-resolve at T+48h if no response
  private static async handleAutoResolution() {
    const targetTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // T+48h ago

    const result = await db.query(
      `SELECT d.id, d.amount, d.errand_id, d.defendant_user_id, d.asker_id
       FROM disputes d
       WHERE d.status IN ('OPEN', 'PENDING_RESPONSE')
       AND d.created_at <= $1
       AND d.verdict_issued_at IS NULL`,
      [targetTime]
    );

    for (const row of result.rows) {
      await this.executeAutoResolution(row.id, row.amount);
    }
  }

  private static async executeAutoResolution(disputeId: number, totalAmount: number) {
    const now = new Date();

    // Get evidence counts
    const evidenceResult = await db.query(
      `SELECT submitted_by, COUNT(*) as count
       FROM dispute_evidence
       WHERE dispute_id = $1
       GROUP BY submitted_by`,
      [disputeId]
    );

    const doerCount = evidenceResult.rows.find((r: any) => r.submitted_by === 'doer')?.count || 0;
    const companyCount = evidenceResult.rows.find((r: any) => r.submitted_by === 'company')?.count || 0;

    let decision = 'PARTIAL_SPLIT';
    let confidence = 35;
    let doerAmount = totalAmount * 0.5;
    let companyAmount = totalAmount * 0.5;

    if (doerCount === 0 && companyCount === 0) {
      // No evidence - split
      decision = 'PARTIAL_SPLIT';
      confidence = 35;
      doerAmount = totalAmount * 0.5;
      companyAmount = totalAmount * 0.5;
    } else if (doerCount > companyCount) {
      // More doer evidence
      decision = 'APPROVE_DOER';
      confidence = 65;
      doerAmount = totalAmount;
      companyAmount = 0;
    } else if (companyCount > doerCount) {
      // More company evidence
      decision = 'APPROVE_COMPANY';
      confidence = 65;
      doerAmount = 0;
      companyAmount = totalAmount;
    }

    // Update dispute
    await db.query(
      `UPDATE disputes
       SET status = 'CLOSED',
           verdict_issued_at = NOW(),
           verdict_issued_by = $1,
           verdict_decision = $2,
           verdict_confidence = $3,
           verdict_doer_amount = $4,
           verdict_company_amount = $5,
           verdict_reasoning = $6,
           closed_at = NOW()
       WHERE id = $7`,
      [
        'SYSTEM',
        decision,
        confidence,
        doerAmount,
        companyAmount,
        `Auto-resolved at T+48h. Evidence: Doer=${doerCount}, Company=${companyCount}`,
        disputeId,
      ]
    );

    // TODO: Process payment release/refund
    // TODO: Send notifications

    console.log(
      `[AutoResolution] Dispute ${disputeId}: ${decision} (Doer: $${doerAmount}, Company: $${companyAmount})`
    );
  }

  // Check appeals that need resolution by T+60h
  static async checkAndResolveAppeals() {
    const appealDeadline = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12h from verdict

    const result = await db.query(
      `SELECT d.id, d.verdict_issued_at, d.appeal_submitted_at
       FROM disputes d
       WHERE d.status = 'APPEALED'
       AND d.appeal_reviewed_at IS NULL
       AND d.verdict_issued_at <= $1`,
      [appealDeadline]
    );

    console.log(`[Appeals] ${result.rows.length} appeals due for review`);

    // TODO: Notify admin to review appeals
  }

  // Process payment releases/refunds
  static async processPaymentSettlements() {
    const result = await db.query(
      `SELECT d.id, d.verdict_doer_amount, d.verdict_company_amount, d.errand_id, d.closed_at
       FROM disputes d
       WHERE d.status = 'CLOSED'
       AND d.payment_status = 'HELD'
       AND d.closed_at <= NOW() - INTERVAL '5 minutes'`
    );

    for (const row of result.rows) {
      // TODO: Release payment to doer if approved
      // TODO: Refund company if approved
      // TODO: Update payment_status

      console.log(`[PaymentSettlement] Processed dispute ${row.id}`);
    }
  }
}

// Schedule automated checks
export function initializeDisputeAutomation() {
  // Run every 30 minutes
  setInterval(() => {
    DisputeAutomationService.checkAndSendReminders().catch((err) => {
      console.error('[DisputeAutomation] Error:', err);
    });
  }, 30 * 60 * 1000);

  // Check appeals every 1 hour
  setInterval(() => {
    DisputeAutomationService.checkAndResolveAppeals().catch((err) => {
      console.error('[DisputeAppeals] Error:', err);
    });
  }, 60 * 60 * 1000);

  // Process settlements every 5 minutes
  setInterval(() => {
    DisputeAutomationService.processPaymentSettlements().catch((err) => {
      console.error('[PaymentSettlement] Error:', err);
    });
  }, 5 * 60 * 1000);

  console.log('[DisputeAutomation] Initialized');
}
