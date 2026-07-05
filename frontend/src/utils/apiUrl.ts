export const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : window.location.origin);
};
