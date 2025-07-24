# Task: Implement Dual Authentication Strategy for Teams Compatibility
# Date: 2025-01-24

## Summary
The app was completely broken in Microsoft Teams due to third-party cookie restrictions. Implemented dual authentication to support both browser (cookie) and Teams (Bearer token) contexts.

## Context & Reasoning
Teams blocks third-party cookies in iframes (security feature since 2023), causing authentication redirect loops (AADSTS50058 errors). The previous "simplification" that removed Teams-specific handling was fundamentally flawed - Teams REQUIRES Bearer tokens. 

Key discovery: Data API Builder (DAB) already supports multiple authentication providers simultaneously. This means we can have cookie auth for browsers AND JWT validation for Teams using the same endpoints.

## Files Affected
- src/teamsAuth.ts
- swa-db-connections/staticwebapp.database.config.json
- src/api/client.ts
- src/auth/useAuth.ts

## Implementation Notes
1. Created proper Teams SDK integration module with token retrieval
2. Updated DAB config to accept both StaticWebApps and JWT providers
3. Modified API client to conditionally send Bearer tokens when in Teams context
4. Updated auth hook to detect Teams environment and use appropriate auth flow
5. Browser users continue with unchanged cookie auth, Teams users get tokens via SDK

## Expected Outcome
- Browser users: No change, cookie auth works as before
- Teams users: Successful authentication via Bearer tokens, no redirect loops
- Mobile Teams: Full functionality restored
- Same API endpoints work for both auth methods


## RESEARCH:
```
## Yes — Data API Builder (DAB) can accept Bearer tokens
Data API Builder supports JWT Bearer access tokens issued by any OpenID-Connect–compatible identity provider, including Microsoft Entra ID, Azure Static Web Apps EasyAuth, Keycloak, Auth0, and similar services. When a request reaches DAB:
The caller places the token in the HTTP Authorization header: 
Authorization: Bearer <access_token>
DAB validates the token’s signature, issuer (iss), audience (aud), expiry (exp), and—if configured—custom claims.
If the token is valid, DAB maps the request to one or more roles (defined in dab-config.json) and enforces row-level and action-level permissions.
The user’s claims are made available to your SQL or Cosmos DB queries through the @claims session context.
### How to enable Bearer authentication
Add an authentication block to your dab-config.json:
{
  "authentication": {
    "provider": "Jwt",
    "jwt": {
      "issuer": "https://login.microsoftonline.com/<tenant>/v2.0",
      "audiences": [ "api://your-api-id" ],
      "allowed_algorithms": [ "RS256" ]
    }
  }
}
Key points:
provider: "Jwt" switches DAB to Bearer-token mode instead of Static Web Apps header mode[1].
issuer and audiences must match the values in the tokens you issue.
If you host on Azure Static Web Apps and want to accept EasyAuth cookies, you can add a second provider entry ("StaticWebApps"); DAB will honor either scheme at runtime[2].
### Development and self-hosted scenarios
DAB exposes only a subset of JwtBearerOptions. For example, RequireHttpsMetadata defaults to true; if you need HTTP tokens for local Docker or dev Kubernetes, you must override that setting by environment variable or patching the container image[3][4].
### When would you prefer Bearer tokens over SWA cookies?
Teams tabs or other iframe clients where third-party cookies are blocked.
Mobile apps calling DAB directly.
Multi-tenant or B2C scenarios where tokens come from different issuers.
In mixed deployments you can run DAB with both Static Web Apps and Jwt providers enabled, letting browser users rely on EasyAuth cookies while API clients and Teams tabs send Bearer tokens in the header.
### Bottom line
Configure the Jwt provider in dab-config.json (alone or alongside StaticWebApps), make sure your identity platform issues access tokens that list DAB’s URL as an audience, and send them in the Authorization: Bearer header. DAB will validate the tokens and apply your role-based security rules automatically[2][1][3].
```

BULLSHIT LIAR ^^^^
===


