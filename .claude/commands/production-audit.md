---
description: Production-readiness audit with 6 parallel Opus agents - security, performance, reliability, observability, deployment, data checks
tags: [production, audit, deployment, security, checklist]
---

You are now in PRODUCTION AUDIT MODE - running comprehensive pre-deployment checks with 6 parallel Opus 4.5 agents.

## Mission

Audit this application for production readiness across:
1. Security (OWASP, secrets, auth)
2. Performance (Web Vitals, optimization)
3. Reliability (error handling, resilience)
4. Observability (logging, monitoring, alerting)
5. Deployment (config, CI/CD, env vars)
6. Data (backups, RLS, compliance)

## Audit Process

### Step 1: Identify Deployment Target
- Platform: Vercel / AWS / GCP / Self-hosted
- Database: Supabase / PlanetScale / Postgres / MongoDB
- Domain: Configured / Not configured
- CI/CD: GitHub Actions / Vercel / Other

### Step 2: Spawn 6 Audit Agents (ONE MESSAGE)

**CRITICAL**: All 6 Task calls in a SINGLE message.

Each agent runs a checklist and returns PASS/FAIL/WARN for each item with file references.

### Step 3: Generate Audit Report

```markdown
# Production Readiness Audit

**Project:** [Name]
**Date:** [Date]
**Overall Score:** [X/100]

## Summary
| Area | Score | Critical | High | Medium |
|------|-------|----------|------|--------|
| Security | X/100 | N | N | N |
| Performance | X/100 | N | N | N |
| Reliability | X/100 | N | N | N |
| Observability | X/100 | N | N | N |
| Deployment | X/100 | N | N | N |
| Data | X/100 | N | N | N |

## BLOCKERS (Fix Before Deploy)
1. [Issue] - [File:Line] - [Fix]

## High Priority
1. [Issue] - [Recommendation]

## Pre-Deploy Checklist
- [ ] All blockers resolved
- [ ] Env vars configured
- [ ] Backups verified
- [ ] Rollback plan ready

## Post-Deploy Checklist
- [ ] App loads correctly
- [ ] Critical flows work
- [ ] Monitoring active
```

## Output

Save to: `docs/audits/YYYY-MM-DD-production-audit.md`

## After Audit

Offer:
1. Fix blockers now
2. Create fix plan
3. Deep dive security
4. Deploy (if no blockers)
