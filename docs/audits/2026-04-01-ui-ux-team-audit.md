# UI/UX and Team Workflow Audit

**Project:** Qualia ERP  
**Date:** 2026-04-01  
**Focus:** Employee flow, admin flow, collaboration handoffs, role clarity

## Scope

This audit focuses on the internal ERP surfaces used by employees and admins:

- Daily dashboard
- Inbox and task management
- Project detail workflow
- Schedule
- Admin team management, assignments, attendance, and reports

The review is based on code inspection plus limited local route rendering. Full end-to-end role testing was not possible in this workspace because the local environment does not include the live Supabase public auth configuration, so any authenticated-behavior claims below are grounded in the code paths that run after login.

## Executive Summary

Qualia ERP already has a strong visual base: the layout system is coherent, the role-aware dashboard direction is good, and the product clearly aims to center work around projects instead of generic CRUD. The main problems are not visual polish problems. They are workflow trust problems:

1. Some role boundaries are blurred or incorrect.
2. Important work surfaces are split across multiple entry points.
3. Collaboration context disappears on smaller screens.
4. Admin tools expose data, but not enough action paths.

The result is a platform that looks more mature than it currently behaves. Employees can be put into ambiguous or even incorrect task and commenting states. Admins can see activity, but several screens still require manual coordination outside the product.

## Priority Findings

### 1. Critical: Employees can fall through to another teammate's task list

**Evidence:** `components/today-dashboard/team-task-container.tsx`

- Employee mode resolves `viewedMember` with `members.find(...) ?? members[0]`
- That fallback exists only outside "view as" mode

**Impact**

- An employee whose profile is missing from the current dashboard payload can be shown the first teammate's tasks.
- This breaks trust immediately. It is both a privacy problem and a workflow problem.

**Why it hurts teamwork**

- Team members cannot trust that "my task list" is actually theirs.
- Any confusion here contaminates task ownership, status updates, and daily planning.

**Recommendation**

- Never fall back to another member in employee mode.
- Show an explicit empty/error state: "We could not load your assignments."
- Log this case so it can be diagnosed quickly.

### 2. Critical: Employees are exposed to project settings they should not control

**Evidence:** `app/projects/[id]/project-detail-view.tsx`, `app/actions/projects.ts`

- The settings button is always rendered in the project header.
- The settings dialog exposes project metadata editing and delete controls.
- `updateProject()` checks only that the user is authenticated before mutating project metadata.

**Impact**

- Employees can reach admin-style controls from the normal project page.
- Even if some changes are later blocked by RLS, the interface itself communicates the wrong permission model.
- If RLS currently allows assigned employees to update the row, project metadata can drift based on whoever touched it last.

**Why it hurts teamwork**

- Ownership of project truth becomes ambiguous.
- Admins and leads lose confidence that client, lead, target date, and resource metadata are stable.

**Recommendation**

- Split project detail into `work surface` and `project settings`.
- Hide settings entirely for non-admin and non-lead roles.
- Add explicit authorization checks inside `updateProject()` before any update.
- Keep destructive actions in a role-gated admin/lead-only surface.

### 3. Critical: Employee comments are being treated as client comments

**Evidence:** `app/actions/phase-comments.ts`

- `const isClient = profile?.role !== 'admin'`
- That means employees are grouped with clients.
- Non-admin comments are forced to `is_internal = false`.
- Non-admin comments also trigger `notifyEmployeesOfClientComment(...)`

**Impact**

- Employees cannot reliably mark internal-only workflow comments.
- Internal team comments can trigger the same notification path as external client feedback.
- Comment semantics become misleading for everyone reading the thread.

**Why it hurts teamwork**

- The system blurs internal discussion and external client communication.
- Notification quality drops, so people start ignoring the channel.

**Recommendation**

- Treat `client`, `employee`, and `admin` as distinct actors.
- Only clients should trigger client-comment notifications.
- Employees should be able to post normal internal team comments.
- Make comment visibility explicit in the UI: `Internal team note` vs `Client-visible update`.

### 4. High: Project collaboration context disappears below `xl`

**Evidence:** `app/projects/[id]/project-detail-view.tsx`

- Lead, client, assigned team, resources, and notes live in an `xl`-only right panel.
- Below `xl`, the replacement sheet only contains `Resources` and `Notes`.

**Impact**

- On smaller laptops, tablets, and phones, users lose quick access to lead, client, and assigned team context.
- The project workflow becomes task-centric without the people context needed to coordinate work.

**Why it hurts teamwork**

- Team members cannot quickly answer: who owns this, who is assigned, who is the client?
- Collaboration shifts back to chat and memory instead of the project page.

**Recommendation**

- Add a third mobile/tab sheet for `People`.
- Include lead, assigned team, and client in the compact project info surface.
- Make project context available before notes/resources, not after.

### 5. High: Core task work is split, but only one surface is discoverable

**Evidence:** `components/sidebar.tsx`, `app/inbox/inbox-view.tsx`

- Sidebar navigation has no `Inbox` or `Tasks` entry.
- `/inbox` exists as a full task workspace with filtering, quick add, and status summaries.

**Impact**

- Users are expected to manage tasks from multiple places:
  - Today dashboard
  - Project workflow
  - Hidden inbox route
- The most complete task surface is not part of the primary IA.

**Why it hurts teamwork**

- Training overhead increases.
- People solve the same task-management need in different places, so habits diverge.

**Recommendation**

- Choose a primary task home and make it explicit in navigation.
- Either:
  - add `Inbox` to the main nav, or
  - merge inbox capabilities back into the dashboard and retire `/inbox`
- Keep task counts and status language consistent across all task surfaces.

### 6. Medium: Phase comments show delete affordances to users who may not be allowed to delete

