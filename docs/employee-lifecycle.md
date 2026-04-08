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
/qualia-new → set up project
For each phase:
  /qualia-plan  → plan the phase
  /qualia-build → build it (parallel tasks)
  /qualia-verify → verify it works
/qualia-polish → design/UX pass
/qualia-ship → deploy
/qualia-handoff → deliver to client
```

### Step 1: Start the Project

If it's a brand new project:

```
/qualia-new
```

This asks you questions about what you're building, creates the project structure, and sets up a roadmap with phases. It takes about 10-15 minutes.

You end up with a `.planning/` directory containing a roadmap of phases to build.

### Step 2: Plan a Phase

```
/qualia-plan
```

This creates a detailed plan for the current phase — what to build, acceptance criteria, and step-by-step tasks. The plan lives in `.planning/phases/N/PLAN.md`.

### Step 3: Build the Phase

```
/qualia-build
```

This is where the actual building happens. Claude reads the plan and builds it. For larger phases, it spawns multiple builder agents working in parallel on independent tasks.

During execution, you can describe what you want naturally:

> "Make the header sticky with a blur effect, add the logo on the left, navigation links on the right, and ship"

### Step 4: Verify the Work

```
/qualia-verify
```

This walks through the acceptance criteria from the plan and checks that everything was actually built. If something's missing, it flags it.

### Step 5: Next Phase

After verification passes, move to the next phase:

```
/qualia-plan
```

Or just ask what's next:

```
/qualia
```

The smart router reads your project state and tells you exactly what command to run.

### Repeat Until All Phases Are Done

The cycle repeats for every phase in your roadmap:

```
Phase 1: Plan → Build → Verify
Phase 2: Plan → Build → Verify
Phase 3: Plan → Build → Verify
...
All feature phases done → The Finish Line
```

---

## The Commands That Matter

You don't need to know 70+ commands. These are the ones you'll actually use:

### Building

| When                     | Command          | What it does                        |
| ------------------------ | ---------------- | ----------------------------------- |
| Starting a new project   | `/qualia-new`    | Sets up everything, creates roadmap |
| Planning a phase         | `/qualia-plan`   | Creates detailed plan for phase     |
| Building a phase         | `/qualia-build`  | Builds what was planned (parallel)  |
| Verifying work           | `/qualia-verify` | Checks work against plan            |
| Build one task properly  | `/qualia-task`   | Single task, done right             |
| Quick task (most common) | `/qualia-quick`  | Build/fix/improve anything fast     |
| Design transformation    | `/qualia-design` | One-shot design overhaul            |

### Shipping

| When                    | Command           | What it does                                      |
| ----------------------- | ----------------- | ------------------------------------------------- |
| Design/UX pass          | `/qualia-polish`  | Critique + polish + harden in one pass            |
| Code review before ship | `/qualia-review`  | Security + quality audit                          |
| Deploy to production    | `/qualia-ship`    | Full pipeline: quality gates, git, deploy, verify |
| Deliver to client       | `/qualia-handoff` | Generates delivery document for client            |

### Navigation (When You're Not Sure)

| When                   | Command         | What it does                                         |
| ---------------------- | --------------- | ---------------------------------------------------- |
| What should I do next? | `/qualia`       | Reads your project state, tells you the next command |
| I'm completely stuck   | `/qualia-idk`   | Senior advisor — analyzes everything, gives options  |
| Something is broken    | `/qualia-debug` | Structured debugging with error analysis             |

### Session Management

| When                 | Command          | What it does                                 |
| -------------------- | ---------------- | -------------------------------------------- |
| Stopping for the day | `/qualia-pause`  | Saves everything so you can pick up tomorrow |
| Starting next day    | `/qualia-resume` | Picks up where you left off                  |
| End of day report    | `/qualia-report` | Mandatory before clock-out                   |
| Context getting long | `/compact`       | Compresses context, preserves project state  |
| Switching projects   | `/clear`         | Clears context for a fresh start             |

### Design Refinement

| When                      | Command     | What it does                        |
| ------------------------- | ----------- | ----------------------------------- |
| Final detail pass         | `/polish`   | Spacing, alignment, consistency     |
| Design director review    | `/critique` | High-level design review            |
| Edge cases and robustness | `/harden`   | Overflow, i18n, edge case hardening |

**Most of the time**, you don't need a specific command. Just describe what you want and say "and ship" at the end. Claude handles the rest.

---

## The Finish Line (70% to 100%)

This is the part that gets missed. Building features is maybe 70% of a project. The other 30% is what makes it client-ready. Here's the exact sequence:

### After All Feature Phases Are Verified:

**1. Design polish**

```
/qualia-polish
```

Runs a full design/UX pass — critique, polish, and harden in one go. Fixes spacing, visual consistency, and edge cases.

**2. Code review**

```
/qualia-review
```

Security audit, quality checks, consistency review.

**3. Create a pull request**

Push your branch to GitHub and create a PR for Fawzi to review. You do NOT deploy to production — Fawzi handles that after reviewing your PR.

**4. Fawzi reviews + deploys**

After your PR is created, Fawzi reviews it and deploys to production. You'll be notified when it's live.

**5. Client handoff**

```
/qualia-handoff
```

Generates the delivery document for the client. (Fawzi may run this himself, or ask you to.)

**Important:** The framework guides you through these steps automatically. After all phases are verified, just keep typing `/qualia` — it tells you exactly what to do next until the PR is created. You don't need to memorize this list.

---

## How .planning/ Works

Every project has a `.planning/` directory. You don't edit these files manually — the commands update them. But understanding what's there helps.

```
.planning/
  STATE.md          <- Where the project is right now
  ROADMAP.md        <- All phases and their status
  PROJECT.md        <- What the project is, requirements, decisions
  DESIGN.md         <- Design system spec (read before frontend changes)
  phases/
    1/
      PLAN.md       <- What phase 1 should build
      SUMMARY.md    <- What phase 1 actually built
      VERIFICATION.md <- Verification results
    2/
      PLAN.md
      ...
