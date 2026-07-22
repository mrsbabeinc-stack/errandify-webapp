/**
 * Came in from origin during the branch reconciliation. The original read:
 *
 *   typeof window !== 'undefined' ? window.location.origin : window.location.origin
 *
 * Both branches were identical, so the guard did nothing and the "safe" path
 * dereferenced `window` in exactly the case it was checking for. Returning ''
 * instead leaves axios on a relative URL, which is the sane answer when there
 * is no origin to read.
 */
export const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return typeof window !== 'undefined' ? window.location.origin : '';
};
