<task-instruction>
####### CURRENT CODEBASE AS OF 7/9/2025 - 2:04 PM ########
</task-instruction>
<files>
api-server\build.js
```js
const esbuild = require('esbuild');
esbuild.build({
    entryPoints: ['server.js'],
    bundle: true,
    platform: 'node',
    outfile: 'dist/index.js'
})
    .then((r) => {
        console.log(`Build succeeded.`);
    })
    .catch((e) => {
        console.log("Error building:", e.message);
        process.exit(1);
    });
```

api-server\README.md
```md
# API Server
The API server is used to exchange the access token provided by Teams to get a token for accessing graph resources that you need for your app.  This sample is requesting permission to read the user's profile to display the current logged in user's profile picture.
## Prerequisites
-  [NodeJS](https://nodejs.org/en/)
-  [M365 developer account](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant) or access to a Teams account with the appropriate permissions to install an app.
-  [Create an Azure AD App registration to support SSO and the User.Read Graph API](https://aka.ms/teams-toolkit-sso-appreg)
## Update the env files
- In the *api-server* directory, open the *.env* file and update the *CLIENT_ID* and *CLIENT_SECRET* variables with the client ID and secret from your Azure AD app registration. If you requested additional Graph permissions from the default *User.Read*, append them, space separated, to the GRAPH_SCOPES key.
## Build and Run
In the root directory, execute:
`npm install`
`npm start`
```

api-server\server.js
```js
const fetch = require('node-fetch');
const express = require('express');
const jwt_decode = require('jwt-decode');
const msal = require('@azure/msal-node');
const app = express();
const path = require('path');
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const graphScopes = ['https://graph.microsoft.com/' + process.env.GRAPH_SCOPES];
let handleQueryError = function (err) {
    console.log("handleQueryError called: ", err);
    return new Response(JSON.stringify({
        code: 400,
        message: 'Stupid network Error'
    }));
};
app.get('/getGraphAccessToken', async (req,res) => {
    const msalClient = new msal.ConfidentialClientApplication({
        auth: {
            clientId: clientId,
            clientSecret: clientSecret
        }
    });
    let tenantId = jwt_decode(req.query.ssoToken)['tid']; 
    msalClient.acquireTokenOnBehalfOf({
        authority: `https://login.microsoftonline.com/${tenantId}`,
        oboAssertion: req.query.ssoToken,
        scopes: graphScopes,
        skipCache: true
      })
      .then( async (result) => {     
                let graphPhotoEndpoint = `https://graph.microsoft.com/v1.0/users/${req.query.upn}/photo/$value`;
                let graphRequestParams = {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'image/jpg',
                        "authorization": "bearer " + result.accessToken
                    }
                }
                let response = await fetch(graphPhotoEndpoint,graphRequestParams).catch(this.unhandledFetchError);
                if(!response.ok){
                    console.error("ERROR: ", response);
                }
                else{
                    const imageBuffer = await response.arrayBuffer(); 
                    const imageUri = 'data:image/png;base64,' + Buffer.from(imageBuffer).toString('base64');
                    res.json(imageUri);
                }
      })
      .catch(error => {
        console.log("error"+ error.errorCode);
        res.status(403).json({ error: 'consent_required' });
    });
});
app.get('*', (req,res) =>{
    console.log("Unhandled request: ",req);
    res.status(404).send("Path not defined");
});
const port = process.env.PORT || 5000;
app.listen(port);
console.log('API server is listening on port ' + port);
```

env\.env.local
```local
# This file includes environment variables that can be committed to git. It's gitignored by default because it represents your local development environment.
# Built-in environment variables
TEAMSFX_ENV=local
# Generated during provision, you can also add your own variables.
TAB_DOMAIN=
TAB_ENDPOINT=
TEAMS_APP_ID=
AAD_APP_CLIENT_ID=
AAD_APP_OBJECT_ID=
AAD_APP_TENANT_ID=
AAD_APP_OAUTH_AUTHORITY=
AAD_APP_OAUTH_AUTHORITY_HOST=
AAD_APP_ACCESS_AS_USER_PERMISSION_ID=
TEAMS_APP_TENANT_ID=
M365_TITLE_ID=
M365_APP_ID=
```

m365agents.local.yml
```yml
# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.2/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: v1.2
additionalMetadata:
  sampleTag: Microsoft-Teams-Samples:tab-personal-sso-quickstart-ts
