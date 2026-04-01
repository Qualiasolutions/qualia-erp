# Your Guide to Building at Qualia

> This is your map from "project assigned" to "client using it."
> Read this before anything else. It covers how every project works, regardless of type.

---

## How This Works

You get assigned a project. You open Claude Code in the terminal. You describe what you want in natural language. The Qualia framework handles the structure behind the scenes.

```bash
# Open Claude Code in your project
cd ~/Projects/[project-name]
claude
```

That's it. You're now working with an AI that reads your codebase, writes code, deploys, and tracks progress. The framework gives it structure so nothing falls through the cracks.

---

## The Build Cycle

Every project follows this cycle. It doesn't matter if it's a website, AI agent, voice agent, or mobile app — the cycle is the same.

```
Start → Plan → Execute → Verify → Next Phase → ... → Finish Line → Client Has It
```

### Step 1: Start the Project

If it's a brand new project:

```
/qualia-new-project
```

This asks you questions about what you're building, creates the project structure, and sets up a roadmap with phases. It takes about 10-15 minutes.

If the project already exists and you're starting new work:

```
/qualia-new-milestone
```

Either way, you end up with a `.planning/` directory containing a roadmap of phases to build.

### Step 2: Plan a Phase

```
/qualia-plan-phase 1
```

This creates a detailed plan for phase 1 — what to build, acceptance criteria, and step-by-step tasks. The plan lives in `.planning/phases/1/PLAN.md`.

If you're unsure about the approach, discuss first:

```
/qualia-discuss-phase 1
```

### Step 3: Execute the Phase

```
/qualia-execute-phase 1
```

This is where the actual building happens. Claude reads the plan and builds it. For larger phases, it spawns multiple agents working in parallel.

During execution, you can describe what you want naturally:

> "Make the header sticky with a blur effect, add the logo on the left, navigation links on the right, and ship"

### Step 4: Verify the Work

```
/qualia-verify-work 1
```

This walks through the acceptance criteria from the plan and checks that everything was actually built. If something's missing, it flags it.

### Step 5: Next Phase

After verification passes, move to the next phase:

```
/qualia-plan-phase 2
```

Or just ask what's next:

```
/qualia
```

The smart router reads your project state and tells you exactly what command to run.

### Repeat Until All Phases Are Done

The cycle repeats for every phase in your roadmap:

```
Phase 1: Plan → Execute → Verify ✓
Phase 2: Plan → Execute → Verify ✓
Phase 3: Plan → Execute → Verify ✓
...
All feature phases done → The Finish Line
```

---

## The Commands That Matter

You don't need to know 70+ commands. These are the ones you'll actually use:

### Building

| When                     | Command                   | What it does                        |
| ------------------------ | ------------------------- | ----------------------------------- |
| Starting a new project   | `/qualia-new-project`     | Sets up everything, creates roadmap |
| Planning a phase         | `/qualia-plan-phase N`    | Creates detailed plan for phase N   |
| Building a phase         | `/qualia-execute-phase N` | Builds what was planned             |
| Verifying work           | `/qualia-verify-work N`   | Checks work against plan            |
| Quick task (most common) | `/qualia-quick`           | Build/fix/improve anything fast     |
| Premium UI               | `/frontend-master`        | Distinctive, animated interfaces    |

### Shipping

| When                    | Command          | What it does                                      |
| ----------------------- | ---------------- | ------------------------------------------------- |
| Deploy to production    | `/ship`          | Full pipeline: quality gates, git, deploy, verify |
| Code review before ship | `/qualia-review` | Security + quality audit                          |
| Verify after deploy     | `/deploy-verify` | HTTP 200, auth, console, latency checks           |

### Navigation (When You're Not Sure)

