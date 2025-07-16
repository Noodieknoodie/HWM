# Frontend Implementation Plan for DB Changes

## Background: What We Changed and Why

We discovered the system had two parallel "posting" systems that were confusing:
1. **`posted_to_hwm`** - A field on individual payments that was never used in the UI
2. **`compliance_status`** - A view field that translated payment status into UI color names ('green'/'yellow')

This was bad design because:
- Database fields shouldn't contain presentation logic (colors)
- Having unused fields creates confusion
- Two different posting systems for no clear reason

**What we did:**
- Removed the unused `posted_to_hwm` field entirely
- Changed the sidebar view to pass through semantic `payment_status` ('Paid'/'Due') instead of colors
- Kept the quarterly compliance checkboxes (`is_posted`) which Dodd actually uses

## 1. TypeScript Interface Updates

### Files Affected:
- **src/stores/useAppStore.ts** (lines ~6-11)
- **Anywhere else that defines a Client interface**

### Current State:
```typescript
interface Client {
  client_id: number;
  display_name: string;
  full_name: string;
  provider_name?: string;
  compliance_status?: 'green' | 'yellow';  // <-- This no longer exists
}
```

### What Needs to Change:
Replace `compliance_status` with `payment_status` in the interface:
```typescript
interface Client {
  client_id: number;
  display_name: string;
  full_name: string;
  provider_name?: string;
  payment_status?: 'Paid' | 'Due';  // <-- New field from database
}
```

### Why This Change:
The database view `sidebar_clients_view` now returns `payment_status` with semantic values instead of `compliance_status` with color names. TypeScript interfaces must match what the API actually returns or you'll get runtime errors when the data doesn't match the expected shape.

### Expected Result:
TypeScript will now correctly type-check the data coming from the API, preventing bugs where code expects `compliance_status` but receives `payment_status`.

## 2. Sidebar Component Status Display

### File: **src/components/Sidebar.tsx**

### Current State:
The sidebar has a `StatusIcon` component that expects color-based status values and shows a gray dot for 'yellow' status.

### What Needs to Change:

1. **Update the StatusIcon component signature** (around line 90):
   - FROM: `const StatusIcon: React.FC<{ status?: 'green' | 'yellow' }>`
   - TO: `const StatusIcon: React.FC<{ status?: 'Paid' | 'Due' }>`

2. **Update the condition inside StatusIcon**:
   - FROM: `if (status === 'yellow')`
   - TO: `if (status === 'Due')`

3. **Update where StatusIcon is called** (around line 110):
   - FROM: `<StatusIcon status={client.compliance_status} />`
   - TO: `<StatusIcon status={client.payment_status} />`

### Why This Change:
The component was built to show visual indicators based on status, but it was using database values ('yellow') instead of semantic values. Now it receives semantic values ('Due') and decides internally how to display them. This separates data concerns from presentation concerns.

### Expected Result:
- Clients with 'Due' status will show the gray dot (indicating attention needed)
- Clients with 'Paid' status will show nothing (all caught up)
- The UI remains exactly the same - users won't notice any visual change

## 3. Client Search Hover Colors

### File: **src/components/ClientSearch.tsx**

### Current State:
When hovering over search results, the user icon changes color based on `compliance_status === 'green'`.

### What Needs to Change:

Around line 89, in the className logic:
- FROM: `client.compliance_status === 'green' ? 'text-green-500' : 'text-yellow-500'`
- TO: `client.payment_status === 'Paid' ? 'text-green-500' : 'text-yellow-500'`

### Why This Change:
The search component wants to show visual feedback (green = good, yellow = needs attention) but was relying on database color values. Now it translates semantic values into colors at the presentation layer where this decision belongs.

### Expected Result:
- Search results for paid-up clients show green icons on hover
- Search results for clients with payments due show yellow icons on hover
- Visual behavior remains identical to before

## 4. Payment-Related Components

### Files to Check:
- **src/components/payment/PaymentHistory.tsx**
- **src/components/payment/PaymentForm.tsx**
- **src/hooks/usePayments.ts**

### Current State:
These components work with payment data but don't appear to use `posted_to_hwm`.

### What Needs to Change:
- Remove any TypeScript interfaces that include `posted_to_hwm` field
- Remove any references to this field in the code (though none were found)

### Why This Change:
Even if unused, leaving references to deleted database fields in the code creates confusion and potential bugs. Clean code should only reference things that actually exist.

### Expected Result:
- Payment components continue working exactly as before
- No type errors or warnings about missing fields
- Cleaner code without vestigial references

## 5. Summary Page - No Changes Needed

### File: **src/pages/Summary.tsx**

### Current State:
Uses `is_posted` from `client_quarter_markers` table for the quarterly compliance checkboxes.

### What Needs to Change:
**Nothing!** This was the correct implementation all along.

### Why No Change:
We kept the `client_quarter_markers` table and its `is_posted` field because this is what Dodd actually uses for compliance tracking. The Summary page checkboxes will continue working exactly as they do now.

### Expected Result:
- Quarterly checkboxes continue to work
- Dodd can still mark quarters as reviewed
- Provider-level posted counts (2/3, etc.) continue to display correctly

## 6. Testing Strategy

### What to Test:

1. **Sidebar Functionality**
   - Open the app, look at the sidebar
   - Verify clients with unpaid current periods show gray dots
   - Verify the dots appear in the correct position

2. **Client Search**
   - Type a client name in the search box
   - Hover over results
   - Verify icon colors match payment status

3. **Type Safety**
   - Run `npm run type-check` or `tsc --noEmit`
   - Should see no errors about missing `compliance_status`
   - Should see no errors about `payment_status` type mismatches

4. **Summary Page**
   - Navigate to Summary page
   - Click quarterly checkboxes
   - Verify they still toggle and save

### Why This Testing:
We need to verify that:
1. The semantic data is correctly translated to visual representation
2. TypeScript types match runtime data
3. Existing functionality (quarterly checkboxes) remains intact

## Key Principle We're Following

**Before:** Database knew about UI (colors) → Bad separation of concerns

**After:** Database provides semantic data, UI decides how to display it → Proper separation

This change makes the system more maintainable because:
- UI designers can change colors without touching the database
- Database remains focused on business logic, not presentation
- Code is more self-documenting (what does 'yellow' mean vs 'Due')