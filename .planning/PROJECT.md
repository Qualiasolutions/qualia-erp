# Qualia ERP / Portal v2

Internal Qualia Solutions platform — runs the company's project delivery, client portal, financial ops, and AI-assisted workflows.

**Live at:** https://portal.qualiasolutions.net
**Repo:** github.com/QualiasolutionsCY/qualia-erp · `master` is the deploy source (no auto-deploy from push — `vercel --prod` only)
**Status:** shipped, M1–M4 closed, M5 rolling polish.

## What it is

A combined ERP + client portal serving three roles:

- **Admin** (Fawzi + ops) — full workspace: dashboard, projects, clients, team, reports, billing, knowledge, settings
- **Employee** — daily work surface: dashboard, projects, knowledge, settings; clock-in/out + time tracking
- **Client** — read-only portal: dashboard, projects, requests, messages, billing, settings

## What's running

- **Project + task tracking** with phase rollups synced from `.planning/` via GitHub webhooks
- **Auto-assignment engine** that converts phase items into inbox tasks on assignment
- **Client portal** with messaging (Supabase Realtime), file management, billing, feature requests
- **Financial ops** — Zoho Books integration, 4 invoice templates (monthly retainer, simple service, project deposit, project balance), 2 terms templates (generic, sakani PDA), 5 finance MCP tools
- **AI chat** with pgvector RAG over project context (Gemini + OpenRouter via AI SDK)
- **Framework integration** — `/api/v1/reports` ingests session reports from `/qualia-report` clock-out
- **MCP server** at `/api/mcp/mcp` exposing the ERP to Claude connectors with `qlt_*` bearer tokens
- **Live presence**, time tracking, daily check-ins, work sessions

## Stack (verify against root CLAUDE.md, not this doc)

Next.js 16+ (App Router) · React 19 · TypeScript · Tailwind + shadcn/ui · SWR (45s refresh) · Supabase (PostgreSQL + pgvector + Realtime + Storage) · AI SDK (Gemini + OpenRouter) · Resend · Sentry · Zoho Books + Zoho Mail · Upstash Redis (rate limiting) · Vercel (team `qualia-glluztech`).

## What lives where

- `app/actions/` — 56 domain modules of server actions, each returning `ActionResult { success, error?, data? }`
- `lib/` — adapters, validation (Zod), SWR hooks (37 + 33 invalidators), color/elevation/z-index constants, Zoho client, planning sync core, AI tools
- `supabase/migrations/` — schema (63 tables + 1 view) — never edit prod directly
- `.planning/` — Qualia framework state (this folder); `JOURNEY.md` is the milestone arc, `STATE.md` is current position, `ROADMAP.md` is M5 sub-tracks, `REVIEW.md` is the last audit
- Root `CLAUDE.md` — definitive engineering reference (commands, conventions, route map, RLS rules, deploy procedure)

## What this file is NOT

Not the engineering reference — that's `CLAUDE.md` at the repo root.
Not the milestone arc — that's `.planning/JOURNEY.md`.
Not requirements — `REQUIREMENTS.md` is historical (M1–M4 spec, all shipped).

This is the one-paragraph orientation a new contributor or agent reads to know what they're looking at.