provision:
  # Creates a new Azure Active Directory (AAD) app to authenticate users if
  # the environment variable that stores clientId is empty
  - uses: aadApp/create
    with:
      # Note: when you run aadApp/update, the AAD app name will be updated
      # based on the definition in manifest. If you don't want to change the
      # name, make sure the name in AAD manifest is the same with the name
      # defined here.
      name: tab-personal-sso-quickstart
      # If the value is false, the action will not generate client secret for you
      generateClientSecret: true
      # Authenticate users with a Microsoft work or school account in your
      # organization's Azure AD tenant (for example, single tenant).
      signInAudience: AzureADMyOrg
    # Write the information of created resources into environment file for the
    # specified environment variable(s).
    writeToEnvironmentFile:
      clientId: AAD_APP_CLIENT_ID
      # Environment variable that starts with `SECRET_` will be stored to the
      # .env.{envName}.user environment file
      clientSecret: SECRET_AAD_APP_CLIENT_SECRET
      objectId: AAD_APP_OBJECT_ID
      tenantId: AAD_APP_TENANT_ID
      authority: AAD_APP_OAUTH_AUTHORITY
      authorityHost: AAD_APP_OAUTH_AUTHORITY_HOST
  # Creates a Teams app
  - uses: teamsApp/create
    with:
      # Teams app name
      name: tab-personal-sso-quickstart${{APP_NAME_SUFFIX}}
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile: 
      teamsAppId: TEAMS_APP_ID
  # Apply the AAD manifest to an existing AAD app. Will use the object id in
  # manifest file to determine which AAD app to update.
  - uses: aadApp/update
    with:
      # Relative path to this file. Environment variables in manifest will
      # be replaced before apply to AAD app
      manifestPath: ./aad.manifest.json
      outputFilePath: ./build/aad.manifest.${{TEAMSFX_ENV}}.json
  # Validate using manifest schema
  - uses: teamsApp/validateManifest
    with:
      # Path to manifest template
      manifestPath: ./appManifest/manifest.json
  # Build Teams app package with latest env value
  - uses: teamsApp/zipAppPackage
    with:
      # Path to manifest template
      manifestPath: ./appManifest/manifest.json
      outputZipPath: ./appManifest/build/appManifest.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./appManifest/build/manifest.${{TEAMSFX_ENV}}.json
  # Validate app package using validation rules
  - uses: teamsApp/validateAppPackage
    with:
      # Relative path to this file. This is the path for built zip file.
      appPackagePath: ./appManifest/build/appManifest.${{TEAMSFX_ENV}}.zip
  # Apply the Teams app manifest to an existing Teams app in
  # Developer Portal.
  # Will use the app id in manifest file to determine which Teams app to update.
  - uses: teamsApp/update
    with:
      # Relative path to this file. This is the path for built zip file.
      appPackagePath: ./appManifest/build/appManifest.${{TEAMSFX_ENV}}.zip
  # Extend your Teams app to Outlook and the Microsoft 365 app
  - uses: teamsApp/extendToM365
    with:
      # Relative path to the build app package.
      appPackagePath: ./appManifest/build/appManifest.${{TEAMSFX_ENV}}.zip
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile:
      titleId: M365_TITLE_ID
      appId: M365_APP_ID
deploy:
  # Run npm command
  - uses: cli/runNpmCommand
    with:
      workingDirectory: .
      args: install --no-audit
  # Run npm command
  - uses: cli/runNpmCommand
    with:
      workingDirectory: ./api-server
      args: install --no-audit
  # Generate runtime environment variables for tab
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: .env
      envs:
        BROWSER: none
        HTTPS: true
        REACT_APP_AZURE_APP_REGISTRATION_ID: ${{AAD_APP_CLIENT_ID}}
        REACT_APP_BASE_URL: ${{TAB_ENDPOINT}}
 # Generate runtime environment variables for backend
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: ./api-server/.env # Required. The relative path of settings file
      envs:
        CLIENT_ID: ${{AAD_APP_CLIENT_ID}}
        CLIENT_SECRET: ${{SECRET_AAD_APP_CLIENT_SECRET}}
```

m365agents.yml
```yml
# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.2/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: v1.2
additionalMetadata:
  sampleTag: Microsoft-Teams-Samples:tab-personal-sso-quickstart-ts
