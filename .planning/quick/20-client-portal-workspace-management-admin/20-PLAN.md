---
phase: 20-client-portal-workspace-management-admin
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/actions/client-portal.ts
  - components/portal/portal-hub.tsx
autonomous: true

must_haves:
  truths:
    - 'Admin can create a new client workspace (name + email + projects) without needing a pre-existing CRM entry'
    - 'Created workspace appears immediately in the portal hub grid with correct project count'
    - 'Credentials (email + temp password) are shown in a copy dialog after creation'
    - 'Admin can click a client card and manage (add/remove) projects assigned to that workspace'
  artifacts:
    - path: 'app/actions/client-portal.ts'
      provides: 'createClientWorkspace server action'
      contains: 'createClientWorkspace'
    - path: 'components/portal/portal-hub.tsx'
      provides: 'Create Workspace button + dialog, manage projects per client'
      contains: 'createClientWorkspace'
  key_links:
    - from: 'components/portal/portal-hub.tsx'
      to: 'app/actions/client-portal.ts'
      via: 'createClientWorkspace server action call'
      pattern: 'createClientWorkspace'
    - from: 'createClientWorkspace'
      to: 'clients table + setupPortalForClient'
      via: 'insert CRM client then call existing setup'
      pattern: 'supabase.from.*clients.*insert'
---

<objective>
Add "Create Workspace" flow to the portal admin page so admins can create a new client workspace
(CRM entry + portal credentials + project assignment) in a single dialog, without requiring an
existing CRM client.

Additionally, add per-client project management: clicking a client's card opens a dialog to
add or remove project assignments without recreating credentials.

Purpose: The portal hub currently shows "No clients found" for new installs and has no way to
create workspaces from scratch. Admins need a self-contained flow.

Output: New server action + enhanced PortalHub dialog.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/portal/portal-hub.tsx
@app/actions/client-portal.ts
@app/portal/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add createClientWorkspace server action</name>
  <files>app/actions/client-portal.ts</files>
  <action>
    Add a new exported server action `createClientWorkspace` at the bottom of client-portal.ts
    (before the closing lines), following the same pattern as `setupPortalForClient`.

    Function signature:
    ```ts
    export async function createClientWorkspace(
      name: string,
      email: string,
      projectIds: string[]
    ): Promise<ActionResult>
    ```

    Implementation steps:
    1. Auth check: `supabase.auth.getUser()` — return error if no user
    2. Permission check: `isUserManagerOrAbove(user.id)` — return error if not admin/manager
    3. Get workspaceId via `getCurrentWorkspaceId()` (already imported)
    4. Validate inputs: name must be non-empty, email must be valid format (basic regex), projectIds
       must have at least one entry
    5. Check if a `clients` row with this email already exists (contacts JSONB first element):
       - Use: `supabase.from('clients').select('id, name, contacts').order('created_at')`
       - Filter in JS: find client whose `contacts[0].email` matches the normalized email
       - If found: skip CRM creation, use existing client id
    6. If not found: insert new row into `clients` table:
       ```ts
       supabase.from('clients').insert({
         name,
         workspace_id: workspaceId,
         contacts: [{ name, email: normalizedEmail }],
         lead_status: 'active_client',
       }).select('id').single()
       ```
    7. Call the existing `setupPortalForClient(clientId, projectIds)` and return its result
       (it handles auth account creation, profile upsert, project linking, temp password generation)
    8. On success return `{ success: true, data: { ...setupResult.data, clientId, isNewCrmClient } }`
    9. revalidatePath('/portal') and revalidatePath('/clients')

    Do NOT create a new auth user directly — delegate entirely to setupPortalForClient to avoid
    duplication of that logic.

  </action>
  <verify>npx tsc --noEmit 2>&1 | head -30</verify>
  <done>No TypeScript errors. `createClientWorkspace` is exported from client-portal.ts and accepts
  (name, email, projectIds[]) returning ActionResult with credential data.</done>
</task>

