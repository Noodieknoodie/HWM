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
    const authenticateUser = async () => {
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

      const isInTeams = window.parent !== window.self;

      if (isInTeams) {
        try {
          await microsoftTeams.app.initialize();
          
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
            microsoftTeams.authentication.authenticate({
              url: `${window.location.origin}/.auth/login/aad`,
              width: 600,
              height: 535,
              successCallback: () => {
                window.location.reload();
              },
              failureCallback: (error) => {
                setAuthState({
                  user: null,
                  loading: false,
                  error: new Error(error || 'Authentication failed')
                });
              }
            });
          }
        } catch (error) {
          console.error('Teams init error:', error);
          setAuthState({
            user: null,
            loading: false,
            error: error as Error
          });
        }
      } else {
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
            window.location.href = '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent(window.location.pathname);
          }
        } catch (error) {
          setAuthState({
            user: null,
            loading: false,
            error: error as Error
          });
        }
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