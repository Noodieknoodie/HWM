# CLAUSE_LESSONS_LEARNED.md
Add to this journal VERY RARELY and usually only only after you have to apologize to the user for not understanding something, or, anytime your first insticts or assumptions turn out to be incorrect. Your knowlege cutoff date is a while back, you know. In real life it is July 2025 - sometimes your understanding of what is "current" best practices are depreciated - sometimes you learn this the hard way. If this sort of "self discovery" occurs at any time in your coding journey, THEN THAT IS WHEN YOU LOG AN ENTRY INTO THIS FILE. The purpose of this file is to ENSURE NO FUTURE AI CODING AGENTS DEFAULT BACK INTO THE SAME TRAPS (since you have the same core training information you can assume any future agents will do the same faulty thing you did)

**EXAMPLE ENTRY:** 
# DO NOT DO XYZ 
- this is depreciated
- use ABC instead!
===============================

# SWA CLI v2 Data API Path Changes | 2025-07-09
- In SWA CLI v2, frontend MUST use `/data-api/rest/*` paths, NOT `/rest/*`
- The Data API Builder itself still serves at `/rest/*` (in staticwebapp.database.config.json)
- But SWA CLI proxies these through `/data-api/rest/*` to the frontend
- ALWAYS check the DATA_API_BASE constant in frontend code when debugging 404s
- The fix is usually just changing `/rest` to `/data-api/rest` in the API client


local view
npm run build
npm start dev