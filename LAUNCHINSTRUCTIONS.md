## Teams App Manifest - Condensed Documentation for Tab Apps

### Core Manifest Structure
```json
{
    "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.22/MicrosoftTeams.schema.json",
    "manifestVersion": "1.22",
    "version": "1.0.0",
    "id": "%MICROSOFT-APP-ID%",
    "developer": {...},
    "name": {...},
    "description": {...},
    "icons": {...},
    "accentColor": "#FFFFFF",
    "staticTabs": [...],
    "permissions": [...],
    "validDomains": [...],
    "webApplicationInfo": {...}
}
```

### Essential Properties

**id** (Required)
- Unique Microsoft-generated identifier (GUID format)
- Get from Microsoft Application Registration Portal

**developer** (Required)
```json
{
    "name": "Your Company Name",
    "websiteUrl": "https://example.com/",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms",
    "mpnId": "1234567890"  // Optional
}
```

**name** (Required)
```json
{
    "short": "App Name (≤30 chars)",
    "full": "Full App Name if longer than 30 characters (≤100 chars)"
}
```

**description** (Required)
```json
{
    "short": "Brief description (≤80 chars)",
    "full": "Complete description (≤4000 chars)"
}
```

**icons** (Required)
```json
{
    "outline": "icon-outline-32x32.png",  // 32x32 transparent PNG
    "color": "icon-color-192x192.png"     // 192x192 full color PNG
}
```

**accentColor** (Required)
- HTML hex color code (e.g., "#4464ee")
- Used as background for color icons

### Tab Configuration

**staticTabs** - For personal tabs that are pre-configured
```json
"staticTabs": [
    {
        "entityId": "unique-tab-id",
        "name": "Tab Display Name",
        "contentUrl": "https://your-app.azurestaticapps.net",
        "websiteUrl": "https://your-app.azurestaticapps.net",
        "scopes": ["personal"]
    }
]
```

**configurableTabs** - For team/channel tabs requiring setup
```json
"configurableTabs": [
    {
        "configurationUrl": "https://your-app.azurestaticapps.net/config",
        "scopes": ["team", "groupChat"],
        "canUpdateConfiguration": true,
        "context": ["channelTab", "privateChatTab", "meetingChatTab"]
    }
]
```

### SSO Configuration

**webApplicationInfo** (Required for SSO)
```json
"webApplicationInfo": {
    "id": "AAD-APP-ID",  // Your Azure AD App Registration ID
    "resource": "api://your-app.azurestaticapps.net/AAD-APP-ID"
}
```

### Domain Validation

**validDomains**
```json
"validDomains": [
    "*.azurestaticapps.net",
    "your-specific-domain.com"
]
```

### Permissions
```json
"permissions": [
    "identity",              // For user identity info
    "messageTeamMembers"     // If sending messages to team members
]
```

### Minimal Tab App Example
```json
{
    "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.22/MicrosoftTeams.schema.json",
    "manifestVersion": "1.22",
    "version": "1.0.0",
    "id": "00000000-0000-0000-0000-000000000000",
    "developer": {
        "name": "Your Financial Advisory Firm",
        "websiteUrl": "https://yourfirm.com",
        "privacyUrl": "https://yourfirm.com/privacy",
        "termsOfUseUrl": "https://yourfirm.com/terms"
    },
    "name": {
        "short": "Payment Tracker",
        "full": "Internal Payment Records Tracker"
    },
    "description": {
        "short": "Track payment records internally",
        "full": "Internal tool for tracking and managing payment records for the financial advisory team"
    },
    "icons": {
        "outline": "outline-32.png",
        "color": "color-192.png"
    },
    "accentColor": "#0078D4",
    "staticTabs": [
        {
            "entityId": "payment-tracker-tab",
            "name": "Payments",
            "contentUrl": "https://your-app.azurestaticapps.net",
            "websiteUrl": "https://your-app.azurestaticapps.net",
            "scopes": ["personal"]
        }
    ],
    "permissions": ["identity"],
    "validDomains": [
        "*.azurestaticapps.net"
    ],
    "webApplicationInfo": {
        "id": "YOUR-AAD-APP-ID",
        "resource": "api://your-app.azurestaticapps.net/YOUR-AAD-APP-ID"
    }
}
```

### Key Notes for Your Scenario

1. **Authentication**: Since Azure Static Web Apps handles auth at the infrastructure level, you mainly need `webApplicationInfo` for Teams SSO integration

2. **Tab Types**: Use `staticTabs` for personal tabs (appears in left rail) or `configurableTabs` for team/channel tabs

3. **Scopes**: 
   - `personal` - Tab available to individual users
   - `team` - Tab can be added to teams
   - `groupChat` - Tab can be added to group chats

4. **Context for Tabs**:
   - `personalTab` - Personal app space
   - `channelTab` - Team channel
   - `privateChatTab` - 1:1 or group chat

5. **TeamsJS Integration**: Your React app will need to use the Teams JavaScript SDK to:
   - Initialize the app: `app.initialize()`
   - Get user context: `app.getContext()`
   - Handle authentication: `authentication.getAuthToken()`


   ===







## 1. Install Teams SDK

```bash
npm install @microsoft/teams-js@2.32.0
```

## 2. Replace your `useAuth.ts` completely

```typescript
// src/auth/useAuth.ts
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
    // Use mock auth for local development
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

    // Teams SSO for production
    const authenticateWithTeams = async () => {
      try {
        await microsoftTeams.app.initialize();
        const context = await microsoftTeams.app.getContext();
        
        // This is the magic - Teams handles everything
        const token = await microsoftTeams.authentication.getAuthToken();
        
        // Decode the token to get user info (basic parsing, not validation)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        setAuthState({
          user: {
            userId: payload.oid || payload.sub,
            userDetails: payload.preferred_username || payload.email,
            userRoles: ['authenticated'],
            identityProvider: 'aad'
          },
          loading: false,
          error: null
        });
      } catch (error) {
        setAuthState({
          user: null,
          loading: false,
          error: error as Error
        });
      }
    };

    authenticateWithTeams();
  }, []);

  const logout = () => {
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    logout
  };
}
```

## 3. Update `staticwebapp.config.json`

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/rest/*", "/data-api/*", "/_framework/*", "/.auth/*"]
  },
  "mimeTypes": {
    ".json": "application/json"
  },
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/e621abc4-3baa-4b93-badc-3b99e8609963/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
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

## 4. Update App Registration (Azure Portal)

Go to your App Registration and:

1. **Application ID URI**: Set to `api://green-rock-024c27f1e.1.azurestaticapps.net/cc64b230-1e3b-49e3-9a1e-4bb95b55ddb0`
1. **Expose an API** → **Add a client application**:
- Add `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams mobile/desktop)
- Add `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web)
- Check the `access_as_user` scope for both
1. **Manifest**: Change `accessTokenAcceptedVersion` to `2`

That’s it. Your local development will use mock auth, and when deployed to Azure inside Teams, it’ll use real SSO automatically.​​​​​​​​​​​​​​​​


---




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
 