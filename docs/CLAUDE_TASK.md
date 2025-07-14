<!-- markdownlint-disable MD032 -->

## **401k Payment Tracker - Style Modernization Brief**

### **Your Job Is To:**
Update the visual styling of this 401k payment recording system to be more cohesive and professional. This is a payment recording system for a small financial advisory firm - think of it as a digital receiving log where staff record payments as they arrive from providers. Compliance reviews these entries to ensure accuracy.

**Key Context**: This is NOT a collections system. Status indicators reflect whether WE have recorded payments, not whether clients have paid.

---

## **Style Standardization Tasks**

### **Task 1: Remove Heavy Status Indicators**
Replace all green/yellow circle status indicators in the sidebar with simple gray dots (for items with pending entries) or remove entirely. The current Christmas-tree effect is overwhelming and suggests problems where none exist.
**Files**: `src/components/Sidebar.tsx`

### **Task 2: Standardize All Spacing**
Apply these exact spacing patterns throughout:
- All cards: `p-6`
- All table cells: `px-6 py-4`
- All primary buttons: `px-4 py-2 rounded-md`
- All page containers: `px-4 sm:px-6 lg:px-8 py-8`
**Start with**: High-traffic components like dashboard cards and payment forms

### **Task 3: Implement Typography Hierarchy**
Apply this exact system:
- Page headers: `text-2xl font-bold text-gray-900`
- Section headers: `text-lg font-semibold text-gray-900`
- Card headers: `text-sm font-semibold text-gray-600`
- Keep the gradient line under the Payments page header and add it to Summary page header
**Files**: All page components

### **Task 4: Consolidate to Single Color Scheme**
Use these exact colors:
- Primary actions: `bg-blue-600 hover:bg-blue-700`
- Text hierarchy: `text-gray-900` (primary), `text-gray-600` (secondary), `text-gray-500` (muted)
- All borders: `border-gray-200`
- Replace all `indigo` classes with `blue` equivalents
- Remove custom `dark-` and `light-` prefixed colors
**Priority**: `ContactsModal.tsx` and other components using indigo

### **Task 5: Implement Subtle Variance Display**
Change variance indicators to:
- Display all numbers in `text-gray-900`
- Add small amber dot (•) inline after numbers only when variance exceeds 10%
- Remove all red/green/amber text colors from variance displays
**Files**: `src/pages/Summary.tsx`, `src/components/payment/PaymentHistory.tsx`

### **Task 6: Update Dashboard Status Card**
Replace "PAYMENT DUE" messaging with:
- Main text: The period name (e.g., "January 2025")
- Subtitle: "Awaiting Entry" in `text-gray-500`
- Remove amber color from status text
**File**: `src/components/dashboard/cards/CurrentStatusCard.tsx`

### **Task 7: Simplify Summary Page Indicators**
Replace the current green checkmarks and amber warnings with:
- Recorded payments: Display the dollar amount only
- Missing entries: Display expected amount in `text-gray-400`
- Remove icon columns but keep the Posted checkbox column
**File**: `src/pages/Summary.tsx`

### **Task 8: Create Style Reference File**
Create `src/styles/reference.tsx` containing standardized component patterns for future maintenance. Include the exact className combinations for cards, buttons, tables, inputs, and modals.

---

## **Design Principles**
- Status reflects recording state, not payment problems
- Minimize color to reduce visual noise
- Let data speak through numbers, not colors
- Maintain professional financial software aesthetic
- Variance matters for compliance but shouldn't dominate visually

The existing functionality is solid. These changes create visual consistency and reduce unnecessary urgency in the interface.