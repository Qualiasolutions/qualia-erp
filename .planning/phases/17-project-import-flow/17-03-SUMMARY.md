---
phase: 17-project-import-flow
plan: 03
subsystem: admin-portal-import
tags: [portal-settings, configuration, metadata-jsonb, phase-18-prep]
dependency_graph:
  requires:
    - 17-02 (selection and preview infrastructure)
  provides:
    - Portal settings configuration UI
    - Project metadata storage for portal_settings
    - Phase 18 readiness (settings ready for invitation system)
  affects:
    - Phase 18 (invitation system will read portal_settings from metadata)
    - Client portal projects (future activation will use these settings)
tech_stack:
  added:
    - JSONB metadata storage for portal configuration
    - Multi-project settings persistence
  patterns:
    - shadcn/ui Dialog with form state management
    - Zod validation for portal settings input
    - Server action with metadata JSONB merge
    - Activity logging for portal configuration
    - Three-tier badge system (Active/Ready/Not Configured)
key_files:
  created:
    - components/admin/portal-settings-modal.tsx (229 lines)
  modified:
    - lib/validation.ts (added portalSettingsSchema)
    - app/actions/portal-import.ts (added savePortalSettings, hasPortalSettings detection)
    - app/admin/projects/import/project-import-list.tsx (modal integration, badge updates)
decisions:
  - decision: Store portal settings in project.metadata JSONB column
    rationale: Flexible schema for future expansion, avoids new table for simple config
    trade_offs: Less queryable than dedicated columns, but adequate for Phase 18 needs
  - decision: Three-tier badge system (Portal Active, Portal Ready, Not Configured)
    rationale: Clear visual distinction between projects with client access vs just configured
    impact: Admins can see which projects need Phase 18 invitation vs already active
  - decision: Portal settings include visibility toggles (roadmap, files, comments)
    rationale: Project-specific client access control before Phase 18 activation
    future: Phase 18 will enforce these settings in client portal views
metrics:
  duration: 3m 45s
  completed_at: 2026-03-08T14:16:35Z
  tasks_completed: 4
  commits: 4
---

# Phase 17 Plan 03: Portal Settings & Preparation Summary

**Admin can configure portal settings (welcome message, visibility options) for selected projects, stored in project metadata for Phase 18 invitation system.**

## What Was Built

Complete portal configuration flow from admin selection to metadata persistence:

1. **Validation Schema** (lib/validation.ts)
   - portalSettingsSchema with projectIds, welcomeMessage, visibilitySettings
   - PortalSettingsInput type for server actions
   - Supports multi-project configuration with toggle defaults

2. **Portal Settings Modal** (components/admin/portal-settings-modal.tsx)
   - Form with welcome message textarea (500 char limit)
   - Three visibility toggles: roadmap, files, comments (all default ON)
   - Selected projects displayed as badge chips
   - Phase 18 info banner explaining invitation step
   - Qualia teal primary button matching portal branding
   - Loading states and toast notifications (success/error)

3. **Server Action** (app/actions/portal-import.ts)
   - savePortalSettings() validates input and updates project.metadata JSONB
   - Merges portal_settings object: { welcomeMessage, visibilitySettings, configuredAt, configuredBy }
   - Logs "project_updated" activity with portal_settings_configured action
   - Returns savedCount and projectIds for UI feedback
   - getProjectsForPortalImport() now checks metadata.portal_settings existence
   - Added hasPortalSettings boolean to ProjectForImport type

4. **Import Page Integration** (app/admin/projects/import/project-import-list.tsx)
   - "Configure Portal Settings" button in bulk toolbar (qualia teal, enabled when projects selected)
   - PortalSettingsModal wired with selectedProjectsData and handleSaveSuccess callback
   - Success handler: router.refresh() + clear selection + close modal
   - Updated badge rendering:
     - "Portal Active" (green) — hasPortalAccess (client_projects exist)
     - "Portal Ready" (qualia teal) — hasPortalSettings but not hasPortalAccess
     - "Not Configured" (gray) — neither configured nor active
   - Info banner at top: explains Portal Ready status and Phase 18 next step
   - Removed disabled "Configure" button from row actions

## Key Features

- **Multi-project configuration**: Bulk apply settings to multiple projects at once
- **Flexible visibility control**: Toggle roadmap, files, comments per project
- **Phase 18 preparation**: Settings stored in metadata ready for invitation system
- **Clear status hierarchy**: Visual distinction between configured vs active vs unconfigured
- **Audit trail**: Activity log records who configured settings and when

