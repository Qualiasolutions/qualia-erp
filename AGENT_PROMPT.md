# Agent Continuation Prompt

## Context

You are continuing the Qualia platform optimization work. This is a Next.js 16+ project management platform with Supabase, featuring CRM, project roadmaps, AI chat, and VAPI voice assistant.

## What's Been Completed

### Week 1 Quick Wins (All Done ✅)

- **Design System**: Centralized color constants (`lib/color-constants.ts`), widget headers, empty states, skeleton components
- **AI Chat Agent**: Workspace scoping fixes, step count increased to 12, tool input validation
- **Voice Assistant**: Added `assign_task`, `update_project`, `get_overdue_items` tools
- **Meeting Links**: Dashboard meetings widget, Google Meet integration, join buttons
- **Mobile**: Inbox kanban responsive grid fixed

## What's Next: Month 1 Intelligence Enhancements

Reference: `/home/qualiasolutions/Desktop/Projects/platforms/qualia/OPTIMIZATION_PLAN.md`

### Priority 1: AI Agent - Semantic Search with RAG

- **Goal**: Use pgvector embeddings for intelligent knowledge retrieval
- **Implementation**:
  1. Create `app/api/embeddings/route.ts` - Generate embeddings using OpenAI text-embedding-3-small
  2. Add `searchKnowledgeBase` tool to `app/api/chat/route.ts`
  3. Use existing `match_documents()` function in Supabase
- **Existing**: `documents` table with pgvector (1536 dimensions) already exists

### Priority 2: AI Agent - Message History & Context

- **Goal**: Stateful conversations with follow-up capability
- **Implementation**:
  1. Create migration: `supabase/migrations/add_chat_messages.sql` (workspace_id, user_id, message, role, timestamp)
  2. Update `app/api/chat/route.ts` to load last 10 messages
  3. Update `components/chat.tsx` to persist messages to DB
- **Benefit**: User can say "create a task for that project" without re-specifying

### Priority 3: Redis Rate Limiting

- **Goal**: Production-ready rate limiting (current in-memory doesn't work at scale)
- **Implementation**:
  1. Add Upstash Redis (Vercel integration)
  2. Update `lib/rate-limit.ts` to use Redis incr + TTL
  3. Add `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` to env
- **Current**: `lib/rate-limit.ts` uses in-memory Map

### Priority 4: Voice Assistant - Conversation Memory

- **Goal**: Context across calls
- **Implementation**:
  1. Create migration: `supabase/migrations/add_voice_call_history.sql` (call_id, user_id, transcript, tools_used)
  2. Update `app/api/vapi/webhook/route.ts` to load history on call start
  3. Pass last 3 calls' context to system prompt

### Priority 5: Response Caching

- **Goal**: Faster responses, reduce DB load
- **Implementation**:
  1. Create `lib/cache.ts` with Redis client
  2. Cache keys: `workspace:{id}:stats`, `workspace:{id}:projects`, `workspace:{id}:team`
  3. TTLs: 5 min for stats, 2 min for projects, 10 min for team
  4. Invalidate on writes in `app/actions.ts`

## Key Files

```
app/api/chat/route.ts          # AI chat agent with tools
app/api/vapi/webhook/route.ts  # Voice assistant webhook (11+ tools)
lib/rate-limit.ts              # Current rate limiter
lib/vapi-webhook-handlers.ts   # Intelligent voice response handlers
components/chat.tsx            # Chat UI component
```

## Database

- Supabase project is connected via MCP
- Use `mcp__supabase__apply_migration` for schema changes
- Use `mcp__supabase__execute_sql` for queries
- Use `mcp__supabase__list_tables` to see schema

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

## Instructions

1. Pick ONE priority item to implement
2. Read the relevant files first
3. Create a plan before coding
4. Test with `npm run build` before committing
5. Use conventional commit messages
6. Push to master to trigger CI/CD → Vercel deployment

Start by asking which Month 1 item to implement, or suggest starting with RAG search as it provides the most user value.
