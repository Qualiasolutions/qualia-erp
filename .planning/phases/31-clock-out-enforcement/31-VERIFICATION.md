---
phase: 31-clock-out-enforcement
verified: 2026-03-27T21:30:48Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 31: Clock-Out Enforcement Verification Report

**Phase Goal:** Employees who forget to clock out are caught — idle detection, planned logout reminders, browser exit warnings.
**Verified:** 2026-03-27T21:30:48Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                  | Status   | Evidence                                                                                                                                              |
| --- | ---------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | After 30min idle, "Are you still working?" prompt appears              | VERIFIED | `useIdleDetection` (30min default) fires `onIdle` → `SessionGuard` opens `IdlePromptDialog` with "Are you still working?" title                       |
| 2   | Idle prompt has a countdown and is non-dismissible                     | VERIFIED | `IdlePromptDialog` blocks `onOpenChange`, `onEscapeKeyDown`, and `onInteractOutside`; live countdown decrements every second                          |
| 3   | Grace period (15min) with no response auto-closes session              | VERIFIED | `useIdleDetection` fires `onAutoClose` after grace timeout; `SessionGuard.handleAutoClose` calls `autoClockOut` with `[Auto-closed: inactivity]` note |
| 4   | If planned logout time passes while clocked in, amber banner appears   | VERIFIED | `PlannedLogoutBanner` polls every 60s, shows amber banner when `isPastPlannedTime` and session is active                                              |
| 5   | Banner re-shows on navigation and is dismissible per-page              | VERIFIED | `useEffect` on `pathname` resets `dismissed` to false; X button sets it to true                                                                       |
| 6   | Closing browser tab while clocked in shows native beforeunload warning | VERIFIED | `useBeforeunloadGuard(!!session)` wired in `PlannedLogoutBanner`; adds `beforeunload` handler with `e.preventDefault()` + `e.returnValue = ''`        |
| 7   | Employee can set their planned logout time in settings                 | VERIFIED | `WorkScheduleSection` in `/settings` with `<input type="time">` → `updatePlannedLogoutTime` action                                                    |
| 8   | Idle detection only active for non-admin employees with active session | VERIFIED | `SessionGuard`: `idleEnabled = !adminLoading && !isAdmin && !!session && !!workspaceId`                                                               |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact                                                         | Expected                                    | Status   | Details                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `hooks/use-idle-detection.ts`                                    | 30min idle, 15min grace, activity listeners | VERIFIED | 157 lines, full state machine, 5 activity event types, throttled handler              |
| `components/idle-prompt-dialog.tsx`                              | Non-dismissible dialog with countdown       | VERIFIED | 125 lines, blocks all dismiss paths, live countdown                                   |
| `components/session-guard.tsx`                                   | Wires idle detection to auto-close          | VERIFIED | 125 lines, employees only, calls `autoClockOut`, renders both dialogs                 |
| `app/actions/work-sessions.ts` — `autoClockOut`                  | Close session with inactivity note          | VERIFIED | Auth-gated, queries user's own session, updates `ended_at` + `summary`                |
| `supabase/migrations/20260327120000_add_planned_logout_time.sql` | Column on profiles                          | VERIFIED | `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS planned_logout_time TIME DEFAULT NULL` |
| `app/actions/work-sessions.ts` — `getPlannedLogoutTime`          | Read planned time from profiles             | VERIFIED | Auth-gated, selects from profiles by user.id                                          |
| `app/actions/work-sessions.ts` — `updatePlannedLogoutTime`       | Write planned time with validation          | VERIFIED | HH:MM regex validation, null-safe clear, revalidates                                  |
| `lib/swr.ts` — `usePlannedLogoutTime`                            | SWR hook for planned time                   | VERIFIED | Hook at line 1729, cache key `['planned-logout', wsId]`, dynamic import               |
| `components/planned-logout-banner.tsx`                           | Amber banner, dismissible, re-shows on nav  | VERIFIED | 96 lines, amber styling, pathname effect resets dismiss state, 60s poll               |
| `hooks/use-beforeunload-guard.ts`                                | Browser exit warning when clocked in        | VERIFIED | 28 lines, `beforeunload` with `e.preventDefault()` + `e.returnValue = ''`             |
| `components/settings/work-schedule-section.tsx`                  | Settings UI to set planned time             | VERIFIED | 125 lines, `<input type="time">`, save + clear actions wired                          |

### Key Link Verification

