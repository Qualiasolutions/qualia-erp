# Plan: 8 — Replace Sally with Hasan, configure employee schedule visibility and role-based page access

**Mode:** quick
**Created:** 2026-03-06

## Task 1: Replace Sally with Hasan in code

**What:** Remove Sally references, keep Hasan in team constants and edit-meeting-modal
**Files:** `lib/team-constants.ts`, `components/edit-meeting-modal.tsx`, `lib/color-constants.ts`
**Done when:** Sally removed from TEAM array and constants, Hasan is the 3rd team member

## Task 2: Add employee route restrictions in middleware

**What:** Restrict employee role to only dashboard (`/`), schedule (`/schedule`), knowledge (`/knowledge`)
**Files:** `middleware.ts`
**Done when:** Employees accessing other routes get redirected to `/`

## Task 3: SQL migration to set Hasan's role

**What:** Set hasan@qualiasolutions.net role to 'employee', full_name to 'Hasan'
**Files:** `supabase/migrations/` new migration
**Done when:** Migration file created and applied
