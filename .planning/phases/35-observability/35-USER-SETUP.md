# Phase 35: User Setup — Sentry Environment Variables

## Required For: Plan 35-01 (Sentry SDK)

Sentry is installed and configured but will be a **no-op** until these env vars are set.

### Step 1: Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and log in
2. Navigate to **Projects > Create Project**
3. Select **Next.js** as the platform
4. Name it `qualia-erp` (or similar)
5. Note the **DSN** shown after creation

### Step 2: Get Auth Token

1. Go to **Settings > Auth Tokens**
2. Click **Create New Token**
3. Scopes needed: `org:read`, `project:read`, `project:releases`
4. Copy the token

### Step 3: Set Environment Variables

Add to `.env.local` (local dev) and Vercel project settings (production):

```bash
# The DSN from Step 1 (same value for both)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@oNNNN.ingest.sentry.io/NNNNN
SENTRY_DSN=https://xxxxx@oNNNN.ingest.sentry.io/NNNNN

# Auth token from Step 2 (for source map uploads during build)
SENTRY_AUTH_TOKEN=sntrys_xxxxx

# Organization slug (Settings > Organization > slug)
SENTRY_ORG=your-org-slug

# Project slug (from Step 1)
SENTRY_PROJECT=qualia-erp
```

### Step 4: Add to Vercel

```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_DSN production
vercel env add SENTRY_AUTH_TOKEN production
vercel env add SENTRY_ORG production
vercel env add SENTRY_PROJECT production
```

### Verification

After setting env vars, trigger a test error and check it appears in the Sentry dashboard.

Without env vars, everything works normally — Sentry init is guarded and skipped.