| From                    | To                        | Via                                     | Status | Details                                                |
| ----------------------- | ------------------------- | --------------------------------------- | ------ | ------------------------------------------------------ |
| `SessionGuard`          | `useIdleDetection`        | import + hook call                      | WIRED  | Line 12 import, line 77 hook invocation                |
| `SessionGuard`          | `IdlePromptDialog`        | render with `open={idleDialogOpen}`     | WIRED  | Line 105 render, state drives open prop                |
| `SessionGuard`          | `autoClockOut`            | `startTransition` async call            | WIRED  | Line 64 call with workspaceId, session.id              |
| `PlannedLogoutBanner`   | `useBeforeunloadGuard`    | import + call with `!!session`          | WIRED  | Line 7 import, line 68 invocation                      |
| `PlannedLogoutBanner`   | `usePlannedLogoutTime`    | SWR hook                                | WIRED  | Line 42 destructure                                    |
| `app/layout.tsx`        | `SessionGuard`            | `<Suspense>` wrapper in providers tree  | WIRED  | Line 153 render inside AdminProvider+WorkspaceProvider |
| `app/layout.tsx`        | `PlannedLogoutBanner`     | `<Suspense>` wrapper in providers tree  | WIRED  | Line 156 render                                        |
| `WorkScheduleSection`   | `updatePlannedLogoutTime` | direct server action call on save/clear | WIRED  | Lines 43, 61 calls                                     |
| `app/settings/page.tsx` | `WorkScheduleSection`     | tab content array                       | WIRED  | Line 185, `id: 'work-schedule'`                        |
| `usePlannedLogoutTime`  | `getPlannedLogoutTime`    | dynamic import inside SWR fetcher       | WIRED  | Line 1739, fetcher calls action                        |

### Requirements Coverage

| Requirement                                         | Status    | Blocking Issue |
| --------------------------------------------------- | --------- | -------------- |
| Idle detection after configurable period            | SATISFIED | —              |
| "Are you still working?" prompt                     | SATISFIED | —              |
| Non-dismissible idle dialog with countdown          | SATISFIED | —              |
| Auto-close session with inactivity note after grace | SATISFIED | —              |
| Planned logout time banner (amber, dismissible)     | SATISFIED | —              |
| Banner re-shows on navigation                       | SATISFIED | —              |
| beforeunload warning while clocked in               | SATISFIED | —              |
| Settings UI to configure planned logout time        | SATISFIED | —              |
| DB column for planned_logout_time with migration    | SATISFIED | —              |
| Idle detection limited to non-admin employees       | SATISFIED | —              |

### Anti-Patterns Found

None. The two `return null` instances in `SessionGuard` and `PlannedLogoutBanner` are legitimate guard clauses, not stubs — both components have full implementations beyond those guards.

### Human Verification Required

#### 1. Idle Prompt Non-Dismissibility

**Test:** Log in as employee, clock in, wait or simulate idle (reduce timeout in dev), attempt to press Escape and click outside the dialog.
**Expected:** Dialog stays open; only "Yes, still working" or "Clock out now" buttons dismiss it.
**Why human:** Programmatic checks confirm `e.preventDefault()` is set but browser integration requires real interaction testing.

#### 2. Auto-Close End-to-End

**Test:** Trigger idle state and do not interact for the grace period. Verify session ends and toast "Your session was automatically closed due to inactivity" appears.
**Expected:** Work session `ended_at` is populated, `summary` contains `[Auto-closed: inactivity]`.
**Why human:** Requires timer progression and DB state observation.

#### 3. Beforeunload Warning in Browser

**Test:** Clock in, then try to close the browser tab or navigate away to a different domain.
**Expected:** Browser shows native "Leave site?" confirmation dialog.
**Why human:** beforeunload behavior is browser-controlled and cannot be verified programmatically from the codebase alone.

#### 4. Planned Logout Banner Timing

**Test:** Set a planned logout time 1-2 minutes from now, remain clocked in, wait for it to pass.
**Expected:** Amber banner appears within 60 seconds of the planned time passing; banner re-appears after navigating to another route even after dismissing.
**Why human:** Requires real-time observation of the 60s polling interval and navigation behavior.

### Gaps Summary

None. All 11 must-have artifacts exist, are substantive (non-stub), and are fully wired. All 8 observable truths are supported by concrete code evidence. The phase goal — catching employees who forget to clock out — is achieved across all four dimensions: idle detection, auto-close after grace period, planned logout banner, and beforeunload exit warning.

---

_Verified: 2026-03-27T21:30:48Z_
_Verifier: Claude (qualia-verifier)_
