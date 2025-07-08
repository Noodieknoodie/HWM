# HWM 401k Payment Tracker

A Microsoft Teams application for Hohimer Wealth Management to track 401k client fee payments, monitor compliance status, and manage payment schedules.

## Architecture

- **Frontend**: React 19.1 with Vite, TypeScript, Tailwind CSS
- **Database**: Azure SQL Database with automatic REST API via Azure Static Web Apps database connections
- **Authentication**: Azure Static Web Apps built-in auth (seamless Teams SSO)
- **Deployment**: Azure Static Web Apps with integrated database connections

## Project Structure

```
/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks for data fetching
│   │   ├── auth/         # Azure Static Web Apps auth integration
│   │   └── api/          # Data API client for Azure database connections
│   └── vite.config.ts
├── swa-db-connections/    # Azure database connection configuration
│   └── staticwebapp.database.config.json
├── teams-manifest/        # Microsoft Teams app manifest
└── staticwebapp.config.json  # Azure Static Web Apps configuration
```

## Getting Started

### Prerequisites

- Node.js 20+
- Azure SQL Database access
- Azure subscription for Static Web Apps
- Microsoft Teams admin access

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Noodieknoodie/HWM.git
   cd HWM
   ```

2. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install
   cd ..
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Add your database connection string to `.env`:
   ```
   DATABASE_CONNECTION_STRING="Server=tcp:your-server.database.windows.net,1433;Initial Catalog=your-database;..."
   ```

5. Start the development server:
   ```bash
   npm start
   ```

   This runs the Static Web Apps CLI which emulates Azure's environment locally, including database connections.

## Azure Deployment

1. Create an Azure Static Web App in the Azure Portal
2. Connect it to your GitHub repository
3. Configure the database connection in the Azure Portal under "Database connection"
4. Add the following application settings:
   - `AAD_CLIENT_ID`: Your Azure AD app registration client ID
   - `AAD_CLIENT_SECRET`: Your Azure AD app registration client secret

The GitHub Actions workflow will automatically deploy on push to main.

## Teams App Setup

1. Update `teams-manifest/manifest.json` with:
   - Your Azure Static Web App URL
   - Your Azure AD app registration ID
   
2. Zip the contents of the `teams-manifest` folder

3. Upload to Teams Admin Center or sideload for testing

## Database Schema

The app uses an existing Azure SQL Database with optimized views:

- `clients_by_provider_view` - Client list with compliance status
- `client_payment_status` - Current payment status for each client
- `client_metrics_view` - YTD totals and latest payment info
- `payment_variance_view` - Payment history with variance calculations
- `available_payment_periods` - Unpaid periods for dropdown selection
- `client_fee_reference` - Fee calculations at different frequencies

## Key Features

- **Client Dashboard**: Real-time payment status and compliance tracking
- **Payment Recording**: Record payments with automatic fee calculations
- **Payment History**: View, edit, and delete payment records
- **Provider Grouping**: Organize clients by their 401k provider
- **Compliance Status**: Visual indicators (green/yellow) for payment status
- **Period Management**: Automatic period detection and assignment

## Development Notes

- All data fetching uses Azure's `/data-api/rest/` endpoints
- Authentication is handled automatically by Azure Static Web Apps
- SQL views handle all business logic - the frontend just displays data
- No manual data transformations or calculations in JavaScript
- Uses React hooks for clean state management

## Troubleshooting

### Local Development Issues

- Ensure you're using the SWA CLI (`npm start`), not `npm run dev`
- Check that your connection string in `.env` is properly formatted
- Verify your database firewall allows your local IP

### Azure Deployment Issues

- Confirm database connection is configured in Azure Portal
- Check that all required app settings are configured
- Verify the GitHub Actions workflow has the correct API token

## License

ISC