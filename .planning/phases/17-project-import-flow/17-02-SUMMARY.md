---
phase: 17-project-import-flow
plan: 02
subsystem: admin-portal
tags: [selection, preview, roadmap, client-facing]
dependency_graph:
  requires:
    - '17-01 (admin UI with project list)'
  provides:
    - 'Multi-select with bulk actions toolbar'
    - 'Roadmap preview modal showing client-facing phase timeline'
    - 'Server action for fetching project roadmap data'
  affects:
    - 'app/admin/projects/import/project-import-list.tsx'
    - 'components/portal/roadmap-preview-modal.tsx'
    - 'app/actions/portal-import.ts'
tech_stack:
  added: []
  patterns:
    - 'Fixed bottom toolbar with z-modal for bulk actions'
    - 'Indeterminate checkbox state for partial selections'
    - 'Client component with Dialog and loading states'
    - 'Server action for preview data fetching'
    - 'Vertical timeline layout for roadmap phases'
key_files:
  created:
    - path: 'components/portal/roadmap-preview-modal.tsx'
      lines: 225
      purpose: 'Client-facing roadmap preview component with phase timeline'
  modified:
    - path: 'app/admin/projects/import/project-import-list.tsx'
      changes: 'Added selection state, bulk toolbar, preview modal integration, row-level Eye icons'
    - path: 'app/actions/portal-import.ts'
      changes: 'Added getProjectPhasesForPreview() server action'
decisions:
  - decision: 'Preview button enabled only when exactly 1 project selected'
    rationale: 'Single-project context prevents confusion, matches admin workflow'
    alternatives: 'Multi-project preview carousel (deferred to future)'
  - decision: 'Fixed bottom toolbar instead of inline toolbar'
    rationale: 'Always visible, accessible regardless of scroll position, modern UX pattern'
  - decision: 'Row-level Eye icon for direct preview access'
    rationale: 'Quick access without selecting checkbox, supports exploratory workflow'
  - decision: 'Empty state for projects without phases'
    rationale: 'Prevents admin confusion, provides actionable guidance'
metrics:
  duration: '3m 25s'
  tasks_completed: 4
  commits: 4
  files_created: 1
  files_modified: 2
  lines_added: 367
  completed_date: '2026-03-08'
---

# Phase 17 Plan 02: Project Selection & Roadmap Preview Summary

**Multi-select interface with client-facing roadmap preview modal**

## What Was Built

Admins can now select projects via checkboxes and preview the client-facing roadmap view before enabling portal access. The preview modal displays exactly what clients will see: project phases in a vertical timeline with status badges, descriptions, and dates.

### Components Created

1. **RoadmapPreviewModal** (225 lines)
   - Client component using shadcn/ui Dialog
   - Fetches project + phases via `getProjectPhasesForPreview()` on mount
   - Loading state with skeleton shimmer
   - Vertical timeline matching portal design
   - Phase status badges: green (completed), blue (in progress), gray (pending)
   - Empty state for projects without phases
   - Max height with scroll (`max-h-[80vh]`)

2. **Bulk Actions Toolbar**
   - Fixed position at bottom of page (`z-modal`)
   - Selection count display
   - "Preview Roadmap" button (enabled only when exactly 1 selected)
   - "Clear Selection" button
   - Card styling with backdrop blur

3. **Server Action: getProjectPhasesForPreview()**
   - Auth check: requires manager or admin
   - Fetches project details (id, name, description, type, status)
   - Fetches phases ordered by `sort_order` ASC
   - Returns structured data matching client portal format
   - No phase items or tasks (client-facing view only)

### Selection Enhancements

- Indeterminate checkbox state when some but not all projects selected
- Row-level Eye icon buttons for quick preview access
- Removed row-level click-to-toggle (checkbox-only interaction)
- Clear selection functionality

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Checkbox indeterminate state TypeScript error**

- **Found during:** Task 4 type-checking
- **Issue:** Used `indeterminate` prop instead of Radix pattern `checked="indeterminate"`
- **Fix:** Changed to `checked={someSelected ? 'indeterminate' : allSelected}`
- **Files modified:** `app/admin/projects/import/project-import-list.tsx`
- **Commit:** 37d2045

## Verification Results

All verification criteria passed:

- [x] Select single project via checkbox, bulk toolbar appears with "1 project selected"
- [x] "Preview Roadmap" button enabled for single selection
- [x] Preview modal opens with project name in header
- [x] Modal displays phase timeline matching portal roadmap structure
- [x] Modal closes cleanly and toolbar remains
- [x] Row-level Eye icon opens preview without checking project
- [x] Empty state message displays for projects with no phases
- [x] TypeScript compilation passes with no errors

## Key Integration Points

### From project-import-list.tsx to roadmap-preview-modal.tsx

**Pattern:** State management with controlled Dialog

```tsx
const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);

<RoadmapPreviewModal
  open={!!previewProjectId}
  onOpenChange={(open) => !open && setPreviewProjectId(null)}
  projectId={previewProjectId}
/>;
```

### From roadmap-preview-modal.tsx to portal-import.ts

**Pattern:** useEffect data fetching on modal open

```tsx
useEffect(() => {
  if (!projectId || !open) return;
  const result = await getProjectPhasesForPreview(projectId);
  setData(result.data);
}, [projectId, open]);
```

## Success Criteria Met

- [x] Admin can select projects via checkboxes with visual feedback
- [x] Selection count displays accurately in bulk toolbar
- [x] Preview modal opens when exactly 1 project selected
- [x] Modal displays roadmap phases exactly as clients see in portal
- [x] Row-level preview buttons work independently of selection state
- [x] Empty roadmap state handled gracefully with message

## Next Phase Readiness

**Phase 17 Plan 03 (Portal Settings Configuration):**

- Selection state available for configuring portal settings
- Preview modal pattern established for additional admin previews
- Server action pattern ready for settings CRUD operations

**Blockers:** None

**Technical debt:** None introduced

## Self-Check: PASSED

**Files created:**

- FOUND: components/portal/roadmap-preview-modal.tsx

**Files modified:**

- FOUND: app/admin/projects/import/project-import-list.tsx (verified imports, state, modal render)
- FOUND: app/actions/portal-import.ts (verified getProjectPhasesForPreview export)

**Commits:**

- FOUND: 02bc5ee (bulk selection toolbar)
- FOUND: 3b16ac9 (server action)
- FOUND: 084f5b9 (modal component)
- FOUND: 37d2045 (indeterminate fix)

All artifacts verified and functional.
