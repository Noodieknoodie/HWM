// In: src/auth/useAuth.ts
import { useEffect, useState } from 'react';

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
}

/**
 * This is the primary authentication hook for the application.
 * It leverages the built-in authentication ("Easy Auth") of Azure Static Web Apps.
 * The flow is simple:
 * 1. Check for an existing session via the `/.auth/me` endpoint.
 * 2. If no session, redirect to `/.auth/login/aad`.
 * 3. Inside Teams, this redirect is handled silently by the SWA platform,
 *    achieving seamless SSO without any manual token exchange in the frontend.
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const authenticate = async () => {
      // For local development, create a mock user to bypass auth.
      if (window.location.hostname === 'localhost') {
        setAuthState({
          user: { 
            userId: 'dev-user', 
            userDetails: 'dev@hohimerwealthmanagement.com', 
            userRoles: ['authenticated'], 
            identityProvider: 'aad' 
          },
          loading: false, 
          error: null
        });
        return;
      }

      try {
        // Check if the SWA platform has already established a session.
        const response = await fetch('/.auth/me');
        const data = await response.json();

        if (data.clientPrincipal) {
          // Yes, user is logged in.
          setAuthState({ user: data.clientPrincipal, loading: false, error: null });
        } else {
          // No session. Redirect to the SWA login endpoint.
          // Inside Teams, this is a silent, invisible process.
          window.location.href = '/.auth/login/aad';
        }
      } catch (e) {
        setAuthState({ user: null, loading: false, error: e as Error });
      }
    };

    authenticate();
  }, []);

  const logout = () => {
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !authState.loading && !!authState.user,
    logout,
  };
}