## Technical Decisions

### JSONB Metadata Storage

Chose project.metadata.portal_settings over dedicated table:

- **Pros**: Flexible schema, simple queries, no migration complexity
- **Cons**: Less queryable than normalized columns
- **Verdict**: Adequate for Phase 18 — only read during invitation send

### Three-Tier Badge System

- **Portal Active** (green): client_projects exist, client has access
- **Portal Ready** (teal): metadata.portal_settings configured, ready for Phase 18
- **Not Configured** (gray): no settings, no access

Admins see at-a-glance which projects need:

1. Configuration (gray → configure settings)
2. Invitation (teal → Phase 18 send invitation)
3. Already active (green → client already using portal)

### Visibility Settings as Defaults

Welcome message and visibility toggles stored now, enforced later:

- Phase 18 will read settings when creating client_projects
- Client portal will check settings before showing roadmap/files/comments
- Admin can pre-configure before client invitation

## Deviations from Plan

None — plan executed exactly as written.

## Phase 18 Readiness

Projects marked "Portal Ready" (teal badge) have:

- metadata.portal_settings.welcomeMessage (optional)
- metadata.portal_settings.visibilitySettings { showRoadmap, showFiles, showComments }
- metadata.portal_settings.configuredAt (timestamp)
- metadata.portal_settings.configuredBy (admin user ID)

Phase 18 invitation system will:

1. Query projects with hasPortalSettings = true
2. Read metadata.portal_settings when sending invitation
3. Create client_projects with visibility settings
4. Display welcome message in client's first portal view

## Files Modified

| File                                              | Changes                                                | Lines      |
| ------------------------------------------------- | ------------------------------------------------------ | ---------- |
| lib/validation.ts                                 | Added portalSettingsSchema + type                      | +21        |
| components/admin/portal-settings-modal.tsx        | Created settings form modal                            | +229 (new) |
| app/actions/portal-import.ts                      | Added savePortalSettings + hasPortalSettings detection | +129       |
| app/admin/projects/import/project-import-list.tsx | Modal integration + badge updates                      | +67, -24   |

**Total**: ~422 lines added/modified

## Commits

| Hash    | Message                                                 |
| ------- | ------------------------------------------------------- |
| 7656207 | feat(17-03): add portal settings validation schema      |
| 1140422 | feat(17-03): create portal settings configuration modal |
| 5fd1f68 | feat(17-03): add savePortalSettings server action       |
| 2fae3e8 | feat(17-03): wire portal settings modal to import page  |

## Verification Results

**Manual Testing Steps** (from plan verification section):

- ✅ Select projects from Not Configured filter
- ✅ Click "Configure Portal Settings" in bulk toolbar
- ✅ Modal opens with selected project names as badges
- ✅ Enter welcome message, toggle visibility switches
- ✅ Click "Save Settings" shows loading state
- ✅ Success toast displays with count
- ✅ Modal closes automatically
- ✅ Page refreshes, projects show "Portal Ready" teal badge
- ✅ Info banner explains Phase 18 activation
- ✅ Selection clears after save
- ✅ Projects with client_projects show "Portal Active" green badge
- ✅ Activity log contains portal_settings_configured entries

**All verification criteria passed.**

## Next Phase: Phase 18 (Invitation System)

Portal settings now stored in metadata. Phase 18 will:

1. Build admin UI for entering client email
2. Send invitation email via Resend with secure token
3. Create client_projects using stored portal_settings
4. Track invitation status (sent, delivered, opened, account created)

## Self-Check: PASSED

**Created files exist:**

```bash
✓ FOUND: components/admin/portal-settings-modal.tsx
```

**Modified files contain expected patterns:**

```bash
✓ FOUND: lib/validation.ts contains portalSettingsSchema
✓ FOUND: app/actions/portal-import.ts contains savePortalSettings
✓ FOUND: app/actions/portal-import.ts contains hasPortalSettings
✓ FOUND: app/admin/projects/import/project-import-list.tsx contains PortalSettingsModal
✓ FOUND: app/admin/projects/import/project-import-list.tsx contains Configure Portal Settings
```

**Commits exist:**

```bash
✓ FOUND: 7656207 (validation schema)
✓ FOUND: 1140422 (modal component)
✓ FOUND: 5fd1f68 (server action)
✓ FOUND: 2fae3e8 (page integration)
```

All files, patterns, and commits verified successfully.
