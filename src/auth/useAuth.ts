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

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const authenticateUser = async () => {
      // Check URL params for demo mode
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('demo') === 'true') {
        sessionStorage.setItem('demoMode', 'true');
      }

      // Check for demo mode first
      const isDemoMode = sessionStorage.getItem('demoMode') === 'true';
      if (isDemoMode) {
        setAuthState({
          user: {
            userId: 'demo-user',
            userDetails: 'demo@example.com',
            userRoles: ['authenticated'],
            identityProvider: 'demo'
          },
          loading: false,
          error: null
        });
        return;
      }

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
        const response = await fetch('/.auth/me');
        const data = await response.json();
        
        if (data.clientPrincipal) {
          setAuthState({
            user: {
              userId: data.clientPrincipal.userId,
              userDetails: data.clientPrincipal.userDetails,
              userRoles: data.clientPrincipal.userRoles,
              identityProvider: data.clientPrincipal.identityProvider
            },
            loading: false,
            error: null
          });
        } else {
          window.location.href = '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent(window.location.href);
        }
      } catch (error) {
        setAuthState({
          user: null,
          loading: false,
          error: error as Error
        });
      }
    };

    authenticateUser();
  }, []);

  const logout = () => {
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !authState.loading && !!authState.user,
    logout
  };
}