# Troubleshooting — When Things Don't Work

> Something broke? Don't panic. Work through this checklist.

---

## Step 1: What's Actually Broken?

Before diving in, figure out the scope:

| Symptom                            | Likely cause                        | Jump to                             |
| ---------------------------------- | ----------------------------------- | ----------------------------------- |
| White screen / "Application error" | Build error or missing env var      | [Build Issues](#build-issues)       |
| Login doesn't work                 | Supabase auth URL misconfigured     | [Auth Issues](#auth-issues)         |
| Data doesn't load                  | Supabase connection or RLS          | [Database Issues](#database-issues) |
| Site loads but looks wrong         | CSS/deployment cache issue          | [Display Issues](#display-issues)   |
| "500 Internal Server Error"        | Server action or API route crashing | [Server Errors](#server-errors)     |
| Site is completely down            | Vercel or Supabase outage           | [Outages](#outages)                 |

---

## Build Issues

### The site shows "Application error" or a white screen

**Check 1: Does the build pass locally?**

```bash
npm run build
```

If it fails, the error message tells you what's wrong. Common causes:

- TypeScript errors (wrong types, missing imports)
- Missing environment variables
- A file was deleted but still imported somewhere

**Check 2: Are all env vars set in Vercel?**

Go to Vercel → Project → Settings → Environment Variables. Compare with your `.env.local`. Every variable you use locally needs to exist in Vercel too.

**Check 3: Check Vercel build logs**

Vercel → Project → Deployments → Click the failed deployment → View build logs. The error is usually near the bottom.

---

## Auth Issues

### Login redirects to the wrong place

**Fix**: Update Supabase Authentication settings:

1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL**: Set to your production URL (`https://yourproject.vercel.app`)
3. **Redirect URLs**: Add both:
   - `https://yourproject.vercel.app/**`
   - `http://localhost:3000/**`

### "Invalid redirect URL" error

The URL your app is trying to redirect to isn't in Supabase's allowlist. Add it to Redirect URLs (see above).

### Users can't sign up

Check: Supabase Dashboard → Authentication → Providers → Email

- Is email auth enabled?
- Is email confirmation required? (If yes, check spam folders)

### Auth works locally but not in production

The most common cause: `Site URL` in Supabase still points to `http://localhost:3000` instead of the production URL.

---

## Database Issues

### No data loads on the page

**Check 1: Is the Supabase project running?**

```bash
curl -s -o /dev/null -w "%{http_code}" https://[your-project-ref].supabase.co/rest/v1/
# Should return 200
```

If it returns an error, the project might be paused (free tier projects pause after 7 days of inactivity). Go to the dashboard and restore it.

**Check 2: Is the table empty?**

Open Supabase Dashboard → Table Editor → Select the table. Is there actually data in it?

**Check 3: Are env vars correct?**

Double-check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are correct and match the project you're looking at.

### "Permission denied" or empty results

This is usually a Row Level Security (RLS) issue. The database has rules about who can see what data. Talk to your lead — they can check the RLS policies.

---

## Display Issues

### Site loads but CSS looks broken

**Try 1: Hard refresh**

- Chrome: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
- This clears the browser cache

**Try 2: Check if it's a deployment issue**

- Open the Vercel deployment URL directly (not the custom domain)
- If it looks fine there, the issue is DNS/caching on the custom domain

**Try 3: Redeploy**

```bash
vercel --prod
```

### Layout breaks on mobile

Use `/responsive` in Claude Code — it'll analyze and fix responsive issues.

---

## Server Errors

### 500 Internal Server Error

**Check 1: Vercel function logs**

```bash
vercel logs
```

Look for error messages. They tell you exactly which function crashed and why.

**Check 2: Run the app locally**

```bash
npm run dev
```

Try to reproduce the error. Check the terminal output for error messages.

**Common causes:**

- A server action references a table/column that doesn't exist
- Missing env var (the code runs but crashes when it tries to use the var)
- A third-party API changed or is down

---

## Outages

### Is it Vercel or Supabase?

Check their status pages:

- **Vercel**: [vercel.com/status](https://www.vercel-status.com/)
- **Supabase**: [status.supabase.com](https://status.supabase.com/)

If either service is down, there's nothing you can do but wait and let the client know.

### The site was working and suddenly stopped

Run through this in order:

1. Check if someone deployed recently (`vercel ls`)
2. Check if an env var was changed or deleted (Vercel Dashboard → Settings → Environment Variables)
3. Check if the Supabase project is paused
4. Check Vercel and Supabase status pages
5. Check the domain DNS (if using custom domain)

---

## The Nuclear Option: Rollback

If you can't find the fix and the site is down for a client:

```bash
# List recent deployments
vercel ls

# Find the last working deployment URL
# Promote it to production
vercel promote [working-deployment-url] --yes
```

This restores the previous version instantly. Now you have breathing room to investigate.

---

## When to Escalate

Don't spend more than 30 minutes stuck on the same issue without asking for help. Reach out to Fawzi with:

1. **What's broken** (specific error message or behavior)
2. **What you tried** (list what you checked)
3. **Screenshots** (of the error, Vercel logs, browser console)

A clear bug report saves everyone time.
