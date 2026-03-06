

# Fix: Admin Analytics Page Going Blank

## Root Cause Analysis

After thorough investigation, the page code, database tables, RLS policies, and routing all look correct. The most likely causes of the blank page are:

1. **Silent query errors** — the `fetchAll` function has no error handling. If any query returns an error (e.g., network issue, timeout), the data defaults to empty arrays via `?? []`, and `setLoading(false)` still runs. The page renders but shows only "No data available" messages, which looks blank.

2. **Recharts rendering crash** — if a chart receives unexpected data shapes, it can throw an unhandled error that blanks the entire component tree (no error boundary).

## Fix

### 1. Add error handling and error boundary to `src/pages/admin/Analytics.tsx`

- Wrap the `fetchAll` logic in a try/catch block
- Log and display errors if any query fails (add an `error` state)
- Show a user-friendly error message with a retry button if data fetching fails
- Add `console.error` logging for each query's `.error` property so issues are visible in the console

### 2. Add an error boundary wrapper

- Wrap the chart section in a React error boundary (or a simple try-catch pattern) so if recharts crashes, the rest of the page still renders with an error message instead of going fully blank

### Files Changed
- `src/pages/admin/Analytics.tsx` — add error state, try/catch, error logging, retry button, and error boundary around charts

No database, routing, or navigation changes needed.

