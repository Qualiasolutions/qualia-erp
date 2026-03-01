# Coding Conventions

**Analysis Date:** 2026-03-01

## Naming Patterns

**Files:**

- Component files: PascalCase with extension indicating type
  - `TasksWidget.tsx`, `DashboardPage.tsx`, `EditTaskModal.tsx`
- Utility files: kebab-case
  - `server-utils.ts`, `schedule-utils.ts`, `color-constants.ts`
- Server actions: Domain-based grouping in `app/actions/`
  - `projects.ts`, `clients.ts`, `meetings.ts`, `inbox.ts`
- Test files: Co-located with `__tests__/` directory
  - `__tests__/lib/validation.test.ts`, `__tests__/components/button.test.tsx`

**Functions:**

- camelCase for all functions
  - `createProject()`, `getProjects()`, `updateTask()`, `formatDateTime()`
- Server actions prefix with verb: `create*`, `update*`, `delete*`, `get*`
  - `createProject()`, `updateIssue()`, `deleteTask()`, `getProjectById()`
- Utility functions are descriptive: `truncate()`, `formatRelativeTime()`, `safeJsonParse()`
- Hook naming: `use*` prefix
  - `useInboxTasks()`, `useProjects()`, `useTodaysMeetings()`

**Variables:**

- camelCase for all variables
  - `const workspaceId = ...`, `let currentStatus = ...`
- Constants: SCREAMING_SNAKE_CASE when exported from constants files
  - `TASK_STATUSES`, `PROJECT_TYPES`, `LEAD_STATUSES`, `DATE_FORMAT`
- Boolean variables: Prefixed with `is`, `has`, `can`
  - `isOverdue`, `hasEnvVars`, `canDelete`

**Types:**

- PascalCase for interfaces and types
  - `ActionResult`, `Task`, `Project`, `ActivityType`
- Type files suffix: `.d.ts` for declarations
  - `types/database.ts` exports generated Supabase types

## Code Style

**Formatting:**

- Tool: Prettier 3.x
- Config: `.prettierrc`
  - Semi-colons: `true`
  - Single quotes: `true`
  - Tab width: `2`
  - Trailing comma: `"es5"`
  - Print width: `100`
  - Plugin: `prettier-plugin-tailwindcss` for class sorting

**Linting:**

- Tool: ESLint 9.x with flat config
- Config: `eslint.config.mjs`
- Extends: `next/core-web-vitals`, `next/typescript`
- Ignores: `.next/`, `node_modules/`, `build/`, `dist/`, `coverage/`

**Pre-commit Enforcement:**

- Husky + lint-staged configured
- Auto-runs on `*.{ts,tsx}`: `eslint --fix`, `prettier --write`
- Auto-runs on `*.{json,md,css}`: `prettier --write`

## Import Organization

**Order:**

1. External libraries (React, Next.js, third-party)
2. Internal aliases (`@/*`)
3. Relative imports (`./`, `../`)

**Example:**

```typescript
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { createProject, deleteProject } from '@/app/actions/projects';
import { invalidateDailyFlow } from '@/lib/swr';

import { ProjectCard } from './project-card';
```

**Path Aliases:**

- `@/*` maps to project root via `tsconfig.json`
  - `@/lib/utils`, `@/components/ui/button`, `@/app/actions`

## Error Handling

**Patterns:**

- Server actions return `ActionResult` type:
  ```typescript
  type ActionResult = { success: boolean; error?: string; data?: unknown };
  ```
- Always return explicit success/failure:
  ```typescript
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
  ```
- Client-side async handlers use try-catch with toast notifications (Sonner)
- Validation uses Zod `.safeParse()` to avoid throwing
- Auth checks return early with `{ success: false, error: 'Not authenticated' }`

**Standard Error Responses:**

```typescript
// Auth failure
return { success: false, error: 'Not authenticated' };

// Validation failure
const validation = parseFormData(schema, formData);
if (!validation.success) {
  return { success: false, error: validation.error };
}

// Database failure
if (error) {
  return { success: false, error: error.message };
}

// Authorization failure
const hasPermission = await canDeleteProject(projectId);
if (!hasPermission) {
  return { success: false, error: 'Not authorized' };
}
```

## Logging

**Framework:** Console (no structured logger)

**Patterns:**

- Development: `console.log()`, `console.error()`
- Production: Minimal logging, errors only
- No logging in client components (React devtools)
- Server actions log errors: `console.error('Failed to create project:', error)`

**When to Log:**

- Database errors in server actions
- Authentication failures
- Webhook processing (VAPI, Vercel)
- AI tool execution (`lib/ai/tools/`)

## Comments

**When to Comment:**

- Complex business logic requiring explanation
- Non-obvious workarounds or Supabase FK normalization
- Section dividers in large files (e.g., `app/actions.ts`)
- Function purpose when not self-evident

**Example Section Dividers:**

