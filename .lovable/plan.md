

# Fix: Analytics script tag missing `data-geo` attribute

## Problem
The current script tag on line 22 of `index.html` is:
```html
<script defer data-site="fa3d3c5bbfe60412" src="https://webstats.creekdata.workers.dev/t.js"></script>
```

It's missing the `data-geo` attribute that the user specified is required:
```html
data-geo="https://webstats.creekdata.workers.dev/geo"
```

## Fix
Update line 22 in `index.html` to add the missing `data-geo` attribute:
```html
<script defer data-site="fa3d3c5bbfe60412" data-geo="https://webstats.creekdata.workers.dev/geo" src="https://webstats.creekdata.workers.dev/t.js"></script>
```

This is a one-line change. The `data-geo` attribute likely enables geographic tracking/resolution for the CreekData analytics, which may also be needed for the country breakdown data on the stats page.

**Note:** This fixes the *tracking script* configuration. The separate issue of the stats dashboard not loading data (CORS / 502 errors when fetching the API) is a different problem — the tracking script sends data *to* CreekData, while the dashboard tries to *read from* the CreekData API.

