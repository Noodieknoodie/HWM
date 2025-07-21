import { useState, useEffect } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';

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
    // Mock auth for local development
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

    // Teams SSO for production
    const authenticateWithTeams = async () => {
      try {
        await microsoftTeams.app.initialize();
        const token = await microsoftTeams.authentication.getAuthToken();
        
        // Extract user info from token
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        setAuthState({
          user: {
            userId: payload.oid || payload.sub,
            userDetails: payload.preferred_username || payload.email,
            userRoles: ['authenticated'],
            identityProvider: 'aad'
          },
          loading: false,
          error: null
        });
      } catch (error) {
        setAuthState({
          user: null,
          loading: false,
          error: error as Error
        });
      }
    };

    authenticateWithTeams();
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