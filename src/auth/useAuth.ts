// In: src/auth/useAuth.ts
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
}

/**
 * This is the primary authentication hook for the application.
 * It leverages the built-in authentication ("Easy Auth") of Azure Static Web Apps.
 * The flow is:
 * 1. If in Teams context, get SSO token and send it to SWA
 * 2. Otherwise, check for existing session via `/.auth/me`
 * 3. If no session, redirect to `/.auth/login/aad`
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const [isInTeams, setIsInTeams] = useState(false);

  useEffect(() => {
    const authenticate = async () => {
      // For local development, create a mock user to bypass auth.
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
        // First check if we're in Teams
        const inTeams = await checkTeamsContext();
        setIsInTeams(inTeams);
        console.log('[Auth] Teams context detected:', inTeams);

        // Check if we already have a session
        const response = await fetch('/.auth/me');
        const data = await response.json();

        if (data.clientPrincipal) {
          // Already authenticated
          setAuthState({ user: data.clientPrincipal, loading: false, error: null });
          return;
        }

        // No existing session - need to authenticate
        if (inTeams) {
          // In Teams: Use SSO token
          try {
            await microsoftTeams.app.initialize();
            console.log('[Auth] Getting Teams SSO token...');
            const token = await microsoftTeams.authentication.getAuthToken();
            console.log('[Auth] Got Teams token, length:', token.length);
            
            // Send token to SWA to establish session
            const authResponse = await fetch('/.auth/login/aad', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ id_token: token })
            });

            if (authResponse.ok) {
              // Check session again
              const meResponse = await fetch('/.auth/me');
              const meData = await meResponse.json();
              
              if (meData.clientPrincipal) {
                console.log('[Auth] Teams SSO successful, user:', meData.clientPrincipal.userDetails);
                setAuthState({ user: meData.clientPrincipal, loading: false, error: null });
                return;
              }
            }
          } catch (teamsError) {
            console.error('Teams SSO failed:', teamsError);
          }
        }

        // Fallback: redirect to login (works for both Teams and browser)
        window.location.href = '/.auth/login/aad';
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
    isInTeams,
    logout,
  };
}

async function checkTeamsContext(): Promise<boolean> {
  try {
    await microsoftTeams.app.initialize();
    const context = await microsoftTeams.app.getContext();
    return !!context.app.host.name;
  } catch {
    return false;
  }
}