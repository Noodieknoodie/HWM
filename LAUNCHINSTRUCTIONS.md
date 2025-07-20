# Teams SSO Configuration for Static Web Apps with React and Azure SQL

Your architecture is well-suited for Teams SSO, and Azure Static Web Apps handles much of the authentication complexity automatically. Here’s precisely what’s essential versus redundant for your setup.

## Azure App Registration: Essential Settings

The most critical configuration for Teams SSO lives in your App Registration. These settings are **non-negotiable** for Teams authentication to work: 

**Application ID URI Format**  
Must be exactly: `api://your-static-web-app-domain.com/{Application-Client-ID}`  
Example: `api://myapp.azurestaticapps.net/12345678-1234-1234-1234-123456789012` 

**Authorized Client Applications**  
Add these exact Microsoft client IDs under “Expose an API”:

- `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams mobile/desktop)
- `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web) 

Select the `access_as_user` scope for both. This is what allows Teams to authenticate on behalf of users.  

**Access Token Version**  
In the App Registration Manifest, set `requestedAccessTokenVersion` to `2`. This ensures compatibility with Teams’ authentication flow.  

**API Permissions**  
Only these Microsoft Graph delegated permissions are needed:

- `openid`, `profile`, `email`, `offline_access`, `User.Read` 

## Static Web Apps Authentication Configuration

Your `staticwebapp.config.json` needs minimal Teams-specific configuration:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/data-api/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

In your Static Web Apps Configuration settings, add:

- `AZURE_CLIENT_ID`: Your App Registration’s Client ID
- `AZURE_CLIENT_SECRET`: Client secret (only if doing server-side token exchange)

## React Code Implementation

Install the Teams JavaScript SDK v2: 

```bash
npm install @microsoft/teams-js@2.32.0
```

Create a custom hook for Teams SSO:

```typescript
import { useEffect, useState } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';

export const useTeamsSSO = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTeams = async () => {
      try {
        await microsoftTeams.app.initialize();
        const context = await microsoftTeams.app.getContext();
        
        // Get SSO token - this is the key Teams API call
        const authToken = await microsoftTeams.authentication.getAuthToken();
        setToken(authToken);
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    initializeTeams();
  }, []);

  return { token, loading, error };
};
```

The critical difference from regular Azure AD auth: Teams handles the entire authentication flow internally using `getAuthToken()`. No redirect URIs, no MSAL configuration, no popup windows.  

## Teams App Manifest Configuration

Your `manifest.json` must include this exact `webApplicationInfo` section: 

```json
{
  "webApplicationInfo": {
    "id": "{YOUR_AZURE_AD_APP_ID}",
    "resource": "api://yourstaticwebapp.azurestaticapps.net/{YOUR_AZURE_AD_APP_ID}"
  },
  "validDomains": [
    "yourstaticwebapp.azurestaticapps.net",
    "*.login.microsoftonline.com"
  ],
  "permissions": ["identity", "messageTeamMembers"]
}
```

 

The `resource` value must match your Application ID URI exactly. This is how Teams knows which app to authenticate against. 

## Database Authentication: No Additional Configuration Needed

**Key finding**: Azure Static Web Apps Database Connections automatically handles authentication when using the `/data-api` endpoints. You don’t need:

- Managed identity configuration for database access
- Database-level user authentication
- Custom authentication between Static Web Apps and SQL

Your `staticwebapp.database.config.json` simply needs:

```json
{
  "runtime": {
    "host": {
      "authentication": {
        "provider": "StaticWebApps"
      }
    }
  },
  "entities": {
    "YourEntity": {
      "permissions": [{
        "actions": ["read", "create", "update", "delete"],
        "role": "authenticated"
      }]
    }
  }
}
```

The authentication flow works automatically: Teams Token → Static Web Apps → Data API Builder → SQL Database.

## Managed Identity Requirements

**For your architecture**: Managed identity is **not required** for database access. Static Web Apps Database Connections use connection strings, not managed identity authentication.

Managed identity in Static Web Apps is only useful for:

- Retrieving secrets from Azure Key Vault
- Available only on Standard plan
- Not applicable to database connections 

The only database requirement: Enable “Allow Azure services and resources to access this server” in your SQL Database firewall settings. 

## Essential vs Redundant Summary

**Essential for Teams SSO:**

- App Registration with Teams client IDs authorized
- Application ID URI matching your domain exactly
- Teams manifest `webApplicationInfo` configuration  
- Teams JS SDK implementation with `getAuthToken()` 
- Database firewall allowing Azure services 

**Redundant/Not Needed:**

- Redirect URIs in App Registration (Teams doesn’t use them) 
- MSAL.js or other OAuth libraries
- Custom API layer between frontend and database
- Managed identity for database access 
- Database-level authentication configuration
- Complex token validation logic

Your architecture leverages Static Web Apps’ built-in capabilities perfectly.   The authentication chain from Teams through to your database is handled automatically once these configurations are in place.