environmentFolderPath: ./env
```

public\index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <link rel="stylesheet" href="https://static2.sharepointonline.com/files/fabric/office-ui-fabric-core/11.0.0/css/fabric.min.css" />
    <title>Microsoft Teams Tab</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

README.md
```md
---
page_type: sample
description: This sample application demonstrates how to implement Single Sign-On (SSO) authentication in personal Teams tabs using Azure Microsoft Entra and TypeScript.
products:
- office-teams
- office
- office-365
languages:
- typescript
- nodejs
extensions:
 contentType: samples
 createdDate: "07/07/2021 01:38:27 PM"
urlFragment: officedev-microsoft-teams-samples-tab-personal-sso-quickstart-ts
---
# Teams Personal Tab SSO Authentication Sample TS
This sample application serves as a complete guide for implementing Single Sign-On (SSO) authentication in personal tabs within Microsoft Teams, leveraging Azure Microsoft Entra and TypeScript. It provides step-by-step instructions for app registration, integration with MSAL.js 2.0, Graph API, and manifest configuration, ensuring a smooth setup and user experience in collaborative Teams environments.
## Included Features
* Teams SSO (tabs)
* MSAL.js 2.0 support
* Graph API
## Interaction with app
![Tab Personal SSO QuickstartGif](Images/TabPersonalSSOQuickstartGif.gif)
## Try it yourself - experience the App in your Microsoft Teams client
Please find below demo manifest which is deployed on Microsoft Azure and you can try it yourself by uploading the app package (.zip file link below) to your teams and/or as a personal app. (Sideloading must be enabled for your tenant; [see steps here](https://docs.microsoft.com/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant#enable-custom-teams-apps-and-turn-on-custom-app-uploading)).
**Personal tab with SSO quick-start:** [Manifest](/samples/tab-personal-sso-quickstart/csharp_dotnetcore/demo-manifest/tab-personal-sso-quickstart.zip)
 ## Prerequisites
- Microsoft Teams is installed and you have an account (not a guest account)
-  [NodeJS](https://nodejs.org/en/)
-  [dev tunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows) or [ngrok](https://ngrok.com/download) latest version or equivalent tunneling solution
-  [M365 developer account](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant) or access to a Teams account with the appropriate permissions to install an app.
- [Microsoft 365 Agents Toolkit for VS Code](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension) or [TeamsFx CLI](https://learn.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli?pivots=version-one)
## Run the app (Using Microsoft 365 Agents Toolkit for Visual Studio Code)
The simplest way to run this sample in Teams is to use Microsoft 365 Agents Toolkit for Visual Studio Code.
1. Ensure you have downloaded and installed [Visual Studio Code](https://code.visualstudio.com/docs/setup/setup-overview)
1. Install the [Microsoft 365 Agents Toolkit extension](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
1. Select **File > Open Folder** in VS Code and choose this samples directory from the repo
1. Using the extension, sign in with your Microsoft 365 account where you have permissions to upload custom apps
1. Select **Debug > Start Debugging** or **F5** to run the app in a Teams web client.
1. In the browser that launches, select the **Add** button to install the app to Teams.
> If you do not have permission to upload custom apps (uploading), Microsoft 365 Agents Toolkit will recommend creating and using a Microsoft 365 Developer Program account - a free program to get your own dev environment sandbox that includes Teams.
## Setup
1) Register a new application in the [Microsoft Entra ID – App Registrations](https://go.microsoft.com/fwlink/?linkid=2083908) portal.
   Register a new application in the [Microsoft Entra ID – App Registrations](https://go.microsoft.com/fwlink/?linkid=2083908) portal.
 - Select **New Registration** and on the *register an application page*, set following values:
    * Set **name** to your app name.
    * Choose the **supported account types** (any account type will work)
    * Leave **Redirect URI** empty.
    * Choose **Register**.
 - On the overview page, copy and save the **Application (client) ID, Directory (tenant) ID**. You’ll need those later when updating your Teams application manifest and in the appsettings.json.
 -  Under **Manage**, select **Expose an API**. 
 - Select the **Set** link to generate the Application ID URI in the form of `api://{AppID}`. Insert your fully qualified domain name (with a forward slash "/" appended to the end) between the double forward slashes and the GUID. The entire ID should have the form of: `api://fully-qualified-domain-name/{AppID}`
    * ex: `api://%ngrokDomain%.ngrok-free.app/00000000-0000-0000-0000-000000000000`.
 - Select the **Add a scope** button. In the panel that opens, enter `access_as_user` as the **Scope name**.
 - Set **Who can consent?** to `Admins and users`
 - Fill in the fields for configuring the admin and user consent prompts with values that are appropriate for the `access_as_user` scope:
    * **Admin consent title:** Teams can access the user’s profile.
    * **Admin consent description**: Allows Teams to call the app’s web APIs as the current user.
    * **User consent title**: Teams can access the user profile and make requests on the user's behalf.
    * **User consent description:** Enable Teams to call this app’s APIs with the same rights as the user.
  - Ensure that **State** is set to **Enabled**
  - Select **Add scope**
    * The domain part of the **Scope name** displayed just below the text field should automatically match the **Application ID** URI set in the previous step, with `/access_as_user` appended to the end:
        * `api://[ngrokDomain].ngrok-free.app/00000000-0000-0000-0000-000000000000/access_as_user.
  - In the **Authorized client applications** section, identify the applications that you want to authorize for your app’s web application. Each of the following IDs needs to be entered:
    * `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams mobile/desktop application)
    * `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web application)
  - Navigate to **API Permissions**, and make sure to add the follow permissions:
    -   Select Add a permission
    -   Select Microsoft Graph -\> Delegated permissions.
    * User.Read (enabled by default)    
    - Click on Add permissions. Please make sure to grant the admin consent for the required permissions.
    - Navigate to **Authentication**
    If an app hasn't been granted IT admin consent, users will have to provide consent the first time they use an app.
    Set a redirect URI:
    * Select **Add a platform**.
    * Select **Single Page Application**.
    * Enter the **redirect URI** for the app in the following format: `https://%ngrokDomain%.ngrok-free.app/auth-end`. This will be the page where a successful implicit grant flow will redirect the user.
    ![AppRegistrations](Images/AppRegistrations.png)
   - Navigate to the **Certificates & secrets**. In the Client secrets section, click on "+ New client secret". Add a description      (Name of the secret) for the secret and select “Never” for Expires. Click "Add". Once the client secret is created, copy its value, it need to be placed in the appsettings.json.
2) Setup for Bot
   In Azure portal, create a [Azure Bot resource](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration).
    - For bot handle, make up a name.
    - Select "Use existing app registration" (Create the app registration in Microsoft Entra ID beforehand.)
    - __*If you don't have an Azure account*__ create an [Azure free account here](https://azure.microsoft.com/en-us/free/)
   In the new Azure Bot resource in the Portal, 
    - Ensure that you've [enabled the Teams Channel](https://learn.microsoft.com/en-us/azure/bot-service/channel-connect-teams?view=azure-bot-service-4.0)
    - In Settings/Configuration/Messaging endpoint, enter the current `https` URL you were given by running the tunnelling application. Append with the path `/api/messages`
3. Setup NGROK
 - Run ngrok - point to port 3978
   ```bash
   ngrok http 3978 --host-header="localhost:3978"
   ```  
   Alternatively, you can also use the `dev tunnels`. Please follow [Create and host a dev tunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows) and host the tunnel with anonymous user access command as shown below:
   ```bash
   devtunnel host -p 3978 --allow-anonymous
   ```
4. Setup for code
   - Clone the repository
    ```bash
    git clone https://github.com/OfficeDev/Microsoft-Teams-Samples.git
    ```
   - In a terminal, navigate to `samples/tab-personal-sso-quickstart/ts`
   - Update the `.env` configuration for the bot to use the `REACT_APP_AZURE_APP_REGISTRATION_ID` and `REACT_APP_BASE_URL` with application base url. For e.g., your ngrok or dev tunnels url. (Note the MicrosoftAppId is the AppId created in step 1 (Setup for Bot).
- Build and Run
  -In the root directory, execute:
   `npm install`
    `npm start`
5. Setup Manifest for Teams
- __*This step is specific to Teams.*__
    - **Edit** the `manifest.json` contained in the ./appManifest folder to replace your Microsoft App Id (that was created when you registered your app registration earlier) *everywhere* you see the place holder string `{{Microsoft-App-Id}}` (depending on the scenario the Microsoft App Id may occur multiple times in the `manifest.json`)
    - **Edit** the `manifest.json` for `validDomains` and replace `{{domain-name}}` with base Url of your domain. E.g. if you are using ngrok it would be `https://1234.ngrok-free.app` then your domain-name will be `1234.ngrok-free.app` and if you are using dev tunnels then your domain will be like: `12345.devtunnels.ms`.
    - **Edit** the `manifest.json` for `webApplicationInfo` resource `"api://<<YOUR-NGROK-DOMAIN>>/<<YOUR-MICROSOFT-APP-ID>>"` with MicrosoftAppId. E.g. `"api://1234.ngrok-free.app/00000000-0000-0000-0000-000000000000"`.
    - **Zip** up the contents of the `appManifest` folder to create a `manifest.zip` (Make sure that zip file does not contains any subfolder otherwise you will get error while uploading your .zip package)
- Upload the manifest.zip to Teams (in the Apps view click "Upload a custom app")
   - Go to Microsoft Teams. From the lower left corner, select Apps
   - From the lower left corner, choose Upload a custom App
   - Go to your project directory, the ./appManifest folder, select the zip folder, and choose Open.
   - Select Add in the pop-up dialog box. Your app is uploaded to Teams.
## Build and Run
In the project directory, execute:
`npm install`
`npm start`
## Deploy to Teams
Start debugging the project by hitting the `F5` key or click the debug icon in Visual Studio Code and click the `Start Debugging` green arrow button.
### NOTE: First time debug step
On the first time running and debugging your app you need allow the localhost certificate.  After starting debugging when Chrome is launched and you have installed your app it will fail to load.
- Open a new tab `in the same browser window that was opened`
- Navigate to `https://localhost:3000/tab`
- Click the `Advanced` button
- Select the `Continue to localhost`
- You may also need to enable popups in the browser to see the auth consent page.
### NOTE: Debugging
Ensure you have the Debugger for Chrome/Edge extension installed for Visual Studio Code from the marketplace.
### Build for production
`npm run build`
## Running the sample
**Install App:**
![InstallApp](Images/InstallApp.png)
**Tab SSO Authentication UI:**
![personaltab](Images/personaltab.png)
Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.
The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
## Further Reading.
[Tab-personal-quickStart](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-overview)
<img src="https://pnptelemetry.azurewebsites.net/microsoft-teams-samples/samples/tab-personal-sso-quickstart-ts" />
```

src\components\App.css
```css
.App {
  text-align: center;
}
.App-logo {
  height: 40vmin;
  pointer-events: none;
}
@media (prefers-reduced-motion: no-preference) {
  .App-logo {
    animation: App-logo-spin infinite 20s linear;
  }
}
.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}
.App-link {
  color: #61dafb;
}
@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

src\components\App.tsx
```tsx
import React from 'react';
import './App.css';
import * as microsoftTeams from "@microsoft/teams-js";
import { BrowserRouter,  Route, Routes } from "react-router-dom";
import Privacy from "./Privacy";
import TermsOfUse from "./TermsOfUse";
import Tab from "./Tab";
import ConsentPopup from "./ConsentPopup";
import ClosePopup from "./ClosePopup";
/**
 * The main app which handles the initialization and routing
 * of the app.
 */
function App() {
  microsoftTeams.app.initialize();
  return (
    <BrowserRouter>
    <Routes>
      <Route  path="/privacy" element={<Privacy/>} />
      <Route  path="/termsofuse" element={<TermsOfUse/>} />
      <Route  path="/tab" element={<Tab/>} />
      <Route  path="/auth-start" element={<ConsentPopup/>} />
      <Route  path="/auth-end" element={<ClosePopup/>} />
    </Routes>
    </BrowserRouter>
  );
}
export default App;
```

src\components\ClosePopup.tsx
```tsx
import React from 'react';
import * as microsoftTeams from "@microsoft/teams-js";
import * as msal from "@azure/msal-browser";
/**
 * This component is used to redirect the user to the Azure authorization endpoint from a popup.
 */
class ClosePopup extends React.Component {
    componentDidMount() {
        microsoftTeams.app.initialize().then(() => {
            microsoftTeams.app.getContext().then(async (context) => {
                const msalConfig : msal.Configuration = {
                    auth: {
                        clientId: process.env.REACT_APP_AZURE_APP_REGISTRATION_ID!,
                        authority: `https://login.microsoftonline.com/${context.user!.tenant!.id}`,
                        navigateToLoginRequestUrl: false
                    },
                    cache: {
                        cacheLocation: "sessionStorage",
                    },
                }
                const msalInstance = new msal.PublicClientApplication(msalConfig);
                msalInstance.handleRedirectPromise()
                    .then((tokenResponse) => {
                        if (tokenResponse !== null) {
                            microsoftTeams.authentication.notifySuccess("Authentication succedded");
                        } else {
                            microsoftTeams.authentication.notifyFailure("Get empty response.");
                        }
                    })
                    .catch((error) => {
                        microsoftTeams.authentication.notifyFailure(JSON.stringify(error));
                    });
            });
        });
    }     
    render() {
      return (
        <div>
            <h1>Consent flow complete.</h1>
        </div>
      );
    }
}
export default ClosePopup;
```

src\components\ConsentPopup.tsx
```tsx
import React from 'react';
import * as microsoftTeams from "@microsoft/teams-js";
import * as msal from "@azure/msal-browser";
/**
 * This component is loaded to grant consent for graph permissions.
 */
