// frontend/src/auth/useAuth.ts
import { useState, useEffect } from 'react';

interface User {
  userId: string;
  userDetails: string; // email
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
    // Mock auth for local development
    if (window.location.hostname === 'localhost') {
      setAuthState({
        user: {
          userId: 'local-dev-user',
          userDetails: 'dev@localhost',
          userRoles: ['authenticated'],
          identityProvider: 'aad'
        },
        loading: false,
        error: null
      });
      return;
    }
    
    // Fetch user info from Static Web App auth endpoint
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientPrincipal) {
          setAuthState({
            user: {
              userId: data.clientPrincipal.userId,
              userDetails: data.clientPrincipal.userDetails,
              userRoles: data.clientPrincipal.userRoles || [],
              identityProvider: data.clientPrincipal.identityProvider
            },
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            user: null,
            loading: false,
            error: null
          });
        }
      })
      .catch(error => {
        setAuthState({
          user: null,
          loading: false,
          error
        });
      });
  }, []);

  const logout = () => {
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    logout
  };
}