

# Replace hoovrr-logo.png and favicon.ico with favicon.png

Two files reference the old assets:

## Changes

### 1. `src/components/ui/hoovrr-logo.tsx` (line 17)
Change `src="/hoovrr-logo.png"` → `src="/favicon.png"`

### 2. `index.html` (line 11)
Change `href="/hoovrr-logo.png"` → `href="/favicon.png"`

### 3. Clean up old files
Delete `public/hoovrr-logo.png` and `public/favicon.ico` since they are no longer referenced.

