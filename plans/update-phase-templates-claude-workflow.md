# Update Phase Templates to Claude Code Workflow

## Overview

Transform project phase tasks from vague descriptions into actionable Claude Code workflow instructions. Each task should follow the format: "Prompt Claude to do X", "Run command Y", or "MANUAL: do Z".

**Scope**: Update phases 2-5 (Design, Build, Test, Ship) while keeping Phase 1 (Plan) unchanged.

**Affected Projects**: All existing projects + new project creation templates.

---

## Problem Statement

Current phase tasks are too vague for efficient AI-assisted development:

```
Current: "Sketch wireframes"
Better: "MANUAL: Sketch wireframes in Excalidraw or paper, take photos"

Current: "Build main pages"
Better: "Claude: /workflows:plan 'Build [page_name] page with [features]'"
```

The goal is to make every task:

1. **Actionable** - Clear what to do
2. **AI-first** - Leverage Claude Code commands when possible
3. **Verifiable** - Know when it's done

---

## Proposed Solution

Update `UNIVERSAL_PIPELINE` in `app/actions/pipeline.ts` with new task formats, then run a migration to update all existing projects.

### Task Format Convention

| Prefix    | Meaning               | Example                                  |
| --------- | --------------------- | ---------------------------------------- |
| `Claude:` | Prompt Claude Code    | `Claude: /workflows:plan "Auth pages"`   |
| `Run:`    | Execute shell command | `Run: npm run dev`                       |
| `MANUAL:` | Human action required | `MANUAL: Get client feedback in meeting` |
| `Check:`  | Verification step     | `Check: All tests passing`               |

---

## Technical Approach

### Files to Modify

| File                              | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `app/actions/pipeline.ts:309-367` | Update `UNIVERSAL_PIPELINE` constant              |
| `app/actions/pipeline.ts:548-633` | Modify `resetAllPhaseTasks()` to use new template |

### New Phase Templates

#### Phase 2: Design (unchanged name, new tasks)

```typescript
{
  name: 'Design',
  order: 2,
  description: 'Create specifications and mockups',
  tasks: [
    'MANUAL: Sketch wireframes in Excalidraw/paper, save to /docs',
    'Claude: "Suggest color palette and fonts based on [client industry]"',
    'Claude: "Design database schema for [MVP features]. Output as Mermaid ERD"',
    'MANUAL: Share wireframes + schema with client for approval',
    'Check: Client approved design before moving to Build',
  ],
}
```

#### Phase 3: Build (unchanged name, new tasks)

```typescript
{
  name: 'Build',
  order: 3,
  description: 'Implement the solution',
  tasks: [
    'Run: npx create-next-app@latest [project-name] --typescript --tailwind --app',
    'Claude: "Set up Supabase client in lib/supabase/. Add server.ts and client.ts"',
    'Claude: /supabase "Create tables from the ERD in /docs"',
    'Claude: /supabase "Add RLS policies: users can only access their own data"',
    'Claude: /workflows:plan "[Feature 1 from MVP list]"',
    'Claude: /workflows:work plans/[feature-1].md',
    'Claude: /workflows:plan "[Feature 2 from MVP list]"',
    'Claude: /workflows:work plans/[feature-2].md',
    'Run: npm run build (must succeed with no errors)',
    'Run: npm run dev and test locally',
  ],
}
```

#### Phase 4: Test (unchanged name, new tasks)

```typescript
{
  name: 'Test',
  order: 4,
  description: 'Verify quality and functionality',
  tasks: [
    'Claude: "Write integration tests for [critical user flows]"',
    'Run: npm test (all tests must pass)',
    'MANUAL: Test full flow in browser: signup → main feature → logout',
    'MANUAL: Test responsive on mobile (Chrome DevTools)',
    'Claude: /responsive "Check homepage and [key pages] for mobile issues"',
    'MANUAL: Fix any bugs found, use Claude: /smart-fix "[bug description]"',
    'MANUAL: Schedule demo call with client',
    'MANUAL: Demo to client, collect feedback',
  ],
}
```

#### Phase 5: Ship (unchanged name, new tasks)

```typescript
{
  name: 'Ship',
  order: 5,
  description: 'Deploy and deliver',
  tasks: [
    'Run: git add . && git commit -m "feat: MVP complete"',
    'Run: git push origin main',
    'Claude: /vercel-deploy "Deploy to Vercel with env vars from .env.local"',
    'Check: Site loads on Vercel preview URL',
    'MANUAL: Add custom domain in Vercel dashboard',
    'MANUAL: Update DNS records at domain registrar',
    'Check: Site loads on custom domain with HTTPS',
    'MANUAL: Final walkthrough with client',
    'MANUAL: Send handover document with credentials and docs',
  ],
}
```

---

## Implementation Phases

### Phase 1: Update Template Constant

**Tasks:**

- [ ] `app/actions/pipeline.ts:309-367` - Update `UNIVERSAL_PIPELINE` with new task arrays

**Claude prompt:**

```
Claude: "Update UNIVERSAL_PIPELINE in app/actions/pipeline.ts. Replace tasks for phases 2-5 with the new Claude workflow format. Keep Phase 1 (Plan) unchanged."
```

### Phase 2: Create Migration Function

**Tasks:**

- [ ] Add `updateAllProjectPhaseTasks()` function to `app/actions/pipeline.ts`
- [ ] Function should:
  1. Get all projects with phases
  2. For each project, delete existing tasks for phases 2-5
  3. Create new tasks from updated template
  4. Preserve task completion status where title matches

**Claude prompt:**

```
Claude: "Add updateAllProjectPhaseTasks() to app/actions/pipeline.ts. It should update tasks for phases 2-5 on all existing projects using the new UNIVERSAL_PIPELINE template. Preserve completion status for matching task titles."
```

