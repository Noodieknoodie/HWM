  Example 1 (TypeScript React Tab):

  - Simple client-side Teams SSO using microsoftTeams.authentication.getAuthToken()
  - Exchanges token server-side via /getGraphAccessToken endpoint
  - Uses On-Behalf-Of flow with MSAL to get Graph token
  - Handles consent popup properly with /auth-start and /auth-end routes

  Example 2 (Node.js Tab):

  - Similar pattern but plain JavaScript
  - Client gets Teams token → sends to /getProfileOnBehalfOf → exchanges for Graph token
  - Proper consent handling with popup windows
  - Returns actual data (user profile) not just tokens

  What Your Code Does Wrong:

  1. Trying to POST Teams token directly to /.auth/login/aad - This doesn't work. SWA's auth endpoints don't accept POSTed tokens.
  2. No server-side token exchange - You need your own API endpoint to validate the Teams token and exchange it for session/Graph tokens.
  3. Missing consent flow - No popup handling for additional permissions.

  The Simplest Fix:

  Option 1: Remove Teams SSO entirely
  // Just use SWA's built-in auth
  useEffect(() => {
    const authenticate = async () => {
      const response = await fetch('/.auth/me');
      const data = await response.json();

      if (data.clientPrincipal) {
        setAuthState({ user: data.clientPrincipal, loading: false, error: null });
      } else {
        window.location.href = '/.auth/login/aad';
      }
    };

    authenticate();
  }, []);

  Option 2: Implement proper Teams SSO
  You'd need:
  1. Azure Function endpoint to exchange tokens
  2. Consent popup components
  3. Proper MSAL configuration

  Since you're using SWA with Data API Builder and no custom backend, Option 1 is the simplest. Just let SWA handle everything.


    What changed:
  1. Removed all Teams SDK code and imports
  2. Removed the broken token POST attempt
  3. Removed all console logging
  4. Simplified to just check /.auth/me and redirect if needed

  How it works now:
  1. App loads → checks /.auth/me
  2. If authenticated → sets user and continues
  3. If not → redirects to /.auth/login/aad
  4. Azure handles the OAuth flow
  5. User comes back authenticated



