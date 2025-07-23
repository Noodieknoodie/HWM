Enable SSO for tab app
04/10/2024
With single sign-on (SSO) in Teams, app users have the advantage of using Teams to access tab apps. After logging in to Teams using Microsoft or Microsoft 365 account, app users can use your app without the need to sign in again. Your app is available to app users on any device with the access granted through Microsoft Entra ID.

Here's what you learn in this section:

SSO user experience: Teams offers your app users a true SSO experience. The app users can use your app without signing in again.
SSO in Teams at runtime: Your tab app interacts with Microsoft Entra ID at runtime for one-time authentication and authorization for your app users.
Enable SSO for your tab app: Implement the tasks involved to enable SSO in your tab app.
SSO user experience in Teams
The app users sign in to Teams using either personal Microsoft account or Microsoft 365 account. You can take advantage of this account and use SSO to authenticate and authorize the app users.

Screenshot shows the SSO user experience in a teams tab app.

Teams authenticates and stores the identity of its app user.
Your tab app uses the stored identity of the app user who is already validated by Teams.
The app user needs to give consent to Teams for using the identity to access your tab app.
The app user can access the app on web, desktop, or mobile client.
You can view here an example of user experience with SSO in a tab app:

Graphical representation shows the user experience of SSO in tab app.

Enhance user experience with SSO
Here's what your app users get with SSO experience:

Teams gets the access token for the current app user from Microsoft Entra ID. This interaction with Microsoft Entra ID is invisible to the app user. It translates to get the app access without having to leave the Teams environment.
An app user needs to consent only in a multitenant environment. If the app user and the app reside in the same tenant, the app user doesn't need to give consent for using the app.
After consenting to Teams the first time, the app user can use your app with no further need of consent, even on any other device. For this reason, it offers a better user experience.
Alternatively, the admin can grant consent on behalf of the app users. In this scenario, when the admin consents for the app users in the tenant, the app users don't need to be prompted for consent at all. It means that the app users don't see the consent dialogs and can access the app seamlessly.
The access token is prefetched by Teams to improve performance and load time of the app in the Teams environment.
The app users don't need to memorize or record several passwords to access and use apps in Teams environment.
Now, let's see what happens at the backend during runtime to achieve SSO experience within Teams.

SSO in Teams at runtime
Achieve SSO in a tab app by obtaining access token for the Teams app user who's logged in. This process involves the tab app client and server, Teams client, and Microsoft Entra ID. During this interaction, the app user must give consent for using Teams identity to obtain the access token in a multitenant environment.

The following image shows how SSO works when a Teams app user attempts to access the tab app:

Screenshot shows the tab SSO process flow and how it works.

#	Interaction	What's going on
1	Tab app → Teams Client	The tab app makes a JavaScript call to getAuthToken(), which tells Teams to obtain an access token.
2	Teams Client → Microsoft Entra ID	Teams requests Microsoft Entra endpoint for the access token for the current app user based on Teams identity.
3	Microsoft Entra ID → Consent form	If the current app user is using your tab app for the first time, Teams displays request prompt to consent, if the app needs to access some protected data. The app user (or the administrator) must give consent to Teams for using the app user's Teams identity to obtain access token from Microsoft Entra ID.
Alternately, there's a request prompt to handle step-up authentication such as two-factor authentication.
4	Microsoft Entra ID → Teams Client	Microsoft Entra ID sends the access token to the Teams Client. The token is a JSON Web Token (JWT), and its validation works just like token validation in most standard OAuth flows. Teams caches the token on your behalf so that future calls to getAuthToken() return the cached token.
5	Teams Client → Tab app client	Teams sends the access token to the tab app as part of the result object returned by the getAuthToken() call.
6	Tab app (between client and server)	The tab app parses the access token using JavaScript to extract required information, such as the app user's email address. The token returned to the tab app is both an access token and an identity token.
For more information, see Add code to enable SSO in a tab app and Add code to enable SSO in your bot app.

 Important

