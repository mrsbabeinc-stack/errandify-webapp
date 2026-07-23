/**
 * Holds on to a lead invite token between the link and the signup call.
 *
 * Exactly the problem referralCapture.ts solves, for the same reason: signing
 * up goes out to singpass.gov.sg and returns to /auth/singpass-callback, and
 * that round trip destroys the original query string. An `?invite=` read only
 * from `location.search` at signup time is already gone — which is precisely
 * how every referral link lost its attribution before that util existed.
 *
 * So: capture on arrival, persist, read it back after the redirect.
 *
 * Kept separate from the referral store rather than folded into it. They are
 * different things that can arrive together — someone can follow a launch
 * invite AND carry a friend's referral code — and one must not overwrite the
 * other.
 */

const STORAGE_KEY = 'errandify_lead_invite';

/**
 * Shorter than the referral's 30 days. An invite is "we have launched in your
 * area, come in now"; a token still sitting here two months later belongs to a
 * campaign that has passed, and converting it would attribute a signup to the
 * wrong moment.
 */
const MAX_AGE_DAYS = 30;

interface StoredInvite {
  token: string;
  capturedAt: number;
}

/**
 * Reads `?invite=` from the current URL, stores it, and strips it from the
 * address bar.
 *
 * Stripping matters more here than for a referral code: this token is a
 * single-use credential, and leaving it in the address bar means it travels
 * into every link the visitor copies out of it.
 *
 * Call once, as early as possible, so an invite can point at any page.
 */
export function captureLeadInviteFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token) return;

    const trimmed = token.trim().slice(0, 120);
    if (trimmed) {
      const payload: StoredInvite = { token: trimmed, capturedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    params.delete('invite');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    );
  } catch {
    // A blocked or full localStorage must never stop someone signing up.
  }
}

/** The stored token, or null if absent or too old to still mean anything. */
export function getStoredLeadInvite(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredInvite;
    if (!parsed?.token) return null;

    const ageDays = (Date.now() - (parsed.capturedAt || 0)) / (1000 * 60 * 60 * 24);
    if (ageDays > MAX_AGE_DAYS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

/** Cleared only once the account exists, so a failed signup can be retried. */
export function clearStoredLeadInvite(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}
