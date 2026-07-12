/**
 * Capitalize status strings: 'completed' -> 'Completed', 'completed_unconfirmed' -> 'Completed Unconfirmed'
 */
export const capitalizeStatus = (status: string | undefined): string => {
  if (!status) return 'Unknown';

  // Special case: 'rated' status shows as 'Rated & Closed' since it's the final state
  if (status === 'rated') return 'Rated & Closed';

  // Replace underscores with spaces and capitalize each word
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format currency as SGD with 2 decimal places: 105 -> SGD $105.00
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === '') return 'SGD $0.00';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'SGD $0.00';

  return `SGD $${num.toFixed(2)}`;
};
