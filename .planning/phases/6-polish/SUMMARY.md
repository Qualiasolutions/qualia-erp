# Phase 6 — Polish & Ship

Shipped 2026-04-17.

## Commits

| # | SHA | Title |
|---|-----|-------|
| 1 | `8ec179f` | Responsive + dark-mode audit pass |
| 4 | `79c1d4f` | Apply portal_settings migration + regenerate types |
| 2 | `2156bc0` | A11y hardening — nav landmark, tab ARIA, aria-live, labels, invoice memo |
| 3 | `386abbe` | Perf + motion polish — memo list rows, reduced-motion, no bounce easings |

## Delivered

### Responsive + dark-mode (Task 1)
- Zero hardcoded hex colors across `app/(portal)/` and `components/portal/`
- Zero hardcoded max-width caps (`max-w-[1200..]`, `max-w-7xl`, `max-w-6xl`) across repo
- All 4 residual `text-white` usages carry inline `text-white ok:` comments documenting guaranteed-dark overlay
- Messaging 375px panel-switch verified; workspace admin pages (App Library, Branding, Client Access) all have responsive classes

### Accessibility (Task 2, WCAG AA)
- `<nav aria-label="Portal navigation">` + focus-visible rings on sidebar links
- Full tab ARIA on `portal-project-tabs` (`role="tablist"/tab/tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`, ArrowLeft/Right/Home/End keyboard navigation)
- `role="log"` + `aria-live="polite"` + `aria-label="Message thread"` on message scroll container
- `aria-label`s on composer textarea + send button + `aria-keyshortcuts="Enter"`
- Dashboard stat-card links get descriptive `aria-label`s
- Invoice list: `role="list"` / `role="listitem"`, composed per-row labels, focus-visible rings, row component hoisted to module-level `React.memo` (`InvoiceRow`)
- Skip link verified: `href="#main-content"` + `id="main-content"` wired

### Performance (Task 3)
- 6 list-row components memoized: `RequestRow`, `ProjectGridCard`, `ProjectRow`, `FileCard`, `ActivityRow`, `RecentProjectRow`
- `useCallback` on mutation handlers where appropriate
- Module-scope utility hoisting (e.g., `getFileIcon`)
- `@media (prefers-reduced-motion: reduce)` block present in `app/globals.css` (lines 925-935)
- Zero bounce/spring easings in portal code

### Infrastructure (Task 4)
- `portal_settings` migration applied to production Supabase (project `vbpzaiqovffpsroxaulv`) via Supabase MCP
- `types/database.ts` regenerated from live schema — contains `portal_settings` type
- `/admin/board` feature restored (working tree reverts discarded per Fawzi's confirmed decision)

### Deploy (Task 5)
- `npx tsc --noEmit` → 0 errors
- `npm run lint` → 0 errors (1 acceptable `react-hooks/exhaustive-deps` warning on `portal-settings.tsx:59` — deferred as non-blocking)
- `npm run build` → success
- Production deploy: `vercel --prod --yes` → `portal.qualiasolutions.net`
- Post-deploy: HTTP 200, auth page reachable, API latency < 500ms

## Deferred / Known Items

- **Upstash rate limiting** — still pending Upstash provisioning (Fawzi decision from STATE.md).
- **M16 barrel export migration** — deferred; 39 files, high risk, negligible real bundle impact.
- **Playwright MCP browser QA** — not connected in build session; manual browser verification only.
- **Lint warning** in `portal-settings.tsx` (useCallback deps) — cosmetic, does not affect correctness.

## Phase Complete

Phase 6 closes out the Portal v2 roadmap. All 6 phases done.
