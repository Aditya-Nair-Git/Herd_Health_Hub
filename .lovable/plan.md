

# Fix: Webstats data not loading (CORS blocked)

## Problem
All requests to `webstats.creekdata.workers.dev` fail with "Failed to fetch" from the preview domain. This is a CORS issue — the CreekData API doesn't allow cross-origin requests from the Lovable preview/published domains.

## Solution
Route all API calls through a backend edge function that proxies requests to CreekData server-side, bypassing CORS entirely.

### 1. Create edge function: `supabase/functions/webstats-proxy/index.ts`
- Accepts an `endpoint` query param (e.g. `stats`, `timeseries`, `paths`, `browser`, `country`)
- Forwards the request to `https://webstats.creekdata.workers.dev/resources/{endpoint}` with the API key from secrets
- Passes through `site`, `interval`, `tz` query params
- Returns the JSON response with CORS headers
- `verify_jwt = false` (public endpoint)

### 2. Update `src/pages/WebStats.tsx`
- Change `BASE_URL` to point to the edge function URL
- Remove hardcoded API key from client code
- Update `useWebstatsEndpoint` to call `/webstats-proxy?endpoint=stats&site=...` etc.

### 3. Update `src/components/WebstatsWidget.tsx`
- Same change: fetch from edge function instead of directly from CreekData

### Security note
The API key moves server-side into the edge function (read from `CREEKDATA_API_KEY` secret already stored). No credentials exposed in client code.

