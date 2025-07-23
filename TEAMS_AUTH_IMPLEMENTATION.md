You can rely on the built-in Entra ID (Azure AD) authentication that Azure Static Web Apps already provides, so you do not need a custom flow that trades the Teams SSO token for a second SWA session token.

Why a custom exchange is unnecessary
Fact	Explanation
1. Teams tab SSO issues an Entra ID access token for your app ID	When your React tab calls microsoftTeams.authentication.getAuthToken(), Teams retrieves a normal Entra ID access token whose audience (aud) is set to the application you registered.
2. Azure Static Web Apps accepts that same Entra ID token	SWA’s front-door authentication allows Entra ID as a first-class provider. Any valid bearer token for your app or for the Graph resource can be sent in the Authorization: Bearer <token> header and will be treated as an authenticated session.
3. The SWA auth endpoint (/.auth/me) exposes SWA-specific cookies automatically	After SWA validates the bearer token it issues its own cookies so subsequent requests (including Data API Builder calls) are authenticated without resending the token.
4. The Data API Builder sits behind the same SWA auth boundary	Because DAB APIs are served from /data/* under the SWA domain, they inherit the signed-in identity established by the SWA cookies—no extra exchange is needed.
5. Microsoft guidance shows OBO (on-behalf-of) exchange only when you must call another downstream API (e.g., Graph) from your own server code	In a pure SWA + DAB scenario you have no custom backend that needs a downstream token, so the OBO/token-exchange step is irrelevant.
What you actually need to implement
Register a single Entra ID application

Add Teams tab SSO permissions in the manifest (webApplicationInfo).

Add a Static Web App authentication setting pointing to the same app registration.

Front-end logic

Inside the tab, call getAuthToken() to obtain the Entra ID token.

Immediately send a POST to /.auth/login/aad with that token in the body (or just place it in the Authorization header of your first API call). SWA converts it into its own session.

Consume Data API Builder

Call the generated REST endpoints; they will see the user identity from the SWA cookies and can map roles via claims if desired.

(Optional) Downstream Graph calls

If you later need Microsoft Graph, add a minimal Azure Function and use the OBO flow there. That is the only point where a token exchange becomes necessary.

Key takeaways
SWA already handles the “convert bearer token → site cookies” step for you.

Teams SSO and SWA Entra ID auth are compatible out of the box; no custom micro-service is required.

Implement a custom token exchange only if you introduce your own protected backend that must call other APIs on behalf of the user.

 learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-overview
 learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-code
 learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization