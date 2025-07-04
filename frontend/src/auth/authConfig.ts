// frontend/src/auth/authConfig.ts
import { Configuration, LogLevel } from '@azure/msal-browser';

// Fetch auth config from backend
export async function getAuthConfig(): Promise<Configuration | null> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/config`);
    if (!response.ok) {
      console.error('Failed to fetch auth config');
      return null;
    }
    
    const config = await response.json();
    
    return {
      auth: {
        clientId: config.clientId,
        authority: config.authority,
        redirectUri: config.redirectUri || window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: false,
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) {
              return;
            }
            switch (level) {
              case LogLevel.Error:
                console.error(message);
                return;
              case LogLevel.Info:
                console.info(message);
                return;
              case LogLevel.Verbose:
                console.debug(message);
                return;
              case LogLevel.Warning:
                console.warn(message);
                return;
              default:
                return;
            }
          },
          logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Warning,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching auth config:', error);
    return null;
  }
}

// Login request scopes
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

// API request scopes - will be dynamically set based on backend config
export const getApiRequestScopes = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/config`);
    if (!response.ok) {
      return { scopes: [] };
    }
    const config = await response.json();
    return { scopes: config.scopes || [] };
  } catch {
    return { scopes: [] };
  }
};