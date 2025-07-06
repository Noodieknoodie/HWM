# Local Development Setup

## Quick Start

### Backend
```bash
cd backend
# Make sure .env has ENVIRONMENT=development
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## How Authentication Works

### Local Development
- Backend: Automatically returns a mock user (no login required)
- Frontend: Also mocks a user automatically
- No authentication popups or Microsoft login needed

### Production (Azure Static Web Apps)
- Platform handles all authentication
- Users are automatically authenticated via Teams/Microsoft SSO
- No tokens to manage

## Important Notes

1. **Database Connection**: The backend connects to the real Azure SQL Database even in development mode. Make sure your IP is whitelisted in Azure if needed.

2. **CORS**: Already configured to allow requests from localhost:5173 to localhost:8000

3. **Environment Variables**:
   - Backend: Set `ENVIRONMENT=development` in `.env`
   - Frontend: Vite automatically detects development mode

## Troubleshooting

### "403 Forbidden" errors
- Make sure backend `.env` has `ENVIRONMENT=development`
- Restart the backend after changing environment variables

### Authentication popups in development
- These shouldn't appear if everything is configured correctly
- Check that both frontend and backend are in development mode

### Database connection issues
- Verify your Azure SQL connection string in backend `.env`
- Check if your IP needs to be whitelisted in Azure Portal

## Deployment

When deploying to Azure Static Web Apps:
1. Remove `ENVIRONMENT=development` from backend (or set to `production`)
2. The platform will handle all authentication automatically
3. No code changes needed - it just works!