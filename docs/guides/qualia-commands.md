# Qualia Commands — How We Work with Claude Code

> We use Claude Code (AI in the terminal) to build everything. These are the commands and workflows you'll use daily.

---

## What is Claude Code?

Claude Code is an AI coding assistant that runs in your terminal. You open it, describe what you want, and it writes code, runs commands, and deploys for you.

```bash
# Start Claude Code in any project
claude
```

That's it. You're now talking to an AI that can read your codebase, write code, run tests, and deploy.

---

## The Core Commands You'll Actually Use

These are the commands we use every day. They live in `~/.claude/skills/`.

### `/qualia-quick` — The Go-To Command

This is the most-used command at Qualia. It's a fast, all-purpose workflow for making changes and shipping them. When you want to build something, fix something, or improve something — this is what you reach for.

```
/qualia-quick
```

Use it when:

- Building a new UI component or page
- Fixing a bug
- Making visual improvements
- Anything that's "do this thing and ship it"

In practice, most of the time you'll just describe what you want in plain English and say "and ship" at the end. Claude handles the rest.

### `/qualia-plan` and `/qualia-build` — For Bigger Work

When a project has a structured roadmap with phases (stored in `.planning/`), these commands let you plan and execute them. `/qualia-plan` creates a wave-based plan. `/qualia-build` spins up parallel builder agents to execute each task with fresh context.

```
/qualia-plan       # Plan the current phase
/qualia-build      # Build it (parallel tasks)
```

Each phase gets planned, built in parallel waves, and verified before moving on. This is how we handle larger projects.

### `/qualia-design` — For UI Work

When you need premium, distinctive UI. Not generic Bootstrap-looking stuff — sharp, animated, layered, professional. One-shot design transformation.

```
/qualia-design
```

We often combine this with `/qualia-quick` like: "use qualia-quick and qualia-design to remake this section..."

### `/qualia-ship` — Deploy Pipeline

Full quality gates, git, deploy, verify. Use when you're done and ready to push to production.

```
/qualia-ship
```

`/qualia-ship` auto-detects the project type and runs the right checks (SEO for websites, safety for AI agents, webhook verification for voice agents).

### `/qualia-review` — Code Review

Run before shipping something important. Checks security, quality, and consistency.

```
/qualia-review
```

### `/qualia-polish` — Design and UX Pass

Runs critique, polish, and harden passes on your frontend work. Use before shipping any UI.

```
/qualia-polish
```

### `/qualia-learn` — Teaching Claude

When something goes wrong and you want Claude to remember the lesson for next time:

```
/qualia-learn
```

---

## All Qualia Commands

The `/qualia` namespace covers the full project lifecycle:

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `/qualia-new`     | Set up a new project                  |
| `/qualia`         | What should I do next? (smart router) |
| `/qualia-idk`     | I'm stuck — smart advisor             |
| `/qualia-plan`    | Plan the current phase                |
| `/qualia-build`   | Build it (parallel tasks)             |
| `/qualia-verify`  | Verify it actually works              |
| `/qualia-design`  | One-shot design transformation        |
| `/qualia-debug`   | Structured debugging                  |
| `/qualia-review`  | Production audit                      |
| `/qualia-quick`   | Skip planning, just do it             |
| `/qualia-task`    | Build one thing properly              |
| `/qualia-polish`  | Design and UX pass                    |
| `/qualia-ship`    | Deploy to production                  |
| `/qualia-handoff` | Deliver to client                     |
| `/qualia-pause`   | Save session, continue later          |
| `/qualia-resume`  | Pick up where you left off            |
| `/qualia-learn`   | Save a pattern, fix, or client pref   |
| `/qualia-report`  | Log your work (mandatory)             |

---

## How We Actually Work (Real Examples)

Here's how real tasks look at Qualia. Notice the style — direct, fast, descriptive:

**Building/fixing UI:**

> "remove the 4 badges, make the team notes container extend more, move it to the left, then move the team members on the right, use qualia-quick and qualia-design to make it premium and structured and useable and ship"

**Deploying:**

> "ship phase 11 and 12 fully"

**Bug fix + ship:**

> "when I forget password the link on email takes you to login page, there is no create a new password page, make it connect it test it and ship"

**Design iteration:**

> "make the text full white, and make a bit more gap between links and double size the logo keeping the height same height and ship"

**Monitoring/debugging:**

> "compositing: Access to fetch blocked by CORS policy..."
> (Just paste the error. Claude will figure it out.)

The pattern is: **describe what you want, say "ship" when done**. No ceremony needed.

---

## The CLAUDE.md File

Every project has a `CLAUDE.md` file in the root. This is the project's brain — it tells Claude Code:

- What the project is
- What tech stack it uses
- What commands to run
- What patterns to follow
- What env vars are needed

**When you start working on a project, Claude Code reads this automatically.** You don't need to explain the project every time.

If you're creating a new project, make sure to set up `CLAUDE.md` — it saves everyone time.

---

## Tips

- **Just describe what you want.** You don't need to use slash commands for everything. "Fix the header and ship" works just as well.
- **Be specific.** "The button doesn't work" is better than "it's broken."
- **Paste errors directly.** Console errors, network errors — just paste them. Claude will figure it out.
- **Say "and ship" when you want it deployed.** Claude handles git, build, deploy, and verification.
- **Use `/qualia-learn` when something goes wrong.** Claude will remember and avoid the same mistake next time.
- **Don't fight Claude Code.** If it suggests a different approach, listen. It usually has a reason.

---

## Lost?

Just run `/qualia`. It's the smart router — it looks at where you are and tells you exactly what to do next.
