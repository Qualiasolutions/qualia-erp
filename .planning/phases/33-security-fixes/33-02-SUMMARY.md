---
phase: 33-security-fixes
plan: 02
subsystem: api-security
tags: [security, injection, timing-attack, xss]
dependency-graph:
  requires: []
  provides: [timing-safe-auth, parameterized-queries, svg-upload-block]
  affects: [vercel-webhook, claude-api-routes, file-uploads]
tech-stack:
  added: []
  patterns: [crypto.timingSafeEqual, parameterized-supabase-queries]
key-files:
  created:
    - lib/auth-utils.ts
  modified:
    - app/api/webhooks/vercel/route.ts
    - app/api/claude/project-status/route.ts
    - app/api/claude/session-feed/route.ts
    - app/api/claude/session-log/route.ts
    - app/actions/project-files.ts
decisions: []
metrics:
  duration: 2m
  completed: 2026-03-26
---

# Phase 33 Plan 02: API Security Hardening Summary

Parameterized Supabase filter queries to prevent injection, timing-safe API key comparison via crypto.timingSafeEqual, SVG upload blocked to prevent XSS.

## What Was Done

### Task 1: Fix Vercel webhook filter injection + timing-safe Claude API auth

**Vercel webhook (filter injection):** The `.or()` call was interpolating `project.id` and `project.name` directly into a filter string, allowing a crafted project name to inject arbitrary Supabase filter operators. Replaced with two separate parameterized queries: first an exact `.eq()` on `vercel_project_id`, then a fallback `.ilike()` on sanitized project name (SQL LIKE wildcards `%` and `_` stripped).

**Claude API routes (timing attack):** All three Claude API routes (`project-status`, `session-feed`, `session-log`) compared API keys with `!==`, which is vulnerable to timing attacks. Created `lib/auth-utils.ts` with a `safeCompare()` function using `crypto.timingSafeEqual()` and applied it to all three routes.

**Commit:** `1638564`

### Task 2: Remove SVG from allowed upload MIME types

Removed `image/svg+xml` from the `ALLOWED_MIME_TYPES` array in `app/actions/project-files.ts`. SVG files can contain embedded `<script>` tags and event handlers, making them an XSS vector when served or rendered.

**Commit:** `c21f774`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `grep "svg" app/actions/project-files.ts` returns no matches
- `npx tsc --noEmit` exits 0
- All pre-commit hooks (ESLint, Prettier, TypeScript) passed on both commits

## Self-Check: PASSED

- [x] lib/auth-utils.ts exists
- [x] Commit 1638564 exists
- [x] Commit c21f774 exists
- [x] No SVG in ALLOWED_MIME_TYPES
- [x] All 3 Claude routes use safeCompare
- [x] Vercel webhook uses parameterized queries
