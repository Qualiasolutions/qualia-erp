# Codebase Concerns

**Analysis Date:** 2026-03-01

## Tech Debt

**Massive action file - actions.ts (~2,900+ lines)**

- Issue: Monolithic server actions file with all domain logic in one place
- Files: `app/actions.ts` (deprecated, now split), `app/api/vapi/webhook/route.ts` (1,730 lines), `app/actions/pipeline.ts` (1,199 lines), `app/actions/inbox.ts` (813 lines)
- Impact: Hard to navigate, slow IDE performance, merge conflicts, difficult to test specific domains
- Fix approach: Continue splitting into domain-specific files (already started with `app/actions/*.ts` pattern). Pipeline and webhook routes need further decomposition into smaller handler modules.

**In-memory rate limiting (production scale issue)**

- Issue: Rate limiter uses Map in memory instead of distributed store
- Files: `lib/rate-limit.ts`
- Impact: Rate limits reset on server restart, don't work across serverless function instances, ineffective in production
- Fix approach: Migrate to Redis-based solution (`@upstash/ratelimit` with Upstash Redis). Current implementation has TODO comment acknowledging this.

**Stub email reminder system**

- Issue: Daily reminder functions are stubs that return empty data
- Files: `lib/email.ts` (lines 378-407)
- Impact: Feature appears to exist but doesn't actually send reminders. Users expect functionality that isn't working.
- Fix approach: Implement actual task fetching logic with date filtering, integrate with Resend email service, add cron job scheduler.

**Test coverage critically low (0.97%)**

- Issue: Only 2 test files exist (`__tests__/lib/validation.test.ts`, `__tests__/lib/voice-assistant-intelligence.test.ts`). Coverage below 1% vs 50% threshold.
- Files: All `app/actions/*.ts`, `app/api/**/*.ts`, `lib/**/*.ts` untested
- Impact: No safety net for refactoring, high risk of regression bugs, difficult to verify authorization logic correctness
- Fix approach: Add Jest tests for critical paths - authorization helpers (`canModifyTask`, etc.), validation schemas, server actions. Prioritize security-sensitive code first.

**Large complex client components without virtualization**

- Issue: Large lists rendered without virtual scrolling (588 lines in inbox-view)
- Files: `app/inbox/inbox-view.tsx` (588 lines), `app/projects/[id]/project-detail-view.tsx` (541 lines), `app/payments/payments-client.tsx` (805 lines)
- Impact: Performance degradation with 100+ tasks/projects, slow rendering, poor mobile performance
- Fix approach: Already uses `@tanstack/react-virtual` in inbox-view (line 13) but needs implementation in other list views. Apply virtualization pattern from inbox to project lists and payment tables.

## Known Bugs

**Webhook secret not enforced in production (security bug)**

- Symptoms: VAPI webhook accepts requests without authentication if `VAPI_WEBHOOK_SECRET` not set in production
- Files: `app/api/vapi/webhook/route.ts` (lines 417-432), `lib/integrations/vapi.ts` (line 246)
- Trigger: Deploy without setting `VAPI_WEBHOOK_SECRET` environment variable
- Workaround: Code has fail-closed pattern (rejects if secret missing in prod), but relies on env var being set. Should enforce at build time or startup.

**Service role key usage in scripts (potential exposure)**

- Symptoms: Scripts use service_role key which bypasses RLS
- Files: `app/api/cron/blog-tasks/route.ts`, `app/api/cron/research-tasks/route.ts`, `scripts/migrate-workflows.ts`, `scripts/clear-project-phase-items.ts`, `scripts/assign-todo-to-moayad.ts`, `scripts/manage-clients.ts`, `scripts/populate-knowledge-base.ts`, `scripts/seed-projects.ts`, `app/api/webhooks/vercel/route.ts`
- Trigger: Importing service role key in the wrong context
- Workaround: Currently isolated to scripts and cron jobs (acceptable), but needs audit to ensure not used in client components.

## Security Considerations

**Missing auth checks in deleteTask**

- Risk: Task deletion authorization relies solely on `canModifyTask` helper without explicit admin check
- Files: `app/actions/inbox.ts` (lines 375-400)
- Current mitigation: `canModifyTask` checks creator, assignee, project lead, or admin (lines 138-161 in `app/actions/shared.ts`)
- Recommendations: Add explicit audit logging for deletion operations, consider soft delete instead of hard delete for accountability.

**Project file download IDOR risk**

- Risk: File download URL generation checks workspace membership but not project-specific access
- Files: `app/actions/project-files.ts` (lines 258-305, specifically 280-290)
- Current mitigation: Checks user is workspace member before generating signed URL
- Recommendations: Add explicit project access check via `canAccessProject`, not just workspace membership. Workspace-level check may allow cross-project file access within same workspace.

