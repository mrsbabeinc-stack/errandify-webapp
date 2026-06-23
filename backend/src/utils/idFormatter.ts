/**
 * Generate formatted user ID: SG{XXX}({LAST_4_OF_ID})
 * Example: SG547(1234) where 547 is random and 1234 is last 4 of user ID
 */
export function generateFormattedUserId(userId: number): string {
  // Generate 3 random digits
  const randomCode = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  // Get last 4 characters of user ID (padded with zeros if necessary)
  const userIdStr = userId.toString().padStart(4, '0');
  const lastFour = userIdStr.slice(-4);

  return `SG${randomCode}(${lastFour})`;
}

/**
 * Extract user ID from formatted ID
 * Example: SG547(1234) -> 1234
 */
export function extractUserIdFromFormatted(formattedId: string): number | null {
  const match = formattedId.match(/SG\d{3}\((\d{4})\)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}