| When                          | Command            | What it does                                         |
| ----------------------------- | ------------------ | ---------------------------------------------------- |
| What should I do next?        | `/qualia`          | Reads your project state, tells you the next command |
| How does this all work?       | `/qualia-guide`    | The full developer guide — 10 commands, clear flow   |
| I'm completely stuck          | `/qualia-idk`      | Senior advisor — analyzes everything, gives options  |
| Where does the project stand? | `/qualia-progress` | Phase-by-phase status overview                       |
| See all commands              | `/qualia-help`     | Full reference list                                  |

### Session Management

| When                 | Command               | What it does                                 |
| -------------------- | --------------------- | -------------------------------------------- |
| Stopping for the day | `/qualia-pause-work`  | Saves everything so you can pick up tomorrow |
| Starting next day    | `/qualia-resume-work` | Picks up where you left off                  |
| Context getting long | `/compact`            | Compresses context, preserves project state  |
| Switching projects   | `/clear`              | Clears context for a fresh start             |

**Most of the time**, you don't need a specific command. Just describe what you want and say "and ship" at the end. Claude handles the rest.

---

## The Finish Line (70% to 100%)

This is the part that gets missed. Building features is maybe 70% of a project. The other 30% is what makes it client-ready. Here's the exact sequence:

### After All Feature Phases Are Verified:

**1. Audit the milestone**

```
/qualia-audit-milestone
```

Checks: are all phases actually verified? Are all requirements from the roadmap met? This catches anything that slipped through.

**2. Fix any gaps the audit found**

```
/qualia-plan-milestone-gaps
```

Then execute the gap-fix phases the same way (plan → execute → verify).

**3. Complete the milestone**

```
/qualia-complete-milestone
```

Archives the milestone, tags a release, generates a changelog.

**4. Design polish**

```
/critique
```

Then fix what it finds:

```
/polish
```

Then harden edge cases:

```
/harden
```

**5. Code review**

```
/qualia-review --web
```

Security audit, quality checks, consistency review.

**6. Create a pull request**

```
/pr
```

Pushes your branch to GitHub and creates a PR for Fawzi to review. You do NOT deploy to production — Fawzi handles that after reviewing your PR.

**7. Fawzi reviews + deploys**

After your PR is created, Fawzi reviews it and deploys to production. You'll be notified when it's live.

**8. Client handoff**

```
/client-handoff
```

Generates the delivery document for the client. (Fawzi may run this himself, or ask you to.)

**Important:** The framework now guides you through these steps automatically. After `/qualia-complete-milestone`, just keep typing `/qualia` — it tells you exactly what to do next until the PR is created. You don't need to memorize this list.

---

## How .planning/ Works

Every project has a `.planning/` directory. You don't edit these files manually — the commands update them. But understanding what's there helps.

```
.planning/
  STATE.md          ← Where the project is right now
  ROADMAP.md        ← All phases and their status
  PROJECT.md        ← What the project is, requirements, decisions
  config.json       ← Workflow preferences
  phases/
    1/
      PLAN.md       ← What phase 1 should build
      SUMMARY.md    ← What phase 1 actually built
      UAT.md        ← Verification results
    2/
      PLAN.md
      ...
```

| File         | Updated by                    | What it tells you                        |
| ------------ | ----------------------------- | ---------------------------------------- |
| `STATE.md`   | Every command                 | Current phase, status, what to do next   |
| `ROADMAP.md` | `/qualia-new-project`, audits | Full phase list with status              |
| `PROJECT.md` | `/qualia-new-project`         | Project scope, requirements, constraints |
| `PLAN.md`    | `/qualia-plan-phase`          | Detailed build plan for one phase        |
| `SUMMARY.md` | `/qualia-execute-phase`       | What was actually built                  |
| `UAT.md`     | `/qualia-verify-work`         | Pass/fail for each acceptance criterion  |

**The golden rule:** Run `/qualia` and it reads STATE.md to tell you exactly what to do next. You never need to parse these files yourself.

---

## Session Management

Claude Code has a context window — it can hold a certain amount of conversation before it needs to compress or clear.