**Webhook endpoints accept any origin**

- Risk: VAPI webhook doesn't validate request origin beyond secret check
- Files: `app/api/vapi/webhook/route.ts` (lines 417-457)
- Current mitigation: Requires `VAPI_WEBHOOK_SECRET` in Authorization header or x-vapi-secret header
- Recommendations: Add IP allowlist for known VAPI server IPs, implement request signing for replay attack prevention, add rate limiting per IP.

**Environment variable exposure risk**

- Risk: Multiple environment files committed to git (`.env.local`, `.env.vercel`, `.env.vercel-pull`)
- Files: Root directory contains `.env.local`, `.env.vercel`, `.env.vercel-pull` (all present per ls output)
- Current mitigation: `.gitignore` should exclude these, but their presence suggests they're committed or at risk
- Recommendations: Audit git history for committed secrets, rotate any exposed keys, enforce pre-commit hooks to block `.env*` files.

## Performance Bottlenecks

**N+1 queries in project task fetching**

- Problem: Tasks fetched with foreign key relations that return arrays instead of objects
- Files: `app/actions/inbox.ts` (lines 148-160, normalization pattern), `app/actions/projects.ts`
- Cause: Supabase FK responses return arrays that need normalization. Pattern used consistently but adds overhead.
- Improvement path: Use Supabase's `!inner` join syntax to guarantee single object response instead of array, eliminating need for normalization. Already using `normalizeFKResponse` helper from `lib/server-utils.ts` but could optimize at query level.

**Large knowledge base in webhook route (memory bloat)**

- Problem: 300+ line static knowledge base object loaded in memory on every webhook call
- Files: `app/api/vapi/webhook/route.ts` (lines 50-294)
- Cause: Hardcoded company information dictionary for AI assistant responses
- Improvement path: Move to database table with text search, or extract to separate JSON file loaded on demand. Currently consumes ~15KB per function invocation.

**SWR auto-refresh on all tabs (network spam)**

- Problem: SWR refreshes every 45 seconds when tab visible across all open tabs
- Files: `lib/swr.ts` (SWR hooks with `refreshInterval: 45000`)
- Cause: Default SWR behavior with `revalidateOnFocus: true`
- Improvement path: Use SWR's `dedupingInterval` option, implement leader election for multi-tab refresh, or increase refresh interval to 2-3 minutes for less critical data.

## Fragile Areas

**Task drag-and-drop reordering (complex state management)**

- Files: `app/inbox/inbox-view.tsx` (588 lines with useOptimistic, dnd-kit integration)
- Why fragile: Complex interaction between optimistic updates, DnD state, SWR cache invalidation, and server actions. Uses `useOptimistic` hook (line 6) which can cause race conditions.
- Safe modification: Always test drag between different status columns, verify sort_order persistence, check optimistic rollback on error. Run integration tests with network delays.
- Test coverage: None (0% coverage)

**Foreign key array normalization pattern**

- Files: `app/actions/inbox.ts` (lines 148-160), `app/actions/shared.ts`, all actions using Supabase relations
- Why fragile: Supabase returns FKs as arrays or objects unpredictably. Normalization logic handles both cases but breaks if Supabase changes behavior.
- Safe modification: Always use `normalizeFKResponse` helper from `lib/server-utils.ts`. Never assume FK response shape. Test with actual Supabase data.
- Test coverage: None

**Voice webhook tool routing (11+ tools)**

- Files: `app/api/vapi/webhook/route.ts` (1,730 lines, handles 11+ different AI tools)
- Why fragile: Large switch/case routing logic, each tool has different arg types, error handling must be perfect or assistant breaks mid-conversation
- Safe modification: Add new tools via handler functions (pattern in `lib/vapi-webhook-handlers.ts`), never modify core routing logic without full test. Validate all tool argument schemas with Zod.
- Test coverage: None (0% coverage)

**SWR cache invalidation chain**

- Files: `lib/swr.ts` (invalidation functions), all components using `invalidateInboxTasks()`, `invalidateDailyFlow()`, etc.
- Why fragile: Manual cache invalidation after mutations. Miss one invalidation call and UI shows stale data. Chain of dependencies not obvious.
- Safe modification: Always invalidate with `immediate: true` flag. Document which mutations require which invalidations. Consider moving to tRPC or React Query for automatic invalidation.
- Test coverage: None

## Scaling Limits

**Serverless function timeout (VAPI webhook)**

