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

## Slash Commands We Use

These are shortcuts you type in Claude Code to trigger specific workflows. You don't need to remember what they do in detail — just know when to use which one.

### Everyday Commands

| Command           | When to use it                            | What it does                                    |
| ----------------- | ----------------------------------------- | ----------------------------------------------- |
| `/deploy`         | You're done with a feature, ready to ship | Full pipeline: tests → build → deploy → verify  |
| `/deploy --quick` | Quick push, skip tests                    | Just builds and deploys to production           |
| `/quick-fix`      | Small bug, obvious fix                    | Minimal changes, direct solution                |
| `/quick-pr`       | Need to create a PR                       | Auto-generates PR description from your changes |

### Building & Design

| Command                     | When to use it                 | What it does                                     |
| --------------------------- | ------------------------------ | ------------------------------------------------ |
| `/frontend-master`          | Building UI components         | React components with animations, proper styling |
| `/frontend-master --design` | Need a design direction        | Bold, distinctive aesthetics                     |
| `/responsive`               | Layout broken on mobile/tablet | Analyzes and fixes responsive issues             |

### Database & Backend

| Command     | When to use it                    | What it does                      |
| ----------- | --------------------------------- | --------------------------------- |
| `/supabase` | Any database operation            | Schema, migrations, auth, queries |
| `/quick-db` | Quick database query or migration | Fast Supabase operation           |

### Debugging & Quality

| Command             | When to use it                   | What it does             |
| ------------------- | -------------------------------- | ------------------------ |
| `/debug`            | Something's broken, not sure why | Systematic debugging     |
| `/debug --frontend` | CSS/layout issue                 | Visual debugging         |
| `/review`           | Code review before shipping      | Security + quality audit |
| `/test-runner`      | Need to run or write tests       | Unit tests, coverage     |

### AI & Voice

| Command        | When to use it             | What it does                   |
| -------------- | -------------------------- | ------------------------------ |
| `/voice-agent` | Building a voice assistant | Full VAPI voice agent workflow |

### Project Management

| Command    | When to use it                               | What it does                               |
| ---------- | -------------------------------------------- | ------------------------------------------ |
| `/status`  | Check project health                         | HTTP status, SSL, Supabase, response times |
| `/audit`   | Full project audit                           | Security, performance, code quality        |
| `/handoff` | Stopping for the day, someone else continues | Saves context for next session             |
| `/learn`   | Made a mistake, want to remember the lesson  | Saves a note for future sessions           |
| `/memory`  | View or manage saved notes                   | See what Claude remembers                  |

---

## How to Talk to Claude Code

You don't need to be formal. Just describe what you want:

**Good prompts:**

- "Add a contact form to the homepage"
- "The login page is broken, users get a white screen"
- "Deploy this to production"
- "Add the RESEND_API_KEY to Vercel env vars"
- "Make the sidebar responsive on mobile"

**Bad prompts:**

- "Fix it" (fix what?)
- "Make it better" (better how?)
- "Do the thing" (what thing?)

Be specific about what you want. Claude Code can read your entire codebase, so say things like "the button in the header" or "the projects table" — it'll find it.

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

## Common Workflows

### "I need to add a new feature"

1. Open Claude Code in the project directory
2. Say: "I need to add [feature]. Here's what it should do: [description]"
3. Claude will plan it, ask questions if needed, then build it
4. When done: `/deploy`

### "Something is broken"

1. Open Claude Code in the project directory
2. Say: "The [thing] is broken. Here's what happens: [description]"
3. Or use: `/debug`
4. Claude will investigate, find the root cause, and fix it
5. When done: `/deploy`

### "I need to check the project status"

1. Use `/status`
2. Or ask: "Is the site working? Check the production URL."

### "I'm done for the day"

1. Use `/handoff` — this saves your progress so the next session can pick up where you left off

---

## Tips

- **Don't fight Claude Code.** If it suggests a different approach, listen. It usually has a reason.
- **Be specific.** "The button doesn't work" is better than "it's broken."
- **Ask before you commit.** Claude Code won't push to production unless you tell it to.
- **Use `/learn` when you mess up.** Claude will remember and avoid the same mistake next time.
- **Read error messages.** Before panicking, paste the error to Claude Code. It can usually explain exactly what went wrong.
