/**
 * Generate formatted user ID: SG{XXX}-{LAST_4_OF_SINGPASS}
 * Example: SG547-073E where 547 is random and 073E is last 4 of SingPass ID
 */
export function generateFormattedUserId(singpassId: string): string {
  // Generate 3 random digits
  const randomCode = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  // Get last 4 characters of SingPass ID
  const lastFour = singpassId.slice(-4).toUpperCase();

  return `SG${randomCode}-${lastFour}`;
}

/**
 * Extract last 4 of SingPass ID from formatted ID
 * Example: SG547-073E -> 073E
 */
export function extractSingpassFromFormatted(formattedId: string): string | null {
  const match = formattedId.match(/SG\d{3}-(.{4})/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}
