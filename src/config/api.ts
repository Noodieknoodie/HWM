export const getApiBaseUrl = (): string => {
  return window.location.hostname === 'localhost' ? '' : '';
};