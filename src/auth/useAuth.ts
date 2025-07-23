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
 * Simple authentication hook for Azure Static Web Apps.
 * Uses SWA's built-in authentication - no custom token exchange needed.
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
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
          error: null
        });
        return;
      }

      try {
        // Check if we have an existing session
        const response = await fetch('/.auth/me');
        const data = await response.json();

        if (data.clientPrincipal) {
          // User is authenticated
          setAuthState({ user: data.clientPrincipal, loading: false, error: null });
        } else {
          // No session - redirect to login
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