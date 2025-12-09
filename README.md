# HWM 401k Payment Tracker

# LAUNCH
 s
Terminal 1:
npx vite --host

Terminal 2 (after vite starts):
swa start http://localhost:5173 --data-api-location swa-db-connections --port 4280

> 🤖 **AI Coder Navigation Guide**: This README is optimized for AI agents to quickly understand and modify the codebase without extensive grepping. Start here for all context.

## 🎯 Quick Context for AI Coders

**What this is**: Internal React SPA for tracking 401k payments, built with TypeScript, hosted on Azure Static Web Apps with Data API Builder (no backend code - just SQL views/tables exposed as REST).

**Key insight**: This is 100% AI-implemented. Expect AI patterns: some duplicate logic, overly verbose comments, and occasional orphaned code. When modifying, favor simplicity over complexity.

**Current state**: 
- ✅ Active pages: Summary, Payments, Export
- ❌ Disabled pages: Contacts, Contracts, Documents (commented out in App.tsx)
- 🔄 Teams integration: Redirects to browser (not true Teams tab experience)

## 🗺️ Navigation Map - Where Everything Lives

### Core Application Files
```typescript
src/App.tsx                 // Main app, routing, auth check, Teams redirect logic
src/main.tsx               // React entry point  
src/index.css              // Global styles (Tailwind directives)
```

### Feature Pages (User-Facing Views)
```typescript
src/pages/Summary.tsx       // Quarterly/annual summaries - MAIN DASHBOARD
  // - Uses: QuarterlyPageData & AnnualPageData interfaces
  // - Key state: viewMode (quarterly/annual), expandedClients Set
  // - API calls: getQuarterlyPageData(), getAnnualPageData()

src/pages/Payments.tsx      // Individual payment management (CRUD)
  // - Key state: selectedClient, selectedYear, editingPayment
  // - API calls: getPayments(), createPayment(), updatePayment(), deletePayment()

src/pages/Export.tsx        // Report generation and data export
  // - Export formats: CSV, Excel
  // - Uses comprehensive_payment_summary view
```

### API Layer - ALL Data Operations Here
```typescript
src/api/client.ts           // THE SINGLE SOURCE OF TRUTH for API calls
  // Class: DataApiClient - singleton pattern
  // Key methods:
  //   - getClients() - cached for performance
  //   - getQuarterlyPageData(year, quarter) - main summary data
  //   - getPayments(filters) - payment records
  //   - updatePayment(id, data) - CRUD operations
  // Error handling: AzureApiError class with retry logic
  // Base URL: /data-api/rest/{entity}
```

### Authentication
```typescript
src/auth/useAuth.ts         // Production auth hook (Azure AD via SWA)
  // - Dev bypass: localhost returns mock user
  // - Prod: Uses /.auth/me endpoint
  // - Key: isAuthenticated, user, logout()

src/teamsAuth.ts           // Teams detection and token handling
  // - isInTeams() - detects Teams context
  // - Redirects to browser when in Teams
```

### State Management
```typescript
src/stores/useAppStore.ts   // Zustand global state
  // - selectedClient: Client | null
  // - documentViewerOpen: boolean (unused currently)
```

### Utilities
```typescript
src/utils/cache.ts          // In-memory caching (5 min TTL default)
  // - apiCache singleton
  // - cacheKeys builders for consistent keys

src/utils/formatters.ts     // Number/currency formatting
  // - formatCurrency() - handles nulls
  // - formatPercentage() - with decimals

src/utils/periodFormatting.ts // Quarter/period display
  // - getQuarterFromPeriod()
  // - formatPeriodDisplay() 

src/utils/exportUtils.ts    // CSV/Excel export functions
```

### Component Structure
```typescript
src/components/
├── ui/                    // Radix UI + Tailwind components (Button, Select, etc.)
├── PageLayout.tsx         // Main layout wrapper (Header + Sidebar + content)
├── Header.tsx            // Top navigation bar
├── Sidebar.tsx           // Left navigation with client list
├── ErrorBoundary.tsx     // Global error handling
└── [feature]/            // Feature-specific components
```

## 🔄 Data Flow Architecture

```
User Action → React Component → DataApiClient → Data API Builder → SQL View/Table
                                      ↓
                                  apiCache (5 min TTL)
```

### Key Data Entities (from staticwebapp.database.config.json)

