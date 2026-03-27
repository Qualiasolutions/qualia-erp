---
phase: 31-clock-out-enforcement
plan: '01'
subsystem: attendance
tags: [idle-detection, work-sessions, client-component, hooks]
dependency_graph:
  requires: [30-03]
  provides: [idle-detection-hook, auto-clock-out-action, session-guard]
  affects: [app/layout.tsx, app/actions/work-sessions.ts]
tech_stack:
  added: []
  patterns: [useEffect-timer-pattern, callback-ref-pattern, throttled-event-handler]
key_files:
  created:
    - hooks/use-idle-detection.ts
    - components/idle-prompt-dialog.tsx
    - components/session-guard.tsx
  modified:
    - app/actions/work-sessions.ts
    - app/layout.tsx
decisions:
  - 'Throttle activity events at 5s intervals to avoid thrashing timers on fast mouse movement'
  - 'SessionGuard renders null when not applicable — no wasted DOM nodes for admins'
  - 'useIdleDetection uses callback refs for onIdle/onAutoClose to avoid timer resets on rerenders'
  - 'Grace period countdown in IdlePromptDialog resets from full 15min each time dialog opens'
metrics:
  duration_minutes: 3
  completed_date: '2026-03-27'
  tasks_completed: 2
  tasks_total: 2
---

# Phase 31 Plan 01: Idle Detection and Auto Clock-Out Summary

**One-liner:** Client-side idle detection with 30-min timeout + 15-min grace, auto-closes employee work sessions via server action with `[Auto-closed: inactivity]` summary.

## What Was Built

### useIdleDetection hook (`hooks/use-idle-detection.ts`)

Tracks `mousemove`, `keydown`, `scroll`, `touchstart`, `click` via `document` listeners. Uses a throttle ref so activity only resets the timer if 5+ seconds have passed since the last reset — avoids timer thrashing on rapid mouse movement.

State machine: `active → idle (onIdle) → grace → auto-close (onAutoClose)`. Returns `{ isIdle, isGracePeriod, resetIdle }`. When `enabled` goes false, all timers and listeners are removed immediately.

### autoClockOut server action (`app/actions/work-sessions.ts`)

New export: `autoClockOut(workspaceId, sessionId, reason)`. Validates session belongs to current user and is still open (not already ended). Sets `ended_at` to now and `summary` to the reason string. Mirrors `clockOut` but skips the user-summary requirement.

### IdlePromptDialog (`components/idle-prompt-dialog.tsx`)

shadcn Dialog with `onEscapeKeyDown` and `onInteractOutside` both calling `e.preventDefault()` — dialog cannot be dismissed without explicit action. Shows live countdown using `setInterval`. Countdown text turns destructive red when under 60 seconds remaining. Two buttons: "Yes, still working" (primary) and "Clock out now" (outline with LogOut icon).

### SessionGuard (`components/session-guard.tsx`)

Client component, renders `null` for admins or users without active sessions. Uses `useAdminContext` for role check, `useCurrentWorkspaceId` + `useActiveSession` for session data. Orchestrates the full flow: idle detected → show dialog → either reset or open ClockOutModal for proper summary. Auto-close calls `autoClockOut` server action, invalidates SWR caches, and shows a `toast.info` notification.

Wired into `app/layout.tsx` inside `<Suspense fallback={null}>` immediately after `<AIAssistantWidget />`, inside the `AIAssistantProvider` + `WorkspaceProvider` tree.

## Task Commits

| Task | Name                                     | Commit  | Files                                                                           |
| ---- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| 1    | useIdleDetection hook + autoClockOut     | 5a98fd4 | hooks/use-idle-detection.ts, app/actions/work-sessions.ts                       |
| 2    | IdlePromptDialog + SessionGuard + layout | 6ef7ced | components/idle-prompt-dialog.tsx, components/session-guard.tsx, app/layout.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed undefined workspaceId type mismatch**

- **Found during:** Task 2 TypeScript check
- **Issue:** `useCurrentWorkspaceId` returns `string | undefined` but `useActiveSession` expects `string | null`
- **Fix:** Added `?? null` coercion: `useActiveSession(workspaceId ?? null)`
- **Files modified:** components/session-guard.tsx
- **Commit:** 6ef7ced (inline fix before commit)

## Verification

- `npx tsc --noEmit` — zero errors after both tasks
- `npm run build` — clean production build
- SessionGuard rendered in layout inside Suspense, guarded by role + session checks

## Self-Check: PASSED

Files created:

- hooks/use-idle-detection.ts — FOUND
- components/idle-prompt-dialog.tsx — FOUND
- components/session-guard.tsx — FOUND

Commits:

- 5a98fd4 — FOUND
- 6ef7ced — FOUND
