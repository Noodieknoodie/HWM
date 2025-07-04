# HWM 401k Payment Tracker - Sprint Plan

## File Hierarchy
```
/HWM/
├── frontend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── TeamsAuthProvider.tsx
│   │   │   └── useAuth.ts
│   │   ├── components/
│   │   │   ├── ClientSidebar.tsx
│   │   │   ├── PaymentDashboard.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── PaymentHistory.tsx
│   │   │   └── DocumentViewer.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── clients.py
│   │   │   ├── payments.py
│   │   │   └── auth.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   ├── database.py
│   │   ├── config.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── teams-manifest/
│   └── manifest.json
├── CLAUDE.md
├── CLAUDE_JOURNAL.md
├── CLAUDE_LESSONS_LEARNED.md
├── README.md
└── SPRINTS.md
```

## Sprint Plan

### Sprint 1: Foundation & Authentication
Set up the basic project structure with Teams authentication working end-to-end. Configure the frontend with Vite, TypeScript, and Tailwind CSS, then implement Azure AD authentication through Teams and verify token validation works on the FastAPI backend.

### Sprint 2: Database & Core Models
Connect the FastAPI backend to Azure SQL Database and create the Pydantic models matching the existing schema. Implement the core API endpoints for fetching clients and their contracts, ensuring proper data flow from database to frontend.

### Sprint 3: Client Dashboard UI
Build the client sidebar component with search and filtering, then create the main dashboard showing client details, contract information, and payment status cards. Focus on getting the UI layout right with proper Tailwind styling matching the old design.

### Sprint 4: Payment Recording
Implement the payment form for recording new payments with period selection logic enforcing arrears rules. Create the API endpoints for saving payments and calculating expected fees based on contract terms, then ensure the payment status updates correctly.

### Sprint 5: Payment History & Management
Build the payment history table with pagination, filtering by year, and edit/delete functionality. Add variance calculations showing differences between expected and actual payments, making sure all the business logic matches the simplified requirements.

### Sprint 6: Polish & Teams Integration
Create the Teams app manifest, implement proper error handling throughout the application, and add loading states for better UX. Test the entire flow from authentication through payment recording and ensure everything works smoothly within Teams.

### Sprint 7: Testing & Deployment
Write integration tests for critical payment calculation logic, set up the deployment pipeline for Azure Static Web Apps (frontend) and Azure App Service (backend). Document any deployment-specific configurations and ensure the app runs properly in the Teams environment.