

# Navigation and Routing Audit Fix

## Issues Found

All broken links point to `/vet/search`, which does not exist. This route was replaced by `/vet/records` (Animal Records) but references were not updated everywhere.

### Broken references to `/vet/search` (3 files, 4 occurrences):

1. **`src/pages/vet/Dashboard.tsx` line 290** — "Search for an Animal" button in empty Recent Cases
2. **`src/pages/vet/Cases.tsx` line 188** — "Search Animals" button in empty Case Records tab
3. **`src/pages/vet/AnimalRecord.tsx` lines 257, 274** — "Back to Search" button and back arrow

## Fix Plan

Replace all `/vet/search` references with `/vet/records`:

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `src/pages/vet/Dashboard.tsx` | 290 | `/vet/search` | `/vet/records` |
| `src/pages/vet/Cases.tsx` | 188 | `/vet/search` | `/vet/records` |
| `src/pages/vet/AnimalRecord.tsx` | 257 | `/vet/search` | `/vet/records` |
| `src/pages/vet/AnimalRecord.tsx` | 274 | `/vet/search` | `/vet/records` |

Also update button labels from "Back to Search" / "Search for an Animal" to "Animal Records" / "Browse Animal Records" for consistency with the sidebar label.

No route changes, no new files, no backend changes needed. The "Recent Cases → View All" link already correctly points to `/vet/cases`.