The getAuthToken() is valid only for consenting to a limited set of user-level APIs, such as email, profile, offline_access, and OpenId. It isn't used for other Graph scopes such as User.Read or Mail.Read. For suggested workarounds, see Extend your app with Microsoft Graph permissions.
The getAuthToken fails for anonymous users as they aren't Microsoft Entra accounts.
Tabs are Teams-aware web pages. To enable SSO in a webpage hosted inside a tab app, add Teams JavaScript client library and call microsoftTeams.initialize(). After initialization, call microsoftTeams.getAuthToken() to get the access token for your app.

Use cases for enabling SSO
You can enable SSO in Teams for all apps that support Microsoft Entra ID as an identity provider. In addition to using SSO for authenticating app users in a tab app, you can also use it to enable seamless access across Teams.

Some scenarios where you can use the SSO API to authenticate your app users are:

If you want to authenticate your app users within a Teams tab app, the SSO API allows app users to use your app in Teams with no additional authentication needed. Based on the app user's Teams identity, you can obtain access token for them from Microsoft Entra ID.
If your app uses dialogs (referred as task modules in TeamsJS v1.x) from within a bot, a tab, a message extension, or Adaptive Cards, then you can use the SSO API to authenticate your app users.
You can also use the SSO API for authenticating your app users who want to access to Stageview without need to be validated again.
 Tip

You can also use the SSO API to authenticate app users in dialogs that embed web content.

To achieve SSO at runtime, configure your app to enable SSO for authenticating and authorizing app users.

Enable SSO for a Teams tab app
This section describes the tasks involved in implementing SSO for a Teams app. These tasks are language- and framework-agnostic.

To enable SSO for a Teams tab app:

       Screenshot shows the steps to enable SSO for tab.

Configure app with Microsoft Entra ID: Create a Microsoft Entra app to generate an app ID and application ID URI. For generating access token, configure scopes and authorize trusted client applications.
Add code: Add the code to handle access token, send this token to your app's server code in the Authorization header, and validate the access token when it's received.
Update Teams app manifest: Update your Teams client app manifest with the app ID and application ID URI generated on Microsoft Entra ID to allow Teams to request access tokens on behalf of your app.
Third-party cookies on iOS
After the iOS 14 update, Apple has blocked the third-party cookie access for all apps by default. Therefore, the apps that use third-party cookies for authentication in their Channel or Chat tabs and Personal apps can't complete their authentication workflows on Teams iOS clients. To conform with Privacy and Security requirements, you must move to a token-based system or use first-party cookies for the user authentication workflows.

Teams mobile client support
For Teams mobile, client versions that support SSO are:

Teams for Android (1416/1.0.0.2020073101 and later)
Teams for iOS (version: 2.0.18 and later)
Teams JavaScript library (version: 1.11 and later) for SSO to work in meeting side panel
For the best experience with Teams, use the latest version of iOS and Android.

Step-by-step guides
Use the following step-by-step guides for enabling SSO for Teams app:

Microsoft Entra SSO for tabs and message extension
Build a bot with SSO authentication
Best practices
Here's a list of best practices:

Call access token only when you need it: Call getAuthToken() only when you need an access token. You can call it when an app user accesses your tab app, or for using a particular function that requires app user validation.
Don't store access token on client-side code: Don’t cache or store the access token in your app's client-side code. Teams client caches the access token (or request a new one if it expires). This ensures that there's no accidental leak of your token from your web app.
Use server-side code for Microsoft Graph calls: Always use the server-side code to make Microsoft Graph calls, or other calls that require passing an access token. Never return the OBO token to the client to enable the client to make direct calls to Microsoft Graph. This helps protect the token from being intercepted or leaked. For more information, see Extend tab app with Microsoft Graph permissions and scope.
Known limitations
SSO in Teams supports only OAuth 2.0 token. It doesn't support SAML token.
Multiple domains per app aren't supported. For more information, see custom apps built for your org (LOB apps).
Redirects aren't supported for iframes or brokered apps. Ensure that you use MSAL.js in the top frame of the window if you use the redirect APIs or use the popup API (window.parent!==window) => true.
Next step


