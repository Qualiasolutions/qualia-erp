# Plan: 12 — Simplified portal admin panel

**Mode:** quick (no-plan)
**Created:** 2026-03-09

## Task 1: Replace two admin forms with single project picker

**What:** Remove "Create New Project" and "Add Client to Project" (email/name/project) forms. Replace with single "Setup Client Access" — pick a project, click create, credentials auto-generated.
**Files:** `components/portal/portal-admin-panel.tsx`, `app/actions/client-portal.ts`, `app/portal/page.tsx`
**Done when:** Admin sees one dropdown + button, credentials appear after click

## Task 2: Add Full Stack Feature request category

**What:** Add "Full Stack Feature" to request category dropdown
**Files:** `components/portal/portal-request-dialog.tsx`
**Done when:** New category appears in request dialog
