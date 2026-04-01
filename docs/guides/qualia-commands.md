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

These are the commands we use every day. They live in `~/.claude/commands/`.

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

### `/qualia-plan-phase` and `/qualia-execute-phase` — For Bigger Work

When a project has a structured roadmap with phases (stored in `.planning/`), these commands let you plan and execute them one by one.

```
/qualia-plan-phase 5       # Plan phase 5
/qualia-execute-phase 5    # Execute phase 5
```

Each phase has milestones, and each milestone gets planned, executed, and verified before moving on. This is how we handle larger projects like Aquad'or, Alkemy, etc.

### `/frontend-master` — For UI Work

When you need premium, distinctive UI. Not generic Bootstrap-looking stuff — sharp, animated, layered, professional.

```
/frontend-master
```

We often combine this with `/qualia-quick` like: "use qualia-quick and frontend master to remake this section..."

### `/ship` — Deploy Pipeline

Full quality gates → git → deploy → verify. Use when you're done and ready to push to production.

```
/ship
```

`/ship` auto-detects the project type and runs the right checks (SEO for websites, safety for AI agents, webhook verification for voice agents).

### `/qualia-review` — Code Review

Run before shipping something important. Checks security, quality, and consistency.

```
/qualia-review
```

### `/status` — Project Health Check

Quick check: is the site up? SSL valid? Supabase responding? API latency OK?

```
/status
```

### `/learn` and `/memory` — Teaching Claude

When something goes wrong and you want Claude to remember the lesson for next time:

```
/learn
```

To see what Claude has learned:

```
/memory
```

### `/qualia-optimize` — Speed Up

When something feels slow. Analyzes and optimizes performance.

---

## Other Qualia Workflow Commands

The `/qualia` namespace has more subcommands for project workflow management:

| Command                      | What it does                                 |
| ---------------------------- | -------------------------------------------- |
| `/qualia-progress`           | Show current project progress                |
| `/qualia-new-project`        | Initialize a new project with workflow files |
| `/qualia-verify-work`        | Verify completed work                        |
| `/qualia-new-milestone`      | Create a new milestone                       |
| `/qualia-complete-milestone` | Mark a milestone as complete                 |
| `/qualia-add-todo`           | Add a todo item                              |
| `/qualia-check-todos`        | Check todo status                            |
| `/qualia-pause-work`         | Pause current work and save state            |
| `/qualia-resume-work`        | Resume paused work                           |
| `/qualia-idk`                | When you're stuck and don't know what to do  |
| `/qualia-help`               | See all available commands                   |
| `/client-handoff`            | Generate client delivery document            |

---

## How We Actually Work (Real Examples)

Here's how real tasks look at Qualia. Notice the style — direct, fast, descriptive:

**Building/fixing UI:**

> "remove the 4 badges, make the team notes container extend more, move it to the left, then move the team members on the right, use frontend master and qualia quick to make it premium and structured and useable and ship"

**Deploying:**

> "ship phase 11 and 12 fully"

**Bug fix + ship:**

> "when I forget password the link on email takes you to login page, there is no create a new password page, make it connect it test it and ship"

**Design iteration:**

> "make the text full white, and make a bit more gap between links and double size the logo keeping the height same height and ship"

**Monitoring/debugging:**

> "compositing: Access to fetch blocked by CORS policy..."
> (Just paste the error. Claude will figure it out.)

The pattern is: **describe what you want → say "ship" when done**. No ceremony needed.

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
- **Use `/learn` when something goes wrong.** Claude will remember and avoid the same mistake next time.
- **Don't fight Claude Code.** If it suggests a different approach, listen. It usually has a reason.

---

## All Available Commands

To see everything available:

```
/qualia-help
```