Add code to enable SSO
05/19/2025
Ensure that you register your app with Microsoft Entra ID before you add code to enable SSO.


You need to configure your tab app's client-side code to obtain an access token from Microsoft Entra ID. The access token is issued on behalf of the tab app. If your tab app requires additional Microsoft Graph permissions, you need to pass the access token to the server-side, and exchange it for Microsoft Graph token.

configure code for handling access token

This section covers:

Add client-side code
Pass the access token to server-side code
Validate the access token
Add client-side code
To obtain app access for the current app user, your client-side code must make a call to Teams for getting an access token. You need to update client-side code for using getAuthToken() to initiate the validation process.


Learn more about getAuthToken()
When to call getAuthToken
Use getAuthToken() at the time when you need access token for the current app user:

If access token is needed...	Call getAuthToken()...
When app user accesses the app	After microsoftTeams.app.initialize().
To use a particular functionality of the app	When the app user takes an action that requires signing in.
Add code for getAuthToken
Add JavaScript code snippet to the tab app to:

Call getAuthToken().
Parse the access token or pass it to the server-side code.
The following code snippet shows an example of calling getAuthToken().

JavaScript

Copy
microsoftTeams.app.initialize().then(() => {
    getClientSideToken()
        .then((clientSideToken) => {
            return getServerSideToken(clientSideToken);
        })
        .then((profile) => {
            return useServerSideToken(profile);
        })
        .catch((error) => {
            ...
        })
}

    function getClientSideToken() {

        return new Promise((resolve, reject) => {
            display("1. Get auth token from Microsoft Teams");
            
            microsoftTeams.authentication.getAuthToken().then((result) => {
                display(result);

                resolve(result);
            }).catch((error) => {
                reject("Error getting token: " + error);
            });
        });
    }
You can add calls of getAuthToken() to all functions and handlers that initiate an action where the token is needed.


Here's an example of the client-side code:
When Teams receives the access token, it's cached and reused as needed. This token can be used whenever getAuthToken() is called, until it expires, without making another call to Microsoft Entra ID.

 Important

As a best practice for security of access token:

Always call getAuthToken() only when you need an access token.
Teams automatically caches the access token, so there's no need to cache or store it within your app's code.
Consent dialog for getting access token
When you call getAuthToken() and app user's consent is required for user-level permissions, a Microsoft Entra dialog is shown to the app user who's signed in.

Tab single sign-on dialog prompt

 Note

You mustn't block or modify the Microsoft Entra consent dialog. Modifying the dialog can lead to improper authentication handling in certain scenarios.

The consent dialog that appears is for open-id scopes defined in Microsoft Entra ID. The app user must give consent only once. The app user can access and use your tab app for the granted permissions and scopes after consenting.

 Important

Scenarios where consent dialogs are not needed:

If the admin has granted consent on behalf of the tenant, app users don't need to be prompted for consent at all. This means that the app users don't see the consent dialogs, and can access the app seamlessly.
If your Microsoft Entra app is registered in the same tenant from which you're requesting an authentication in Teams, the app user can't be asked to consent, and is granted an access token right away. App users consent to these permissions only if the Microsoft Entra app is registered in a different tenant.
If you encounter any errors, see Troubleshooting SSO authentication in Teams.

Use the access token as an identity token
The token returned to the tab app is both an access token and an ID token. The tab app can use the token as an access token to make authenticated HTTPS requests to APIs on the server-side.

The access token returned from getAuthToken() can be used to establish the app user's identity using the following claims in the token:

name: The app user's display name.
preferred_username: The app user's email address.
oid: A GUID representing the ID of the app user.
tid: A GUID representing the tenant that the app user is signing in to.
Teams can cache this information associated with the app user's identity, such as the user's preferences.

 Note

If you need to construct a unique ID to represent the app user in your system, see Using claims to reliably identify a user.

Pass the access token to server-side code
If you need to access web APIs on your server, you need to pass the access token to your server-side code. The web APIs must decode access token to view claims for that token.

 Note

If you don't receive User Principal Name (UPN) in the returned access token, add it as an optional claim in Microsoft Entra ID. For more information, see Access tokens.

The access token received in success callback of getAuthToken() provides access (for the authenticated app user) to your web APIs. The server-side code can also parse the token for identity information, if needed.

If you need to pass the access token to get Microsoft Graph data, see Extend tab app with Microsoft Graph permissions.

Code for passing access token to server-side
The following code shows an example of passing the access token to the server-side. The token is passed in an Authorization header when sending a request to a server-side web API. This example sends JSON data, so it uses the POST method. The GET is sufficient to send the access token when you're not writing to the server.

JavaScript

Copy
function getServerSideToken(clientSideToken) {
        return new Promise((resolve, reject) => {
            microsoftTeams.app.getContext().then((context) => {
                fetch('/getProfileOnBehalfOf', {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'tid': context.user.tenant.id,
                        'token': clientSideToken
                    }),
                    mode: 'cors',
                    cache: 'default'
                })
                .then((response) => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        reject(response.error);
                    }
                })
                .then((responseJson) => {
                    if (responseJson.error) {
                        reject(responseJson.error);
                    } else {
                        const profile = responseJson;

                        resolve(profile);
                    }
                });
            });
        });
    }

