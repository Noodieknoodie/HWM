// frontend/src/auth/useAuth.ts
import { useMsal, useAccount } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { getApiRequestScopes } from './authConfig';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
}

export function useAuth() {
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || null);

  const getAccessToken = async (): Promise<string | null> => {
    if (!account) {
      console.error('No active account');
      return null;
    }

    try {
      const apiScopes = await getApiRequestScopes();
      const response = await instance.acquireTokenSilent({
        ...apiScopes,
        account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const apiScopes = await getApiRequestScopes();
          const response = await instance.acquireTokenRedirect({
            ...apiScopes,
            account,
          });
          return response?.accessToken || null;
        } catch (interactiveError) {
          console.error('Interactive token acquisition failed:', interactiveError);
          return null;
        }
      } else {
        console.error('Token acquisition failed:', error);
        return null;
      }
    }
  };

  const signOut = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const user: AuthUser | null = account ? {
    id: account.localAccountId,
    email: account.username,
    name: account.name || '',
    tenantId: account.tenantId || '',
  } : null;

  return {
    user,
    isAuthenticated: !!account,
    getAccessToken,
    signOut,
  };
}