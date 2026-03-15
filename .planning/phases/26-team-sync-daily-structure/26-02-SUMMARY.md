---
phase: 26-team-sync-daily-structure
plan: 02
subsystem: api
tags: [supabase, profiles, daily-flow, team-members, dynamic-query]

# Dependency graph
requires: []
provides:
  - Dynamic team member lookup in getDailyFlowData using profile.role instead of hardcoded emails
  - TeamMember.colorKey is now a string (profile.id) supporting any number of members
affects:
  - 26-03-team-sync-daily-structure (and any plan consuming getDailyFlowData)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Query profiles by workspace_id + role filter instead of hardcoded email whitelist'
    - 'Use profile.id as colorKey so UI can cycle through color palettes by index'

key-files:
  created: []
  modified:
    - app/actions/daily-flow.ts

key-decisions:
  - 'Use profile.id as colorKey — downstream UI should map by index/cycle, not string literal'
  - "Filter profiles by role in ('admin', 'employee') — excludes service/bot accounts without whitelisting"

patterns-established:
  - "Dynamic team lookup pattern: .eq('workspace_id', workspaceId).in('role', ['admin', 'employee'])"

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 26 Plan 02: Dynamic Team Member Lookup Summary

**Replaced hardcoded TEAM_EMAILS whitelist in getDailyFlowData with dynamic profiles query filtered by workspace_id and role (admin/employee)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-15T02:49:26Z
- **Completed:** 2026-03-15T02:50:56Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Removed TEAM_EMAILS constant with hardcoded info@qualia and moayad@qualia emails
- Profiles query now scoped to workspace_id and role in ['admin', 'employee']
- TeamMember.colorKey widened from 'fawzi' | 'moayad' to string — uses profile.id
- Role mapping: profile.role admin -> 'lead', employee -> 'trainee'
- Adding any new team member to the DB with role=employee now makes them appear automatically

## Task Commits

1. **Task 1: Replace hardcoded TEAM_EMAILS with dynamic profile query** - `be65764` (feat)

## Files Created/Modified

- `app/actions/daily-flow.ts` - Removed TEAM_EMAILS, updated profiles query and teamMembers mapping

## Decisions Made

- colorKey now stores profile.id — UI components that need colors should map by array index, not by name literal. The notes-widget already does this (iterates with `.forEach((member, index)`) so it works without changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in learning.ts and project-wizard unrelated to this change — not introduced here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- getDailyFlowData now returns all workspace team members dynamically
- Ready for plans that consume teamMembers or add UI for per-member task columns

---

_Phase: 26-team-sync-daily-structure_
_Completed: 2026-03-15_
