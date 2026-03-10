# Plan: 015 — Fix loading icon, logo uploads, schedule block merging

**Mode:** quick (--fix + feature)
**Created:** 2026-03-10

## Task 1: Fix broken loading state icon

**What:** Loading icon referenced /sphere.png but file is /sphere.webp
**Files:** app/loading.tsx, app/projects/loading.tsx, components/qualia-voice.tsx, components/qualia-voice-inline.tsx
**Done when:** All references point to /sphere.webp

## Task 2: Fix broken logo uploads

**What:** Storage RLS blocks uploads via user session. Switch to admin client for storage ops.
**Files:** app/actions/logos.ts
**Done when:** Logo uploads work for projects and clients

## Task 3: Schedule block merging for multi-hour items

**What:** Meetings/tasks spanning multiple hours now render as merged blocks
**Files:** components/schedule-block.tsx
**Done when:** A 3-5 PM meeting shows as one block spanning both hours

## Task 4: Hasan custom evening schedule

**What:** Hasan gets 6 PM - 12 AM time slots instead of 8 AM - 5 PM
**Files:** components/schedule-block.tsx
**Done when:** Hasan's column shows evening hours when viewing All