### When to `/compact`

- Claude tells you context is getting full
- Responses are getting slower or less focused
- You've been working for a while on the same phase
- The framework preserves your project state through compaction

### When to `/clear`

- You're switching to a different project
- You're starting a completely different task in the same project
- After deploying and before starting new work
- Between phases (after verify, before planning the next one)

### Pause and Resume

- `/qualia-pause-work` — Saves a `.continue-here.md` file with full context. Use when stopping for the day.
- `/qualia-resume-work` — Reads `.continue-here.md` and picks up where you left off. Use when starting the next day.

### End of day

- Update your project's `PROGRESS.md` with what you did today
- Run `/qualia-pause-work` if you're mid-phase
- The framework auto-saves a session summary

---

## "I'm Stuck" — What to Do

In order of what to try:

1. **Run `/qualia`** — It reads your project state and tells you the exact next command.

2. **Run `/qualia-idk`** — The senior advisor. It analyzes your full situation (code, errors, state) and recommends specific actions.

3. **Run `/qualia-debug`** — If something specific is broken. Structured debugging with error analysis.

4. **Paste the error** — Just paste it into Claude Code. Don't explain, don't interpret. Let Claude figure it out.

5. **After 30 minutes** — If you've tried the above and you're still stuck, message Fawzi with:
   - What you were trying to do
   - What error or problem you hit
   - What you've already tried
   - A screenshot if relevant

---

## Project Types

The build cycle above works for all project types. Here's where they differ:

| Type            | Starter Template   | Deploy Target              | Stack                                   | Special Notes              |
| --------------- | ------------------ | -------------------------- | --------------------------------------- | -------------------------- |
| **AI Agent**    | `ai-agent-starter` | Vercel                     | Next.js 16+ + OpenRouter + Supabase     | RAG, chat interfaces       |
| **Platform**    | `platform-starter` | Vercel                     | Next.js 16+ + Server Actions + Supabase | Dashboards, internal tools |
| **Voice Agent** | `voice-starter`    | Supabase Edge / Cloudflare | Retell AI or VAPI + ElevenLabs          | Use `/voice-agent` skill   |
| **Website**     | `website-starter`  | Vercel                     | Next.js 16+ (default) or Vite + React   | Use `/seo-master` for SEO  |
| **Mobile App**  | (ask Fawzi)        | Expo / App Store           | React Native + Expo + Supabase          | Use `/mobile-expo` skill   |

Templates are at `~/Projects/qualia-erp/templates/`. Copy the right one when starting a project:

```bash
cp -r ~/Projects/qualia-erp/templates/[type]-starter/* .
```

Or use `/qualia-new-project` — it auto-detects the type and loads the right template.

---

## Daily Workflow

Here's what a typical day looks like:

### Morning

1. Open Claude Code in your project: `cd ~/Projects/[project] && claude`
2. The Qualia dashboard shows automatically
3. If continuing from yesterday: `/qualia-resume-work`
4. Otherwise: `/qualia` to see what's next

### During the day

- Follow the build cycle: plan → execute → verify → next
- Use `/qualia-quick` for small tasks that don't need a full phase
- Describe what you want naturally: "fix the responsive layout on mobile and ship"
- Update `PROGRESS.md` with what you completed

### End of day

- `/qualia-pause-work` if mid-phase
- Update `PROGRESS.md`
- `/clear` if switching projects tomorrow

---

## Quick Rules

- **Read before you write.** Always understand existing code before changing it.
- **Feature branches only.** Never push to `main` or `master`. The framework enforces this.
- **MVP first.** Build what's asked. Don't over-engineer.
- **Say "and ship"** when you want something deployed. Claude handles git, build, deploy, verify.
- **Don't fight the framework.** If a command blocks you (like pre-commit catching a secret), fix the issue — don't try to bypass it.
- **Ask when unclear.** Check `/qualia-idk` first, then ask Fawzi.