Validate the access token
For more information on validating the access token, see validate tokens.

Example access token
The following code is a typical decoded payload of an access token:

JavaScript

Copy
{
    aud: "2c3caa80-93f9-425e-8b85-0745f50c0d24",
    iss: "https://login.microsoftonline.com/fec4f964-8bc9-4fac-b972-1c1da35adbcd/v2.0",
    iat: 1521143967,
    nbf: 1521143967,
    exp: 1521147867,
    aio: "ATQAy/8GAAAA0agfnU4DTJUlEqGLisMtBk5q6z+6DB+sgiRjB/Ni73q83y0B86yBHU/WFJnlMQJ8",
    azp: "e4590ed6-62b3-5102-beff-bad2292ab01c",
    azpacr: "0",
    e_exp: 262800,
    name: "Mila Nikolova",
    oid: "6467882c-fdfd-4354-a1ed-4e13f064be25",
    preferred_username: "milan@contoso.com",
    scp: "access_as_user",
    sub: "XkjgWjdmaZ-_xDmhgN1BMP2vL2YOfeVxfPT_o8GRWaw",
    tid: "fec4f964-8bc9-4fac-b972-1c1da35adbcd",
    uti: "MICAQyhrH02ov54bCtIDAA",
    ver: "2.0"
}
Code samples
Sample name	Description	.NET	Node.js	Manifest
Tab SSO	This sample app showcases Microsoft Entra SSO within a tab, using the On-Behalf-Of flow to call Microsoft Graph APIs.	View	View,
Teams Toolkit	NA
Tab, bot, and message extension (ME) SSO	This sample app demonstrates Teams SSO integration for tabs, bots, and message extensions and Microsoft Entra ID for secure authentication.	V


Authenticate and authorize Static Web Apps
10/10/2023
Azure Static Web Apps provides a streamlined authentication experience, where no extra configuration is required to use GitHub and Microsoft Entra ID for authentication. All features listed in this article are available in all Static Web Apps plans.

In this article, learn about default behavior, how to set up sign-in and sign-out, how to block an authentication provider, and more. To read the auth details for a specific use, see Access user information.

You can register a custom provider, which disables all pre-configured providers.

 Warning

Due to changes in X (formerly Twitter) API policy, support is not available as part of the pre-configured providers for your app. If you want to continue to use X (formerly Twitter) for authentication/authorization with your app, update your app configuration to register a custom provider.

