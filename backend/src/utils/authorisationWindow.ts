/**
 * The payment window — now a safety net, not a constraint.
 *
 * This existed because we authorised the asker's card at acceptance and
 * captured later, which put a ~7 day ceiling on the whole dispute lifecycle.
 * That model is gone: the asker is CHARGED at acceptance and the money sits in
 * Errandify's Stripe balance until it is transferred to the doer or refunded.
 * Captured funds do not expire, so a dispute can take as long as it fairly
 * needs — a rework can run a week, an appeal is not racing a clock.
 *
 * What is left is still worth keeping. It tells an admin how long a settlement
 * has been outstanding, which is a useful nudge and an operational signal. It
 * must NOT be used to refuse a rework, shorten a response deadline, or force a
 * decision — money is no longer at risk from the passage of time.
 */

export const AUTH_WINDOW_DAYS = 6;

/**
 * The working deadline. Everything that involves waiting on somebody — a
 * rework, a defence, an appeal — has to be finished by day 5, leaving day 6
 * clear for the admin to actually settle and capture.
 *
 * Scheduling activity right up to day 6 meant an admin could arrive on the last
 * day with a decision to make and no time to make it.
 */
export const WORKING_DEADLINE_DAY = 5;

export interface AuthorisationWindow {
  /** 1 on the day of authorisation, 2 the next day, and so on */
  currentDay: number;
  /** whole days left before the authorisation dies */
  daysRemaining: number;
  /** days left to get everything wrapped up, leaving day 6 to settle */
  workingDaysRemaining: number;
  /** the moment the authorisation dies */
  expiresAt: Date;
  /** nothing that waits on a person may be scheduled past this */
  workingDeadline: Date;
  /** past the working deadline — settle now, no more waiting on anyone */
  settleNow: boolean;
  /** true once there is not enough left to do anything but settle */
  critical: boolean;
  expired: boolean;
  /** what an admin should be told, in plain words */
  summary: string;
}

/** Midnight-anchored so "day N" does not shift with the clock. */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function describeWindow(authorisedAt: Date | string | null): AuthorisationWindow | null {
  if (!authorisedAt) return null;

  const authorised = new Date(authorisedAt);
  if (isNaN(authorised.getTime())) return null;

  const dayIndex = Math.floor(
    (startOfDay(new Date()).getTime() - startOfDay(authorised).getTime()) / 86400000
  );
  const currentDay = dayIndex + 1; // authorisation day is day 1
  const daysRemaining = Math.max(0, AUTH_WINDOW_DAYS - currentDay);
  const workingDaysRemaining = Math.max(0, WORKING_DEADLINE_DAY - currentDay);

  const expiresAt = new Date(startOfDay(authorised).getTime() + AUTH_WINDOW_DAYS * 86400000);
  const workingDeadline = new Date(startOfDay(authorised).getTime() + WORKING_DEADLINE_DAY * 86400000);
  // Not "the money is gone" any more — captured funds do not lapse. This just
  // means the settlement has been outstanding longer than we would like.
  const expired = Date.now() >= expiresAt.getTime();
  // Once there are no working days left there is nothing to wait for, whether
  // or not the clock has technically crossed the deadline.
  const settleNow = !expired && (workingDaysRemaining <= 0 || Date.now() >= workingDeadline.getTime());

  return {
    currentDay,
    daysRemaining,
    workingDaysRemaining,
    expiresAt,
    workingDeadline,
    settleNow,
    critical: !expired && workingDaysRemaining <= 1,
    expired,
    summary: expired
      ? `Open for ${currentDay} days now — the payment is still held safely, but this is worth settling.`
      : settleNow
      ? `Day ${currentDay} — worth settling soon. The payment is held safely either way.`
      : `Day ${currentDay} since the payment was taken. It is held safely until this is settled.`,
  };
}

/**
 * How long a rework may run, given what is left.
 *
 * Capped at 3 days of actual work AND never past the window. Returns null when
 * there is not enough left to be worth offering — the honest answer then is a
 * compensation decision, not a rework nobody can finish in time.
 */
export function reworkAllowance(
  authorisedAt: Date | string | null,
  requestedDays = 3
): { days: number; deadline: Date; maxDays: number } | null {
  const w = describeWindow(authorisedAt);

  // Without an authorisation on record, fall back to the plain 3-day cap
  if (!w) {
    const days = Math.min(Math.max(requestedDays, 1), 3);
    return { days, deadline: new Date(Date.now() + days * 86400000), maxDays: 3 };
  }

  // No expiry to race any more — the money is captured and sitting in Stripe.
  // A rework gets the time it actually needs, capped at 3 days because a longer
  // wait is unfair to whoever is owed, not because the payment would lapse.
  const days = Math.min(Math.max(requestedDays, 1), 3);
  return { days, deadline: new Date(Date.now() + days * 86400000), maxDays: 3 };
}
