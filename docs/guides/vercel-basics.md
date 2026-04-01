# Vercel — How We Deploy

> Every Qualia project (except armenius which uses Cloudflare Workers) is deployed on Vercel. This guide covers what you actually need to know day-to-day.

---

## What is Vercel?

Vercel is where our websites and apps live on the internet. Think of it as the hosting platform. When you push code, Vercel builds it and puts it online.

- **Dashboard**: [vercel.com/qualia-solutions](https://vercel.com/qualia-solutions)
- **Team**: Qualia Solutions
- **Every project** gets a `.vercel.app` URL automatically (e.g., `bloom-clinic.vercel.app`)
- Clients can also have custom domains (e.g., `bloomclinic.com`)

---

## How Deployment Works

```
You push code to GitHub → Vercel detects it → Builds automatically → Site is live
```

That's it. Every push to `main` (or `master`) triggers a production deployment. Push to any other branch and you get a preview URL.

### Manual Deploy (when you need it now)

```bash
# Preview deploy (test URL, doesn't affect production)
vercel

# Production deploy (this is the live site)
vercel --prod
```

### Check Deployment Status

```bash
# List recent deployments
vercel ls

# See details of a specific deploy
vercel inspect [deployment-url]
```

Or just check the Vercel dashboard — it shows all deployments with green/red status.

---

## Environment Variables

This is the #1 thing trainees mess up. Env vars are secret values your app needs to work — API keys, database URLs, etc.

### Where env vars live

| Place            | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `.env.local`     | Your local machine only. Never committed to git.     |
| Vercel Dashboard | Production/Preview. This is what the live site uses. |

### How We Set Env Vars at Qualia

We manage environment variables through the **Vercel Dashboard**. It gives you a clear visual overview, lets you edit easily, and avoids typos.

**How to add env vars:**

1. Go to [vercel.com](https://vercel.com) → Log in → Select your project
2. Click **Settings** (top nav)
3. Click **Environment Variables** (left sidebar)
4. For each variable:
   - Type the variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Paste the value
   - Select which environments it applies to: **Production**, **Preview**, **Development**
   - Click **Save**
5. **After adding or changing env vars, you must redeploy** for the changes to take effect:
   ```bash
   vercel --prod
   ```

### Pulling env vars for local development

When joining a project that's already set up, pull the production env vars so you can run locally:

```bash
npx vercel env pull .env.local --environment production --yes
```

This creates your `.env.local` from whatever is already in the Vercel dashboard. You don't need to hunt for keys.

### Common env vars in every project

| Variable                                   | What it is                            | Where to get it                     |
| ------------------------------------------ | ------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                 | Supabase project URL                  | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`     | Public API key (safe for frontend)    | Same place                          |
| `SUPABASE_SERVICE_ROLE_KEY`                | Admin key (server-only, NEVER expose) | Same place                          |
| `GOOGLE_GENERATIVE_AI_API_KEY`             | Gemini AI key                         | Google AI Studio                    |
| `RESEND_API_KEY`                           | Email sending                         | Resend dashboard                    |
| `RETELL_API_KEY` / `RETELL_WEBHOOK_SECRET` | Voice AI                              | Retell AI dashboard                 |

### Rules

- Don't put env vars in code. No `const API_KEY = "sk-..."` anywhere.
- Don't commit `.env` files. They're in `.gitignore` for a reason.
- If a variable starts with `NEXT_PUBLIC_`, it's visible in the browser. Only use this for safe public keys.
- Everything else (service role keys, API secrets) stays server-only.

---

## Custom Domains

When a client wants their own domain (e.g., `clientsite.com`):

1. **In Vercel**: Project → Settings → Domains → Add domain
2. **Client updates DNS**: Vercel gives you the DNS records to add
   - A record: `76.76.21.21`
   - CNAME for www: `cname.vercel-dns.com`
3. **SSL is automatic** — Vercel handles HTTPS certificates

---

## Vercel + GitHub Connection

Every project is linked to a GitHub repo. The flow:

```
GitHub repo ← → Vercel project
     ↓                ↓
Push to main    Auto-deploy to production
Push to branch  Auto-deploy to preview URL
```

### Linking a project

```bash
# First time connecting a project to Vercel
vercel link
# Select: Qualia Solutions team
# Link to existing project or create new
```

---

## Checking if a Deployment Worked

After deploying, always verify:

```bash
# 1. Does the site load?
curl -s -o /dev/null -w "%{http_code}" https://yoursite.vercel.app
# Should return: 200

# 2. Is it fast?
curl -w "%{time_total}" -s -o /dev/null https://yoursite.vercel.app
# Should be under 0.5 seconds
```

Or just open the URL in your browser and check:

- Page loads without errors
- No blank white screen
- Login works (if it has auth)
- Key features work

---

## Rollback (When Things Go Wrong)

If a deployment breaks the site:

```bash
# List deployments to find the last working one
vercel ls

# Promote a previous deployment to production
vercel promote [previous-deployment-url] --yes
```

This instantly restores the old version while you fix the issue.

---

## Quick Reference

| Task                  | How                                                       |
| --------------------- | --------------------------------------------------------- |
| Deploy to production  | `vercel --prod`                                           |
| Deploy preview        | `vercel`                                                  |
| List deployments      | `vercel ls`                                               |
| Add/edit env vars     | **Vercel Dashboard → Settings → Environment Variables**   |
| Pull env vars locally | `npx vercel env pull .env.local --environment production` |
| Link project          | `vercel link`                                             |
| Rollback              | `vercel promote [url] --yes`                              |
| Check logs            | `vercel logs`                                             |