Prerequisites
Be aware of the following defaults and resources for authentication and authorization with Azure Static Web Apps.

Defaults:

Any user can authenticate with a preconfigured provider
GitHub
Microsoft Entra ID
To restrict an authentication provider, block access with a custom route rule
After sign-in, users belong to the anonymous and authenticated roles. For more information about roles, see Manage roles
Resources:

Define rules in the staticwebapp.config.json file for authorized users to gain access to restricted routes
Assign users custom roles using the built-in invitations system
Programmatically assign users custom roles at sign-in with an API function
Understand that authentication and authorization significantly overlap with routing concepts, which are detailed in the Application configuration guide
Restrict sign-in to a specific Microsoft Entra ID tenant by configuring a custom Microsoft Entra ID provider. The preconfigured Microsoft Entra ID provider allows any Microsoft account to sign in.
Set up sign-in
Azure Static Web Apps uses the /.auth system folder to provide access to authorization-related APIs. Rather than expose any of the routes under the /.auth folder directly to end users, create routing rules for friendly URLs.

Use the following table to find the provider-specific route.

Authorization provider	Sign in route
Microsoft Entra ID	/.auth/login/aad
GitHub	/.auth/login/github
For example, to sign in with GitHub, you could use a URL similar to the following example.

HTML

Copy
<a href="/.auth/login/github">Login</a>
If you chose to support more than one provider, use a provider-specific link for each provider on your website. Use a route rule to map a default provider to a friendly route like /login.

JSON

Copy
{
  "route": "/login",
  "redirect": "/.auth/login/github"
}
Set up post-sign-in redirect
You can return a user to a specific page after they sign in by providing a fully qualified URL in the post_login_redirect_uri query string parameter.

HTML

Copy
<a href="/.auth/login/github?post_login_redirect_uri=https://zealous-water.azurestaticapps.net/success">Login</a>
You can also redirect unauthenticated users back to the referring page after they sign in. To add this redirect, create a response override rule that sets post_login_redirect_uri to .referrer, like in the following example.

JSON

Copy
{
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/github?post_login_redirect_uri=.referrer",
      "statusCode": 302
    }
  }
}
Set up sign-out
The /.auth/logout route signs users out from the website. You can add a link to your site navigation to allow the user to sign out, like in the following example.

HTML

Copy
<a href="/.auth/logout">Log out</a>
Use a route rule to map a friendly route like /logout.

JSON

Copy
{
  "route": "/logout",
  "redirect": "/.auth/logout"
}
Set up post-sign-out redirect
To return a user to a specific page after they sign out, provide a URL in post_logout_redirect_uri query string parameter.

Block an authentication provider
By default, all authentication providers are enabled, but you may want to restrict your app from using a provider. For instance, your app may want to only use providers that expose email addresses.

To block a provider, create a route rule to return a 404 status code for requests to the blocked provider-specific route. For example, to restrict Entra ID (formerly Azure Active Directory, known as "aad") provider, add the following route rule.

JSON

Copy
{
  "route": "/.auth/login/aad",
  "statusCode": 404
}
Remove personal data
When you grant consent to an application as an end user, the application has access to your email address or username, depending on the identity provider. Once this information is provided, the owner of the application can decide how to manage personal data.

End users need to contact administrators of individual web apps to revoke this information from their systems.

To remove personal data from the Azure Static Web Apps platform, and prevent the platform from providing this information on future requests, submit a request using the following URL:

url

Copy
https://identity.azurestaticapps.net/.auth/purge/<AUTHENTICATION_PROVIDER_NAME>
To prevent the platform from providing this information on future requests to individual apps, submit a request using the following URL:

url

Copy
https://<WEB_APP_DOMAIN_NAME>/.auth/purge/<AUTHENTICATION_PROVIDER_NAME>
If you're using Microsoft Entra ID, use aad as the value for the <AUTHENTICATION_PROVIDER_NAME> placeholder.
