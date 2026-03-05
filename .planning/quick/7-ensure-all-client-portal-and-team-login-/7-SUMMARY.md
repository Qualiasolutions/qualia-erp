# Summary: 007 — Responsive portal & auth pages

**Completed:** 2026-03-05
**Status:** Done

## Changes Made

### 1. Portal header mobile hamburger overlap (portal-header.tsx)

- Changed header padding from `px-4 md:px-6` to `pl-14 pr-4 md:px-6`
- Mobile left padding (pl-14 = 56px) clears the fixed sidebar hamburger button

### 2. Portal tabs scrollable on mobile (portal-tabs.tsx)

- Added `overflow-x-auto` for horizontal scrolling on small screens
- Reduced tab gap from `gap-8` to `gap-6 sm:gap-8`
- Extended tab area to full width on mobile with negative margins

### 3. Invoice cards mobile stacking (portal-invoice-list.tsx)

- Changed layout from always-horizontal to `flex-col sm:flex-row`
- Amount shown inline with invoice number on mobile, separate column on desktop
- View PDF link shown at bottom on mobile, in right column on desktop
- Reduced padding on mobile

### 4. Comment thread metadata wrapping (phase-comment-thread.tsx)

- Added `flex-wrap` with `gap-x-2 gap-y-1` to comment header metadata
- Internal checkbox area now stacks vertically on mobile with `flex-col sm:flex-row`
- Shortened label text for mobile: "Internal comment (team only)"

### 5. PWA webmanifest (site.webmanifest)

- Added `start_url: "/"` for proper Add-to-Home-Screen behavior
- Added `scope: "/"` for PWA navigation scope

### 6. Dashboard activity items (portal/page.tsx)

- Changed from center-aligned to top-aligned on mobile (`items-start sm:items-center`)
- Adjusted dot indicator alignment for top-aligned layout
- Reduced horizontal padding on mobile

### 7. Roadmap timeline mobile (portal-roadmap.tsx)

- Reduced gap between status indicator and content: `gap-3 sm:gap-6`
- Reduced phase card padding on mobile: `p-3 sm:p-4`

### 8. Page header mobile (portal-page-header.tsx)

- Back button and title top-aligned on mobile (`items-start sm:items-center`)
- Title uses smaller font on mobile (`text-xl sm:text-2xl`)
- Added `min-w-0` for text truncation support

## Files Modified

- `components/portal/portal-header.tsx`
- `components/portal/portal-tabs.tsx`
- `components/portal/portal-invoice-list.tsx`
- `components/portal/phase-comment-thread.tsx`
- `components/portal/portal-roadmap.tsx`
- `components/portal/portal-page-header.tsx`
- `app/portal/page.tsx`
- `public/site.webmanifest`

## Already Responsive (no changes needed)

- Login page — left panel hides on mobile, form adapts
- Reset password pages — centered layout with `min-h-svh` padding
- Auth error page — simple centered card
- Portal sidebar — Sheet component on mobile, fixed sidebar on desktop
- Projects list — responsive grid `sm:grid-cols-2 lg:grid-cols-3`
- Billing summary — responsive grid `sm:grid-cols-3`
- Request list — flex-wrap filters, card-based items
- Messages/activity feed — timeline layout works at all sizes
- File list — responsive grid `sm:grid-cols-2 lg:grid-cols-3`
- Request dialog — Dialog component handles mobile natively
- Admin panel tables — already have `overflow-x-auto`
