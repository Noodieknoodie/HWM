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
    error: null,
  });

  useEffect(() => {
    const authenticate = async () => {
      // Dev environment bypass
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
        // Only use SWA auth
        const response = await fetch('/.auth/me');
        const data = await response.json();
        
        if (data.clientPrincipal) {
          setAuthState({ 
            user: data.clientPrincipal, 
            loading: false, 
            error: null
          });
        } else {
          // Redirect to login
          const returnUrl = window.location.href;
          window.location.href = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(returnUrl)}`;
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