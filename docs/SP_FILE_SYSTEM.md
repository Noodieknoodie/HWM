# SP_FILE_SYSTEM.md
## SharePoint Document Management Implementation Plan

---

## EXECUTIVE SUMMARY

### What We're Building
Two new features for the HWM 401k payment tracking app:

1. **Upload Wizard** - Staff uploads check PDFs, system automatically names them and saves to correct SharePoint folders
2. **Document Viewer** - View all check PDFs for any client directly in the app

### Current State
- ✅ Database tables created with client/provider mappings
- ✅ SharePoint folder structure organized (343 PDFs in year folders)
- ✅ File naming convention established
- ❌ Need to build upload interface
- ❌ Need to build document viewer

### End Result
Staff can upload checks and have them automatically filed in SharePoint with correct naming. Anyone can view historical checks for any client without leaving the app.

---

## THE VISION: What Users Will Experience

### Upload Wizard User Flow

**Scenario:** Dodd receives a check from Voya that pays for 3 clients.

1. **Dodd goes to "Add Files" tab** (new tab in top navigation)
2. **Drops the scanned PDF** into the upload area
3. **Sees a form for this file:**
   - Date picker: *Selects July 21, 2025*
   - Provider dropdown: *Selects "Voya"*
4. **System automatically shows Voya's clients:**
   - ✅ Amplero
   - ✅ Bumgardner Architects
   - ✅ Corina Bakery
   - ✅ PSWM Inc
5. **Dodd unchecks Amplero** (not on this check)
6. **Clicks "Upload"**
7. **System shows progress:**
   ```
   Uploading to dump folder... ✓
   Uploading to Bumgardner... ✓
   Uploading to Corina... ✓
   Uploading to PSWM... ✓
   Complete! File saved to 4 locations.
   ```
8. **File is saved as:** `Voya - ba, corina, pswm - rcvd 07.21.25.pdf` in:
   - `/Compliance/Correspondence/Incoming/2025/` (dump folder)
   - `/401Ks/Current Plans/ABC Architects - Bumgardner/Consulting Fee/2025/`
   - `/401Ks/Current Plans/Corina Bakery/Consulting Fee/2025/`
   - `/401Ks/Current Plans/Puget Sound Window/Consulting Fee/2025/`

### Document Viewer User Flow

**Scenario:** Erik wants to see all checks for Corina Bakery.

1. **Goes to Corina's payment page**
2. **Clicks "View Documents" button**
3. **Right sidebar opens (40% of screen)**
4. **Sees PDFs organized by year:**
   ```
   ▼ 2025 (7 files)
   [📄 Voya - all clients - rcvd 07.21.25.pdf]
   [📄 Voya - all clients - rcvd 06.15.25.pdf]
   [📄 Voya - all clients - rcvd 05.17.25.pdf]
   
   ▼ 2024 (12 files)
   [📄 Voya - all clients - rcvd 12.15.24.pdf]
   [📄 Voya - all clients - rcvd 11.17.24.pdf]
   ...
   ```
5. **Clicks a PDF thumbnail**
6. **PDF opens large in the sidebar** - can read check details
7. **Can navigate between files or close sidebar**

---

## WHY THIS MATTERS

### Current Problems
- Checks manually saved with inconsistent naming
- No way to view documents from the app
- Staff has to navigate complex SharePoint folders
- Risk of misfiling or losing documents

### What This Solves
- Automatic, consistent file naming
- Files automatically go to correct folders
- View documents without leaving the app
- Audit trail in dump folder
- No more manual filing errors

---

## TECHNICAL ARCHITECTURE

### The Authentication Challenge
**Problem:** Your app uses Azure SWA auth, but SharePoint needs Graph API tokens.
**Solution:** Azure Function using On-Behalf-Of (OBO) flow to exchange tokens.

### Data Flow
```
1. User uploads file in React app
2. App calls YOUR Azure Function (/api/getGraphToken)
3. Function exchanges SWA token for Graph token
4. App uses Graph token to upload to SharePoint
5. Files saved to multiple locations
```

### Why This Architecture?
- Security: No secrets in frontend
- Compliance: Maintains user context for audit trail
- Simplicity: Leverages existing SWA auth

