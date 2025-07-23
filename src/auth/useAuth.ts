// In: src/auth/useAuth.ts
import { useEffect, useState } from 'react';
import { getSwaAccessToken, isInTeams, getUserFromToken } from '../teamsAuth';

interface User {
  userId: string;
  userDetails: string;
  userRoles: string[];
  identityProvider: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  token: string | null;
}

/**
 * Authentication hook that supports both Teams SSO and SWA Easy Auth.
 * Automatically detects Teams context and uses appropriate auth method.
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    token: null,
  });

  useEffect(() => {
    const authenticate = async () => {
      // For local development, create a mock user to bypass auth
      if (window.location.hostname === 'localhost') {
        setAuthState({
          user: { 
            userId: 'dev-user', 
            userDetails: 'dev@hohimerwealthmanagement.com', 
            userRoles: ['authenticated'], 
            identityProvider: 'aad' 
          },
          loading: false, 
          error: null,
          token: null
        });
        return;
      }

      try {
        // Check if we're running in Teams
        if (isInTeams()) {
          try {
            // Get token from Teams
            const token = await getSwaAccessToken();
            const user = getUserFromToken(token);
            
            if (user) {
              setAuthState({ 
                user, 
                loading: false, 
                error: null,
                token 
              });
            } else {
              throw new Error('Failed to parse user from token');
            }
          } catch (teamsError) {
            console.error('Teams SSO failed:', teamsError);
            // Fall back to SWA auth if Teams SSO fails
            await authenticateWithSwa();
          }
        } else {
          // Not in Teams, use SWA auth
          await authenticateWithSwa();
        }
      } catch (e) {
        setAuthState({ user: null, loading: false, error: e as Error, token: null });
      }
    };

    const authenticateWithSwa = async () => {
      // Check if we have an existing SWA session
      const response = await fetch('/.auth/me');
      const data = await response.json();

      if (data.clientPrincipal) {
        // User is authenticated via SWA
        setAuthState({ 
          user: data.clientPrincipal, 
          loading: false, 
          error: null,
          token: null 
        });
      } else {
        // No session - redirect to login
        window.location.href = '/.auth/login/aad';
      }
    };

    authenticate();
  }, []);

  const logout = () => {
    if (isInTeams()) {
      // In Teams, we can't really log out - just clear local state
      setAuthState({
        user: null,
        loading: false,
        error: null,
        token: null
      });
    } else {
      // In browser, use SWA logout
      window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !authState.loading && !!authState.user,
    token: authState.token,
    logout,
  };
}