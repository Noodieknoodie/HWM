# Project: HWM 401k Tracker

## Project Overview
Microsoft Teams app for 401k plan management with Azure backend, tracking AUM, payments, and contracts.

## Tech Stack
- **Framework:** React 19 + TypeScript 5.3 + Vite
- **State:** Zustand 5
- **Styling:** Tailwind CSS + Radix UI  
- **Backend:** Azure Static Web Apps + Data API
- **Database:** Azure SQL (via Data API)
- **Testing:** Vitest + Testing Library

## 🚨 CRITICAL WORKFLOW - YOU MUST FOLLOW THIS 🚨
For EVERY code change:
1. Implement the change
2. **Type Check:** Run `npm run type-check` and fix ALL issues
3. **Test:** Run `npm test` for affected code  
4. **Manual Test:** Run `npm run dev` and verify functionality
5. **Self-review** against standards below

## Key Commands
```bash
npm run dev          # Start dev server with SWA CLI (port 4280)
npm run build        # TypeScript check + production build
npm run type-check   # TypeScript validation only
npm test             # Run Vitest tests
npm run test:db      # Run database tests
```

## Project Structure
```
src/
├── api/            # API client configuration
├── components/     # UI components (Radix + custom)
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── stores/         # Zustand stores
└── utils/          # Utilities and formatters
tests/              # SQL and frontend tests
swa-db-connections/ # Database config
teams-manifest/     # Teams app config
```

## Coding Standards
- Use 2-space indentation
- Prefer `const` over `let`
- Destructure imports: `import { foo } from 'bar'`
- NO unused variables (TypeScript will catch)
- Components use PascalCase, utils use camelCase
- Dates: Use date-fns, NOT native Date methods
- Numbers: Use formatters.ts for all display values
- Comments explain "why" not "what"

## Database/API Guidelines
- Database operations go through Data API only
- Check actual DB schema with MCP tools before queries
- Cache API responses using utils/cache.ts
- NEVER modify Azure config files directly

## Testing Requirements
- Every new feature needs tests
- Follow existing test patterns in same directory
- Run tests before marking task complete
- Manual testing required for UI changes

## Git Workflow
- NEVER commit unless explicitly asked
- NEVER push to main directly
- Run type-check before ANY commit
- Commit format: `type(scope): message`

## Problem-Solving Approach

### 1. Understand Before Acting
- Read relevant code first
- Check database schema if needed
- Test assumptions with real data
- Look for existing patterns

### 2. Prefer Simple Solutions
- KISS - every line adds debt
- Reuse existing utilities
- Follow established patterns
- Avoid over-engineering

### 3. Verify Everything
- Run type checks
- Test the actual functionality
- Check for side effects
- Review against requirements

## Common Pitfalls to Avoid
- **DON'T** assume library availability - check package.json
- **DON'T** create new patterns when existing ones work
- **DON'T** trust filenames - read actual implementations
- **DON'T** add features not explicitly requested
- **DON'T** create documentation files unless asked

## Working with This Codebase
This is an AI-generated codebase, which means:
- May have duplicated logic across files
- Comments might not reflect actual behavior
- Some patterns may be inconsistent
- Always verify with actual code

When you spot issues:
- Point them out directly with evidence
- Suggest simpler alternatives
- Fix root causes, not symptoms
- Clean up as you go (with permission)

## Important Files / Folders
- `docs/ - build docs and logic 
- `tests/FRONTEND_TEST_LOG.md` - Test documentation
- `src/utils/formatters.ts` - Number/date formatting
- `src/utils/cache.ts` - API response caching

## The Canary Check
**IMPORTANT:** Begin responses with ⚡️ to confirm you've read this file.

## 🛑 DO NOT TOUCH 🛑
- `package-lock.json` directly
- `.github/workflows/`
- `swa-db-connections/staticwebapp.database.config.json`
- Any Azure config files without explicit permission

---

*Note: User (Erik) orchestrates AI builders but isn't a developer. Explain issues clearly, focus on WHY things break rather than HOW code works.*