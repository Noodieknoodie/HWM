# RE-ENABLE AUTHENTICATION INSTRUCTIONS

⚠️ **CRITICAL: The app is currently publicly accessible without authentication!**

## To re-enable authentication:

### 1. Update staticwebapp.config.json
Replace the entire file contents with:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/rest/*", "/data-api/*", "/_framework/*", "/.auth/*"]
  },
  "mimeTypes": {
    ".json": "application/json"
  },
  "routes": [
    {
      "route": "/.auth/login/github",
      "statusCode": 404
    },
    {
      "route": "/.auth/login/twitter",
      "statusCode": 404
    },
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer&domain_hint=HohimerWealthManagement.com",
      "statusCode": 302
    }
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
  }
}
```

### 2. Update src/auth/useAuth.ts
Remove lines 24-52 (the temporary mock auth) and uncomment the production code.
The useEffect should start with:
```javascript
useEffect(() => {
  // Mock auth for local development
  if (window.location.hostname === 'localhost') {
    setAuthState({
      user: {
        userId: 'local-dev-user',
        userDetails: 'dev@localhost',
        userRoles: ['authenticated'],
        identityProvider: 'aad'
      },
      loading: false,
      error: null
    });
    return;
  }
  
  // Fetch user info from Static Web App auth endpoint
  fetch('/.auth/me')
    .then(res => res.json())
  // ... rest of the code
```

### 3. Commit and Deploy
```bash
git add -A
git commit -m "Re-enable authentication for production"
git push origin main
```

## Conditional Access Issues
If you're still blocked by Conditional Access policies:
1. Contact IT to add your device as compliant
2. Or request the app (ID: cc64b230-1e3b-49e3-9a1e-4bb95b55ddb0) be excluded from device policies
3. Or access the app through Teams on a managed device