### Phase 3: Run Migration

**Tasks:**

- [ ] `Run: npm run build` (verify no errors)
- [ ] Create a one-off API route or script to run the migration
- [ ] `Run: curl http://localhost:3000/api/admin/migrate-phases` (or equivalent)
- [ ] Verify a sample project has new tasks

---

## Acceptance Criteria

### Functional Requirements

- [ ] New projects get Claude workflow tasks automatically
- [ ] Existing projects updated with new task format
- [ ] Phase 1 (Plan) remains unchanged
- [ ] Task prefixes (Claude:, Run:, MANUAL:, Check:) are consistent

### Quality Gates

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual test: Create new project, verify tasks match template

---

## Rollback Plan

If issues arise:

1. Revert `UNIVERSAL_PIPELINE` to original tasks
2. Run `resetAllPhaseTasks()` which exists at line 548

---

## References

### Internal References

- Pipeline constants: `app/actions/pipeline.ts:309-367`
- Reset function: `app/actions/pipeline.ts:548-633`
- Bulk initialization: `app/actions/pipeline.ts:704-802`

### External References

- Claude Code workflows: User's `~/.claude/CLAUDE.md`
- Task format best practices: AI workflow research

---

## Full Updated UNIVERSAL_PIPELINE

```typescript
const UNIVERSAL_PIPELINE = [
  {
    name: 'Plan',
    order: 1,
    description: 'Define scope and requirements',
    tasks: [
      'Create project folder locally',
      'Create GitHub repo',
      'Create Supabase project',
      'Create Vercel project',
      'Get client requirements',
      'List MVP features',
    ],
  },
  {
    name: 'Design',
    order: 2,
    description: 'Create specifications and mockups',
    tasks: [
      'MANUAL: Sketch wireframes in Excalidraw or paper, save to /docs',
      'Claude: "Suggest color palette and fonts for [client industry]"',
      'Claude: "Design database schema for MVP features. Output Mermaid ERD"',
      'MANUAL: Share wireframes + schema with client for approval',
      'Check: Client approved design before moving to Build',
    ],
  },
  {
    name: 'Build',
    order: 3,
    description: 'Implement the solution',
    tasks: [
      'Run: npx create-next-app@latest [name] --typescript --tailwind --app',
      'Claude: "Set up Supabase client in lib/supabase/ with server.ts and client.ts"',
      'Claude: /supabase "Create tables from the ERD in /docs"',
      'Claude: /supabase "Add RLS policies - users access own data only"',
      'Claude: /workflows:plan "[Feature 1 from MVP]"',
      'Claude: /workflows:work plans/[feature-1].md',
      'Claude: /workflows:plan "[Feature 2 from MVP]"',
      'Claude: /workflows:work plans/[feature-2].md',
      'Run: npm run build (must succeed)',
      'Run: npm run dev - test locally',
    ],
  },
  {
    name: 'Test',
    order: 4,
    description: 'Verify quality and functionality',
    tasks: [
      'Claude: "Write integration tests for critical user flows"',
      'Run: npm test (all tests must pass)',
      'MANUAL: Test full flow: signup → core feature → logout',
      'MANUAL: Test responsive on mobile (Chrome DevTools)',
      'Claude: /responsive "Check key pages for mobile issues"',
      'Claude: /smart-fix "[any bugs found]"',
      'MANUAL: Schedule and run demo with client',
      'MANUAL: Collect and address client feedback',
    ],
  },
  {
    name: 'Ship',
    order: 5,
    description: 'Deploy and deliver',
    tasks: [
      'Run: git add . && git commit -m "feat: MVP complete"',
      'Run: git push origin main',
      'Claude: /vercel-deploy "Deploy with env vars from .env.local"',
      'Check: Site loads on Vercel preview URL',
      'MANUAL: Add custom domain in Vercel dashboard',
      'MANUAL: Update DNS at domain registrar',
      'Check: Site loads on custom domain with HTTPS',
      'MANUAL: Final walkthrough with client',
      'MANUAL: Send handover doc with credentials',
    ],
  },
];
```

---

## Migration Function

```typescript
export async function updateAllProjectPhaseTasks(): Promise<ActionResult> {
  const supabase = await createClient();

  // Get all projects with their phases
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, project_id')
    .in('name', ['Design', 'Build', 'Test', 'Ship']);

  if (phasesError) {
    return { success: false, error: phasesError.message };
  }

  let updated = 0;
  let errors: string[] = [];

  for (const phase of phases) {
    // Find matching template
    const template = UNIVERSAL_PIPELINE.find((p) => p.name === phase.name);
    if (!template) continue;

    // Get existing tasks to preserve completion status
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('title, status, completed_at')
      .eq('phase_id', phase.id);

    const completedTitles = new Set(
      existingTasks?.filter((t) => t.status === 'Done').map((t) => t.title) || []
    );

    // Delete old tasks
    await supabase.from('tasks').delete().eq('phase_id', phase.id);

    // Get workspace_id from project
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', phase.project_id)
      .single();

    if (!project) continue;

    // Create new tasks from template
    const newTasks = template.tasks.map((title, index) => ({
      workspace_id: project.workspace_id,
      project_id: phase.project_id,
      phase_id: phase.id,
      phase_name: phase.name,
      title,
      status: completedTitles.has(title) ? 'Done' : 'Todo',
      sort_order: index,
      show_in_inbox: false,
    }));

    const { error: insertError } = await supabase.from('tasks').insert(newTasks);

    if (insertError) {
      errors.push(`Phase ${phase.id}: ${insertError.message}`);
    } else {
      updated++;
    }
  }

  return {
    success: errors.length === 0,
    data: { updated, errors },
    error: errors.length > 0 ? `${errors.length} phases failed` : undefined,
  };
}
```
