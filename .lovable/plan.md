

# Enhance Priority Sorting and Vet Workload Analytics

## What Already Exists
- Priority field on tickets (normal/urgent/emergency) with farmer UI selector
- Color-coded priority badges on ticket cards
- Vet workload chart in Admin Analytics (based on treatment records)

## Changes Needed

### 1. Priority-based sorting in useTickets hook
**File:** `src/hooks/useTickets.ts`

After fetching tickets, sort them client-side: emergency → urgent → normal, then by created_at descending. The Supabase `.order()` only supports single-column sort, so we sort in JS after fetch.

### 2. Emergency case highlighting on Vet Dashboard
**File:** `src/pages/vet/Dashboard.tsx`

In the "Assigned Tickets" section, add a visual highlight for emergency tickets — a red left-border and emergency icon. Sort assigned tickets by priority before displaying.

### 3. Active-ticket-based Vet Workload widget on Admin Dashboard
**File:** `src/pages/admin/Dashboard.tsx`

Add a "Vet Workload" card showing active case counts per vet (from tickets where status is not completed/cancelled), with color-coded workload levels (Low/Medium/High). Include total active cases and average per vet stats.

### 4. Update Admin Analytics workload chart
**File:** `src/pages/admin/Analytics.tsx`

Change the existing workload chart data source from `treatment_records` to active tickets (`status != completed AND status != cancelled`), matching the requested query pattern.

## Files to modify
- `src/hooks/useTickets.ts` — add priority sort
- `src/pages/vet/Dashboard.tsx` — emergency highlighting
- `src/pages/admin/Dashboard.tsx` — add workload widget
- `src/pages/admin/Analytics.tsx` — update workload data source

No database changes needed. No backend changes.

