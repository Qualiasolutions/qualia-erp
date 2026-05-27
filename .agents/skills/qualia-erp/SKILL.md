```markdown
# qualia-erp Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you how to contribute effectively to the `qualia-erp` TypeScript codebase. It covers the project's coding conventions, commit patterns, and the main workflows for adding features, expanding the admin surface, syncing planning documents, refactoring, and handling database migrations. You'll learn how to structure code, write tests, and use suggested commands to streamline your development process.

## Coding Conventions

- **Language:** TypeScript
- **Framework:** None detected (custom structure)
- **File Naming:** Use `camelCase` for file names.
  - Example: `adminSectionNav.tsx`, `qualiaSidebar.tsx`
- **Import Style:** Use aliases for imports.
  - Example:
    ```typescript
    import { getUser } from 'lib/auth/user'
    import { AdminSectionNav } from 'components/portal/adminSectionNav'
    ```
- **Export Style:** Mixed (both default and named exports are used).
  - Example:
    ```typescript
    // Named export
    export function fetchData() { ... }

    // Default export
    export default function AdminPage() { ... }
    ```
- **Commit Patterns:** Follows [Conventional Commits](https://www.conventionalcommits.org/)
  - Types: `chore`, `feat`, `fix`, `refactor`, `docs`
  - Example: `feat(admin): add user management page`
- **Component Organization:** UI components are under `components/portal/`, pages under `app/(portal)/`, and server actions under `app/actions/`.

## Workflows

### Admin Surface Expansion
**Trigger:** When you want to add new admin features or reorganize admin navigation.  
**Command:** `/add-admin-surface`

1. Create or update page files under `app/(portal)/admin/*` (e.g., new index/detail pages, stubs, or layouts).
2. Add or update shared navigation components such as `admin-section-nav` or `qualia-sidebar`.
3. Implement or update server actions in `app/actions/admin-control/*` and barrel-export in `index.ts`.
4. Update or remove related documentation or planning notes if needed.

**Example:**
```typescript
// app/(portal)/admin/users/index.tsx
import { AdminSectionNav } from 'components/portal/adminSectionNav'

export default function UsersAdminPage() {
  return (
    <div>
      <AdminSectionNav />
      {/* ... */}
    </div>
  )
}
```

### Planning/Tracking Sync
**Trigger:** When you want to update project planning or tracking status.  
**Command:** `/sync-tracking`

1. Update `.planning/tracking.json` with new status or sync info.
2. Optionally update related planning files (e.g., `STATE.md`, `ROADMAP.md`).

**Example:**
```json
// .planning/tracking.json
{
  "featureX": "in-progress",
  "lastUpdated": "2024-06-01"
}
```

### Feature Implementation with Server Action
**Trigger:** When you want to add a new feature that requires both frontend and backend changes.  
**Command:** `/add-feature`

1. Create or update UI components/pages (e.g., under `app/(portal)/*` or `components/portal/*`).
2. Add or update server action files (e.g., `app/actions/*`).
3. Wire up UI to use new server actions.
4. Optionally add or update helper functions or integration libs.

**Example:**
```typescript
// app/actions/userActions.ts
export async function createUser(data) { /* ... */ }

// app/(portal)/users/create.tsx
import { createUser } from 'app/actions/userActions'

function handleSubmit(formData) {
  createUser(formData)
}
```

### Refactor or Cleanup with Component Removal
**Trigger:** When you want to clean up, refactor, or remove unused code/components.  
**Command:** `/refactor-cleanup`

1. Identify and remove unused or duplicate helpers/components.
2. Rename or reorganize helpers to clarify intent or reduce collisions.
3. Update all affected imports and usages across `app/(portal)/*` and `components/portal/*`.
4. Update documentation or planning files if relevant.

**Example:**
```typescript
// Remove unused helper from lib/oldHelper.ts
// Update imports in components/portal/ to use lib/newHelper.ts
```

### Feature with Database Migration
**Trigger:** When you want to add or change a feature that needs a schema or RLS update.  
**Command:** `/add-migration-feature`

1. Write a new migration SQL file under `supabase/migrations/*`.
2. Update server actions or helpers to use the new/changed schema.
3. Update or add relevant `lib/auth` or `lib/cached-reads` helpers.
4. Wire up UI or API to reflect the new data access patterns.

**Example:**
```sql
-- supabase/migrations/20240601_add_user_role.sql
ALTER TABLE users ADD COLUMN role TEXT;
```
```typescript
// lib/auth/role.ts
export function getUserRole(userId: string) { /* ... */ }
```

## Testing Patterns

- **Test File Pattern:** `*.test.*` (e.g., `userActions.test.ts`)
- **Testing Framework:** Unknown (check for test runner in project)
- **Typical Test Example:**
  ```typescript
  // userActions.test.ts
  import { createUser } from './userActions'

  test('creates a user', async () => {
    const result = await createUser({ name: 'Alice' })
    expect(result).toHaveProperty('id')
  })
  ```

## Commands

| Command                | Purpose                                                      |
|------------------------|--------------------------------------------------------------|
| /add-admin-surface     | Add or reorganize admin portal pages and navigation          |
| /sync-tracking         | Sync or update project planning/tracking files               |
| /add-feature           | Implement a new feature with UI and server action changes    |
| /refactor-cleanup      | Refactor code, remove dead code, or reorganize components    |
| /add-migration-feature | Add a feature that requires a database migration             |
```