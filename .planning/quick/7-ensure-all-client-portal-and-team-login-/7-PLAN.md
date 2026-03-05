# Plan: 007 — Ensure all client portal and team login pages are fully responsive

**Mode:** quick
**Created:** 2026-03-05

## Task 1: Fix portal header mobile hamburger overlap

**What:** The sidebar hamburger button is fixed at `left-0 top-0 z-40 h-14` on mobile. The header's mobile page title starts at `px-4` — they overlap. Add left padding to the header on mobile to clear the hamburger.
**Files:** `components/portal/portal-header.tsx`
**Done when:** Mobile page title doesn't overlap with hamburger button

## Task 2: Make portal tabs scrollable on mobile

**What:** Portal tabs have `gap-8` which is too wide on small screens. Make tabs horizontally scrollable with `overflow-x-auto` and reduce gap on mobile.
**Files:** `components/portal/portal-tabs.tsx`
**Done when:** Tabs don't overflow on 320px screens

## Task 3: Stack invoice items on mobile

**What:** Invoice cards use `flex items-start justify-between gap-4` which puts amount on the right. On very narrow screens this gets cramped. Stack vertically on mobile.
**Files:** `components/portal/portal-invoice-list.tsx`
**Done when:** Invoice cards stack content vertically on small screens

## Task 4: Fix comment thread metadata wrapping on mobile

**What:** Comment header has name + badge + timestamp in a flex row that can overflow. Make it wrap on mobile.
**Files:** `components/portal/phase-comment-thread.tsx`
**Done when:** Comment metadata wraps gracefully on mobile

## Task 5: Add PWA start_url and scope to webmanifest

**What:** Missing `start_url` in site.webmanifest. Add it for proper web app Add-to-Home-Screen behavior.
**Files:** `public/site.webmanifest`
**Done when:** start_url is set to "/" and scope is "/"

## Task 6: Fix dashboard activity items for mobile

**What:** Activity items use `flex items-center justify-between` — on very narrow screens the date can get cramped. Stack or allow wrapping.
**Files:** `app/portal/page.tsx`
**Done when:** Activity items display cleanly on 320px screens
