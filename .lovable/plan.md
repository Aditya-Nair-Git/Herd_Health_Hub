

# CreekData Webstats Visitor Widget on Homepage Footer

## Overview
Add a live visitor statistics widget to the homepage footer, pulling data from CreekData webstats (Counterscale-based analytics). An edge function will proxy the API requests, keeping the API key server-side.

## Architecture

```text
Homepage Footer → Edge Function → CreekData Webstats API
                  (proxy)         (resources/stats endpoint)
```

## Changes

### 1. Store API key as a backend secret
Use `add_secret` to store `CREEKDATA_API_KEY` = `wl_02b7a1d4ec63ed0db733d04efa9a8f858cf4bcf1f90a08f7823518ead66a1a2e`

### 2. New edge function: `supabase/functions/webstats/index.ts`
- Proxies requests to `https://webstats.creekdata.workers.dev/resources/stats`
- Passes `site=fa3d3c5bbfe60412`, `interval` (default `30d`), and `timezone` as query params
- Sends `Authorization: Bearer <API_KEY>` header (Counterscale auth pattern)
- Falls back to cookie-based auth if bearer fails
- Returns JSON with `views`, `visitors` counts
- CORS headers enabled

### 3. New component: `src/components/WebstatsWidget.tsx`
- Small, clean widget displaying total visitors and page views
- Fetches from the edge function on mount
- Shows loading skeleton, then stat numbers with icons (Eye for views, Users for visitors)
- Graceful fallback if API fails (hides widget entirely)

### 4. Modified: `src/pages/Index.tsx`
- Import and render `WebstatsWidget` in the footer section, between the logo and copyright text
- Displays as a subtle inline stat bar (e.g., "👁 1,234 views · 👤 567 visitors")

## Config
Add to `supabase/config.toml`:
```toml
[functions.webstats]
verify_jwt = false
```

## Notes
- The site ID `fa3d3c5bbfe60412` is hardcoded in the edge function (matches the tracking script in `index.html`)
- If the Counterscale API auth mechanism differs from Bearer token, the edge function will try alternative auth patterns and log errors for debugging

