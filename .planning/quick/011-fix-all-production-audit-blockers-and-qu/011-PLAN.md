# Plan: 011 — Fix All Production Audit Blockers and Quick Wins

**Mode:** quick (inline)
**Created:** 2026-03-10

## Wave 1: Critical Security (parallel)

### Task 1: Remove tracked .env.vercel files + add to gitignore

**Files:** `.gitignore`, `.env.vercel`, `.env.vercel-pull`
**Done when:** Files untracked, gitignore updated

### Task 2: Delete unprotected /api/migrate-tasks route

**Files:** `app/api/migrate-tasks/route.ts`
**Done when:** Route deleted

### Task 3: Delete dead /api/upload-video route

**Files:** `app/api/upload-video/route.ts`
**Done when:** Route deleted

### Task 4: Fix cron secret enforcement (all 3 cron routes)

**Files:** `app/api/cron/reminders/route.ts`, `app/api/cron/blog-tasks/route.ts`, `app/api/cron/research-tasks/route.ts`
**Done when:** Secret always required in production, not conditional on its existence

### Task 5: Fix timezone bug in cron jobs

**Files:** `app/api/cron/blog-tasks/route.ts`, `app/api/cron/research-tasks/route.ts`
**Done when:** "today" computed in Europe/Nicosia timezone

## Wave 2: Performance + Cleanup (parallel)

### Task 6: Delete 24MB PowerPoint from public/

**Files:** `public/work/afifi/AI - Presentation.pptm`
**Done when:** File deleted, directory cleaned

### Task 7: Compress large public images

**Files:** `public/sphere.png`, `public/dashboard-bg.png`, `public/logos/glluztech.png`, `public/logos/melon-auto.png`
**Done when:** Images converted to WebP, <100KB each

### Task 8: Add dynamic imports for AI assistant + command menu

**Files:** `app/layout.tsx`
**Done when:** Heavy components use next/dynamic

### Task 9: Fix useTodaysMeetings to derive from useMeetings cache

**Files:** `lib/swr.ts`
**Done when:** Single network request, today's meetings derived from cache

## Wave 3: Build + verify

### Task 10: Update Next.js to patch CVEs

**Done when:** `next@16.1.6` or latest patch installed

### Task 11: Build verification

**Done when:** `npm run build` passes clean