- Current capacity: 10-second default Vercel timeout for API routes
- Limit: Voice webhook with knowledge base search + project queries can approach 5-8 seconds under load
- Scaling path: Move long-running operations to background jobs with queue (Upstash QStash or Supabase Edge Functions with longer timeout). Cache knowledge base responses.

**In-memory rate limit storage**

- Current capacity: Single server instance Map (lost on restart)
- Limit: Doesn't scale across serverless functions or multiple regions
- Scaling path: Migrate to Upstash Redis with `@upstash/ratelimit` (already documented in code TODO comment at `lib/rate-limit.ts` line 3).

**SWR client-side caching only**

- Current capacity: Browser memory per user session
- Limit: No cross-user cache, every user fetches same reference data (teams, projects, profiles)
- Scaling path: Add server-side Redis cache for reference data with short TTL (30-60s), serve from edge with ISR for static project lists.

**PostgreSQL connection pooling**

- Current capacity: Supabase free tier (60 connections)
- Limit: Each serverless function creates new connection, can exhaust pool under high load
- Scaling path: Use Supabase connection pooler (pgBouncer), upgrade to paid tier with more connections, implement query result caching.

## Dependencies at Risk

**Next.js 16 (bleeding edge)**

- Risk: Using Next.js 16.0.10 which may have unstable App Router features
- Impact: Potential breaking changes in minor version updates, less community support for edge cases
- Migration plan: Pin to 16.0.x until 16.1.x stabilizes, monitor Next.js GitHub issues for regressions, test thoroughly before upgrading.

**React 19 (new release)**

- Risk: React 19.2.1 is recent major version with new hooks (`useOptimistic`, `useTransition` used extensively)
- Impact: Ecosystem libraries may not be fully compatible, edge cases in concurrent rendering
- Migration plan: Already adopted and working. Monitor for React 19 regression issues, keep escape hatch to React 18 if needed.

**Zod v4 (major version jump)**

- Risk: Using Zod 4.3.5 which has different API than v3
- Impact: Breaking changes from v3, validation schemas may need updates if dependencies use v3
- Migration plan: Already migrated. Watch for type inference issues, test all validation schemas thoroughly.

**shadcn/ui (community-maintained)**

- Risk: Components from Radix UI primitives without official shadcn package manager
- Impact: Manual updates required, version conflicts between Radix packages
- Migration plan: Pin Radix versions in `package.json`, test UI components after any Radix upgrade, consider forking critical components.

## Missing Critical Features

**No audit logging for sensitive operations**

- Problem: Task deletion, project updates, client changes have no audit trail
- Blocks: Compliance requirements, debugging user actions, accountability
- Priority: High

**No database backups automation**

- Problem: Relying on Supabase default backups without verification
- Blocks: Disaster recovery confidence, point-in-time restore testing
- Priority: High

**No error boundary components**

- Problem: React errors crash entire app instead of isolated components
- Blocks: User experience during errors, production error recovery
- Priority: Medium

**No real-time collaboration indicators**

- Problem: Multiple users can edit same task/project without knowing others are active
- Blocks: Concurrent edit conflicts, user confusion
- Priority: Low

## Test Coverage Gaps

**Server actions completely untested**

- What's not tested: All authorization helpers, task CRUD, project CRUD, client CRUD
- Files: `app/actions/inbox.ts`, `app/actions/projects.ts`, `app/actions/clients.ts`, `app/actions/meetings.ts`, `app/actions/phases.ts`, `app/actions/payments.ts`, `app/actions/health.ts`, `app/actions/shared.ts`
- Risk: Authorization bypasses undetected, validation errors in production, data integrity issues
- Priority: Critical (P0)

**API routes have zero test coverage**

- What's not tested: VAPI webhook tool routing, chat endpoint, embeddings generation, cron jobs
- Files: `app/api/vapi/webhook/route.ts`, `app/api/chat/route.ts`, `app/api/embeddings/route.ts`, `app/api/cron/*`
- Risk: Webhook tool failures break voice assistant, AI chat errors unnoticed, cron jobs silently fail
- Priority: High (P1)

**React components untested**

- What's not tested: All client components, drag-and-drop interactions, optimistic updates
- Files: `app/inbox/inbox-view.tsx`, `app/projects/[id]/project-detail-view.tsx`, all components
- Risk: UI regressions, broken interactions, accessibility issues
- Priority: Medium (P2)

**Integration tests missing**

- What's not tested: End-to-end task creation flow, project workflow, voice webhook to database flow
- Files: All integration paths across API → Actions → Database
- Risk: Feature regressions across boundaries, broken user journeys
- Priority: Medium (P2)

---

_Concerns audit: 2026-03-01_