```

| File              | Updated by                      | What it tells you                        |
| ----------------- | ------------------------------- | ---------------------------------------- |
| `STATE.md`        | Every command                   | Current phase, status, what to do next   |
| `ROADMAP.md`      | `/qualia-new`                   | Full phase list with status              |
| `PROJECT.md`      | `/qualia-new`                   | Project scope, requirements, constraints |
| `DESIGN.md`       | `/qualia-new`, `/qualia-design` | Design system and visual spec            |
| `PLAN.md`         | `/qualia-plan`                  | Detailed build plan for one phase        |
| `SUMMARY.md`      | `/qualia-build`                 | What was actually built                  |
| `VERIFICATION.md` | `/qualia-verify`                | Pass/fail for each acceptance criterion  |

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

- `/qualia-pause` — Saves a `.continue-here.md` file with full context. Use when stopping for the day.
- `/qualia-resume` — Reads `.continue-here.md` and picks up where you left off. Use when starting the next day.

### End of day

- Update your project's `PROGRESS.md` with what you did today
- Run `/qualia-pause` if you're mid-phase
- Run `/qualia-report` before clocking out
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

| Type            | Starter Template   | Deploy Target              | Stack                                   | Special Notes                       |
| --------------- | ------------------ | -------------------------- | --------------------------------------- | ----------------------------------- |
| **AI Agent**    | `ai-agent-starter` | Vercel                     | Next.js 16+ + OpenRouter + Supabase     | RAG, chat interfaces                |
| **Platform**    | `platform-starter` | Vercel                     | Next.js 16+ + Server Actions + Supabase | Dashboards, internal tools          |
| **Voice Agent** | `voice-starter`    | Supabase Edge / Cloudflare | Retell AI or VAPI + ElevenLabs          | Voice workflows                     |
| **Website**     | `website-starter`  | Vercel                     | Next.js 16+ (default) or Vite + React   | Use `/qualia-design` for premium UI |

Templates are at `~/Projects/qualia-erp/templates/`. Copy the right one when starting a project:

```bash
cp -r ~/Projects/qualia-erp/templates/[type]-starter/* .
```

Or use `/qualia-new` — it auto-detects the type and loads the right template.

---

## Daily Workflow

Here's what a typical day looks like:

### Morning

1. Open Claude Code in your project: `cd ~/Projects/[project] && claude`
2. The Qualia dashboard shows automatically
3. If continuing from yesterday: `/qualia-resume`
4. Otherwise: `/qualia` to see what's next

### During the day

- Follow the build cycle: plan → build → verify → next
- Use `/qualia-quick` for small tasks that don't need a full phase
- Describe what you want naturally: "fix the responsive layout on mobile and ship"
- Update `PROGRESS.md` with what you completed

### End of day

- `/qualia-pause` if mid-phase
- Update `PROGRESS.md`
- `/qualia-report` before clocking out
- `/clear` if switching projects tomorrow

---

## Quick Rules

- **Read before you write.** Always understand existing code before changing it.
- **Feature branches only.** Never push to `main` or `master`. The framework enforces this.
- **MVP first.** Build what's asked. Don't over-engineer.
- **Say "and ship"** when you want something deployed. Claude handles git, build, deploy, verify.
- **Don't fight the framework.** If a command blocks you (like pre-commit catching a secret), fix the issue — don't try to bypass it.
- **Ask when unclear.** Check `/qualia-idk` first, then ask Fawzi.
