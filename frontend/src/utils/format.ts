/**
 * Capitalize status strings: 'completed' -> 'Completed', 'completed_unconfirmed' -> 'Completed Unconfirmed'
 */
export const capitalizeStatus = (status: string | undefined): string => {
  if (!status) return 'Unknown';

  // Replace underscores with spaces and capitalize each word
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
