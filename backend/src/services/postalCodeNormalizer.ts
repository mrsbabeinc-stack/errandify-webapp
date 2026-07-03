/**
 * Normalize Singapore postal codes
 * - Trim spaces
 * - Uppercase input
 * - Remove leading 'S'
 * - Validate exactly 6 digits
 *
 * Examples:
 * "S680433" → "680433"
 * " 680433 " → "680433"
 * "invalid" → null
 */
export function normalizePostalCode(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalized = input
    .trim()
    .toUpperCase()
    .replace(/^S/, '')
    .replace(/[^0-9]/g, '');

  if (normalized.length === 6 && /^\d{6}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

export default {
  normalizePostalCode,
};
