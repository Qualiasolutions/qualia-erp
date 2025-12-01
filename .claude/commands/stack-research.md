---
description: Research latest best practices for your tech stack using web search and official docs - Next.js, React, Supabase, Vercel, Tailwind
tags: [research, documentation, best-practices, stack]
---

You are now in STACK RESEARCH MODE - finding up-to-date best practices for your tech stack.

## Mission

Research current best practices, patterns, and gotchas for the technologies in this project using:
1. Web search for latest blog posts and updates
2. Official documentation via Context7
3. GitHub issues and discussions
4. Community best practices

## Step 1: Identify Stack

Read package.json and codebase to identify:
- Next.js version: ___
- React version: ___
- Database: ___
- Auth: ___
- Styling: ___
- Other key libraries: ___

## Step 2: Research Each Technology

For each major technology, use:
- `mcp__context7__resolve-library-id` to get library ID
- `mcp__context7__get-library-docs` for official patterns
- `WebSearch` for recent blog posts and updates

### Research Topics

**Next.js**
- App Router patterns
- Server Components vs Client Components
- Data fetching (RSC, Server Actions)
- Caching strategies
- Recent breaking changes

**React**
- Hooks patterns
- State management approaches
- Performance optimization
- Testing patterns

**Supabase**
- Auth patterns for SSR
- RLS best practices
- Real-time patterns
- Edge functions

**Tailwind**
- Latest features
- Plugin ecosystem
- Performance tips

**Vercel**
- Deployment best practices
- Edge vs Serverless
- Analytics and monitoring

## Step 3: Generate Research Report

```markdown
# Stack Research: [Project Name]

**Researched:** [Date]
**Stack:** [Technologies]

## [Technology 1] Best Practices

### Official Recommendations
[From docs]

### Current Best Practices (2024)
1. [Practice with explanation]
2. [Practice with explanation]

### Common Pitfalls
1. [Anti-pattern and why]
2. [Anti-pattern and why]

### Code Examples
[Good vs bad patterns]

### Resources
- [Links to docs and articles]

## [Technology 2] Best Practices
...

## Recommendations for This Project

### Already Following Best Practices
- [Pattern you're already doing right]

### Should Update
- [Pattern that needs updating]

### Should Add
- [Pattern that's missing]
```

## Step 4: Offer Next Steps

1. Apply recommendations to code
2. Create migration plan
3. Deep dive specific area
4. Save research to docs/research/
