# Quick Task 002: Summary

## Task

Add Pre-Production pipeline column between Building and Live on the projects page.

## Changes Made

### Database

- Added `is_pre_production` boolean column to `projects` table (default false)
- Created partial index `idx_projects_is_pre_production` for efficient filtering
- Updated `get_project_stats` RPC function to return `is_pre_production`

### Backend

- `app/actions/projects.ts` — Added `preProduction` category to `getProjectStats()`, splits Active/Delayed projects by `is_pre_production` flag
- `lib/swr.ts` — Added `preProduction` to `useProjectStats` hook and `ProjectStatsData` type

### Frontend

- `app/projects/projects-client.tsx` — Added Pre-Production column (amber theme, ClipboardCheck icon), changed to 4-column grid layout
- `app/projects/page.tsx` — Added `is_pre_production` to `ProjectData` type and filter logic
- `types/database.ts` — Added `is_building`, `is_finished`, `is_live`, `is_pre_production` boolean fields to projects Row/Insert/Update types

## Pipeline Layout

```
Demo → Building → Pre-Production → Live → (Archived collapsible)
```

## How to Use

Set `is_pre_production = true` on a project (via Supabase or future UI toggle) to move it from the Building column to Pre-Production. When it goes live, change status to `Launched`.

## Commit

`0d20f29` — feat: add Pre-Production pipeline column between Building and Live
