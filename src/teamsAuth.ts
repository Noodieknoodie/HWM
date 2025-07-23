import * as microsoftTeams from "@microsoft/teams-js";

// Initialize Teams SDK
let teamsInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initializeTeams(): Promise<void> {
  if (teamsInitialized) return;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    microsoftTeams.app.initialize().then(() => {
      teamsInitialized = true;
      resolve();
    });
  });

  return initPromise;
}

export async function getSwaAccessToken(): Promise<string> {
  // Ensure Teams is initialized
  await initializeTeams();

  return new Promise((resolve, reject) => {
    microsoftTeams.authentication.getAuthToken({
      successCallback: (token) => resolve(token),
      failureCallback: (err) => reject(new Error(err))
    });
  });
}

// Helper to check if we're running in Teams
export function isInTeams(): boolean {
  // Check multiple indicators to determine if we're in Teams
  const urlParams = new URLSearchParams(window.location.search);
  const hasTeamsParams = urlParams.has('entityId') || urlParams.has('subEntityId');
  const hasTeamsUserAgent = /Teams/i.test(navigator.userAgent);
  const inIframe = window.self !== window.top;
  
  return hasTeamsParams || hasTeamsUserAgent || inIframe;
}

// Parse JWT token to get user info
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT token:', e);
    return null;
  }
}

// Get user info from Teams token
export function getUserFromToken(token: string): { userId: string; userDetails: string; userRoles: string[]; identityProvider: string } | null {
  const claims = parseJwt(token);
  if (!claims) return null;

  return {
    userId: claims.oid || claims.sub || 'unknown',
    userDetails: claims.preferred_username || claims.email || claims.name || 'unknown',
    userRoles: ['authenticated'],
    identityProvider: 'aad'
  };
}