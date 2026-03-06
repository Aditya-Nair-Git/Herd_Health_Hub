

# Create Webstats Dashboard Page

## Changes

### 1. New page: `src/pages/WebStats.tsx`
- Full-page public dashboard showing CreekData webstats
- Fetch from the same API endpoints used in `WebstatsWidget`
- Include: summary stats (views, visitors), timeseries chart (using recharts), top pages, browsers, countries
- Use endpoints: `/resources/stats`, `/resources/timeseries`, `/resources/paths`, `/resources/browser`, `/resources/country`
- Reuse the same `SITE_ID`, `BASE_URL`, `API_KEY` constants
- Clean public layout with back-to-home link, no auth required

### 2. Modified: `src/App.tsx`
- Add route: `<Route path="/stats" element={<WebStats />} />`

### 3. Modified: `src/pages/Index.tsx`
- Add "Site Stats" link in the footer next to "Admin Login"
- Add "Site Stats" link in the top nav bar next to "About"
- Make the `WebstatsWidget` in the footer clickable (link to `/stats`)

### Files
- `src/pages/WebStats.tsx` (new)
- `src/App.tsx` (add route)
- `src/pages/Index.tsx` (add links)

