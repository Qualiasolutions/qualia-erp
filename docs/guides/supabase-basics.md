# Supabase — How We Use It

> Every Qualia project uses Supabase as its database and authentication backend. Here's what you need to know as a trainee.

---

## What is Supabase?

Supabase is our backend — it handles:

- **Database** — Where all the data lives (projects, users, tasks, etc.)
- **Authentication** — Login, signup, password reset
- **Storage** — File uploads (logos, documents, images)
- **API** — Automatic REST API for every table you create

Think of it as "the server" for your app. You don't need to build a backend from scratch.

- **Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)
- **Organization**: Qualia Solutions

---

## The Dashboard — What's Where

When you open a Supabase project, here's what matters:

| Section                       | What it does                                                           |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Table Editor**              | View and edit your database tables. Like a spreadsheet for your data.  |
| **Authentication**            | See who's signed up, manage users, configure login methods.            |
| **Storage**                   | File uploads — logos, images, PDFs.                                    |
| **SQL Editor**                | Run SQL queries directly. Useful for quick fixes.                      |
| **Settings → API**            | **This is where you get your API keys** (the env vars your app needs). |
| **Settings → Authentication** | Configure redirect URLs, email templates, etc.                         |

---

## Getting Your API Keys

Every project needs these keys. Here's where to find them:

1. Open your project in the Supabase dashboard
2. Go to **Settings** → **API** (in the left sidebar under Configuration)
3. You'll see:

| Key                  | What it is                       | Safe for frontend?                           |
| -------------------- | -------------------------------- | -------------------------------------------- |
| **Project URL**      | `https://xxxxx.supabase.co`      | Yes (`NEXT_PUBLIC_SUPABASE_URL`)             |
| **anon/public key**  | `eyJ...` (long string)           | Yes (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |
| **service_role key** | `eyJ...` (different long string) | **NO. Server only. Never expose.**           |

Copy these and add them to:

- Your `.env.local` file (for local development)
- Vercel environment variables (for production) — see [Vercel Guide](./vercel-basics.md)

---

## Authentication Setup

When you create a new project, you need to tell Supabase where your app lives so login redirects work.

### Adding Your Site URL

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://yourproject.vercel.app` (your production URL)
3. Add **Redirect URLs**:
   - `https://yourproject.vercel.app/**` (production)
   - `http://localhost:3000/**` (local development)

Without this, login will break — users will get stuck after trying to sign in because Supabase doesn't know where to send them back.

### Common Auth Issues

| Problem                          | Cause                                | Fix                                               |
| -------------------------------- | ------------------------------------ | ------------------------------------------------- |
| Login redirects to wrong URL     | Site URL not set                     | Update Site URL in Authentication settings        |
| "Invalid redirect" error         | Redirect URL not in allowlist        | Add the URL to Redirect URLs                      |
| Users can't sign up              | Email confirmations disabled/enabled | Check Authentication → Providers → Email settings |
| Password reset link doesn't work | Site URL points to localhost         | Update to production URL                          |

---

## Creating a New Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. **Organization**: Qualia Solutions
4. **Name**: Use the project name (e.g., `bloom-clinic`)
5. **Database Password**: Generate a strong one. Save it somewhere safe.
6. **Region**: Frankfurt (eu-central-1) — closest to Cyprus
7. Click **Create new project**

Wait 1-2 minutes for it to provision. Then grab your API keys from Settings → API.

---

## Checking if Your Database is Working

### Quick health check

```bash
# Replace with your project's URL and anon key
curl -s -o /dev/null -w "%{http_code}" \
  "https://xxxxx.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"
# Should return: 200
```

### Common problems

| Symptom                    | Check                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| App shows no data          | Is the table empty? Check Table Editor.                            |
| "Permission denied" errors | RLS policies might be blocking access (ask your lead).             |
| App can't connect at all   | Are env vars correct? Check URL and key.                           |
| Project seems slow/down    | Is it paused? Free-tier projects pause after 7 days of inactivity. |

### Paused projects

Free-tier Supabase projects pause if unused for a week. If a project is paused:

1. Go to the Supabase dashboard
2. Click on the paused project
3. Click **Restore project**
4. Wait a few minutes

---

## Storage (File Uploads)

We use Supabase Storage for logos, documents, and images.

### How it works

- Files are organized in **buckets** (like folders)
- Most projects use a bucket called `project-files`
- Files get a public URL you can use in your app

### Checking storage

1. Dashboard → **Storage** (left sidebar)
2. Click on the bucket name
3. Browse files, upload new ones, or delete old ones

---

## Supabase Reference for Each Project

Every Qualia project has a unique Supabase "project ref" (a random string). Here are ours:

| Project      | Ref                    |
| ------------ | ---------------------- |
| Qualia ERP   | `vbpzaiqovffpsroxaulv` |
| Aquador      | `hznpuxplqgszbacxzbhv` |
| Maud         | `vspyxscitcuwnrhchskl` |
| Vero         | `zskfdlqyzhkzefafqkpx` |
| AiBossBrainz | `esymbjpzjjkffpfqukxw` |
| MPM          | `llherorsfgbdyqkrrlpc` |
| Zaid         | `uoqiwidqlsoamtugioik` |

You'll see this ref in the project URL: `https://[ref].supabase.co`

---

## Quick Reference

| Task                   | Where                                          |
| ---------------------- | ---------------------------------------------- |
| Get API keys           | Dashboard → Settings → API                     |
| Set auth redirect URLs | Dashboard → Authentication → URL Configuration |
| View/edit data         | Dashboard → Table Editor                       |
| Manage users           | Dashboard → Authentication → Users             |
| Upload files           | Dashboard → Storage                            |
| Run a query            | Dashboard → SQL Editor                         |
| Check project health   | Dashboard → Home (shows status)                |
