# Fix: New Project Wizard Functionality

## Overview

Fix the "+New Project" wizard to work as intended - ensuring projects are created correctly with proper cache invalidation, SWR updates, and consistent behavior.

## Problem Statement

The current project creation wizard has several issues identified through codebase analysis:

| Issue                           | Impact                                            | Status   |
| ------------------------------- | ------------------------------------------------- | -------- |
| **No SWR cache invalidation**   | Projects don't appear in lists until page refresh | Critical |
| **Misleading action name**      | `createProjectWithRoadmap` doesn't create roadmap | Medium   |
| **No transaction handling**     | Partial failures can leave orphaned clients       | Medium   |
| **Missing email notifications** | Inconsistent with legacy `createProject` action   | Low      |

## Proposed Solution

### Phase 1: Fix SWR Cache Invalidation (Critical)

The wizard calls `createProjectWithRoadmap` which only uses `revalidatePath()`. This doesn't update SWR caches, so the project list won't show the new project until manual refresh.

**Files to modify:**

- `components/project-wizard/project-wizard.tsx:127-133`

**Changes:**

```typescript
// After successful creation, invalidate SWR caches
if (result.success) {
  // Add SWR invalidation
  invalidateProjects(true);
  invalidateDailyFlow(true);
  invalidateTimeline(true);

  onOpenChange(false);
  router.push(`/projects/${(result.data as { id: string }).id}`);
  router.refresh();
}
```

**Import to add:**

```typescript
import { invalidateProjects, invalidateDailyFlow, invalidateTimeline } from '@/lib/swr';
```

### Phase 2: Reset Form State on Success

Currently, the wizard resets form state only on close, not on success. This could cause stale data if the user opens the wizard again.

**Files to modify:**

- `components/project-wizard/project-wizard.tsx:127-140`

**Changes:**

- Reset `wizardData` to initial state after successful creation
- Reset `currentStep` to 1

### Phase 3: Improve Error Handling

Add toast notifications for success/error states for better UX.

**Files to modify:**

- `components/project-wizard/project-wizard.tsx`

**Changes:**

```typescript
import { toast } from 'sonner';

// On success
toast.success(`Project "${wizardData.name}" created successfully`);

// On error (already shows inline, add toast for visibility)
toast.error(result.error || 'Failed to create project');
```

## Acceptance Criteria

- [ ] New projects appear immediately in the project list without page refresh
- [ ] SWR caches (`projects`, `daily-flow`, `timeline-dashboard`) are invalidated on creation
- [ ] Form state resets after successful project creation
- [ ] Success toast notification shows project name
- [ ] Error toast notification shows error message
- [ ] Wizard can be reopened and used immediately after creating a project

## Technical Considerations

### SWR Invalidation Functions

From `lib/swr.ts`, the following invalidation functions should be called:

```typescript
// Existing functions to use
invalidateProjects(immediate: boolean = true)
invalidateDailyFlow(immediate: boolean = true)
invalidateTimeline(immediate: boolean = true)
```

### Type Safety

The `result.data` is typed as `unknown` in `ActionResult`. We need to handle the type assertion safely:

```typescript
const projectData = result.data as { id: string } | undefined;
if (projectData?.id) {
  router.push(`/projects/${projectData.id}`);
}
```

## Test Plan

- [ ] Create a new project via wizard → verify it appears in project list immediately
- [ ] Create project with custom client → verify client is created and linked
- [ ] Create project with existing client → verify project links correctly
- [ ] Open wizard again after creation → verify form is reset (empty)
- [ ] Test error scenario (e.g., validation failure) → verify error displays
- [ ] Test from different entry points (header button, column "+" button)

## References

- `components/project-wizard/project-wizard.tsx:1-279` - Main wizard component
- `app/actions.ts:2631-2732` - `createProjectWithRoadmap` server action
- `lib/swr.ts` - SWR cache invalidation utilities
- `lib/validation.ts:109-140` - `createProjectWizardSchema`

---

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