<task type="auto">
  <name>Task 2: Add Create Workspace dialog + per-client project management to PortalHub</name>
  <files>components/portal/portal-hub.tsx</files>
  <action>
    Make two enhancements to PortalHub:

    **A) Create Workspace button + dialog (header area)**

    1. Import `createClientWorkspace` from `@/app/actions/client-portal`
    2. Import `Plus`, `UserPlus` from lucide-react
    3. Add state for the create workspace dialog:
       ```ts
       const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
       const [newClientName, setNewClientName] = useState('');
       const [newClientEmail, setNewClientEmail] = useState('');
       const [newProjectIds, setNewProjectIds] = useState<string[]>([]);
       const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
       const [workspaceCredentials, setWorkspaceCredentials] = useState<{
         email: string; password?: string; name: string; alreadyExisted: boolean;
       } | null>(null);
       const [workspaceCopied, setWorkspaceCopied] = useState(false);
       ```
    4. Add `handleCreateWorkspace` async function:
       - Validate name + email non-empty, newProjectIds.length > 0
       - Call `createClientWorkspace(newClientName.trim(), newClientEmail.trim(), newProjectIds)`
       - On success: set workspaceCredentials, add new client to local `clients` state
       - On error: `toast.error(result.error)`
    5. In the header `<div>`, add a "New Workspace" button to the right of the heading:
       ```tsx
       <Button size="sm" className="gap-1.5 bg-qualia-600 text-white hover:bg-qualia-700"
         onClick={() => { setCreateWorkspaceOpen(true); setWorkspaceCredentials(null);
           setNewClientName(''); setNewClientEmail(''); setNewProjectIds([]); }}>
         <Plus className="h-3.5 w-3.5" /> New Workspace
       </Button>
       ```
       Wrap header div in `flex items-start justify-between`.
    6. Add the Dialog: two states — form state and credentials state (same two-state pattern as
       the existing credential dialog). Form has:
       - Input for client name (label: "Client Name")
       - Input for email (label: "Contact Email")
       - Project multi-select checklist (same pattern as existing credential dialog, using allProjects)
       - Cancel + Create buttons

    **B) Manage Projects per existing client**

    1. Add state:
       ```ts
       const [manageProjectsDialog, setManageProjectsDialog] = useState<{
         clientId: string; clientName: string; currentProjectIds: string[];
       } | null>(null);
       const [managedProjectIds, setManagedProjectIds] = useState<string[]>([]);
       const [isSavingProjects, setIsSavingProjects] = useState(false);
       ```
    2. Add `handleSaveProjects` function that calls `setupPortalForClient(clientId, managedProjectIds)`
       — this re-links the full new set (setupPortalForClient handles upsert semantics for existing
       users, so passing the new desired list re-links projects).
    3. On client cards that already have portal access, add a "Manage Projects" ghost button
       (next to "View Portal" and "Reset Password"):
       ```tsx
       <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
         onClick={() => { setManageProjectsDialog({ clientId: client.id, clientName: client.name,
           currentProjectIds: client.projects.map(p => p.id) });
           setManagedProjectIds(client.projects.map(p => p.id)); }}>
         <Folder className="h-3 w-3" /> Manage Projects
       </Button>
       ```
    4. Add Dialog for manage projects: shows all projects with checkboxes pre-checked for
       current assignments. Save button calls `handleSaveProjects`. Use same checklist pattern
       as existing credential dialog.

    Keep all existing dialog JSX intact. Add the two new dialogs below the existing ones.
    Maintain clean professional style — no flashy effects, consistent with existing card/dialog
    patterns already in the file.

  </action>
  <verify>npm run build 2>&1 | tail -20</verify>
  <done>
    Build passes with no errors.
    - Header shows "New Workspace" button
    - Clicking opens a dialog with name, email, project checklist
    - Client cards with portal access show "Manage Projects" button
    - Clicking manages project assignments for that client
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — no TypeScript errors
2. `npm run build` — production build passes
3. Visit `/portal` as admin — "New Workspace" button visible in header
4. Click "New Workspace" → form dialog opens with name, email, project checklist
5. Fill form and submit → credentials shown with copy button
6. Client appears in grid immediately
7. Click "Manage Projects" on existing client → project checklist shows current assignments
</verification>

<success_criteria>

- Admin can create a new client workspace from `/portal` without any pre-existing CRM entry
- Generated temp credentials are shown and copyable
- Admin can add/remove project assignments for existing clients via "Manage Projects"
- Build passes cleanly
  </success_criteria>

<output>
After completion, create `.planning/quick/20-client-portal-workspace-management-admin/20-SUMMARY.md`
</output>
