# guide for setting up an Azure Static Web App with a React frontend and an Azure SQL Database backend using the database connections feature, focusing on the Azure Portal and Visual Studio Code.

This approach allows your React application to communicate directly with your database through a secure, managed `/data-api` endpoint, eliminating the need for a separate backend function app for basic CRUD operations[1].

### Step 1: Configure Your Azure SQL Database
Before connecting your app, you must configure your database's network settings to allow access from your local machine (for development) and from Azure services (for the deployed app)[2].

1.  Navigate to your Azure SQL Server resource in the **Azure Portal**.
2.  Under the **Security** section, select **Networking**.
3.  On the **Public access** tab, select **Selected networks** to enable firewall rules[2].
4.  Under **Firewall rules**, click **Add your client IPv4 address**. This allows you to connect from your local development environment[3].
5.  Under **Exceptions**, check the box for **Allow Azure services and resources to access this server**. This is crucial for your deployed Static Web App to reach the database[2].
6.  Click **Save**.

### Step 2: Set Up Your Local Development Environment in VS Code
You will use the Static Web Apps (SWA) CLI to initialize the database connection configuration locally. This setup emulates the cloud environment, allowing you to develop against your Azure SQL database[1].

1.  **Install the SWA CLI**: If you haven't already, install or update the SWA CLI globally using npm[4].
    ```bash
    npm install -g @azure/static-web-apps-cli
    ```
2.  **Initialize the Database Connection**: In your project's root directory in the VS Code terminal, run the `swa db init` command. This creates the necessary configuration file[2].
    ```bash
    swa db init --database-type mssql
    ```
    This command generates a folder named `swa-db-connections` containing a `staticwebapp.database.config.json` file[5].
3.  **Configure the `staticwebapp.database.config.json` File**: This file defines how your app interacts with the database. Open it and configure it to map your database tables to API endpoints.

    *   **`data-source`**: This section specifies the database type and the connection string. For security, it's best practice to reference the connection string from an environment variable (`@env('DATABASE_CONNECTION_STRING')`)[2].
    *   **`entities`**: Here, you define each table (or "entity") you want to expose. You map an entity name (e.g., `Todo`) to a database source table (e.g., `dbo.todos`) and define permissions for who can perform actions (`create`, `read`, `update`, `delete`)[2].

    Below is a sample configuration:
    ```json
    {
      "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
      "data-source": {
        "database-type": "mssql",
        "connection-string": "@env('DATABASE_CONNECTION_STRING')",
        "options": {
          "set-session-context": true
        }
      },
      "runtime": {
        "rest": {
          "enabled": true,
          "path": "/api/data"
        },
        "graphql": {
          "enabled": false
        },
        "host": {
          "mode": "development",
          "authentication": {
            "provider": "StaticWebApps"
          }
        }
      },
      "entities": {
        "Todo": {
          "source": "dbo.todos",
          "permissions": [
            {
              "role": "anonymous",
              "actions": ["*"]
            },
            {
              "role": "authenticated",
              "actions": ["*"]
            }
          ]
        }
      }
    }
    ```
4.  **Set Your Connection String Locally**: To run your app locally, create a `.env` file in your project root and add your database connection string. The SWA CLI will automatically load this.
    ```
    DATABASE_CONNECTION_STRING="your_azure_sql_connection_string"
    ```
5.  **Run the App Locally**: Use the SWA CLI to start the local development server, which will emulate the Static Web Apps service, including the database connection.
    ```bash
    swa start
    ```

### Step 3: Create and Deploy the Static Web App
With your local configuration complete, you can create the Static Web App resource in Azure and set up CI/CD with GitHub Actions.

1.  **Create Static Web App in Azure Portal**:
    *   In the Azure Portal, search for and select **Static Web Apps**, then click **Create**[6].
    *   Select your subscription and resource group.
    *   Enter a name for your app and choose a region.
    *   For the deployment source, select **GitHub** and sign in to authorize Azure to access your repositories[6].
    *   Select your organization, the repository for your React app, and the branch to deploy from.
2.  **Configure Build Details**: In the **Build Details** section, configure the settings for your React project[6].
    *   **Build Presets**: Select **React**.
    *   **App location**: Enter the path to your React app code (e.g., `/app`).
    *   **Api location**: Leave this field **blank**, since you are using the database connection feature instead of a separate Functions app.
    *   **Output location**: Enter the build output directory for your Vite project (usually `dist`).
3.  **Review and Create**: Click **Review + create**. Azure will create the Static Web App and commit a GitHub Actions workflow file to your repository. This action will trigger the first build and deployment. Any subsequent push to your selected branch will automatically redeploy the app.

### Step 4: Link the Database in the Azure Portal
The final step is to link your deployed Static Web App to your Azure SQL Database. This establishes the connection for the production environment[3].

1.  Once your Static Web App has been deployed, navigate to its resource page in the **Azure Portal**.
2.  In the settings menu on the left, select **Database connection**[2].
3.  Under the *Production* section, select the **Link existing database** link[3].
4.  In the window that appears, select your **Database Type** (Azure SQL), **Subscription**, **Resource Name** (your SQL server), and the specific **Database Name**[3].
5.  Choose your preferred **Authentication Type**.
6.  Click **Link**.

Your React app is now fully configured to perform CRUD operations against your Azure SQL database through the `/data-api` endpoint. You can make `fetch` requests from your React components to this endpoint (e.g., `fetch('/data-api/rest/Todo')`) to interact with your data.