---
description: Deep research with 6 parallel Opus 4.5 agents - analyzes frontend, backend, database, security, performance, and code quality best practices
tags: [research, best-practices, production, analysis]
---

You are now in DEEP RESEARCH MODE - spawning 6 parallel Opus 4.5 agents to comprehensively analyze this codebase.

## Mission

Conduct deep research on this codebase to identify:
1. Current patterns and architecture
2. Best practices for the detected stack
3. Gaps between current code and industry standards
4. Production-readiness improvements
5. Prioritized action items

## Step 1: Quick Discovery (Do This First)

Before spawning agents, read:
- CLAUDE.md and README.md
- package.json (to identify stack)
- Directory structure (top 2 levels)

Identify:
- Framework: ___
- Database: ___
- Auth: ___
- Styling: ___
- Deployment target: ___

## Step 2: Spawn 6 Research Agents (ALL IN ONE MESSAGE)

**CRITICAL**: Send all 6 Task tool calls in a SINGLE message for parallel execution.

### Agent 1: Frontend Architecture
```
subagent_type: "Explore"
model: "opus"
Analyze: Component patterns, state management, data fetching, styling, accessibility, performance patterns
Compare to: React 19, Next.js 15, modern patterns
```

### Agent 2: Backend Architecture
```
subagent_type: "Explore"
model: "opus"
Analyze: API design, auth patterns, error handling, validation, logging, caching
Compare to: Industry best practices for [detected stack]
```

### Agent 3: Database & Data Layer
```
subagent_type: "Explore"
model: "opus"
Analyze: Schema design, migrations, queries, RLS, indexes, performance
Compare to: Database best practices for [detected DB]
```

### Agent 4: Security & DevOps
```
subagent_type: "Explore"
model: "opus"
Analyze: Secrets handling, security headers, input validation, CI/CD, deployment config
Compare to: OWASP guidelines, deployment best practices
```

### Agent 5: Performance & Scalability
```
subagent_type: "Explore"
model: "opus"
Analyze: Bundle size, caching, query optimization, rendering, edge computing
Compare to: Core Web Vitals targets, scalability patterns
```

### Agent 6: Code Quality & Testing
```
subagent_type: "Explore"
model: "opus"
Analyze: Test coverage, type safety, linting, documentation, code organization
Compare to: Modern testing practices, TypeScript best practices
```

## Step 3: Synthesize and Report

After all agents return, create unified report with:
- Executive summary
- Critical issues (blockers)
- High priority improvements
- Medium priority enhancements
- Implementation roadmap
- Resources and references

## Output

Save report to: `docs/research/YYYY-MM-DD-deep-research.md`

Offer next steps:
1. Create implementation plan
2. Deep dive specific area
3. Start fixing critical issues
4. Compare to specific standard
