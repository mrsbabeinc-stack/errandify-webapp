/**
 * Holds on to a referral code between the invite link and the signup call.
 *
 * The code cannot simply be read off the URL at signup time. Signing up goes
 * out to singpass.gov.sg and comes back to /auth/singpass-callback, and that
 * round trip destroys the original query string — so a `?ref=` that is only
 * ever read from `location.search` is gone by the time the account is created.
 * Every invite link ever shared lost its attribution here.
 *
 * So: capture on arrival, persist, and read it back after the redirect.
 *
 * The code is stored with a timestamp and expires. A referral code sitting in
 * localStorage forever means someone who followed a friend's link in March and
 * signed up in September gets attributed to that friend, which is not what
 * either of them would expect.
 */

const STORAGE_KEY = 'errandify_referral';
const PENDING_ERRAND_KEY = 'errandify_pending_errand';
const MAX_AGE_DAYS = 30;
/** An errand goes stale far faster than a referral — it gets taken or expires. */
const PENDING_ERRAND_MAX_AGE_DAYS = 3;

interface StoredReferral {
  code: string;
  capturedAt: number;
}

interface PendingErrand {
  errandId: string;
  capturedAt: number;
}

/**
 * Reads `?ref=` from the current URL, stores it, and strips it from the
 * address bar.
 *
 * Stripping matters: the parameter otherwise survives into every link the
 * visitor copies out of their address bar, so one person's code spreads to
 * pages they never meant to attribute.
 *
 * Call this once, as early as possible, so an invite can point at any page —
 * `/join?ref=`, `/errand/12?ref=`, or the bare `/?ref=`.
 */
export function captureReferralFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    const errand = params.get('errand');
    if (!code && !errand) return;

    const trimmed = code?.trim().slice(0, 50);
    if (trimmed) {
      const payload: StoredReferral = { code: trimmed, capturedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    /**
     * An invite sent from a specific errand carries `&errand=`, because the
     * message says "You can pick it up here". Nothing read that parameter, so
     * the friend signed up and landed on the generic home screen — the errand
     * they were actually invited to was never shown to them, and the message
     * had promised otherwise.
     *
     * Held separately and with a much shorter life than the referral code: a
     * referral is worth honouring weeks later, but an errand someone was
     * pointed at is very likely taken or expired by then.
     */
    if (errand && /^\d+$/.test(errand.trim())) {
      localStorage.setItem(
        PENDING_ERRAND_KEY,
        JSON.stringify({ errandId: errand.trim(), capturedAt: Date.now() })
      );
    }

    params.delete('ref');
    params.delete('errand');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    );
  } catch {
    // Attribution is a nice-to-have. A private-mode browser that refuses
    // localStorage must still be able to sign up.
  }
}

/** The stored code, or null if there is none or it has gone stale. */
export function getStoredReferral(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: StoredReferral = JSON.parse(raw);
    if (!parsed?.code || typeof parsed.capturedAt !== 'number') return null;

    const ageDays = (Date.now() - parsed.capturedAt) / 86_400_000;
    if (ageDays > MAX_AGE_DAYS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

/**
 * The errand an invite pointed at, if there is one — read once and cleared.
 *
 * One-shot by design: a returning member should not be bounced to the same
 * errand every time they open the app.
 */
export function consumePendingErrand(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_ERRAND_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_ERRAND_KEY);

    const parsed: PendingErrand = JSON.parse(raw);
    if (!parsed?.errandId || typeof parsed.capturedAt !== 'number') return null;

    const ageDays = (Date.now() - parsed.capturedAt) / 86_400_000;
    if (ageDays > PENDING_ERRAND_MAX_AGE_DAYS) return null;

    return parsed.errandId;
  } catch {
    return null;
  }
}

/** Call once the signup has been accepted, so the code is not reused. */
export function clearStoredReferral(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * The canonical invite URL. One place, so the four different link formats that
 * used to exist — two backend, two frontend, none of them a real route —
 * cannot drift apart again.
 */
export function buildReferralLink(code: string): string {
  return `${window.location.origin}/join?ref=${encodeURIComponent(code)}`;
}