```json
{
  "comprehensive_payment_summary": "Main view for all payment data (read-only)",
  "clients": "Client master data (read/write)", 
  "payments": "Individual payment records (full CRUD)",
  "quarterly_summary_cache": "Pre-aggregated summary data (performance)",
  "quarterly_notes": "Provider-level notes per quarter",
  "client_quarter_markers": "Completion tracking"
}
```

## 📊 Database Schema Quick Reference

### Core Tables
- **clients_all**: Master client list with provider relationships
- **payments**: Individual payment transactions  
- **payment_periods**: Defines quarters (period_id 76 = Q3 2024, etc.)
- **quarterly_summary_cache**: Pre-calculated summaries for performance

### Key Views (Pre-Aggregated Data)
- **quarterly_page_data**: Everything needed for Summary page quarterly view
- **annual_page_data**: Everything needed for Summary page annual view
- **comprehensive_payment_summary**: Export/reporting data source

## 🛠️ Common Modification Scenarios

### Adding a New Field to Summary Page
1. Check if field exists in `quarterly_page_data` view (src/schema_reference.sql:908)
2. If not, modify the SQL view (coordinate with DBA)
3. Update interface in `src/pages/Summary.tsx` (~line 20)
4. Add field to component display logic

### Adding New API Endpoint
1. Add entity to `staticwebapp.database.config.json`
2. Add method to `DataApiClient` class in `src/api/client.ts`
3. Follow existing patterns (error handling, caching)
4. Use `apiCache.set()` for frequently accessed data

### Modifying Payment Logic
1. Payment CRUD is in `src/pages/Payments.tsx`
2. API calls through `dataApiClient.updatePayment()`
3. Check `payment_form_defaults_view` for business rules
4. Test with 2024 data (2025 data is incomplete)

### Adding New Page/Route
1. Create component in `src/pages/`
2. Add lazy import in `src/App.tsx` (~line 10)
3. Add Route in `src/App.tsx` (~line 100)
4. Add navigation in `src/components/Sidebar.tsx`

### Styling Changes
1. Use Tailwind classes (no custom CSS)
2. UI components in `src/components/ui/`
3. Follow existing patterns (gray-50 backgrounds, blue-600 accents)
4. Check `tailwind.config.js` for customizations

## 🔍 Debugging Tips

### Check These First
1. **Auth issues**: `localStorage.debug = 'true'` for verbose logging
2. **API failures**: Network tab - check for 401/403 (auth) or 500 (SQL)
3. **Empty data**: Use 2024 data - 2025 is incomplete
4. **Cache issues**: `apiCache.clear()` in console

### Key Console Commands
```javascript
// Clear all cache
apiCache.clear()

// Check cache stats
apiCache.getStats()

// Force reload clients
await dataApiClient.getClients()

// Check auth status
const auth = useAuth()
console.log(auth.user)
```

## 🚀 Local Development

```bash
# Install and run (includes API emulation)
npm install
npm run dev  # Opens at http://localhost:4280

# Just the React dev server
npm run dev:vite  # http://localhost:5173

# Type checking
npm run type-check
```

## 📝 Code Patterns & Conventions

### API Calls
```typescript
// Always use try/catch with loading states
const [loading, setLoading] = useState(false);
try {
  setLoading(true);
  const data = await dataApiClient.getClients();
  // handle data
} catch (error) {
  // use getErrorMessage() utility
} finally {
  setLoading(false);
}
```

### Caching Pattern
```typescript
// Check cache first
const cached = apiCache.get<Client[]>(cacheKeys.clients());
if (cached) return cached;

// Fetch and cache
const data = await fetch(...);
apiCache.set(cacheKeys.clients(), data);
```

### Component Pattern
```typescript
// Pages handle data fetching
// Components are presentational
// Use hooks for shared logic
```

## ⚠️ Known Gotchas

1. **Teams Tab**: Currently just redirects to browser - not a true Teams experience
2. **Year Selection**: Hardcoded in some places - search for "2024" when updating
3. **Period IDs**: Not sequential - Q3 2024 = 76, Q4 2024 = 77, etc.
4. **Null Handling**: Many number fields can be null - always use formatters
5. **Provider Names**: Can be null/empty - affects grouping logic

## 🔮 Future Considerations

- Contacts/Contracts/Documents features are built but disabled
- Teams integration could be improved for native tab experience  
- Consider moving from in-memory cache to React Query
- SQL views could be optimized further for large datasets

---

**Remember**: This codebase is 100% AI-generated. When in doubt, favor simple solutions over clever ones. The user (non-technical) values functionality over elegance.