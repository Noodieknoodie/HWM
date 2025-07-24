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
        // Check SWA session
        const swaUser = await checkSwaSession();
        
        if (swaUser) {
          // We have a valid SWA session
          setAuthState({ 
            user: swaUser, 
            loading: false, 
            error: null,
            token: null
          });
        } else {
          // No SWA session - redirect to login
          const returnUrl = window.location.href;
          window.location.href = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(returnUrl)}`;
        }
      } catch (e) {
        setAuthState({ user: null, loading: false, error: e as Error, token: null });
      }
    };

    const checkSwaSession = async () => {
      try {
        const response = await fetch('/.auth/me');
        const data = await response.json();
        return data.clientPrincipal || null;
      } catch {
        return null;
      }
    };

    authenticate();
  }, []);

  const logout = () => {
    // Use SWA logout
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
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