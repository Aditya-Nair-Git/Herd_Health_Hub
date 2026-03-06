

# Admin Analytics Dashboard with Recharts

## Overview
Replace the current text-based `AdminReports` component with interactive recharts visualizations, and add a new `/admin/analytics` page with a dedicated nav link. The existing `AdminReports` data-fetching logic will be reused and extended.

## Changes

### 1. New file: `src/pages/admin/Analytics.tsx`
A dedicated analytics page wrapped in `DashboardLayout` containing three chart sections:

- **Ticket Stats (BarChart)**: Grouped bar chart showing ticket counts by status (created, assigned, scheduled, in_progress, completed, cancelled) with color-coded bars by priority (normal, urgent, critical). Data from `tickets` table.

- **Animal Health Distribution (PieChart)**: Donut chart showing animal_status distribution (Healthy, Under Treatment, Critical, Recovering, Vaccination Due, Deceased). Data from `animals` table where `is_active = true`.

- **Vet Workload (BarChart horizontal)**: Horizontal bar chart showing treatment count per vet. Resolves vet names from `profiles` table. Data from `treatment_records` table.

Also retains the existing KPI stat cards (vaccination coverage %, follow-up completion %, ongoing medications, unique diagnoses) at the top.

Uses `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from the existing `src/components/ui/chart.tsx` for consistent theming.

### 2. Modified: `src/App.tsx`
- Import `AdminAnalytics` 
- Add route `/admin/analytics` protected for `['admin']`

### 3. Modified: `src/components/layout/DashboardLayout.tsx`
- Add `BarChart3` icon import
- Add `{ href: '/admin/analytics', label: 'Analytics', icon: BarChart3 }` to `adminLinks` array

### 4. Modified: `src/components/admin/AdminReports.tsx`
Keep as-is (it still renders on the main dashboard's "Reports & Analytics" tab). No changes needed.

## Data Queries (all from existing backend tables)

| Chart | Table | Query |
|-------|-------|-------|
| Ticket stats | `tickets` | Select `status, priority` where `is_active = true`, group client-side |
| Animal health | `animals` | Select `animal_status` where `is_active = true`, group client-side |
| Vet workload | `treatment_records` + `profiles` | Count by `vet_id`, resolve names from profiles |

## Tech
- All charts use `recharts` (already installed) via the existing `ChartContainer`/`ChartConfig` pattern
- No new dependencies needed
- No database changes needed