**Evidence:** `components/phase-comments.tsx`, `app/actions/phase-comments.ts`

- The delete button is rendered for every visible comment on hover.
- Server-side deletion is actually restricted to admin or comment author.

**Impact**

- Users get a false destructive affordance.
- On click, the UI optimistically removes the comment before the server can reject it and reload it.

**Why it hurts teamwork**

- It makes the comments area feel unreliable and inconsistent.
- Users learn not to trust what the UI says they can do.

**Recommendation**

- Pass current user context into the comment component.
- Only show delete for author/admin.
- Avoid optimistic removal for unauthorized actions.

### 7. Medium: Assignment management is too loose and too manual

**Evidence:** `components/admin/employee-assignment-manager.tsx`

- The assignment picker uses all cached profiles as potential assignees.
- There is no role filter, no search, and no workload context in the assignment flow.

**Impact**

- Admins can assign from an over-broad people list.
- The UI does not help answer the real question: who should take this work next?

**Why it hurts teamwork**

- Assignments become clerical instead of operational.
- The platform stores assignment history, but does not help admins make better assignment decisions.

**Recommendation**

- Filter the picker to valid internal delivery roles only.
- Add search.
- Show active assignment count, current project count, and clocked-in status next to each assignee.
- Allow assignment directly from project detail and report views, not only the admin assignments page.

### 8. Medium: Admin analytics surfaces are reporting sinks, not control rooms

**Evidence:** `app/admin/attendance/page.tsx`, `app/admin/reports/page.tsx`

- Attendance and reports show tables and exports, but no drill-through actions.
- Rows do not link directly to the employee, project, session history, or assignment surface that would let an admin act on the data.

**Impact**

- Admins can observe problems, but must manually navigate elsewhere to fix them.

**Why it hurts teamwork**

- Reporting is disconnected from intervention.
- Team ops still depend on side conversations and memory.

**Recommendation**

- Add row actions:
  - `Open employee`
  - `Open project`
  - `View assignments`
  - `View session history`
- Surface exceptions first: low completion, overdue work, missing check-ins, unassigned active projects.

### 9. Medium: Schedule timezone behavior is inconsistent between views

**Evidence:** `components/weekly-view.tsx`, `components/calendar-view.tsx`

- Weekly view supports Cyprus/Jordan switching.
- Month view hardcodes a `Cyprus` label and exposes no equivalent timezone control.

**Impact**

- The same meeting can be understood in one timezone model in week view and another in month view.

**Why it hurts teamwork**

- Distributed teams need one mental model for shared time.
- Inconsistent time framing makes planning and meeting attendance less reliable.

**Recommendation**

- Use the same timezone control in both views.
- Persist the selection across schedule surfaces.
- Make the active timezone visible in the page header, not only inside the view.

### 10. Medium: Admin invite flow requires manual temporary password handling

**Evidence:** `app/admin/page.tsx`

- Inviting a team member requires the admin to create a temporary password manually.

**Impact**

- Onboarding is more fragile than necessary.
- The admin becomes responsible for password generation and out-of-band delivery.

**Why it hurts teamwork**

- This adds friction exactly where growth and handoff should be smooth.
- It also trains the team into insecure operational habits.

**Recommendation**

- Move to invite-by-link or password-set-on-first-login.
- Keep role selection, but remove manual password handling from the admin UI.

## Cross-Cutting Workflow Problems

### Work context is fragmented

Task context lives in the dashboard, inbox, project workflow, and comments, but the handoffs between those surfaces are weak. A user can know what to do in one view and lose that context in the next.

### Admin control and employee execution are not clearly separated

The app already thinks in roles, but several UI surfaces still expose admin-ish controls inside normal employee work views.

### Collaboration metadata is secondary instead of primary

Lead, assigned team, client, notes, resources, and comments are all present, but often off to the side, hidden behind breakpoints, or separated from the main workflow.

## Recommended Product Direction

### 1. Make tasks the backbone

- Pick one primary task surface.
- Keep dashboard for triage, but ensure the full task workspace is easy to reach.
- Standardize task actions and counts across dashboard, inbox, and project views.

### 2. Separate "do work" from "configure work"

- Employee project pages should center phases, tasks, blockers, notes, and people.
- Admin/lead settings should move into a clearly gated configuration surface.

### 3. Put people context back into the project page

- Always show lead, assigned team, and client.
- On smaller screens, this should be a first-class panel, not hidden context.

### 4. Rebuild comment semantics around actor type

- Internal team note
- Admin-only note
- Client-visible update
- Client comment

These need distinct rules, labels, and notification behavior.

### 5. Turn admin reporting into action-oriented operations

- Drill from reports into employees and projects.
- Highlight exceptions before totals.
- Let admins resolve assignment and coordination problems from the same screen where they discover them.

## Suggested Fix Order

### Immediate

1. Remove the teammate fallback in employee task view.
2. Add authorization checks to `updateProject()` and hide settings for employees.
3. Fix phase comment actor classification so employees are not treated as clients.

### Next

4. Restore lead/client/team context on sub-`xl` project detail layouts.
5. Add `Inbox` or `Tasks` to primary navigation and define the canonical task workspace.
6. Restrict comment delete affordances to authorized users only.

### After that

7. Improve assignment UI with search, role filtering, and workload context.
8. Add drill-through actions to attendance and reports.
9. Unify schedule timezone controls.
10. Replace manual temporary-password invites with link-based onboarding.

## Bottom Line

The product does not primarily need a visual redesign. It needs stronger workflow truth:

- the right person sees the right work
- the right roles can change the right things
- collaboration context stays visible
- admin insight turns into action without leaving the product

Once those are fixed, the existing UI foundation is strong enough to support a much cleaner employee/admin experience.
