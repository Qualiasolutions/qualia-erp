---
name: admin-surface-expansion
description: Workflow command scaffold for admin-surface-expansion in qualia-erp.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /admin-surface-expansion

Use this workflow when working on **admin-surface-expansion** in `qualia-erp`.

## Goal

Adds or reorganizes admin portal pages, navigation, and related server actions.

## Common Files

- `app/(portal)/admin/*`
- `components/portal/admin-section-nav.tsx`
- `components/portal/qualia-sidebar.tsx`
- `app/actions/admin-control/*`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update page files under app/(portal)/admin/* (e.g., new index/detail pages, stubs, or layouts).
- Add or update shared navigation components (e.g., admin-section-nav, qualia-sidebar).
- Implement or update server actions in app/actions/admin-control/* and barrel-export in index.ts.
- Update or remove related documentation or planning notes if needed.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.