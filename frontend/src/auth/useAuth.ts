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
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      // For local development, mock a user
      setAuthState({
        user: {
          userId: 'dev-user',
          userDetails: 'developer@hohimerwealthmanagement.com',
          userRoles: ['authenticated'],
          identityProvider: 'development'
        },
        loading: false,
        error: null
      });
      return;
    }

    // Production: Fetch user info from Static Web App auth endpoint
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
    if (import.meta.env.DEV) {
      console.log('Logout in development mode');
      return;
    }
    window.location.href = '/.auth/logout';
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    logout
  };
}