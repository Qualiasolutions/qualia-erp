---
phase: 01-trainee-interactive-system
plan: 01
subsystem: ui
tags: [react, framer-motion, supabase, phase-items, trainee-onboarding]

# Dependency graph
requires:
  - phase: 00-foundation
    provides: GSD templates system, phase_items table schema, project_phases structure
provides:
  - TaskInstructionCard component for trainee guidance
  - togglePhaseTask server action for phase_items completion tracking
  - PhaseTasks refactor to use phase_items instead of tasks table
  - Phase-level "Copy prompt to Claude Code" button for one-click GSD workflow
affects: [02-client-portal, trainee-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TaskInstructionCard pattern for template-driven task display
    - phase_items as single source of truth for GSD template tasks
    - Phase-level prompt aggregation for complete Claude Code context

key-files:
  created:
    - components/project-pipeline/task-instruction-card.tsx
  modified:
    - components/project-pipeline/phase-tasks.tsx
    - components/project-pipeline/phase-card.tsx
    - app/actions/pipeline.ts

key-decisions:
  - 'phase_items table is template-driven (not user-editable) - separates GSD workflow from ad-hoc tasks'
  - 'Phase-level copy button aggregates gsdCommand + helper_text for complete Claude Code prompt'
  - 'TaskInstructionCard shows helper text inline instead of modal for faster scanning'

patterns-established:
  - 'Template-driven tasks use phase_items, user-added tasks use tasks table'
  - 'GSD commands extracted from template_key via getPhasePromptData()'
  - 'Optimistic UI updates in PhaseTasks for instant checkbox feedback'

# Metrics
duration: 219s
completed: 2026-03-01
---

# Phase 1 Plan 1: Interactive Task Instruction Cards Summary

**TaskInstructionCard component with helper text, copyable GSD commands, and phase-level prompt aggregation for one-click Claude Code workflow**

## Performance

- **Duration:** 3 min 39 sec
- **Started:** 2026-03-01T14:37:36Z
- **Completed:** 2026-03-01T14:41:15Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- TaskInstructionCard displays task title, helper text, and copyable GSD command in single view
- Phase tasks now fetch from phase_items table with automatic completion tracking
- Phase header "Copy prompt to Claude Code" button aggregates full phase guidance
- Removed "Add task" input (phase_items are template-driven, not user-created)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TaskInstructionCard component** - `3834838` (feat)
2. **Task 2: Add togglePhaseTask server action** - `06dcd0a` (feat)
3. **Task 3: Update PhaseTasks to use phase_items** - `8380405` (feat)
4. **Task 4: Add Copy prompt button to phase header** - `2e077a9` (feat)

## Files Created/Modified

### Created

- `components/project-pipeline/task-instruction-card.tsx` - Specialized task card showing checkbox, title, helper text (with Info icon), and copyable GSD command code block. Fades to 50% opacity when completed. Uses framer-motion for smooth animations.

### Modified

- `components/project-pipeline/phase-tasks.tsx` - Refactored to fetch from phase_items table instead of tasks. Removed "Add task" input. Uses TaskInstructionCard for rendering. Implements optimistic UI updates on checkbox toggle.

- `components/project-pipeline/phase-card.tsx` - Added "Copy prompt to Claude Code" button in phase header (before chevron). Aggregates gsdCommand + helper_text from phase template. Shows checkmark on successful copy. Only visible if phase has GSD template data.

- `app/actions/pipeline.ts` - Added togglePhaseTask() server action. Toggles is_completed in phase_items table, sets completed_at/completed_by timestamps, calls checkPhaseProgress() for auto-phase completion, revalidates relevant paths.

## Decisions Made

1. **Helper text displayed inline instead of modal**
   - Rationale: Faster scanning for trainees, no need to click to see guidance

2. **Phase-level copy button aggregates gsdCommand + helper_text**
   - Rationale: Provides complete phase context to Claude Code in one click, combining GSD command with task-specific instructions

3. **Removed "Add task" input from PhaseTasks**
   - Rationale: phase_items are template-driven and predefined from GSD templates, not user-created. User-added tasks belong in tasks table separately.

4. **Optimistic UI updates in togglePhaseTask**
   - Rationale: Instant feedback on checkbox click improves perceived performance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. All verification criteria passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

✅ **Ready for Plan 02 (Integration Display)**

The interactive task system is complete and functional. Phase_items table is populated from GSD templates, TaskInstructionCard displays guidance clearly, and trainees can copy phase prompts with one click.

No blockers for next plan.

## Self-Check: PASSED

**Files created:**

- ✓ components/project-pipeline/task-instruction-card.tsx
- ✓ components/project-pipeline/phase-tasks.tsx (modified)
- ✓ components/project-pipeline/phase-card.tsx (modified)
- ✓ app/actions/pipeline.ts (modified)

**Commits verified:**

- ✓ 3834838 - Task 1: Create TaskInstructionCard component
- ✓ 06dcd0a - Task 2: Add togglePhaseTask server action
- ✓ 8380405 - Task 3: Update PhaseTasks to use phase_items
- ✓ 2e077a9 - Task 4: Add Copy prompt button to phase header

All artifacts verified and present.

---

_Phase: 01-trainee-interactive-system_
_Completed: 2026-03-01_
