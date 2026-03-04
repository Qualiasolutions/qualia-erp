# Environment Variables — The Complete Guide

> Environment variables are the #1 source of "it works locally but not in production" bugs. This guide explains exactly how they work at Qualia.

---

## What Are Environment Variables?

They're secret values your app needs but that you don't want in your code. Things like:

- Database connection URLs
- API keys for services (AI, email, voice)
- Webhook secrets

They're called "environment" variables because they change depending on where your app runs:

- **Locally**: You have `.env.local` on your machine
- **Production**: They're stored in Vercel's settings
- **Preview**: Can be different from production (useful for testing)

---

## The Two Places Env Vars Live

### 1. Local Development (`.env.local`)

This file sits in your project root. It's **never committed to git** (it's in `.gitignore`).

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUz...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUz...
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
```

### 2. Production (Vercel Dashboard)

Go to: **Vercel** → Your project → **Settings** → **Environment Variables**

Add each variable there. Select which environments it applies to:

- **Production** — the live site
- **Preview** — preview deployments from branches
- **Development** — pulled when using `vercel env pull`

---

## Where to Find Each Key

| Variable                               | Service    | Where to get it                                                  |
| -------------------------------------- | ---------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase   | Dashboard → Settings → API → Project URL                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase   | Dashboard → Settings → API → anon/public key                     |
| `SUPABASE_SERVICE_ROLE_KEY`            | Supabase   | Dashboard → Settings → API → service_role key                    |
| `GOOGLE_GENERATIVE_AI_API_KEY`         | Google     | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `RESEND_API_KEY`                       | Resend     | [resend.com/api-keys](https://resend.com/api-keys)               |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY`          | VAPI       | [vapi.ai/dashboard](https://vapi.ai/dashboard) → Settings        |
| `VAPI_WEBHOOK_SECRET`                  | VAPI       | Set when configuring assistant webhook                           |
| `OPENROUTER_API_KEY`                   | OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys)                 |

---

## The NEXT*PUBLIC* Rule

This is important:

- Variables that start with `NEXT_PUBLIC_` are **visible in the browser**. Anyone can see them.
- Variables **without** that prefix are **server-only**. They never reach the browser.

| Prefix         | Visible to users? | Use for                                         |
| -------------- | ----------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_` | Yes               | Supabase URL, public API keys, feature flags    |
| No prefix      | No                | Service role keys, API secrets, webhook secrets |

**Never put secret keys behind `NEXT_PUBLIC_`.** If someone can open DevTools and see your key, that's a security problem.

---

## Adding Env Vars to a New Project

### Step 1: Create the Supabase project

Get your URL, anon key, and service role key from the Supabase dashboard.

### Step 2: Create `.env.local`

```bash
# Copy the example file
cp .env.example .env.local

# Fill in the values
```

### Step 3: Add to Vercel

```bash
# Option A: Via CLI (one at a time)
vercel env add NEXT_PUBLIC_SUPABASE_URL
# It will prompt for the value and environment

# Option B: Via dashboard (easier for many vars)
# Go to Vercel → Project → Settings → Environment Variables
# Add them all through the UI
```

### Step 4: Verify

```bash
# Pull from Vercel to make sure they match
npx vercel env pull .env.check --environment production
# Compare with your .env.local
# Then delete the check file
rm .env.check
```

---

## Pulling Env Vars from Vercel

If you're joining a project that's already set up, you don't need to hunt for keys. Pull them from Vercel:

```bash
# Pull production env vars to a local file
npx vercel env pull .env.local --environment production --yes
```

This gives you all the env vars the production site uses. Now you can run the project locally.

---

## Common Problems

### "It works locally but not in production"

**Cause**: Env var is in `.env.local` but not in Vercel.

**Fix**: Add it to Vercel Dashboard → Settings → Environment Variables. Then redeploy:

```bash
vercel --prod
```

### "Build failed: missing environment variable"

**Cause**: Code references an env var that doesn't exist in the build environment.

**Fix**: Add the missing variable in Vercel. Check the build logs to see which one is missing.

### "API returns 401 Unauthorized"

**Cause**: Wrong API key, or the key expired.

**Fix**: Check the service dashboard (Supabase, Resend, etc.) for the correct key. Update it in both `.env.local` and Vercel.

### "Supabase says 'Invalid API key'"

**Cause**: You're using the wrong key, or copied it with extra spaces.

**Fix**: Go to Supabase → Settings → API. Copy the key again carefully. Make sure there are no spaces or newlines.

---

## Rules

1. **Never hardcode keys in code.** Always use `process.env.VAR_NAME`.
2. **Never commit `.env` files.** They should always be in `.gitignore`.
3. **Never share keys in Slack/WhatsApp.** Use the dashboard or `vercel env pull`.
4. **Always add to both** `.env.local` (local) AND Vercel (production).
5. **When in doubt**, pull from Vercel: `npx vercel env pull .env.local`.