```typescript
// ============ PROJECT TYPES ============

// ============ PROJECT ACTIONS ============

// =====================
// Issue Schemas
// =====================
```

**JSDoc/TSDoc:**

- Used for utility functions and public APIs
- Format:
  ```typescript
  /**
   * Merge Tailwind CSS classes with proper precedence
   */
  export function cn(...inputs: ClassValue[]) { ... }
  ```
- Not required for simple functions or server actions

## Function Design

**Size:**

- Server actions: 30-100 lines typical
- Utilities: 10-30 lines
- Large files (`app/actions.ts`) are deprecated – migrate to domain modules

**Parameters:**

- Server actions take `FormData` or plain objects
- Validation via Zod schemas before processing
- Optional parameters use `?` or default values
- Return type always declared for server actions: `: Promise<ActionResult>`

**Return Values:**

- Server actions: `ActionResult` object
- Utilities: Explicit return types
  ```typescript
  export function formatDate(
    date: string | Date | null | undefined,
    formatStr = DATE_FORMAT
  ): string;
  ```
- Hooks: Tuple or object destructuring
  ```typescript
  const { data: tasks, error, isLoading } = useInboxTasks();
  ```

## Module Design

**Exports:**

- Named exports preferred over default exports
  - Exception: Page components (`page.tsx`) use default export
- Barrel file pattern in `app/actions/index.ts` for backward compatibility
  ```typescript
  export { createProject, getProjects } from './actions/projects';
  export { createClient, getClients } from './actions/clients';
  ```
- Utilities export multiple functions from single file
  ```typescript
  // lib/utils.ts
  export function cn(...) { ... }
  export function formatDate(...) { ... }
  export function truncate(...) { ... }
  ```

**Barrel Files:**

- Used in `app/actions/index.ts` for re-exporting all domain actions
- Used in `components/ui/` for shadcn components
- Not used elsewhere to avoid circular dependencies

**File Organization:**

- Domain-driven structure for server actions:
  - `app/actions/projects.ts` – Project CRUD
  - `app/actions/clients.ts` – Client CRM
  - `app/actions/inbox.ts` – Task management
  - `app/actions/shared.ts` – Common types and helpers
- Feature-based components:
  - `components/today-dashboard/` – Dashboard widgets
  - `components/project-wizard/` – Multi-step forms

## TypeScript Conventions

**Strict Mode:** Enabled in `tsconfig.json`

- `strict: true`
- `forceConsistentCasingInFileNames: true`

**Type Inference:**

- Prefer type inference over explicit types where obvious
  ```typescript
  const tasks = useInboxTasks(); // Inferred type
  ```
- Declare types for function signatures, complex objects, props
  ```typescript
  interface TasksWidgetProps {
    tasks: Task[];
  }
  ```

**Type Imports:**

- Use `import type` for type-only imports
  ```typescript
  import type { ActionResult, ActivityType } from './shared';
  ```

**Enums vs Union Types:**

- Union types from database schema exported as constants
  ```typescript
  export const TASK_STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'Done', 'Canceled'];
  ```
- No enums – use string literal unions instead

**Type Safety:**

- Zod schemas provide runtime validation + TypeScript types
  ```typescript
  const createProjectSchema = z.object({ ... });
  type CreateProjectInput = z.infer<typeof createProjectSchema>;
  ```

## React Patterns

**Client Components:**

- Use `'use client'` directive at top of file
- Hooks: `useState`, `useTransition`, `useOptimistic`, `useRouter`
- No server-side data fetching

**Server Components:**

- Default in Next.js App Router
- Direct Supabase queries via `createClient()` from `@/lib/supabase/server`
- Pass data to client components as props

**Optimistic Updates:**

- Use `useOptimistic` hook for instant UI feedback
  ```typescript
  const [optimisticTasks, addOptimistic] = useOptimistic(tasks, tasksReducer);
  ```

**Memoization:**

- `React.memo()` for list item components to prevent re-renders
- `useCallback` for event handlers passed to children

## Data Fetching

**SWR Hooks:**

- Auto-refresh: 45s for active data, 90s for reference data
- Stop polling when tab hidden
- Manual invalidation: `invalidateInboxTasks(true)`, `invalidateDailyFlow(true)`

**Server Actions:**

- Prefer server actions over API routes for mutations
- Always call `revalidatePath()` after mutations
  ```typescript
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  ```

## Validation

**Zod Schemas:**

- Centralized in `lib/validation.ts`
- Naming: `create*Schema`, `update*Schema`
  - `createProjectSchema`, `updateTaskSchema`, `createClientSchema`
- Helper functions:
  ```typescript
  parseFormData(schema, formData); // For FormData inputs
  validateData(schema, data); // For plain objects
  ```

**Form Validation:**

- Validate in server actions before database operations
  ```typescript
  const validation = parseFormData(createProjectSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }
  ```

**Empty String Handling:**

- `parseFormData()` converts empty strings to `null` automatically

---

_Convention analysis: 2026-03-01_
