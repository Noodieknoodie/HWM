// frontend/src/auth/AuthProvider.tsx
import React, { useState, useEffect } from 'react';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { PublicClientApplication, InteractionType, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { getAuthConfig, loginRequest } from './authConfig';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeMsal = async () => {
      const config = await getAuthConfig();
      if (!config) {
        console.error('Failed to get auth configuration');
        setIsLoading(false);
        return;
      }

      const instance = new PublicClientApplication(config);
      
      // Handle auth redirects
      await instance.initialize();
      await instance.handleRedirectPromise();

      // Set up event callbacks
      instance.addEventCallback((event: EventMessage) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const payload = event.payload as AuthenticationResult;
          console.log('Login successful:', payload);
        }
        if (event.eventType === EventType.LOGIN_FAILURE) {
          console.error('Login failed:', event.error);
        }
      });

      // Check if running in Teams
      if (window.parent !== window.self) {
        try {
          // Attempt silent SSO
          const silentRequest = {
            ...loginRequest,
            loginHint: undefined, // Will be set if we can get Teams context
          };
          
          const response = await instance.ssoSilent(silentRequest);
          instance.setActiveAccount(response.account);
        } catch (error) {
          console.log('Silent SSO failed, user interaction required:', error);
        }
      }

      setMsalInstance(instance);
      setIsLoading(false);
    };

    initializeMsal();
  }, []);

  if (isLoading || !msalInstance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthGuard>{children}</AuthGuard>
    </MsalProvider>
  );
};

// Inner component that has access to MSAL context
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const authenticate = async () => {
      if (inProgress !== InteractionType.None || isAuthenticating) {
        return;
      }

      if (accounts.length === 0) {
        setIsAuthenticating(true);
        try {
          // Try silent authentication first
          const response = await instance.ssoSilent(loginRequest);
          instance.setActiveAccount(response.account);
        } catch (silentError) {
          console.log('Silent auth failed, trying interactive login');
          try {
            // Fall back to interactive login
            const response = await instance.loginRedirect(loginRequest);
          } catch (interactiveError) {
            console.error('Interactive login failed:', interactiveError);
          }
        }
        setIsAuthenticating(false);
      } else {
        // Set active account if not already set
        if (!instance.getActiveAccount() && accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
        }
      }
    };

    authenticate();
  }, [instance, accounts, inProgress, isAuthenticating]);

  // Show loading during authentication
  if (inProgress !== InteractionType.None || isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show error if no account after authentication attempts
  if (accounts.length === 0 && !isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the 401k Payment Tracker.</p>
          <button
            onClick={() => instance.loginRedirect(loginRequest)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};