class ConsentPopup extends React.Component {
    componentDidMount() {
        microsoftTeams.app.initialize().then(() => {
            microsoftTeams.app.getContext().then(async (context) => {
                var scope = "User.Read email openid profile offline_access Chat.Read Chat.ReadWrite ChatMessage.Send";
                var loginHint = context.user!.loginHint;
                const msalConfig: msal.Configuration = {
                    auth: {
                        clientId: process.env.REACT_APP_AZURE_APP_REGISTRATION_ID!,
                        authority: `https://login.microsoftonline.com/${context.user!.tenant!.id}`,
                        navigateToLoginRequestUrl: false
                    },
                    cache: {
                        cacheLocation: "sessionStorage",
                    },
                };
                const msalInstance = new msal.PublicClientApplication(msalConfig);
                const scopesArray = scope.split(" ");
                const scopesRequest = {
                    scopes: scopesArray,
                    redirectUri: window.location.origin + `/auth-end`,
                    loginHint: loginHint
                };
                await msalInstance.loginRedirect(scopesRequest);
            });
        });
    }
    render() {
      return (
        <div>
          <h1>Redirecting to consent page.</h1>
        </div>
      );
    }
}
export default ConsentPopup;
```

src\components\Privacy.tsx
```tsx
import React from 'react';
import './App.css';
/**
 * This component is used to display the required
 * privacy statement which can be found in a link in the
 * about tab.
 */
