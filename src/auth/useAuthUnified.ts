import { useEffect, useState } from 'react';
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
  isTeams: boolean;
}

export function useAuthUnified() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isTeams: false
  });

  useEffect(() => {
    const authenticateUser = async () => {
      // Development mode
      if (window.location.hostname === 'localhost') {
        setAuthState({
          user: {
            userId: 'dev-user',
            userDetails: 'dev@hohimer.com',
            userRoles: ['authenticated'],
            identityProvider: 'aad'
          },
          loading: false,
          error: null,
          isTeams: false
        });
        return;
      }

      // Check if we're in Teams
      try {
        await microsoftTeams.app.initialize();
        await microsoftTeams.app.getContext();
        
        // We're in Teams - use Teams SSO
        setAuthState(prev => ({ ...prev, isTeams: true }));
        
        try {
          const token = await microsoftTeams.authentication.getAuthToken();
          
          // Decode the token to get user info (basic parsing, not validation)
          const payload = token.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          
          setAuthState({
            user: {
              userId: decoded.oid || decoded.sub,
              userDetails: decoded.preferred_username || decoded.upn || decoded.email,
              userRoles: ['authenticated'],
              identityProvider: 'teams-sso'
            },
            loading: false,
            error: null,
            isTeams: true
          });
        } catch (ssoError) {
          // Teams SSO failed - show error
          setAuthState({
            user: null,
            loading: false,
            error: new Error('Teams authentication failed. Please ensure you are logged into Teams.'),
            isTeams: true
          });
        }
      } catch (teamsError) {
        // Not in Teams - use EasyAuth for browser
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
              error: null,
              isTeams: false
            });
          } else {
            // Redirect to login
            window.location.href = '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent(window.location.href);
          }
        } catch (authError) {
          setAuthState({
            user: null,
            loading: false,
            error: authError as Error,
            isTeams: false
          });
        }
      }
    };

    authenticateUser();
  }, []);

  const logout = () => {
    if (authState.isTeams) {
      // Can't really logout from Teams - just clear local state
      setAuthState({
        user: null,
        loading: false,
        error: null,
        isTeams: true
      });
    } else {
      // Browser logout
      window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !authState.loading && !!authState.user,
    isTeams: authState.isTeams,
    logout
  };
}