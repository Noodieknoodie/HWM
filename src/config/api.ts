// API configuration based on environment
export const getApiBaseUrl = (isTeams: boolean): string => {
  // For local development
  if (window.location.hostname === 'localhost') {
    return '';
  }

  // For Teams - use the container endpoint
  if (isTeams) {
    // This will be set during deployment
    const teamsUrl = import.meta.env.VITE_TEAMS_DAB_URL;
    if (teamsUrl) {
      return teamsUrl;
    }
    // Fallback - this will be replaced during deployment
    console.warn('VITE_TEAMS_DAB_URL not set, using placeholder');
    return 'https://dab-teams-placeholder.azurecontainerapps.io';
  }

  // For browser - use relative path (SWA hosted DAB)
  return '';
};