---

## DATABASE FOUNDATION (ALREADY COMPLETE)

### Tables Created and Populated

**`provider_lookup`** - Maps provider variations to standard names
```
Ascensus Trust Company → Ascensus
Voya → Voya
```

**`client_metadata`** - Client info and SharePoint URLs
```
client_id: 7
short_name: corina
sharepoint_base_url: https://.../Corina%20Bakery/Consulting%20Fee
```

**`upload_wizard_clients`** - View that joins everything
```sql
-- Query this to get clients for a provider
SELECT * FROM upload_wizard_clients WHERE provider_name = 'Voya'
-- Returns: All Voya clients with their short names and SharePoint URLs
```

**`system_config`** - Global settings
```
dump_folder_base: https://.../Compliance/Correspondence/Incoming
```

---

## IMPLEMENTATION PLAN

### Phase 1: Azure Function Setup (Backend)

**Create `/api/getGraphToken.js`**
- Extracts SWA user claims
- Uses OBO flow to get Graph token
- Returns token to frontend

**Register Graph Permissions in Azure AD:**
- Files.ReadWrite.All (Delegated)
- Sites.ReadWrite.All (Delegated)

### Phase 2: Upload Wizard Component

**Create `/src/components/uploads/UploadWizard.tsx`**

Key features:
- Multi-file drag and drop
- For each file: date picker + provider dropdown
- Query `upload_wizard_clients` when provider selected
- Show client checkboxes (ALL pre-selected)
- Generate filename: `Provider - clients - rcvd MM.DD.YY.pdf`
- Upload with progress tracking
- Handle partial failures gracefully

### Phase 3: Document Viewer Component

**Create `/src/components/documents/DocumentViewer.tsx`**

Key features:
- Sidebar overlay (40% viewport)
- Query `client_metadata` for SharePoint URL
- List files grouped by year
- Use `@react-pdf-viewer/core` for in-app viewing
- Add "View Documents" button to payment pages

### Phase 4: Graph Service Layer

**Create `/src/services/graphService.ts`**

Core methods:
- `getGraphToken()` - Gets token from your Azure Function
- `uploadFile()` - Uploads to SharePoint
- `listFiles()` - Lists PDFs by year
- `downloadFile()` - Gets PDF for viewer

---

## FILE NAMING RULES

### Standard Format
```
{Provider} - {clients} - rcvd {MM.DD.YY}.pdf
```

### Examples
```
Single:  Ascensus - bdr - rcvd 07.21.25.pdf
Multi:   Voya - amplero, ba, corina, pswm - rcvd 07.21.25.pdf
Mixed:   John Hancock - airsea, bellmont, floform - rcvd 06.15.25.pdf
```

### Rules
- Client names sorted alphabetically
- Comma + space between clients
- Date as MM.DD.YY (leading zeros)
- Provider short from `provider_lookup`
- Client shorts from `client_metadata`

---

## SUCCESS CRITERIA

### Upload Wizard
- [ ] Files renamed automatically
- [ ] Saved to dump folder + all client folders
- [ ] Progress shown for each location
- [ ] Partial failures reported but don't stop other uploads

### Document Viewer  
- [ ] Shows all PDFs for client by year
- [ ] PDFs viewable in-app
- [ ] Works for all 29 clients including disbanded ones

### Testing Scenarios
1. **Voya** - 4 clients, all selected = 5 uploads
2. **John Hancock** - 7 clients, select 3 = 4 uploads  
3. **Empower** - Single client = 2 uploads

---

## CRITICAL NOTES FOR IMPLEMENTATION

1. **DO NOT use MSAL.js** - SWA handles user auth
2. **Must use OBO flow** through Azure Function for Graph tokens
3. **All checkboxes start selected** in upload wizard
4. **Always save to dump folder** plus client folders
5. **Client names must be alphabetically sorted** in filename
6. **SharePoint URLs in database are already URL-encoded**

---

## NEXT STEPS

1. Set up Azure Function for token exchange
2. Test Graph API connection
3. Build upload wizard
4. Build document viewer
5. Test with real provider scenarios