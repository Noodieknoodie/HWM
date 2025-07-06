# HWM 401k Payment Tracker

A Microsoft Teams application for Hohimer Wealth Management to track 401k client fee payments, monitor compliance status, and manage payment schedules.

## Architecture

- **Frontend**: React 19.1 with Vite, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python 3.12) with Azure SQL Database
- **Authentication**: Azure Static Web Apps built-in auth (seamless Teams SSO)
- **Deployment**: 
  - Frontend: Azure Static Web Apps
  - Backend: Azure App Service
  - Database: Azure SQL Database (existing)

## Project Structure

```
/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── auth/         # Simple auth hook for Static Web Apps
│   │   └── api/          # API client code
│   └── vite.config.ts
├── backend/               # FastAPI backend application
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── models.py     # Pydantic models
│   │   ├── database.py   # Database connection
│   │   └── main.py       # FastAPI app
│   └── requirements.txt
└── teams-manifest/        # Microsoft Teams app manifest
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- Azure SQL Database access
- Azure Static Web App configured with authentication

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create `.env` file from `.env.example` and configure:
   ```
   AZURE_SQL_CONNECTION_STRING=your-connection-string
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

### Teams App Setup

1. Update `teams-manifest/manifest.json` with your app IDs and URLs
2. Add icon files (color.png and outline.png)
3. Zip the manifest folder contents
4. Upload to Teams Admin Center

## Database

The application connects to an existing Azure SQL Database with the following key features:

- Proper DATE columns (no string date manipulation)
- Optimized views for common queries:
  - `client_payment_status`: Current payment status
  - `clients_by_provider_view`: Clients with provider grouping
  - `payment_variance_view`: Payment variance calculations
- Pre-populated `payment_periods` table (2015-2030)
- Automated triggers for metrics updates

## Key Features

- **Client Management**: Track clients with payment status indicators
- **Payment Recording**: Record payments with single period assignment
- **Compliance Tracking**: Binary status (Paid/Due) for current period
- **Dashboard Views**: Comprehensive client payment information
- **Payment History**: View and manage historical payments

## Development Principles

- **Minimalist**: Simple, maintainable code without unnecessary abstractions
- **Performance**: Leverage database views and indexes
- **Security**: Azure Static Web Apps authentication (automatic Teams SSO), no hardcoded secrets
- **Clarity**: Self-documenting code for AI-assisted maintenance

## Sprint Progress

- [x] Sprint 1: Foundation & Project Setup
- [x] Sprint 2: Core API Endpoints - Clients & Contracts
- [x] Sprint 3: Payment Management & Smart Periods
- [x] Sprint 4: Dashboard & Payment Status
- [x] Sprint 5: Authentication & Teams Integration
- [x] Sprint 6: Frontend Foundation & Routing
- [x] Sprint 7: Client Management UI
- [x] Sprint 8: Dashboard Cards Implementation
- [x] Sprint 9: Payment Form & History
- [x] Sprint 10: Final Integration & Cleanup

## Deployment

### Backend Deployment (Azure App Service)

1. Build the application:
   ```bash
   cd backend
   pip freeze > requirements.txt
   ```

2. Deploy to Azure App Service:
   - Configure App Service with Python 3.12 runtime
   - Set environment variables in Configuration:
     - `AZURE_SQL_CONNECTION_STRING`
     - `CORS_ORIGINS` (include your frontend URL)
   - Enable system-assigned managed identity for database auth
   - Deploy code via ZIP deploy or Git integration

### Frontend Deployment (Azure Static Web Apps)

1. Build the application:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy to Azure Static Web Apps:
   - Create Static Web App resource
   - Set build configuration:
     - App location: `/frontend`
     - Output location: `dist`
   - Configure environment variables:
     - `AAD_CLIENT_ID` = your Azure AD app client ID
     - `AAD_CLIENT_SECRET` = your Azure AD app client secret
   - Authentication is handled automatically by the platform
   - Deploy via GitHub Actions or Azure CLI

### Teams App Deployment

1. Update manifest with production URLs:
   - Set `contentUrl` to your frontend URL
   - Update `validDomains` with frontend and API domains
   - Generate unique app ID if needed

2. Package the manifest:
   ```bash
   cd teams-manifest
   zip -r app.zip manifest.json color.png outline.png
   ```

3. Deploy to Teams:
   - Upload to Teams Admin Center
   - Publish to your organization's app catalog
   - Grant necessary permissions

## Notes

- Document viewer functionality is UI-only (placeholder for future implementation)
- No file upload/download capabilities in current version
- Database structure is fixed - do not modify schemas or views