class Privacy extends React.Component {
    render() {
      return (
        <div>
          <h1>Privacy Statement</h1>
        </div>
      );
    }
}
export default Privacy;
```

src\components\Tab.tsx
```tsx
import React from 'react';
import './App.css';
import { app, authentication } from "@microsoft/teams-js";
import * as microsoftTeams from "@microsoft/teams-js";
import { Avatar, Spinner } from '@fluentui/react-components';
/**
 * This tab component renders the main tab content
 * of your app.
 */
export interface ITabProps {
}
interface ITabState {
  context?: app.Context;
  ssoToken: string;
  consentRequired: boolean;
  consentProvided: boolean;
  graphAccessToken: string;
  photo: string;
  error: boolean;
}
class Tab extends React.Component<ITabProps, ITabState> {
  constructor(props: ITabProps){
    super(props)
    this.state = {
      context: undefined,
      ssoToken: "",
      consentRequired: false,
      consentProvided: false,
      graphAccessToken: "",
      photo: "",
      error: false
    }
    this.ssoLoginSuccess = this.ssoLoginSuccess.bind(this);
    this.ssoLoginFailure = this.ssoLoginFailure.bind(this);
    this.consentSuccess = this.consentSuccess.bind(this);
    this.consentFailure = this.consentFailure.bind(this);
    this.unhandledFetchError = this.unhandledFetchError.bind(this);
    this.callGraphFromClient = this.callGraphFromClient.bind(this);
    this.showConsentDialog = this.showConsentDialog.bind(this);
  }
  componentDidMount(){
    microsoftTeams.app.initialize();
    app.getContext().then((context: app.Context) => {
      this.setState({context:context});
    });
    authentication.getAuthToken().then((result)=>{
      this.ssoLoginSuccess(result)
    }).catch((error) => {
      this.ssoLoginFailure(error)
    });
  }  
  ssoLoginSuccess = async (result: string) => {
    this.setState({ssoToken:result});
    this.exchangeClientTokenForServerToken(result);
  }
  ssoLoginFailure(error: string){
    console.error("SSO failed: ",error);
    this.setState({error:true});
  }
  exchangeClientTokenForServerToken = async (token: string) => {
    let serverURL = `${process.env.REACT_APP_BASE_URL}/getGraphAccessToken?ssoToken=${token}&upn=${this.state.context?.user?.userPrincipalName}`;
    console.log('here ' + serverURL);
    let response = await fetch(serverURL).catch(this.unhandledFetchError); 
    if (response) {
      let data = await response.json().catch(this.unhandledFetchError);
      if(!response.ok && data.error==='consent_required'){
        this.setState({consentRequired:true}); 
        this.showConsentDialog(); 
      } else if (!response.ok) {
        console.error(data);
        this.setState({error:true});
      } else {
         this.setState({
            photo: data 
         })
      }
    }
  }
  showConsentDialog(){ 
    authentication.authenticate({
      url: window.location.origin + "/auth-start",
      width: 600,
      height: 535
    }).then((result)=>{
      this.consentSuccess(result)
    }).catch((error) => {
      this.consentFailure(error)
    });
  }
  consentSuccess(result: string){
    this.setState({
      graphAccessToken: result,
      consentProvided: true
    });
  }
  consentFailure(reason: string){
    console.error("Consent failed: ",reason);
    this.setState({error:true});
  }  
  componentDidUpdate = async (prevProps: ITabProps, prevState: ITabState) => {
    if((prevState.graphAccessToken === "") && (this.state.graphAccessToken !== "")){
      this.callGraphFromClient();
    }
  }  
  callGraphFromClient = async () => {
    let upn = this.state.context?.user?.userPrincipalName;
    let graphPhotoEndpoint = `https://graph.microsoft.com/v1.0/users/${upn}/photo/$value`;
    let graphRequestParams = {
      method: 'GET',
      headers: {
        'Content-Type': 'image/jpg',
        "authorization": "bearer " + this.state.graphAccessToken
      }
    }
    let response = await fetch(graphPhotoEndpoint,graphRequestParams).catch(this.unhandledFetchError);
    if (response) {
      if(!response.ok){
        console.error("ERROR: ", response);
        this.setState({error:true});
      }
      let imageBlog = await response.blob(); 
      this.setState({
        photo: URL.createObjectURL(imageBlog) 
      })
    }
  }
  unhandledFetchError(err: string){
    console.error("Unhandled fetch error: ",err);
    this.setState({error:true});
  }
  render() {
      let title = this.state.context && Object.keys(this.state.context).length > 0 ?
        'Congratulations ' + this.state.context?.user?.userPrincipalName + '! This is your tab' : <Spinner/>;
      let ssoMessage = this.state.ssoToken === "" ?
        <Spinner label='Performing Azure AD single sign-on authentication...'/>: null;
      let serverExchangeMessage = (this.state.ssoToken !== "") && (!this.state.consentRequired) && (this.state.photo==="") ?
        <Spinner label='Exchanging SSO access token for Graph access token...'/> : null;
      let consentMessage = (this.state.consentRequired && !this.state.consentProvided) ?
        <Spinner label='Consent required.'/> : null;
          let content;
      if(this.state.error){
        content = <h1>ERROR: Please ensure pop-ups are allowed for this website and retry</h1>
      } else {
        content =
          <div>
            <h1>{title}</h1>
            <h3>{ssoMessage}</h3>
            <h3>{serverExchangeMessage}</h3>          
            <h3>{consentMessage}</h3>
            <img src={this.state.photo} width="200" />
          </div>
      }
      return (
        <div>
          {content}
        </div>
      );
  }
}
export default Tab;
```

src\components\TermsOfUse.tsx
```tsx
import React from 'react';
import './App.css';
/**
 * This component is used to display the required
 * terms of use statement which can be found in a
 * link in the about tab.
 */
class TermsOfUse extends React.Component {
    render() {
      return (
        <div>
          <h1>Terms of Use</h1>
        </div>
      );
    }
}
export default TermsOfUse;
```

src\index.css
```css
body {
  margin: 5em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

src\index.tsx
```tsx
import React from 'react';
import './index.css';
import App from './components/App';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components'; 
import ReactDOM from "react-dom/client";
const root = ReactDOM.createRoot(document.getElementById("root")!)
root.render(<App />);
```

src\react-app-env.d.ts
```ts

```
</files>