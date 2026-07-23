import { buildReferralLink } from './referralCapture';

/**
 * The message a member sends when inviting someone.
 *
 * This text was pasted in eight places across two pages, and every copy said:
 *
 *   "🎁 We both earn 50 Errandify Points when you complete your first errand!"
 *
 * That is not what happens. referralService awards points to the *referrer*
 * only — `awardReferralPoints(client, referrerId, ...)` on both the join and
 * the first-job event. The person being invited receives nothing for being
 * referred. So the promise was made to a third party, by name, in a message
 * the platform composed, and the platform was never going to keep it.
 *
 * The honest version tells the referrer what they earn (in-app, where it is
 * true) and tells the friend what the link actually is (in the message, where
 * they are the one being asked to act). Disclosing that it is a referral link
 * is the decent thing to do and costs nothing — people forward these to
 * friends, not to strangers.
 */

/** Referrer earns this when someone joins on their code. */
export const JOIN_BONUS_EP = 50;
/** And this again when that person finishes their first errand. */
export const FIRST_JOB_BONUS_EP = 50;
export const MAX_PER_FRIEND_EP = JOIN_BONUS_EP + FIRST_JOB_BONUS_EP;

/**
 * A missing code is left out rather than papered over. The errand share used
 * to substitute the literal strings 'REF-CODE' and 'unknown', so a member
 * whose code had not loaded sent friends a message quoting a fake code and a
 * link ending `?ref=unknown` — an invite that could never be credited to
 * anyone. Sharing without attribution is a worse outcome than sharing with it,
 * but it is much better than sharing a lie.
 */
const CREDIT_LINE =
  "(It's my referral link, so the sign-up gets credited to me — thank you!)";

/** A general invite. */
export function buildInviteMessage(code: string | null | undefined): string {
  const intro =
    "Hi! I'm on Errandify — neighbours helping each other with everyday errands.";

  if (!code) {
    return `${intro}\n\nIf it sounds useful, you can join here:\n${window.location.origin}/join`;
  }
  return (
    `${intro}\n\n` +
    `If it sounds useful, you can join here:\n${buildReferralLink(code)}\n\n` +
    `Referral code: ${code}\n${CREDIT_LINE}`
  );
}

/** An invite attached to a specific errand the sender thinks they'd want. */
export function buildErrandInviteMessage(
  code: string | null | undefined,
  errandTitle: string,
  errandRef: string,
  errandId: number | string
): string {
  const header = `Saw this on Errandify and thought of you:\n\n${errandTitle}\n${errandRef}`;
  const errandParam = `errand=${encodeURIComponent(String(errandId))}`;

  if (!code) {
    return `${header}\n\nYou can pick it up here:\n${window.location.origin}/join?${errandParam}`;
  }
  return (
    `${header}\n\n` +
    `You can pick it up here:\n${buildReferralLink(code)}&${errandParam}\n\n` +
    `Referral code: ${code}\n${CREDIT_LINE}`
  );
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
