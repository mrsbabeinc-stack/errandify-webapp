import db from '../db.js';

export interface PaymentValidationResult {
  allowed: boolean;
  reason?: string;
  details?: {
    status: string;
    askerId: number;
    doerId: number;
    completedAt: string;
    hoursElapsed: number;
    disputeWindowRemaining: number;
  };
}

export async function validatePaymentRelease(errandId: number, requesterId: number): Promise<PaymentValidationResult> {
  try {
    const errand = await db.query(
      `SELECT id, asker_id, doer_id, status, completed_at, asker_confirmed FROM errands WHERE id = $1`,
      [errandId]
    );

    if (errand.rows.length === 0) {
      return { allowed: false, reason: 'Errand not found' };
    }

    const job = errand.rows[0];

    if (job.asker_id !== requesterId) {
      return { allowed: false, reason: 'Only asker can release payment' };
    }

    if (!job.status.includes('completed')) {
      return { allowed: false, reason: `Errand status: ${job.status}` };
    }

    const hoursElapsed = (new Date().getTime() - new Date(job.completed_at).getTime()) / (1000 * 60 * 60);
    const minutesRemaining = Math.max(0, (48 * 60) - (hoursElapsed * 60));

    if (hoursElapsed < 48 && !job.asker_confirmed) {
      return {
        allowed: false,
        reason: `Wait ${Math.ceil(48 - hoursElapsed)}h for disputes`,
        details: {
          status: job.status,
          askerId: job.asker_id,
          doerId: job.doer_id,
          completedAt: job.completed_at,
          hoursElapsed: Math.floor(hoursElapsed * 100) / 100,
          disputeWindowRemaining: Math.ceil(minutesRemaining / 60),
        },
      };
    }

    return {
      allowed: true,
      details: {
        status: job.status,
        askerId: job.asker_id,
        doerId: job.doer_id,
        completedAt: job.completed_at,
        hoursElapsed: Math.floor(hoursElapsed * 100) / 100,
        disputeWindowRemaining: 0,
      },
    };
  } catch (error) {
    console.error('[PaymentSecurity] Validation error:', error);
    return { allowed: false, reason: 'Payment validation failed' };
  }
}

export async function releasePayment(
  errandId: number,
  requesterId: number,
  askerConfirmation: boolean
): Promise<{ success: boolean; message: string }> {
  if (!askerConfirmation) {
    return { success: false, message: 'Asker must confirm payment release' };
  }

  try {
    const validation = await validatePaymentRelease(errandId, requesterId);
    if (!validation.allowed) {
      return { success: false, message: validation.reason || 'Payment release not allowed' };
    }

    const result = await db.query(
      `UPDATE errands SET status = 'payment_released', asker_confirmed = true, payment_released_at = NOW() WHERE id = $1 RETURNING id, status, payment_released_at`,
      [errandId]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'Failed to release payment' };
    }

    console.log(`[PaymentSecurity] Payment released for errand ${errandId}`);
    return { success: true, message: 'Payment released successfully' };
  } catch (error) {
    console.error('[PaymentSecurity] Release error:', error);
    return { success: false, message: 'Payment release failed' };
  }
}

export async function getPaymentStatus(errandId: number) {
  try {
    const result = await db.query(
      `SELECT id, status, completed_at, payment_released_at, asker_confirmed, asker_id, doer_id FROM errands WHERE id = $1`,
      [errandId]
    );

    if (result.rows.length === 0) return null;

    const job = result.rows[0];
    const hoursElapsed = (new Date().getTime() - new Date(job.completed_at).getTime()) / (1000 * 60 * 60);
    const minutesElapsed = (new Date().getTime() - new Date(job.completed_at).getTime()) / (1000 * 60);
    const minutesRemaining = Math.max(0, (48 * 60) - minutesElapsed);

    return {
      errandId: job.id,
      status: job.status,
      completedAt: job.completed_at,
      paymentReleasedAt: job.payment_released_at,
      askerConfirmed: job.asker_confirmed,
      askerId: job.asker_id,
      doerId: job.doer_id,
      hoursElapsed: Math.floor(hoursElapsed * 100) / 100,
      disputeWindowOpen: hoursElapsed < 48,
      minutesUntilPaymentRelease: Math.ceil(minutesRemaining),
      canBeReleasedNow: hoursElapsed >= 48 || job.asker_confirmed,
    };
  } catch (error) {
    console.error('[PaymentSecurity] Status check error:', error);
    return null;
  }
}
