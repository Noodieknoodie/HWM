<task-instruction>
####### CURRENT CODEBASE AS OF 7/9/2025 - 2:04 PM ########
</task-instruction>
<files>
.deployment
```deployment
[config]
command = bash deploy.sh
```

build.js
```js
const esbuild = require('esbuild');
esbuild.build({
    entryPoints: ['src/app.js'],
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

CODE_OF_CONDUCT.md
```md
# Microsoft Open Source Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
Resources:
- [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/)
- [Microsoft Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
- Contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with questions or concerns
```

deploy.cmd
```cmd
@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off
:: ----------------------
:: KUDU Deployment Script
:: Version: 1.0.17
:: ----------------------
:: Prerequisites
:: -------------
:: Verify node.js installed
where node 2>nul >nul
IF %ERRORLEVEL% NEQ 0 (
  echo Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment.
  goto error
)
:: Setup
:: -----
setlocal enabledelayedexpansion
SET ARTIFACTS=%~dp0%..\artifacts
IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)
IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)
IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%ARTIFACTS%\manifest
  IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
    SET PREVIOUS_MANIFEST_PATH=%ARTIFACTS%\manifest
  )
)
IF NOT DEFINED KUDU_SYNC_CMD (
  :: Install kudu sync
  echo Installing Kudu Sync
  call npm install kudusync -g --silent
  IF !ERRORLEVEL! NEQ 0 goto error
  :: Locally just running "kuduSync" would also work
  SET KUDU_SYNC_CMD=%appdata%\npm\kuduSync.cmd
)
goto Deployment
:: Utility Functions
:: -----------------
:SelectNodeVersion
IF DEFINED KUDU_SELECT_NODE_VERSION_CMD (
  :: The following are done only on Windows Azure Websites environment
  call %KUDU_SELECT_NODE_VERSION_CMD% "%DEPLOYMENT_SOURCE%" "%DEPLOYMENT_TARGET%" "%DEPLOYMENT_TEMP%"
  IF !ERRORLEVEL! NEQ 0 goto error
  IF EXIST "%DEPLOYMENT_TEMP%\__nodeVersion.tmp" (
    SET /p NODE_EXE=<"%DEPLOYMENT_TEMP%\__nodeVersion.tmp"
    IF !ERRORLEVEL! NEQ 0 goto error
  )
  IF EXIST "%DEPLOYMENT_TEMP%\__npmVersion.tmp" (
    SET /p NPM_JS_PATH=<"%DEPLOYMENT_TEMP%\__npmVersion.tmp"
    IF !ERRORLEVEL! NEQ 0 goto error
  )
  IF NOT DEFINED NODE_EXE (
    SET NODE_EXE=node
  )
  SET NPM_CMD="!NODE_EXE!" "!NPM_JS_PATH!"
) ELSE (
  SET NPM_CMD=npm
  SET NODE_EXE=node
)
goto :EOF
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: Deployment
:: ----------
:Deployment
echo Handling node.js deployment.
:: 1. KuduSync
IF /I "%IN_PLACE_DEPLOYMENT%" NEQ "1" (
  call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd"
  IF !ERRORLEVEL! NEQ 0 goto error
)
:: 2. Select node version
call :SelectNodeVersion
:: 3. Install npm packages
IF EXIST "%DEPLOYMENT_TARGET%\package.json" (
  pushd "%DEPLOYMENT_TARGET%"
  call :ExecuteCmd !NPM_CMD! install --production
  IF !ERRORLEVEL! NEQ 0 goto error
  popd
)
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
goto end
:: Execute command routine that will echo out when error
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
exit /b %ERRORLEVEL%
:error
endlocal
echo An error has occurred during web site deployment.
call :exitSetErrorLevel
call :exitFromFunction 2>nul
:exitSetErrorLevel
exit /b 1
:exitFromFunction
()
:end
endlocal
echo Finished successfully.
```

deploy.sh
```sh
#!/bin/bash
# ----------------------
# KUDU Deployment Script
# Version: 1.0.17
# ----------------------
# Helpers
# -------
exitWithMessageOnError () {
  if [ ! $? -eq 0 ]; then
    echo "An error has occurred during web site deployment."
    echo $1
    exit 1
  fi
}
# Prerequisites
# -------------
# Verify node.js installed
hash node 2>/dev/null
exitWithMessageOnError "Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment."
# Setup
# -----
SCRIPT_DIR="${BASH_SOURCE[0]%\\*}"
SCRIPT_DIR="${SCRIPT_DIR%/*}"
ARTIFACTS=$SCRIPT_DIR/../artifacts
KUDU_SYNC_CMD=${KUDU_SYNC_CMD//\"}
if [[ ! -n "$DEPLOYMENT_SOURCE" ]]; then
  DEPLOYMENT_SOURCE=$SCRIPT_DIR
fi
if [[ ! -n "$NEXT_MANIFEST_PATH" ]]; then
  NEXT_MANIFEST_PATH=$ARTIFACTS/manifest
  if [[ ! -n "$PREVIOUS_MANIFEST_PATH" ]]; then
    PREVIOUS_MANIFEST_PATH=$NEXT_MANIFEST_PATH
  fi
fi
if [[ ! -n "$DEPLOYMENT_TARGET" ]]; then
  DEPLOYMENT_TARGET=$ARTIFACTS/wwwroot
else
  KUDU_SERVICE=true
fi
if [[ ! -n "$KUDU_SYNC_CMD" ]]; then
  # Install kudu sync
  echo Installing Kudu Sync
  npm install kudusync -g --silent
  exitWithMessageOnError "npm failed"
  if [[ ! -n "$KUDU_SERVICE" ]]; then
    # In case we are running locally this is the correct location of kuduSync
    KUDU_SYNC_CMD=kuduSync
  else
    # In case we are running on kudu service this is the correct location of kuduSync
    KUDU_SYNC_CMD=$APPDATA/npm/node_modules/kuduSync/bin/kuduSync
  fi
fi
# Node Helpers
# ------------
selectNodeVersion () {
  if [[ -n "$KUDU_SELECT_NODE_VERSION_CMD" ]]; then
    SELECT_NODE_VERSION="$KUDU_SELECT_NODE_VERSION_CMD \"$DEPLOYMENT_SOURCE\" \"$DEPLOYMENT_TARGET\" \"$DEPLOYMENT_TEMP\""
    eval $SELECT_NODE_VERSION
    exitWithMessageOnError "select node version failed"
    if [[ -e "$DEPLOYMENT_TEMP/__nodeVersion.tmp" ]]; then
      NODE_EXE=`cat "$DEPLOYMENT_TEMP/__nodeVersion.tmp"`
      exitWithMessageOnError "getting node version failed"
    fi
    if [[ -e "$DEPLOYMENT_TEMP/__npmVersion.tmp" ]]; then
      NPM_JS_PATH=`cat "$DEPLOYMENT_TEMP/__npmVersion.tmp"`
      exitWithMessageOnError "getting npm version failed"
    fi
    if [[ ! -n "$NODE_EXE" ]]; then
      NODE_EXE=node
    fi
    NPM_CMD="\"$NODE_EXE\" \"$NPM_JS_PATH\""
  else
    NPM_CMD=npm
    NODE_EXE=node
  fi
}
##################################################################################################################################
# Deployment
# ----------
echo Handling node.js deployment.
# 1. KuduSync
if [[ "$IN_PLACE_DEPLOYMENT" -ne "1" ]]; then
  "$KUDU_SYNC_CMD" -v 50 -f "$DEPLOYMENT_SOURCE" -t "$DEPLOYMENT_TARGET" -n "$NEXT_MANIFEST_PATH" -p "$PREVIOUS_MANIFEST_PATH" -i ".git;.hg;.deployment;deploy.sh"
  exitWithMessageOnError "Kudu Sync failed"
fi
# 2. Select node version
selectNodeVersion
# 3. Install npm packages
if [ -e "$DEPLOYMENT_TARGET/package.json" ]; then
  cd "$DEPLOYMENT_TARGET"
  echo "Running $NPM_CMD install --production"
  eval $NPM_CMD install --production
  exitWithMessageOnError "npm failed"
  cd - > /dev/null
fi
##################################################################################################################################
echo "Finished successfully."
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
```

gulpfile.js
```js
const gulp = require('gulp');
const zip = require('gulp-zip');
const del = require('del');
gulp.task('clean', function(done) {
    return del([
        'manifest/**/*'
    ], done);
});
gulp.task('generate-manifest', function(done) {
    gulp.src(['src/images/outline*', 'src/images/color*', 'src/manifest.json'])
        .pipe(zip('aadSsoTabSample.zip'))
        .pipe(gulp.dest('manifest'), done);
    done();
});
gulp.task('default', gulp.series('clean', 'generate-manifest'), function(done) {
    console.log('Build completed. Output in manifest folder');
    done();
});
```

m365agents.local.yml
```yml
# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.2/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: v1.2
additionalMetadata:
  sampleTag: Microsoft-Teams-Samples:tab-sso-nodejs
provision:
  # Creates a new Azure Active Directory (AAD) app to authenticate users if
  # the environment variable that stores clientId is empty
  - uses: aadApp/create
    with:
      # Note: when you run aadApp/update, the AAD app name will be updated
      # based on the definition in manifest. If you don't want to change the
      # name, make sure the name in AAD manifest is the same with the name
      # defined here.
      name: tab-sso
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
      name: tab-sso${{APP_NAME_SUFFIX}}
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
deploy:
  # Run npm command
  - uses: cli/runNpmCommand
    with:
      workingDirectory: .
      args: install --no-audit
  - uses: file/createOrUpdateJsonFile
    with:
      target: ./config/default.json # Required. The relative path of settings file
      appsettings: # Required. The appsettings to be generated
        tab:
          appId: ${{AAD_APP_CLIENT_ID}}
          clientSecret: ${{SECRET_AAD_APP_CLIENT_SECRET}}
          applicationIdUri: api://${{TAB_DOMAIN}}/${{AAD_APP_CLIENT_ID}}
        port: "53000"
```

m365agents.yml
```yml
# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.2/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: v1.2
additionalMetadata:
  sampleTag: Microsoft-Teams-Samples:tab-sso-nodejs
environmentFolderPath: ./env
```

README.md
```md
---
page_type: sample
description: This sample app demonstrates Azure AD Single Sign-On for Teams tabs, enabling Graph API access.
products:
- office-teams
- office
- office-365
languages:
- nodejs
extensions:
 contentType: samples
 createdDate: "12/03/2021 12:53:17 PM"
urlFragment: officedev-microsoft-teams-samples-tab-sso-nodejs
---
# Tabs Azure AD SSO Sample using NodeJS
This sample shows how to implement Azure AD single sign-on support for tabs. It will:
1. Obtain an access token for the logged-in user using SSO
2. Call a web service - also part of this project - to exchange this access token for one with User.Read permission
3. Call Graph and retrieve the user's profile
## Included Features
* Teams SSO (tabs)
* MSAL.js 2.0 support
* Graph API
- **Interaction with app**
![tab-sso-sample ](./doc/images/tab-sso.gif)
## Prerequisites
You will need:
1. A global administrator account for an Office 365 tenant. Testing in a production tenant is not recommended! You can get a free tenant for development use by signing up for the [Office 365 Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program).
2. To test locally, [NodeJS](https://nodejs.org/en/download/) must be installed on your development machine.
3. [dev tunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows) or [Ngrok](https://ngrok.com/download) (For local environment testing) latest version (any other tunneling software can also be used)
   If you using Ngrok to test locally, you'll need [Ngrok](https://ngrok.com/) installed on your development machine.
Make sure you've downloaded and installed Ngrok on your local machine. ngrok will tunnel requests from the Internet to your local computer and terminate the SSL connection from Teams.
4. [Teams Toolkit for VS Code](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension) or [TeamsFx CLI](https://learn.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli?pivots=version-one)
> NOTE: The free ngrok plan will generate a new URL every time you run it, which requires you to update your Azure AD registration, the Teams app manifest, and the project configuration. A paid account with a permanent ngrok URL is recommended.
## Run the app (Using Teams Toolkit for Visual Studio Code)
The simplest way to run this sample in Teams is to use Teams Toolkit for Visual Studio Code.
1. Ensure you have downloaded and installed [Visual Studio Code](https://code.visualstudio.com/docs/setup/setup-overview)
1. Install the [Teams Toolkit extension](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
1. Select **File > Open Folder** in VS Code and choose this samples directory from the repo
1. Using the extension, sign in with your Microsoft 365 account where you have permissions to upload custom apps
1. Select **Debug > Start Debugging** or **F5** to run the app in a Teams web client.
1. In the browser that launches, select the **Add** button to install the app to Teams.
> If you do not have permission to upload custom apps (uploading), Teams Toolkit will recommend creating and using a Microsoft 365 Developer Program account - a free program to get your own dev environment sandbox that includes Teams.
## Run the app (Manually Uploading to Teams)
## Step 1: Register an Azure AD Application
Your tab needs to run as a registered Azure AD application in order to obtain an access token from Azure AD. In this step you'll register the app in your tenant and give Teams permission to obtain access tokens on its behalf.
1. Create an [Microsoft Entra ID application](https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/auth-aad-sso#1-create-your-aad-application-in-azure) in Azure. You can do this by visiting the "Azure AD app registration" portal in Azure.
    * Set your application URI to the same URI you've created in tunnelling application. 
        * Ex: `api://<your_tunnel_domain>/{appId}`
        using the application ID that was assigned to your app
    * Setup your redirect URIs. This will allow Azure AD to return authentication results to the correct URI.
        * Visit `Manage > Authentication`. 
        * Add a platform
        * Select `Single-page application`
        * Create a redirect URI in the format of: `https://<your_tunnel_domain>/auth-end`.
        * Within same `Single-page-application` add another url in the format of: `https://<your_tunnel_domain>/Home/BrowserRedirect`.
    * Setup a client secret. You will need this when you exchange the token for more API permissions from your backend.
        * Visit `Manage > Certificates & secrets`
        * Create a new client secret.
    * Setup your API permissions. This is what your application is allowed to request permission to access.
        * Visit `Manage > API Permissions`
        * Make sure you have the following Graph permissions enabled: `email`, `offline_access`, `openid`, `profile`, and `User.Read`.
        * Our SSO flow will give you access to the first 4 permissions, and we will have to exchange the token server-side to get an elevated token for the `profile` permission (for example, if we want access to the user's profile photo).
    * Expose an API that will give the Teams desktop, web and mobile clients access to the permissions above
        * Visit `Manage > Expose an API`
        * Add a scope and give it a scope name of `access_as_user`. Your API url should look like this: `api://contoso.ngrok-free.app/{appID}/access_as_user`. In the "who can consent" step, enable it for "Admins and users". Make sure the state is set to "enabled".
        * Next, add two client applications. This is for the Teams desktop/mobile clients and the web client.
            * 5e3ce6c0-2b1f-4285-8d4b-75ee78787346
            * 1fec8e78-bce4-4aaf-ab1b-5451cc387264
    **Note** If you want to test or extend your Teams apps across Office and Outlook, kindly add below client application identifiers while doing Azure AD app registration in your tenant:
      * `4765445b-32c6-49b0-83e6-1d93765276ca` (Office web)
      * `0ec893e0-5785-4de6-99da-4ed124e5296c` (Office desktop)
      * `bc59ab01-8403-45c6-8796-ac3ef710b3e3` (Outlook web)
      * `d3590ed6-52b3-4102-aeff-aad2292ab01c` (Outlook desktop)
## Update the app manifest and config.js file
1. Update the `manifest.json` file as follows:
    * Generate a new unique ID for the application and replace the id field with this GUID. On Windows, you can generate a new GUID in PowerShell with this command:
    ~~~ powershell
     [guid]::NewGuid()
    ~~~
    * Ensure the package name is unique within the tenant where you will run the app
    * Edit the `manifest.json` contained in the ./appManifest folder to replace your Microsoft App Id (that was created when you registered your app registration earlier) *everywhere* you see the place holder string `{{AppId}}` (depending on the scenario the Microsoft App Id may occur multiple times in the `manifest.json`)
    * Replace `{your_tunnel_domain}` with the subdomain you've assigned to your Ngrok account in step #1 above.
    * Edit the `manifest.json` for `webApplicationInfo` resource `"api://{your_tunnel_domain}/{{AppId}}"` with MicrosoftAppId. E.g. `"api://1245.ngrok-free.app/{{AppId}}`.
    **Note:** If you want to test your app across multi hub like: Outlook/Office.com, please update the `manifest.json` in the `tab-sso\nodejs\appManifest_Hub` folder with the required values.
    **Zip** up the contents of the `appManifest` folder to create a `Manifest.zip` or `appManifest_Hub` folder to create a `Manifest_Hub.zip` (Make sure that zip file does not contains any subfolder otherwise you will get error while uploading your .zip package)
2. Update your `config/default.json` file
    * Replace the `tab.appId` property with you Azure AD application ID
    * Replace the `tab.clientSecret` property with the "client secret" you were assigned in step #2
    * Replace the `tab.applicationIdUri` property with the Application ID URI we get in step #1.1 above. It will look like this - `api://<your_tunnel_domain>/{appID}`
    * If you want to use a port other than 3978, fill that in here (and in your tunnel command)
    * Note : Do not push the `clientId` and `clientSecret` values inside your repo. Instead we recommend to store them at some secure location like Azure key vault.
## Running the app locally
1. If you are using Ngrok, run Ngrok to expose your local web server via a public URL. Make sure to point it to your Ngrok URI. For example, if you're using port 3978 locally, run: 
    * Win: `./ngrok http 3978 -host-header=localhost:3978 -subdomain="contoso"`
    * Mac: `/ngrok http 3978 -host-header=localhost:3978 -subdomain="contoso"`
Leave this running while you're running the application locally, and open another command prompt for the steps which follow.
2. Install the neccessary NPM packages and start the app
    * `npm install`
    * `npm start`
Thhe app should start running on port 3978 or the port you configured
## Packaging and installing your app to Teams
1. Package your manifest 
    * `gulp generate-manifest`
    * This will create a zip file in the manifest folder
2. Install in Teams
    * Open Teams and visit the app store. Depending on the version of Teams, you may see an "App Store" button in the bottom left of Teams or you can find the app store by visiting `Apps > Manage your apps > Publish App > Upload Custom App`.
    * Upload the manifest zip file created in step #1
## Running the sample
1. Once you've installed the app, it should automatically open for you. Visit the `Auth Tab` to begin testing out the authentication flow.
2. Follow the onscreen prompts. The authentication flow will print the output to your screen.
Tab auth in personal scope
![tab-sso-page ](./doc/images/tab-sso-details.png)
Tab auth in group scope
![tab-sso-teams ](./doc/images/tab-sso-teams.png)
Tab auth in browser
![tab-sso-browser ](./doc/images/tab-sso-browser.png)
Tab auth in browser with user details
![tab-sso-teams ](./doc/images/tab-sso-browser-auth.png)
## Outlook on the web
- To view your app in Outlook on the web.
- Go to [Outlook on the web](https://outlook.office.com/mail/)and sign in using your dev tenant account.
**On the side bar, select More Apps. Your uploaded app title appears among your installed apps**
![InstallOutlook](./doc/images/InstallOutlook.png)
**Select your app icon to launch and preview your app running in Outlook on the web**
![AppOutlook](./doc/images/AppOutlook.png)
**Note:** Similarly, you can test your application in the Outlook desktop app as well.
## Office on the web
- To preview your app running in Office on the web.
- Log into office.com with test tenant credentials
**Select the Apps icon on the side bar. Your uploaded app title appears among your installed apps**
![InstallOffice](./doc/images/InstallOffice.png)
**Select your app icon to launch your app in Office on the web**
![AppOffice](./doc/images/AppOffice.png) 
**Note:** Similarly, you can test your application in the Office 365 desktop app as well.
# App structure
## Routes
Compared to the Hello World sample, this app has four additional routes:
1. `/ssoDemo` renders the tab UI. 
    * This is the tab called `Auth Tab` in personal app inside Teams. The purpose of this page is primarily to execute the `ssoDemo.js` file that handles and initiates the authentication flow.
    * This tab can also be added to Teams channels
2. `/getProfileOnBehalfOf` does not render anything but instead is the server-side route for initiating the [on-behalf-of flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v1-oauth2-on-behalf-of-flow). 
    * It takes the token it receives from the `/ssoDemo` page and attemps to exchange it for a new token that has elevated permissions to access the `profile` Graph API (which is usually used to retrieve the users profile photo).
    * If it fails (because the user hasn't granted permission to access the `profile` API), it returns an error to the `/ssoDemo` page. This error is used to display the "Consent" button which uses the Teams SDK to open the `/auth/start` page in a pop-up window.
3. `/auth/start` and `/auth/end` routes are used if the user needs to grant further permissions. This experience happens in a seperate window. 
    * The `/auth/start` page merely creates a valid Microsoft Entra ID authorization endpoint and redirects to that Microsoft Entra ID consent page.
    * Once the user has consented to the permissions, Microsoft Entra ID redirects the user back to `/auth/end`. This page is responsible for returning the results back to the `/ssoDemo` page by calling the `notifySuccess` API.
    * This workflow is only neccessary if you want authorization to use additional Graph APIs. Most apps will find this flow unnesseccary if all they want to do is authenticate the user.
    * This workflow is the same as our standard [web-based authentication flow](https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/auth-tab-aad#navigate-to-the-authorization-page-from-your-popup-page) that we've always had in Teams before we had single sign-on support. It just so happens that it's a great way to request additional permissions from the user, so it's left in this sample as an illustration of what that flow looks like.
## msal-auth.js
This Javascript file is served from the `/msal-auth.js` page and handles the browser-side authentication workflow.
## ssoDemo.js
This Javascript file is served from the `/ssoDemo` page and handles most of the client-side authentication workflow. This file is broken into three main functions:
1. getClientSideToken() -
This function asks Teams for an authentication token from Microsoft Entra ID. The token is displayed so you can try it in Postman.
2. getServerSideToken() -
This function sends the token to the backend to exchange for elevated permissions using Microsoft Entra ID's [on-behalf-of flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v1-oauth2-on-behalf-of-flow). In this case, it sends the token to the `/getProfileOnBehalfOf` route.
3. useServerSideToken() -
This function uses the token to call the Microsoft Graph and display the resulting JSON.
4. requestConsent() - 
This function launches the consent pop-up
Inline code runs these in sequence, running requestConsent only if an `invalid_grant` error is received from the server.
# Additional reading
 For how to get started with Microsoft Teams development see [Get started on the Microsoft Teams platform with Node.js and App Studio](https://docs.microsoft.com/en-us/microsoftteams/platform/get-started/get-started-nodejs-app-studio).
For further information on Single Sign-On and how it works, visit our [Single Sign-On documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/auth-aad-sso)
# Contributing
This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.
When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
## Further Reading.
[Extend Teams apps across Microsoft 365](https://learn.microsoft.com/en-us/microsoftteams/platform/m365-apps/overview)
```

SECURITY.md
```md
<!-- BEGIN MICROSOFT SECURITY.MD V0.0.5 BLOCK -->
## Security
Microsoft takes the security of our software products and services seriously, which includes all source code repositories managed through our GitHub organizations, which include [Microsoft](https://github.com/Microsoft), [Azure](https://github.com/Azure), [DotNet](https://github.com/dotnet), [AspNet](https://github.com/aspnet), [Xamarin](https://github.com/xamarin), and [our GitHub organizations](https://opensource.microsoft.com/).
If you believe you have found a security vulnerability in any Microsoft-owned repository that meets [Microsoft's definition of a security vulnerability](https://docs.microsoft.com/en-us/previous-versions/tn-archive/cc751383(v=technet.10)), please report it to us as described below.
## Reporting Security Issues
**Please do not report security vulnerabilities through public GitHub issues.**
Instead, please report them to the Microsoft Security Response Center (MSRC) at [https://msrc.microsoft.com/create-report](https://msrc.microsoft.com/create-report).
If you prefer to submit without logging in, send email to [secure@microsoft.com](mailto:secure@microsoft.com).  If possible, encrypt your message with our PGP key; please download it from the [Microsoft Security Response Center PGP Key page](https://www.microsoft.com/en-us/msrc/pgp-key-msrc).
You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Additional information can be found at [microsoft.com/msrc](https://www.microsoft.com/msrc). 
Please include the requested information listed below (as much as you can provide) to help us better understand the nature and scope of the possible issue:
  * Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
  * Full paths of source file(s) related to the manifestation of the issue
  * The location of the affected source code (tag/branch/commit or direct URL)
  * Any special configuration required to reproduce the issue
  * Step-by-step instructions to reproduce the issue
  * Proof-of-concept or exploit code (if possible)
  * Impact of the issue, including how an attacker might exploit the issue
This information will help us triage your report more quickly.
If you are reporting for a bug bounty, more complete reports can contribute to a higher bounty award. Please visit our [Microsoft Bug Bounty Program](https://microsoft.com/msrc/bounty) page for more details about our active programs.
## Preferred Languages
We prefer all communications to be in English.
## Policy
Microsoft follows the principle of [Coordinated Vulnerability Disclosure](https://www.microsoft.com/en-us/msrc/cvd).
<!-- END MICROSOFT SECURITY.MD BLOCK -->
```

src\app.js
```js
'use strict';
var config = require('config');
var express = require('express');
var app = express();
var path = require('path');
var tabs = require('./server/tabs');
tabs.setup(app);
app.use(express.static(path.join(__dirname, 'client')));
  app.set('view engine', 'pug');
  app.set('views', path.join(__dirname, 'client/views'));
var port = process.env.PORT ||
  config.has("port") ? config.get("port") : 3978;
app.listen(port, function() {
  console.log(`App started listening on port ${port}`);
});
```

src\client\scripts\config.js
```js
(function () {
    microsoftTeams.app.initialize().then(() => {
        microsoftTeams.pages.config.registerOnSaveHandler(function (saveEvent) {
            var tabUrl = window.location.protocol +
                '//' + window.location.host + '/ssoDemo/?inTeams=true';
            microsoftTeams.pages.config.setConfig({
                contentUrl: tabUrl, 
                entityId: tabUrl    
            });
            saveEvent.notifySuccess();
        });
        microsoftTeams.pages.config.setValidityState(true);
    });
})();
```

src\client\scripts\msal-auth.js
```js
class MsalAuthService {
    constructor(clientId, applicationIdUri) {
        this.api = applicationIdUri;
        this.app = new msal.PublicClientApplication({
            auth: {
                clientId: clientId,
                redirectUri: `${window.location.origin}/Home/BrowserRedirect`,
            },
        });
    }
    isCallback() {
        return this.app.handleRedirectPromise().then((authResponse) => {
            if (authResponse) {
                this.app.setActiveAccount(authResponse.account);
                return true;
            } else {
                return false;
            }
        });
    }
    login() {
        const loginScopes = [
            "openid",
            "email",
            "profile",
            "offline_access",
            "User.Read"
        ];
        const authRequest = {
            scopes: loginScopes,
            prompt: "select_account",
        };
        if (window.navigator.standalone) {
            return this.app.loginRedirect(authRequest);
        } else {
            return this.app.loginPopup(authRequest).then((authResponse) => {
                this.app.setActiveAccount(authResponse.account);
                return authResponse.account;
            });
        }
    }
    logout() {
        this.app.logout();
    }
    getUser() {
        let activeAccount = this.app.getActiveAccount();
        if (!activeAccount) {
            const allAccounts = this.app.getAllAccounts();
            if (allAccounts.length === 1) {
                this.app.setActiveAccount(allAccounts[0]);
                activeAccount = allAccounts[0];
            }
        }
        return Promise.resolve(activeAccount);
    }
    getToken() {
        const scopes = [this.api];
        return this.app
            .acquireTokenSilent({ account: this.app.getActiveAccount() }) 
            .then((authResponse) => authResponse.accessToken)
            .catch((error) => {
                if (error.errorMessage.indexOf("interaction_required") >= 0) {
                    return this.app
                        .acquireTokenPopup({ scopes })
                        .then((authResponse) => authResponse.accessToken);
                } else {
                    return Promise.reject(error);
                }
            });
    }
    getUserInfo(principalName) {
        this.getToken().then((token) => {
            if (principalName) {
                let graphUrl = "https://graph.microsoft.com/v1.0/users/" + principalName;
                $.ajax({
                    url: graphUrl,
                    type: "GET",
                    beforeSend: function (request) {
                        request.setRequestHeader("Authorization", `Bearer ${token}`);
                    },
                    success: function (profile) {
                        let profileDiv = $("#divGraphProfile");
                        profileDiv.empty();
                        $("<div>")
                            .append($("<h2>").text(`Welcome ${profile["displayName"]},`))
                            .append($("<h3>").text(`Here is your profile details:`))
                            .appendTo(profileDiv);
                        for (let key in profile) {
                            if ((key[0] !== "@") && profile[key]) {
                                $("<div>")
                                    .append($("<span>").text(key + ": "))
                                    .append($("<span>").text(profile[key]))
                                    .appendTo(profileDiv);
                            }
                        }
                        $("<div>")
                            .append($("<button class=\"browser-button\" onclick=\"logout()\">").text(`Logout`))
                            .appendTo(profileDiv);
                        $("#divGraphProfile").show();
                    },
                    error: function (error) {
                        console.log("Failed");
                        console.log(error);
                    },
                    complete: function (data) {
                    }
                });
            }
        });
    }
}
```

src\client\scripts\msalDemo.js
```js
var auth;
function msalAuth(authService) {
    auth = authService;
    document.getElementById("browser-signin-container").hidden = false;
    document.getElementById("browser-signin-text").hidden = true;
    authService
        .isCallback()
        .then((isCallback) => {
            if (!isCallback) {
                authService
                    .getUser()
                    .then((user) => {
                        setUserSignedIn(true);
                        getMyProfile(user.localAccountId);
                    })
                    .catch(() => {
                        setUserSignedIn(false);
                        console.log("Failed")
                    });
            }
        })
        .catch((error) => {
            console.log(error);
        });
  }
  function loginUser() {
    auth
        .login()
        .then((user) => {
            if (user) {
                setUserSignedIn(true);
                getMyProfile(user.localAccountId);
            } else {
                setUserSignedIn(false);
            }
        })
        .catch((err) => {
            setUserSignedIn(false);
        });
}
function logout() {
    auth.logout();
}
function getMyProfile(userId) {
    setUserSignedIn(true);
    auth.getUserInfo(userId);
}
function setUserSignedIn(isUserSignedIn) {
  console.log(document.getElementById("browser-login"));
    document.getElementById("browser-login").hidden = isUserSignedIn;
}
```

src\client\scripts\ssoDemo.js
```js
function ssoAuth() {
    'use strict';
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
    function useServerSideToken(data) {
        display("2. Call https://graph.microsoft.com/v1.0/me/ with the server side token");
        return display(JSON.stringify(data, undefined, 4), 'pre');
    }
    function requestConsent() {
        return new Promise((resolve, reject) => {
            microsoftTeams.authentication.authenticate({
                url: window.location.origin + "/auth-start",
                width: 600,
                height: 535
            })
            .then((result) => {
                let tokenData = result;
                resolve(tokenData);
            }).catch((reason) => {
                reject(JSON.stringify(reason));
            });
        });
    }
    function display(text, elementTag) {
        var logDiv = document.getElementById('logs');
        var p = document.createElement(elementTag ? elementTag : "p");
        p.innerText = text;
        logDiv.append(p);
        console.log("ssoDemo: " + text);
        return p;
    }
    $(document).ready(function () {
        microsoftTeams.app.initialize().then(() => {
            getClientSideToken()
                .then((clientSideToken) => {
                    return getServerSideToken(clientSideToken);
                })
                .then((profile) => {
                    return useServerSideToken(profile);
                })
                .catch((error) => {
                    if (error === "invalid_grant") {
                        display(`Error: ${error} - user or admin consent required`);
                        let button = display("Consent", "button");
                        button.onclick = (() => {
                            requestConsent()
                                .then((result) => {
                                    display(`Consent succeeded`);
                                    button.disabled = true;
                                    let refreshButton = display("Refresh page", "button");
                                    refreshButton.onclick = (() => { window.location.reload(); });
                                })
                                .catch((error) => {
                                    display(`ERROR ${error}`);
                                    button.disabled = true;
                                    let refreshButton = display("Refresh page", "button");
                                    refreshButton.onclick = (() => { window.location.reload(); });
                                });
                        });
                    } else {
                        display(`Error from web service: ${error}`);
                    }
                });
        }).catch((error) => {
            console.error(error);
        });
    });
}
```

src\client\styles\button.css
```css
body {
    font-family:"Segoe UI","Apple Color Emoji","Segoe UI Emoji","Segoe UI Web";
}
.browser-button {
    margin-top: 1rem;
    font-weight: 600;
    background-color: #5B58C7;
    padding: 0.5rem 1.5rem;
    color: white;
    border-radius: 7px;
    border: none;
    cursor: pointer;
}
.browser-button:hover {
    background-color: #7A80EB;
}
```

src\client\styles\custom.css
```css
html, body, div.surface, div.panel {
    height: 100%;
    margin: 0;
}
div.panel {
    padding: 15px;
}
```

src\client\styles\msteams-16.css
```css
 .theme-light .surface{background-color:#F0F2F4;color:#16233A;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.875rem;font-weight:400;line-height:1.25rem} .theme-light .panel{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background-color:#FFFFFF;border-color:transparent;border-radius:0.1875rem;border-style:solid;border-width:0.125rem;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden} .theme-light .panel-header{flex:0 0 auto;margin-left:2rem;margin-right:2rem;margin-top:2rem} .theme-light .panel-body{flex:1 1 auto;margin-left:2rem;margin-right:2rem;overflow:auto} .theme-light .panel-footer{flex:0 0 auto;margin-bottom:2rem;margin-left:2rem;margin-right:2rem} .theme-light .button-primary{background:#5558AF;border:0.125rem solid;border-color:transparent;border-radius:0.1875rem;color:#FFFFFF;cursor:pointer;font:inherit;height:2rem;min-width:6rem;padding:0.25rem;white-space:nowrap} .theme-light .button-primary:hover:enabled{background:#4C509D;border-color:transparent;color:#FFFFFF} .theme-light .button-primary:active{background:#454A92;border-color:transparent;color:#FFFFFF} .theme-light .button-primary:disabled{background:#F3F4F5;border-color:transparent;color:#ABB0B8} .theme-light .button-primary:focus{background:#4C509D;border-color:transparent;color:#FFFFFF;outline:0.125rem solid #FFFFFF;outline-offset:-0.25rem} .theme-light .button-secondary{background:#FFFFFF;border:0.125rem solid;border-color:#ABB0B8;border-radius:0.1875rem;color:#525C6D;cursor:pointer;font:inherit;height:2rem;min-width:6rem;padding:0.25rem;white-space:nowrap} .theme-light .button-secondary:hover:enabled{background:#ABB0B8;border-color:transparent;color:#16233A} .theme-light .button-secondary:active{background:#858C98;border-color:transparent;color:#16233A} .theme-light .button-secondary:disabled{background:#FFFFFF;border-color:#F3F4F5;color:#ABB0B8} .theme-light .button-secondary:focus{background:#ABB0B8;border-color:transparent;color:#16233A;outline:0.125rem solid #16233A;outline-offset:-0.25rem} .theme-light .radio-container{align-items:center;background:transparent;border:none;display:flex;outline:none} .theme-light .radio-container + .radio-container{margin-top:0.5rem} .theme-light .radio-button{-moz-user-select:none;-ms-user-select:none;-webkit-user-select:none;background:transparent;border:0.0625rem solid;border-color:#525C6D;border-radius:100%;cursor:pointer;display:inline-block;font:inherit;height:0.75rem;margin:0.125rem;margin-left:0.375rem;padding:0;position:relative;width:0.75rem} .theme-light .radio-button:hover{background:transparent;border-color:#525C6D} .theme-light .radio-button:disabled{background:#F0F2F4;border-color:#ABB0B8} .theme-light .radio-button:disabled + label{color:#ABB0B8;cursor:default} .theme-light .radio-button:focus{box-shadow:0 0 0 0.125rem #9FA4FE;outline:none} .theme-light .hidden-input:checked + .radio-button{background:#5558AF;border-color:#5558AF} .theme-light .hidden-input:checked + .radio-button + label{color:#16233A} .theme-light .radio-label{color:#525C6D;cursor:pointer;font-size:0.75rem;line-height:1rem;margin-left:0.625rem} .theme-light .radio-group{display:inline-block} .theme-light .tab-group{border-bottom:0.0625rem solid #F3F4F5;margin:0;padding:0;width:100%} .theme-light .tab-group .tab{background:0;border:0;border-bottom:transparent 0.25rem solid;color:#525C6D;cursor:pointer;display:inline-block;font:inherit;margin:0;margin-right:1.25rem;outline:none;padding:0.25rem} .theme-light .tab-group .tab:hover{border-bottom-color:#9496CA} .theme-light .tab-group .tab:focus{background-color:#9FA4FE;color:#FFFFFF} .theme-light .tab-group .tab-active{border-bottom-color:#5558AF;color:#5558AF} .theme-light .tab-active:focus{border-bottom-color:#FFFFFF} .theme-light .hidden-input{display:none} .theme-light .toggle{display:inline-block;line-height:1} .theme-light .toggle-ball{background-color:#F0F2F4;border:0;border-radius:1.25rem;cursor:pointer;height:1.25rem;margin:0.125rem;outline:none;padding:0;position:relative;width:3.75rem} .theme-light .toggle-ball:before{background-color:#454A92;border-radius:50%;content:"";height:0.875rem;left:0.1875rem;position:absolute;top:0.18750000000000003rem;transition:0.2s;width:0.875rem} .theme-light .hidden-input:checked + .toggle-ball:before{background-color:#4C509D;transform:translateX(2.5rem)} .theme-light .toggle-ball:focus{box-shadow:0 0 0 0.125rem #5558AF;outline:none} .theme-light .hidden-input:checked + .toggle-ball{background-color:#7FBA00} .theme-light .font-title{font-size:1.5rem;line-height:2rem} .theme-light .font-title2{font-size:1.125rem;line-height:1.5rem} .theme-light .font-base{font-size:0.875rem;line-height:1.25rem} .theme-light .font-caption{font-size:0.75rem;line-height:1rem} .theme-light .font-xsmall{font-size:0.625rem;line-height:0.6875rem} .theme-light .font-semilight{font-family:'Segoe UI Light', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:300} .theme-light .font-regular{font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:400} .theme-light .font-semibold{font-family:'Segoe UI Semibold', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:600} .theme-light .font-bold{font-family:'Segoe UI Bold', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:700} .theme-light .input-container{overflow:hidden;position:relative} .theme-light .input-field{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background:#F0F2F4;border:0.125rem solid transparent;border-radius:0.1875rem;box-sizing:border-box;color:#525C6D;font:inherit;height:2rem;margin:0;outline:none;padding:0.5rem 0.75rem;width:100%} .theme-light .input-error-icon{bottom:0.5625rem;color:#C50E2E;position:absolute;right:0.75rem} .theme-light .label{border:0;color:#4E586A;display:inline-block;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.75rem;font-weight:400;line-height:1rem;margin-bottom:0.5rem;margin-left:0;margin-right:0;margin-top:0;padding:0} .theme-light .error-label{border:0;color:#C50E2E;float:right;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.75rem;font-weight:400;line-height:1rem;margin-bottom:0.5rem;margin-left:0;margin-right:0;margin-top:0;padding:0} .theme-light .textarea-container{display:flex;flex-direction:column;overflow:hidden;position:relative} .theme-light .textarea-field{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background:#F0F2F4;border:0.125rem solid transparent;border-radius:0.1875rem;box-sizing:border-box;color:#525C6D;flex:1;font:inherit;margin:0;min-height:3.75rem;outline:none;padding:0.5rem 0.75rem;resize:none} .theme-light .input-field:hover:inactive:enabled, .theme-light .textarea-field:hover:inactive:enabled{background:#F0F2F4;border-bottom-color:transparent} .theme-light .input-field:disabled, .theme-light .textarea-field:disabled{background:#F3F4F5;border-bottom-color:transparent;color:#DEE0E3} .theme-light .input-field:active:enabled, .theme-light .input-field:focus, .theme-light .textarea-field:active:enabled, .theme-light .textarea-field:focus{background:#F0F2F4;border-bottom-color:#5558AF} .theme-light .textarea-error-icon{color:#C50E2E;position:absolute;right:0.75rem;top:50%} .theme-dark .surface{background-color:#2B2B30;color:#FFFFFF;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.875rem;font-weight:400;line-height:1.25rem} .theme-dark .panel{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background-color:#404045;border-color:transparent;border-radius:0.1875rem;border-style:solid;border-width:0.125rem;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden} .theme-dark .panel-header{flex:0 0 auto;margin-left:2rem;margin-right:2rem;margin-top:2rem} .theme-dark .panel-body{flex:1 1 auto;margin-left:2rem;margin-right:2rem;overflow:auto} .theme-dark .panel-footer{flex:0 0 auto;margin-bottom:2rem;margin-left:2rem;margin-right:2rem} .theme-dark .button-primary{background:#9FA4FE;border:0.125rem solid;border-color:transparent;border-radius:0.1875rem;color:#2B2B30;cursor:pointer;font:inherit;height:2rem;min-width:6rem;padding:0.25rem;white-space:nowrap} .theme-dark .button-primary:hover:enabled{background:#AEB2FF;border-color:transparent;color:#2B2B30} .theme-dark .button-primary:active{background:#B8BBFF;border-color:transparent;color:#2B2B30} .theme-dark .button-primary:disabled{background:#35353A;border-color:transparent;color:#77777A} .theme-dark .button-primary:focus{background:#9FA4FE;border-color:transparent;color:#2B2B30;outline:0.125rem solid #2B2B30;outline-offset:-0.25rem} .theme-dark .button-secondary{background:#404045;border:0.125rem solid;border-color:#77777A;border-radius:0.1875rem;color:#C8C8C9;cursor:pointer;font:inherit;height:2rem;min-width:6rem;padding:0.25rem;white-space:nowrap} .theme-dark .button-secondary:hover:enabled{background:#77777A;border-color:transparent;color:#FFFFFF} .theme-dark .button-secondary:active{background:#48484D;border-color:transparent;color:#FFFFFF} .theme-dark .button-secondary:disabled{background:#404045;border-color:#35353A;color:#77777A} .theme-dark .button-secondary:focus{background:#77777A;border-color:transparent;color:#FFFFFF;outline:0.125rem solid #FFFFFF;outline-offset:-0.25rem} .theme-dark .radio-container{align-items:center;background:transparent;border:none;display:flex;outline:none} .theme-dark .radio-container + .radio-container{margin-top:0.5rem} .theme-dark .radio-button{-moz-user-select:none;-ms-user-select:none;-webkit-user-select:none;background:transparent;border:0.0625rem solid;border-color:#C8C8C9;border-radius:100%;cursor:pointer;display:inline-block;font:inherit;height:0.75rem;margin:0.125rem;margin-left:0.375rem;padding:0;position:relative;width:0.75rem} .theme-dark .radio-button:hover{background:transparent;border-color:#C8C8C9} .theme-dark .radio-button:disabled{background:#404045;border-color:#77777A} .theme-dark .radio-button:disabled + label{color:#77777A;cursor:default} .theme-dark .radio-button:focus{box-shadow:0 0 0 0.125rem #5558AF;outline:none} .theme-dark .hidden-input:checked + .radio-button{background:#9FA4FE;border-color:#9FA4FE} .theme-dark .hidden-input:checked + .radio-button + label{color:#FFFFFF} .theme-dark .radio-label{color:#C8C8C9;cursor:pointer;font-size:0.75rem;line-height:1rem;margin-left:0.625rem} .theme-dark .radio-group{display:inline-block} .theme-dark .tab-group{border-bottom:0.0625rem solid #000000;margin:0;padding:0;width:100%} .theme-dark .tab-group .tab{background:0;border:0;border-bottom:transparent 0.25rem solid;color:#C8C8C9;cursor:pointer;display:inline-block;font:inherit;margin:0;margin-right:1.25rem;outline:none;padding:0.25rem} .theme-dark .tab-group .tab:hover{border-bottom-color:#7174AA} .theme-dark .tab-group .tab:focus{background-color:#5558AF;color:#FFFFFF} .theme-dark .tab-group .tab-active{border-bottom-color:#9FA4FE;color:#9FA4FE} .theme-dark .tab-active:focus{border-bottom-color:#FFFFFF} .theme-dark .hidden-input{display:none} .theme-dark .toggle{display:inline-block;line-height:1} .theme-dark .toggle-ball{background-color:#2B2B30;border:0;border-radius:1.25rem;cursor:pointer;height:1.25rem;margin:0.125rem;outline:none;padding:0;position:relative;width:3.75rem} .theme-dark .toggle-ball:before{background-color:#C8C8C9;border-radius:50%;content:"";height:0.875rem;left:0.1875rem;position:absolute;top:0.18750000000000003rem;transition:0.2s;width:0.875rem} .theme-dark .hidden-input:checked + .toggle-ball:before{background-color:#FFFFFF;transform:translateX(2.5rem)} .theme-dark .toggle-ball:focus{box-shadow:0 0 0 0.125rem #9FA4FE;outline:none} .theme-dark .hidden-input:checked + .toggle-ball{background-color:#88BC2B} .theme-dark .font-title{font-size:1.5rem;line-height:2rem} .theme-dark .font-title2{font-size:1.125rem;line-height:1.5rem} .theme-dark .font-base{font-size:0.875rem;line-height:1.25rem} .theme-dark .font-caption{font-size:0.75rem;line-height:1rem} .theme-dark .font-xsmall{font-size:0.625rem;line-height:0.6875rem} .theme-dark .font-semilight{font-family:'Segoe UI Light', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:300} .theme-dark .font-regular{font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:400} .theme-dark .font-semibold{font-family:'Segoe UI Semibold', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:600} .theme-dark .font-bold{font-family:'Segoe UI Bold', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:700} .theme-dark .input-container{overflow:hidden;position:relative} .theme-dark .input-field{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background:#2B2B30;border:0.125rem solid transparent;border-radius:0.1875rem;box-sizing:border-box;color:#C8C8C9;font:inherit;height:2rem;margin:0;outline:none;padding:0.5rem 0.75rem;width:100%} .theme-dark .input-error-icon{bottom:0.5625rem;color:#ED1B3E;position:absolute;right:0.75rem} .theme-dark .label{border:0;color:#FFFFFF;display:inline-block;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.75rem;font-weight:400;line-height:1rem;margin-bottom:0.5rem;margin-left:0;margin-right:0;margin-top:0;padding:0} .theme-dark .error-label{border:0;color:#ED1B3E;float:right;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.75rem;font-weight:400;line-height:1rem;margin-bottom:0.5rem;margin-left:0;margin-right:0;margin-top:0;padding:0} .theme-dark .textarea-container{display:flex;flex-direction:column;overflow:hidden;position:relative} .theme-dark .textarea-field{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background:#2B2B30;border:0.125rem solid transparent;border-radius:0.1875rem;box-sizing:border-box;color:#C8C8C9;flex:1;font:inherit;margin:0;min-height:3.75rem;outline:none;padding:0.5rem 0.75rem;resize:none} .theme-dark .input-field:hover:inactive:enabled, .theme-dark .textarea-field:hover:inactive:enabled{background:#2B2B30;border-bottom-color:transparent} .theme-dark .input-field:disabled, .theme-dark .textarea-field:disabled{background:#35353A;border-bottom-color:transparent;color:#48484D} .theme-dark .input-field:active:enabled, .theme-dark .input-field:focus, .theme-dark .textarea-field:active:enabled, .theme-dark .textarea-field:focus{background:#2B2B30;border-bottom-color:#9FA4FE} .theme-dark .textarea-error-icon{color:#ED1B3E;position:absolute;right:0.75rem;top:50%} .theme-contrast .surface{background-color:#000000;color:#FFFFFF;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.875rem;font-weight:400;line-height:1.25rem} .theme-contrast .panel{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background-color:#000000;border-color:#FFFFFF;border-radius:0.1875rem;border-style:solid;border-width:0.125rem;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden} .theme-contrast .panel-header{flex:0 0 auto;margin-left:2rem;margin-right:2rem;margin-top:2rem} .theme-contrast .panel-body{flex:1 1 auto;margin-left:2rem;margin-right:2rem;overflow:auto} .theme-contrast .panel-footer{flex:0 0 auto;margin-bottom:2rem;margin-left:2rem;margin-right:2rem} .theme-contrast .button-primary{background:#FFFFFF;border:0.125rem solid;border-color:transparent;border-radius:0.1875rem;color:#000000;cursor:pointer;font:inherit;height:2rem;min-width:6rem;padding:0.25rem;white-space:nowrap} .theme-contrast .button-primary:disabled{background:#30F42C;border-color:transparent;color:#000000} .theme-contrast .button-secondary{background:#000000;border:0.125rem solid;border-color:#FFFFFF;border-radius:0.1875rem;color:#FFFFFF;cursor:pointer;font:inherit;height:2rem;min-width:6rem;padding:0.25rem;white-space:nowrap} .theme-contrast .button-primary:hover:enabled, .theme-contrast .button-primary:active, .theme-contrast .button-secondary:hover:enabled, .theme-contrast .button-secondary:active{background:#FFFF00;border-color:transparent;color:#000000} .theme-contrast .button-secondary:disabled{background:#000000;border-color:#30F42C;color:#30F42C} .theme-contrast .button-primary:focus, .theme-contrast .button-secondary:focus{background:#FFFF00;border-color:transparent;color:#000000;outline:0.125rem solid transparent;outline-offset:-0.25rem} .theme-contrast .radio-container{align-items:center;background:transparent;border:none;display:flex;outline:none} .theme-contrast .radio-container + .radio-container{margin-top:0.5rem} .theme-contrast .radio-button{-moz-user-select:none;-ms-user-select:none;-webkit-user-select:none;background:transparent;border:0.0625rem solid;border-color:#FFFFFF;border-radius:100%;cursor:pointer;display:inline-block;font:inherit;height:0.75rem;margin:0.125rem;margin-left:0.375rem;padding:0;position:relative;width:0.75rem} .theme-contrast .radio-button:hover{background:transparent;border-color:#FFFFFF} .theme-contrast .radio-button:disabled{background:transparent;border-color:#30F42C} .theme-contrast .radio-button:disabled + label{color:#30F42C;cursor:default} .theme-contrast .radio-button:focus{box-shadow:0 0 0 0.125rem #FFFF00;outline:none} .theme-contrast .hidden-input:checked + .radio-button{background:#00EBFF;border-color:#00EBFF} .theme-contrast .hidden-input:checked + .radio-button + label{color:#FFFFFF} .theme-contrast .radio-label{color:#FFFFFF;cursor:pointer;font-size:0.75rem;line-height:1rem;margin-left:0.625rem} .theme-contrast .radio-group{display:inline-block} .theme-contrast .tab-group{border-bottom:0.0625rem solid #30F42C;margin:0;padding:0;width:100%} .theme-contrast .tab-group .tab{background:0;border:0;border-bottom:transparent 0.25rem solid;color:#FFFFFF;cursor:pointer;display:inline-block;font:inherit;margin:0;margin-right:1.25rem;outline:none;padding:0.25rem} .theme-contrast .tab-group .tab:hover{border-bottom-color:#FFFF00} .theme-contrast .tab-group .tab:focus{background-color:#FFFF00;color:#000000} .theme-contrast .tab-group .tab-active{border-bottom-color:#00EBFF;color:#FFFFFF} .theme-contrast .tab-active:focus{border-bottom-color:#000000} .theme-contrast .hidden-input{display:none} .theme-contrast .toggle{display:inline-block;line-height:1} .theme-contrast .toggle-ball{background-color:#FFFFFF;border:0;border-radius:1.25rem;cursor:pointer;height:1.25rem;margin:0.125rem;outline:none;padding:0;position:relative;width:3.75rem} .theme-contrast .toggle-ball:before{background-color:#FFFF00;border-radius:50%;content:"";height:0.875rem;left:0.1875rem;position:absolute;top:0.18750000000000003rem;transition:0.2s;width:0.875rem} .theme-contrast .hidden-input:checked + .toggle-ball:before{background-color:#4C509D;transform:translateX(2.5rem)} .theme-contrast .toggle-ball:focus{box-shadow:0 0 0 0.125rem #30F42C;outline:none} .theme-contrast .hidden-input:checked + .toggle-ball{background-color:#7FBA00} .theme-contrast .font-title{font-size:1.5rem;line-height:2rem} .theme-contrast .font-title2{font-size:1.125rem;line-height:1.5rem} .theme-contrast .font-base{font-size:0.875rem;line-height:1.25rem} .theme-contrast .font-caption{font-size:0.75rem;line-height:1rem} .theme-contrast .font-xsmall{font-size:0.625rem;line-height:0.6875rem} .theme-contrast .font-semilight{font-family:'Segoe UI Light', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:300} .theme-contrast .font-regular{font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:400} .theme-contrast .font-semibold{font-family:'Segoe UI Semibold', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:600} .theme-contrast .font-bold{font-family:'Segoe UI Bold', 'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-weight:700} .theme-contrast .input-container{overflow:hidden;position:relative} .theme-contrast .input-field{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background:#000000;border:0.125rem solid #FFFFFF;border-radius:0.1875rem;box-sizing:border-box;color:#FFFFFF;font:inherit;height:2rem;margin:0;outline:none;padding:0.5rem 0.75rem;width:100%} .theme-contrast .input-error-icon{bottom:0.5625rem;color:#FFFF00;position:absolute;right:0.75rem} .theme-contrast .label{border:0;color:#FFFFFF;display:inline-block;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.75rem;font-weight:400;line-height:1rem;margin-bottom:0.5rem;margin-left:0;margin-right:0;margin-top:0;padding:0} .theme-contrast .error-label{border:0;color:#FFFF00;float:right;font-family:'Segoe UI', Tahoma, Helvetica, Sans-Serif;font-size:0.75rem;font-weight:400;line-height:1rem;margin-bottom:0.5rem;margin-left:0;margin-right:0;margin-top:0;padding:0} .theme-contrast .textarea-container{display:flex;flex-direction:column;overflow:hidden;position:relative} .theme-contrast .textarea-field{-moz-box-sizing:border-box;-webkit-box-sizing:border-box;background:#000000;border:0.125rem solid #FFFFFF;border-radius:0.1875rem;box-sizing:border-box;color:#FFFFFF;flex:1;font:inherit;margin:0;min-height:3.75rem;outline:none;padding:0.5rem 0.75rem;resize:none} .theme-contrast .input-field:hover:inactive:enabled, .theme-contrast .textarea-field:hover:inactive:enabled{background:#000000;border-bottom-color:transparent} .theme-contrast .input-field:disabled, .theme-contrast .textarea-field:disabled{background:#30F42C;border-bottom-color:#FFFFFF;color:#FFFFFF} .theme-contrast .input-field:active:enabled, .theme-contrast .input-field:focus, .theme-contrast .textarea-field:active:enabled, .theme-contrast .textarea-field:focus{background:#000000;border-bottom-color:#FFFF00} .theme-contrast .textarea-error-icon{color:#FFFF00;position:absolute;right:0.75rem;top:50%}
```

src\client\views\auth-end.pug
```pug
doctype html
html
  head
    title Auth End Page
  body
    script(src="https://res.cdn.office.net/teams-js/2.34.0/js/MicrosoftTeams.min.js"
          integrity="sha384-brW9AazbKR2dYw2DucGgWCCcmrm2oBFV4HQidyuyZRI/TnAkmOOnTARSTdps3Hwt"
          crossorigin="anonymous")
    script(type="text/javascript" src="https://alcdn.msauth.net/browser/2.24.0/js/msal-browser.min.js")
    script.
         microsoftTeams.app.initialize().then(() => {
         microsoftTeams.app.getContext().then(async (context) => {
          const msalConfig = {
            auth: {
              clientId: "#{clientId}",
              authority: `https://login.microsoftonline.com/${context.tid}`,
              navigateToLoginRequestUrl: false
            },
            cache: {
              cacheLocation: "sessionStorage",
            },
          }
          const msalInstance = new window.msal.PublicClientApplication(msalConfig);
          msalInstance.handleRedirectPromise()
            .then((tokenResponse) => {
              if (tokenResponse !== null) {
                microsoftTeams.authentication.notifySuccess(JSON.stringify({
                  sessionStorage: sessionStorage
                }));
              } else {
                microsoftTeams.authentication.notifyFailure("Get empty response.");
              }
            })
            .catch((error) => {
              microsoftTeams.authentication.notifyFailure(JSON.stringify(error));
            });
        });
      });
```

src\client\views\auth-start.pug
```pug
doctype html
html
  head
    title Auth Start Page
  body
    script(src="https://res.cdn.office.net/teams-js/2.34.0/js/MicrosoftTeams.min.js"
          integrity="sha384-brW9AazbKR2dYw2DucGgWCCcmrm2oBFV4HQidyuyZRI/TnAkmOOnTARSTdps3Hwt"
          crossorigin="anonymous")
    script(type="text/javascript" src="https://alcdn.msauth.net/browser/2.24.0/js/msal-browser.min.js")
    script.
        microsoftTeams.app.initialize().then(() => {
            microsoftTeams.app.getContext().then(async (context) => {
          var currentURL = new URL(window.location);
          var scope = "User.Read email openid profile offline_access";
          var loginHint = context.user.loginHint;
          const msalConfig = {
            auth: {
              clientId: "#{clientId}",
              authority: `https://login.microsoftonline.com/${context.user.tenant.id}`,
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
```

src\client\views\browser-redirect.pug
```pug
extends layout.pug
block content
    script(type="text/javascript" src="https://alcdn.msauth.net/browser/2.24.0/js/msal-browser.min.js")
    script.
        const authService = new MsalAuthService("#{clientId}", "#{applicationIdURI}");
        $(document).ready(function () {
            authService
                .isCallback()
                .then((isCallback) => {
                    if (!isCallback) {
                        authService
                            .getUser()
                            .then((user) => {
                                console.log(user);
                            })
                            .catch(() => {
                                console.log("Failed")
                            });
                    }
                })
                .catch((error) => {
                    console.log(error);
                });
        });
```

src\client\views\configure.pug
```pug
extends layout.pug
block content
  div(class="font-semibold font-title") Azure AD SSO Sample Tab
  p
    div
      label(for="tabChoice")
      | Click Save below to set up the tab
  script(src="/scripts/config.js")
```

src\client\views\layout.pug
```pug
doctype html
html(lang="en")
  head
    title Microsoft Teams Tab SSO Sample App
    link(rel="stylesheet", type="text/css", href="/styles/msteams-16.css")
    link(rel="stylesheet", type="text/css", href="/styles/custom.css")
    link(rel="stylesheet", type="text/css", href="/styles/button.css")
    script(src="https://res.cdn.office.net/teams-js/2.34.0/js/MicrosoftTeams.min.js"
          integrity="sha384-brW9AazbKR2dYw2DucGgWCCcmrm2oBFV4HQidyuyZRI/TnAkmOOnTARSTdps3Hwt"
          crossorigin="anonymous")
    script(src="https://code.jquery.com/jquery-3.1.1.js")
    block scripts
  body(class="theme-light")
    div(class="surface")
      div(class="panel")
        block content
```

src\client\views\ssoDemo.pug
```pug
extends layout.pug
block content
  script(src="/scripts/ssoDemo.js")
  script(
  src="https://res.cdn.office.net/teams-js/2.34.0/js/MicrosoftTeams.min.js"
  integrity="sha384-brW9AazbKR2dYw2DucGgWCCcmrm2oBFV4HQidyuyZRI/TnAkmOOnTARSTdps3Hwt"
  crossorigin="anonymous")
  script(type="text/javascript" src="https://alcdn.msauth.net/browser/2.24.0/js/msal-browser.min.js")
  script(src="/scripts/msal-auth.js")
  script(src="/scripts/msalDemo.js")
  script.
   $(document).ready(function () {
   const url = new URL(window.location);
        const params = new URLSearchParams(url.search);
        if (params.get("inTeams")) {
            ssoAuth();
          } else {
           const authService = new MsalAuthService("#{clientId}", "#{applicationIdUri}");
            msalAuth(authService);
          }
          });
  div(class="font-semibold font-title") Azure AD SSO Tab Demo
    button(class="taskmodule-button" onclick="openTaskModule()") TaskModule  
  div(id="browser-signin-text") Try signing in from browser - 
    a(href="/ssodemo" target="_blank") Click here
  div(id="logs" style="overflow-x: hidden; overflow-y: scroll;")
  div(id="browser-signin-container" hidden="true")
    div(id="browser-login")
      h2() Please click on Login button to see your profile details!
      button(class="browser-button" onclick="loginUser()") Login
    div(id="divGraphProfile" style="display:none;")
```

src\server\tabs.js
```js
'use strict';
const fetch = require("node-fetch");
var config = require('config');
const msal = require('@azure/msal-node');
module.exports.setup = function (app) {
  var express = require('express')
  const msalClient = new msal.ConfidentialClientApplication({
    auth: {
      clientId: config.get("tab.appId"),
      clientSecret: config.get("tab.clientSecret")
    }
  });
  app.use(express.json());
  app.get('/configure', function (req, res) {
    res.render('configure');
  });
  app.get('/ssoDemo', function (req, res) {
    var clientId = config.get("tab.appId");
    var applicationIdUri = config.get("tab.applicationIdUri");
    res.render('ssoDemo', { clientId: clientId, applicationIdUri: applicationIdUri });
  });
  app.get('/auth-start', function (req, res) {
    var clientId = config.get("tab.appId");
    res.render('auth-start', { clientId: clientId });
  });
  app.get('/auth-end', function (req, res) {
    var clientId = config.get("tab.appId");
    res.render('auth-end', { clientId: clientId });
  });
  app.get('/Home/BrowserRedirect', function (req, res) {
    var clientId = config.get("tab.appId");
    var applicationIdUri = config.get("tab.applicationIdUri");
    res.render('browser-redirect', { clientId: clientId, applicationIdUri: applicationIdUri });
  });
  app.post('/getProfileOnBehalfOf', function (req, res) {
    var tid = req.body.tid;
    var token = req.body.token;
    var scopes = ["https://graph.microsoft.com/User.Read"];
    var oboPromise = new Promise((resolve, reject) => {
      msalClient.acquireTokenOnBehalfOf({
        authority: `https://login.microsoftonline.com/${tid}`,
        oboAssertion: token,
        scopes: scopes,
        skipCache: false
      }).then(result => {
            fetch("https://graph.microsoft.com/v1.0/me/",
              {
                method: 'GET',
                headers: {
                  "accept": "application/json",
                  "authorization": "bearer " + result.accessToken
                },
                mode: 'cors',
                cache: 'default'
              })
              .then((response) => {
                if (response.ok) {
                  return response.json();
                } else {
                  throw (`Error ${response.status}: ${response.statusText}`);
                }
              })
              .then((profile) => {
                resolve(profile);
              })
      }).catch(error => {
        reject({ "error": error.errorCode });
      });
    });
    oboPromise.then(function (result) {
      res.json(result);
    }, function (err) {
      console.log(err); 
      res.json(err);
    });
  });
};
```
</files>