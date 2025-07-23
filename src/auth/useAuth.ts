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
    // Check if we've already tried to authenticate in this session
    const hasTriedAuth = sessionStorage.getItem('auth_attempted');
    if (hasTriedAuth === 'true') {
      console.log('[Auth] Already attempted auth in this session, preventing loop');
      setAuthState({ user: null, loading: false, error: new Error('Authentication loop detected') });
      return;
    }
    
    const authenticate = async () => {
      console.log('[Auth] Starting authentication flow...');
      sessionStorage.setItem('auth_attempted', 'true');
      
      // For local development, create a mock user to bypass auth.
      if (window.location.hostname === 'localhost') {
        console.log('[Auth] Localhost detected, using mock user');
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
        console.log('[Auth] Checking Teams context...');
        const inTeams = await checkTeamsContext();
        setIsInTeams(inTeams);
        console.log('[Auth] Teams context detected:', inTeams);

        // Check if we already have a session
        console.log('[Auth] Checking existing session at /.auth/me...');
        const response = await fetch('/.auth/me');
        console.log('[Auth] /.auth/me response status:', response.status);
        const data = await response.json();
        console.log('[Auth] /.auth/me data:', data);

        if (data.clientPrincipal) {
          // Already authenticated
          console.log('[Auth] Existing session found, user:', data.clientPrincipal.userDetails);
          sessionStorage.removeItem('auth_attempted'); // Clear flag on success
          setAuthState({ user: data.clientPrincipal, loading: false, error: null });
          return;
        }

        console.log('[Auth] No existing session found');

        // No existing session - need to authenticate
        if (inTeams) {
          // In Teams: Use SSO token
          try {
            await microsoftTeams.app.initialize();
            console.log('[Auth] Getting Teams SSO token...');
            const token = await microsoftTeams.authentication.getAuthToken();
            console.log('[Auth] Got Teams token, length:', token.length);
            
            // Send token to SWA to establish session
            console.log('[Auth] Attempting to POST Teams token to /.auth/login/aad...');
            const authResponse = await fetch('/.auth/login/aad', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ id_token: token })
            });
            
            console.log('[Auth] POST response status:', authResponse.status);
            console.log('[Auth] POST response ok:', authResponse.ok);

            if (authResponse.ok) {
              // Check session again
              console.log('[Auth] POST successful, checking session again...');
              const meResponse = await fetch('/.auth/me');
              const meData = await meResponse.json();
              console.log('[Auth] Second /.auth/me check:', meData);
              
              if (meData.clientPrincipal) {
                console.log('[Auth] Teams SSO successful, user:', meData.clientPrincipal.userDetails);
                sessionStorage.removeItem('auth_attempted'); // Clear flag on success
                setAuthState({ user: meData.clientPrincipal, loading: false, error: null });
                return;
              } else {
                console.log('[Auth] Teams SSO failed - no clientPrincipal after POST');
              }
            } else {
              console.log('[Auth] Teams token POST failed with status:', authResponse.status);
            }
          } catch (teamsError) {
            console.error('Teams SSO failed:', teamsError);
          }
        }

        // Fallback: redirect to login (works for both Teams and browser)
        console.log('[Auth] Falling back to redirect login...');
        window.location.href = '/.auth/login/aad';
      } catch (e) {
        console.error('[Auth] Authentication error:', e);
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
    console.log('[Auth] Initializing Teams SDK...');
    await microsoftTeams.app.initialize();
    console.log('[Auth] Teams SDK initialized, getting context...');
    const context = await microsoftTeams.app.getContext();
    console.log('[Auth] Teams context:', context);
    return !!context.app.host.name;
  } catch (error) {
    console.log('[Auth] Not in Teams context:', error);
    return false;
  }
}