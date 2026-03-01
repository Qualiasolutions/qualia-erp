# Quick Task 002: Add Pre-Production Pipeline Column

## Description

Add a "Pre-Production" column to the projects pipeline, positioned after Building and before Live. This represents the stage where a project is feature-complete but undergoing testing/QA/staging before going live.

## Tasks

### Task 1: Database Migration

- Add `is_pre_production` boolean column to `projects` table (default false)
- Update `get_project_stats` function to include `is_pre_production`
- Create partial index for efficient filtering

### Task 2: Backend — Action & SWR Updates

- Update `app/actions/projects.ts` `getProjectStats()` to split Active/Delayed into building vs preProduction based on `is_pre_production` flag
- Update `lib/swr.ts` — add `preProduction` to `useProjectStats` hook and `ProjectStatsData` type
- Update `app/actions/projects.ts` re-export if needed

### Task 3: Frontend — Pipeline UI

- Update `app/projects/page.tsx` — add `preProduction` prop, filter logic
- Update `app/projects/projects-client.tsx` — add Pre-Production column config, 4-column grid layout
- Update `types/database.ts` to include `is_pre_production` in types

## Pipeline After Change

Demo → Building → **Pre-Production** → Live → (Archived collapsible)

## Logic

- **Building**: Active/Delayed AND `is_pre_production = false`
- **Pre-Production**: Active/Delayed AND `is_pre_production = true`
- **Live**: Launched (unchanged)
