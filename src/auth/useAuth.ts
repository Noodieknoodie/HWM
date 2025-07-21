// src/auth/useAuth.ts
import { useState, useEffect } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';

const ENABLE_BROWSER_AUTH = true; // Set to false before deploying to production

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
    // Use mock auth for local development
    if (window.location.hostname === 'localhost') {
      setAuthState({
        user: {
          userId: 'dev-user',
          userDetails: 'dev@hohimer.com',
          userRoles: ['authenticated'],
          identityProvider: 'aad'
        },
        loading: false,
        error: null
      });
      return;
    }

    // ALWAYS use Static Web Apps auth (remove Teams SSO detection)
    fetch('/.auth/me', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
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
            // Redirect to login
            window.location.href = '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent(window.location.pathname);
          }
        })
        .catch(error => {
          setAuthState({
            user: null,
            loading: false,
            error: error as Error
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