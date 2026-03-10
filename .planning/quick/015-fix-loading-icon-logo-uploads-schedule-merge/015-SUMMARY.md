# Summary: 015 — Fix loading icon, logo uploads, schedule block merging

## Changes

### 1. Loading state icon fixed

- **Root cause:** Files referenced `/sphere.png` but actual file is `/sphere.webp`
- **Fix:** Updated 4 files: `app/loading.tsx`, `app/projects/loading.tsx`, `components/qualia-voice.tsx`, `components/qualia-voice-inline.tsx`
- **Commit:** 584189f

### 2. Logo uploads fixed

- **Root cause:** Storage RLS policies block uploads via user session JWT (403 Unauthorized)
- **Fix:** Server actions already verify auth + workspace membership. Switched storage operations (upload, delete, getPublicUrl) to use `createAdminClient()` which bypasses storage RLS
- **Files:** `app/actions/logos.ts` — all 4 functions updated (uploadProjectLogo, deleteProjectLogo, uploadClientLogo, deleteClientLogo)
- **Commit:** 584189f

### 3. Schedule block merging for multi-hour items

- **Root cause:** Items were placed in their start-hour slot only. A 3-5 PM meeting only showed at 3 PM.
- **Fix:** Added `spanHours` to track item duration. Cells covered by a spanning item render as empty (hidden). Start cell gets increased height to visually span all covered hours.
- **Commit:** bb52e99

### 4. Hasan custom evening schedule (6 PM - 12 AM)

- **Fix:** `getMemberSlotHours()` returns `[18,19,20,21,22,23]` for Hasan. Grid computes union of all visible members' hours. Out-of-range cells dimmed.
- **Commit:** bb52e99

## Deployed

- Production: https://qualia-erp.vercel.app
- HTTP 307 (auth redirect) — expected
- Schedule latency: 472ms
