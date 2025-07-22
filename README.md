This is an app that is a 401k payment manager app, it's built with React and TypeScript using Vite as the build tool. The database is Azure SQL Database and uses Azure       
  Static Web Apps' Data API Builder that allows for automatic REST API generation from database tables and views without writing backend code. The app itself will be
  hosted on a Teams Tab app for personal use. It uses Azure Portal resources such as Azure Active Directory for authentication, Azure Static Web Apps for hosting, and
  Azure SQL Database for data storage.

  The application serves as an internal tool for Hohimer Wealth Management to track and manage 401k client fee payments, monitor compliance status, and generate quarterly     
   reports. The frontend is a modern single-page application with a responsive UI built using Tailwind CSS and shadcn/ui components. The architecture leverages Azure's        
  serverless capabilities, meaning there's no traditional backend server - instead, the Data API Builder automatically exposes database operations as secure REST
  endpoints based on configuration files.

  The Teams integration allows the wealth management team to access the payment tracking system directly within their Microsoft Teams workspace, providing a seamless
  experience without needing to switch between different applications. The entire solution is secured through single sign-on, ensuring that only authorized team      
  members can access sensitive client payment information. The app supports features like payment history tracking, quarterly summary reports, client management, and
  export functionality for compliance reporting.

 THIS app is an internal 401k payment tracking tool for Hohimer Wealth Management, built as a React SPA hosted on Azure Static Web Apps with Data API Builder automatically exposing your Azure SQL database as REST endpoints, deployed as a Teams personal tab where your employees can click the app and immediately access client payment data without any login prompts because you'll pre-grant admin consent for the entire organization using your company's single Azure AD tenant - essentially the standard internal Teams app setup where authentication is invisible to users and "just works" after the one-time admin configuration.


  Application Structure Overview

  The app follows a standard React/TypeScript project structure with some Azure-specific configurations:

  /
  ├── src/                        # Main application code
  │   ├── api/                    # API client for data operations
  │   ├── auth/                   # Authentication logic
  │   ├── components/             # Reusable UI components
  │   ├── pages/                  # Main app pages (Summary, Payments, Export)
  │   ├── types/                  # TypeScript type definitions
  │   └── utils/                  # Helper functions and utilities
  │
  ├── swa-db-connections/         # Data API Builder configuration
  │   └── staticwebapp.database.config.json
  │
  ├── teams-manifest/             # Microsoft Teams app package
  │   ├── manifest.json           # Teams app configuration
  │   └── icons/                  # App icons for Teams
  │
  ├── public/                     # Static assets
  ├── docs/                       # Documentation files
  │
  ├── staticwebapp.config.json    # Azure Static Web Apps configuration
  ├── swa-cli.config.json        # Local development configuration
  ├── package.json               # Node.js dependencies
  ├── vite.config.ts             # Build tool configuration
  └── tailwind.config.js         # CSS framework configuration

  How It Works

  The app operates as a single-page application where users navigate between different views:

  - Summary Page: Displays quarterly and annual payment summaries aggregated by provider
  - Payments Page: Manages individual client payments with full CRUD operations
  - Export Page: Generates reports with filtering options for compliance needs

  The frontend communicates with the database through Azure's Data API Builder, which automatically creates REST endpoints based on the SQL tables and views defined in        
  staticwebapp.database.config.json. This eliminates the need for writing API code - you simply configure which database objects to expose and what permissions to apply.      

  Key Configuration Files

  - staticwebapp.config.json: Defines routing rules, authentication requirements, and security headers for the Azure Static Web App
  - swa-db-connections/staticwebapp.database.config.json: Maps database tables/views to REST endpoints with role-based permissions
  - teams-manifest/manifest.json: Configures how the app appears and behaves within Microsoft Teams
  - .github/workflows/: Contains automated deployment pipeline to Azure

  The authentication flow is handled entirely by Azure Static Web Apps' built-in auth system, which integrates with Azure AD for both browser and Teams access. The app        
  uses a smart caching layer to minimize database calls and improve performance, especially important for summary pages that aggregate large amounts of data.
                                                                                                                                                                  

