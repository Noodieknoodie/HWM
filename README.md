# HWM 401k Payment Tracker

A Microsoft Teams application for Hohimer Wealth Management to track 401k client fee payments, monitor compliance status, and manage payment schedules.

## Architecture

- **Frontend**: React 19.1 with Vite, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python 3.12) with Azure SQL Database
- **Authentication**: Azure AD via Teams SSO
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
│   │   ├── auth/         # Authentication logic
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
- Azure AD app registration

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
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-client-id
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
- **Security**: Azure AD authentication, no hardcoded secrets
- **Clarity**: Self-documenting code for AI-assisted maintenance

## Sprint Progress

- [x] Sprint 1: Foundation & Project Setup
- [ ] Sprint 2: Core API Endpoints - Clients & Contracts
- [ ] Sprint 3: Payment Management & Smart Periods
- [ ] Sprint 4: Dashboard & Payment Status
- [ ] Sprint 5: Authentication & Teams Integration
- [ ] Sprint 6: Frontend Foundation & Routing
- [ ] Sprint 7: Client Management UI
- [ ] Sprint 8: Dashboard Cards Implementation
- [ ] Sprint 9: Payment Form & History
- [ ] Sprint 10: Final Integration & Cleanup

## Notes

- Document viewer functionality is UI-only (placeholder for future implementation)
- No file upload/download capabilities in current version
- Database structure is fixed - do not modify schemas or views