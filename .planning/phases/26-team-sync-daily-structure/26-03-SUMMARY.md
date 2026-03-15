---
phase: 26-team-sync-daily-structure
plan: 03
subsystem: ui
tags: [wizard, integrations, vapi, project-creation, typescript]

requires: []
provides:
  - Project creation wizard with VAPI checkbox and provisioning step removed
affects: [26-08-PLAN.md]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - components/project-wizard/project-wizard.tsx
    - components/project-wizard/step-provisioning.tsx
    - lib/integrations/types.ts
    - lib/integrations/orchestrator.ts

key-decisions:
  - 'Remove VAPI from IntegrationSelections type entirely — not just the UI'
  - 'Keep VAPIConfig and related VAPI types in types.ts as they are used by other parts of the system'
  - 'Keep Phone icon in project-wizard.tsx — still needed for voice_agent project type card'

patterns-established: []

duration: 8min
completed: 2026-03-15
---

# Phase 26 Plan 03: Remove VAPI from Project Creation Wizard Summary

**Stripped VAPI checkbox, state, and provisioning step from project wizard — only GitHub and Vercel remain selectable**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-15T02:43:00Z
- **Completed:** 2026-03-15T02:51:40Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Removed `vapi` field from `IntegrationSelections` type in `lib/integrations/types.ts`
- Removed VAPI checkbox UI, state, and integration logic from `project-wizard.tsx`
- Removed `vapi` from step union type, `STEP_CONFIG`, steps builder, poll handler, and `handleRetry` param in `step-provisioning.tsx`
- Fixed cascading TypeScript issue in `orchestrator.ts` where `selectedIntegrations.vapi` was referenced
- TypeScript compiles clean — no VAPI references in wizard files

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove VAPI from wizard state, UI, and provisioning step** - `be530d1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `components/project-wizard/project-wizard.tsx` - Removed vapi from state, helpers, VAPI checkbox block, and provisioning summary note
- `components/project-wizard/step-provisioning.tsx` - Removed vapi from ProvisioningStep union, STEP_CONFIG, steps builder, poll handler, handleRetry type, and Phone import
- `lib/integrations/types.ts` - Removed vapi from IntegrationSelections interface
- `lib/integrations/orchestrator.ts` - Removed selectedIntegrations.vapi reference from provider selection logic

## Decisions Made

- Kept `VAPIConfig`, `VAPIAssistantConfig`, `VAPIAssistantResult`, and `VAPI_VOICE_CONFIGS` in `types.ts` — these are used by `lib/integrations/vapi.ts` and the VAPI settings/webhook infrastructure, not the wizard
- Kept `Phone` icon import in `project-wizard.tsx` — still used for the Voice project type selector card
- Removed VAPI reference from orchestrator proactively (Rule 1 — would have been a TS error)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in orchestrator.ts**

- **Found during:** Task 1 (after removing vapi from IntegrationSelections)
- **Issue:** `lib/integrations/orchestrator.ts` line 43 accessed `config.selectedIntegrations.vapi` which no longer exists on the type after the IntegrationSelections change
- **Fix:** Removed the `if (config.selectedIntegrations.vapi) requiredProviders.push('vapi')` line
- **Files modified:** `lib/integrations/orchestrator.ts`
- **Verification:** `npx tsc --noEmit` — only pre-existing unrelated errors in edit-task-modal.tsx
- **Committed in:** be530d1 (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/type error cascade)
**Impact on plan:** Required fix — TypeScript would have broken the build. No scope creep.

## Issues Encountered

None — straightforward removal with one cascade type error caught and fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 26-04 can proceed immediately
- Plan 26-08 notes (in its plan file) that step-provisioning.tsx may reference `selectedIntegrations.vapi` — this is now fully cleaned up

## Self-Check: PASSED

- FOUND: components/project-wizard/project-wizard.tsx
- FOUND: components/project-wizard/step-provisioning.tsx
- FOUND: lib/integrations/types.ts
- FOUND: lib/integrations/orchestrator.ts
- FOUND: commit be530d1 (feat(26-03): remove VAPI from project creation wizard)

---

_Phase: 26-team-sync-daily-structure_
_Completed: 2026-03-15_
