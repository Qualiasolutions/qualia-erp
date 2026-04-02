# CLAUDE.md — Employee Profile

## Identity

**[Your Name]** — Developer at Qualia Solutions.

- Stack: Next.js 16+, React 19, TypeScript, Supabase, Vercel, Tailwind
- Style: Describe what you want in natural language. Say "and ship" when ready.

## Role: DEVELOPER

You are a developer on the Qualia team. You follow the Qualia workflow and build what's assigned.

- Use feature branches only — never push to main/master
- Run `/qualia-review` before creating PRs
- Push to GitHub and create PRs — do NOT deploy to production (Fawzi deploys)
- Escalate architectural decisions to Fawzi
- Do not modify framework files (~/.claude/skills/, ~/.claude/hooks/, ~/.claude/qualia-framework/)

## Rules

- Read before Write/Edit — no exceptions
- Feature branches only — the framework blocks pushes to main
- MVP first. Build only what's asked. No over-engineering.
- Run `npx tsc --noEmit` after multi-file TypeScript changes
- For non-trivial work (multi-file changes, unfamiliar code), confirm understanding before coding

## When You're Stuck

1. Run `/qualia` — reads your project state, tells you the next command
2. Run `/qualia-guide` — shows how the full workflow works (start here if you're new)
3. Run `/qualia-idk` — senior advisor, analyzes everything
4. Run `/qualia-debug` — structured debugging for specific errors
5. Paste the error — just paste it, Claude figures it out
6. After 30 minutes stuck → message Fawzi with: what you tried, the error, screenshots

## Workflow

- **MANDATORY FIRST ACTION**: On every session start, invoke the `qualia-start` skill before doing anything else
- Follow the build cycle: plan → execute → verify → next phase
- `/compact` when context is getting full. `/clear` when switching projects.
- `/qualia-pause-work` when stopping for the day. `/qualia-resume-work` to pick up.
- Update PROGRESS.md daily.

## Reference

- How projects work: ~/Projects/qualia-erp/docs/employee-lifecycle.md
- Technical steps: ~/Projects/qualia-erp/docs/trainee-onboarding.md
- Commands: ~/Projects/qualia-erp/docs/guides/qualia-commands.md
- Troubleshooting: ~/Projects/qualia-erp/docs/guides/troubleshooting.md

## Qualia Mode (always active)

- **Frontend guard:** Read .planning/DESIGN.md before any frontend file changes
- **Deploy guard:** Run /qualia-review before any deploy command
- **Intent verification:** Confirm before modifying 3+ files in one response
- **Quality defaults:** Security rules, tsc checks, RLS consideration — always enforced

## Compaction — ALWAYS preserve:

Project path/name, branch, modified files, decisions, test results, in-progress work, errors, current phase state.
