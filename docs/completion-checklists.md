# Qualia Project Completion Checklists

> **Every project must pass ALL items in its checklist before being considered complete.**
> Copy the relevant checklist into your project's root as `COMPLETION_CHECKLIST.md` and check items off as you go.
> Manager reviews the checklist before sign-off.

---

## Universal Checklist (ALL project types)

### 1. Client & Requirements

- [ ] All features from the project brief are implemented
- [ ] Client has reviewed and approved the work
- [ ] No outstanding client feedback unaddressed
- [ ] Project brief saved in `.planning/PROJECT.md`

### 2. Code Quality

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` completes successfully
- [ ] No `console.log` statements left in production code
- [ ] No `TODO` or `FIXME` comments left unresolved
- [ ] No commented-out code blocks
- [ ] CLAUDE.md is complete and accurate (stack, structure, commands, env vars)
- [ ] README.md has setup instructions

### 3. Security

- [ ] No API keys or secrets hardcoded in source code
- [ ] No `.env` files committed to git (`git log --all --full-history -- "*.env*"` returns nothing)
- [ ] `.env.example` exists with all required variable names (no values)
- [ ] All environment variables set in deployment platform (Vercel/Cloudflare)
- [ ] No `eval()` or `dangerouslySetInnerHTML` used
- [ ] Server-side auth checks on all mutations (never trust client)
- [ ] CORS configured correctly (not `*` in production)

### 4. Database (if applicable)

- [ ] RLS (Row Level Security) enabled on EVERY table
- [ ] RLS policies written and tested for each table
- [ ] No `service_role` key used in client-side code
- [ ] Supabase client created from `lib/supabase/server.ts` for mutations
- [ ] TypeScript types generated from database schema
- [ ] Migrations committed to `supabase/migrations/`
- [ ] Indexes on frequently queried columns

### 5. Testing

- [ ] Manual testing of all features completed
- [ ] All forms validate correctly (invalid input rejected, valid input accepted)
- [ ] Error states tested (network failure, invalid data, unauthorized access)
- [ ] Mobile responsive tested on real device or DevTools
- [ ] Cross-browser tested (Chrome + Safari minimum)

### 6. Performance

- [ ] `npm run build` bundle size reasonable (no massive chunks)
- [ ] Images optimized (WebP/AVIF, proper sizing, lazy loading)
- [ ] No N+1 database queries
- [ ] API responses under 500ms for key endpoints
- [ ] Fonts loaded efficiently (next/font or font-display: swap)

### 7. Deployment

- [ ] Project deployed to production (`vercel --prod` or `wrangler deploy`)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active and valid
- [ ] **HTTP 200** — Homepage loads: `curl -s -o /dev/null -w "%{http_code}" <URL>`
- [ ] **Auth flow** — Login/signup works end-to-end
- [ ] **Console clean** — No JavaScript errors in browser DevTools
- [ ] **Latency** — Key pages load under 3 seconds on mobile
- [ ] Project added to UptimeRobot monitoring

### 8. Handoff

- [ ] Client walkthrough/demo completed
- [ ] Client has access to all necessary accounts
- [ ] Documentation provided (how to use, how to update)
- [ ] Project registered in Qualia ERP (portal.qualiasolutions.net)
- [ ] Qualia context file updated (`~/.claude/knowledge/qualia-context.md`)

---

## Website-Specific Checklist

> Applies to: Marketing websites, landing pages, portfolio sites
> Stack: Next.js 16+ + React 19 + TypeScript + Tailwind v4 + Supabase + Vercel

### SEO

- [ ] Page titles set on every page (`<title>` or metadata)
- [ ] Meta descriptions set on every page (150-160 chars)
- [ ] Open Graph tags set (og:title, og:description, og:image)
- [ ] Favicon added (multiple sizes: 16x16, 32x32, apple-touch-icon)
- [ ] `robots.txt` exists and allows crawling
- [ ] `sitemap.xml` exists (or auto-generated)
- [ ] JSON-LD structured data on homepage (Organization or LocalBusiness)
- [ ] Heading hierarchy correct (single H1 per page, H2s, H3s in order)
- [ ] All images have `alt` text
- [ ] No broken links (test all navigation + footer links)

### Responsive Design

- [ ] Mobile (375px): All content readable, no horizontal scroll
- [ ] Tablet (768px): Layout adjusts properly
- [ ] Desktop (1280px): Content doesn't stretch beyond max-width
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Font sizes readable without zooming on mobile (min 16px body)

### Visual Quality

- [ ] Distinctive fonts loaded (not Inter/Arial/system default)
- [ ] Brand colors applied consistently
- [ ] Hover effects on all interactive elements
- [ ] Animations are smooth (no jank, no layout shift)
- [ ] Dark mode works (if applicable)
- [ ] No orphaned text (single words on a line in headings)

### Accessibility

- [ ] Keyboard navigation works (Tab through all interactive elements)
- [ ] Focus indicators visible on all interactive elements
- [ ] Color contrast ratio minimum 4.5:1 for body text
- [ ] Forms have associated labels
- [ ] Skip-to-content link exists

---

## Platform with LLM Checklist

> Applies to: SaaS apps, dashboards, internal tools with AI/LLM integration
> Stack: Next.js + Supabase + AI SDK (Gemini/OpenAI/Anthropic)

### AI Safety & Prompt Security

- [ ] System prompt NOT exposed to users (not in client bundle, not in API response)
- [ ] User input sanitized before injection into prompts
- [ ] No `eval()` or dynamic code execution from AI output
- [ ] AI output validated/sanitized before rendering (no raw HTML)
- [ ] Token limits enforced on AI calls (`maxTokens` set)
- [ ] Rate limiting on AI endpoints (per-user, per-minute)
- [ ] Cost monitoring configured (track token usage, set alerts)

### AI Functionality

- [ ] AI responses stream correctly (no buffering, smooth display)
- [ ] Error handling for AI provider failures (timeout, rate limit, quota)
- [ ] Fallback behavior when AI is unavailable
- [ ] Conversation context managed properly (not exceeding window)
- [ ] AI tools/functions validated before execution

### Platform Features

- [ ] Authentication working (login, signup, logout, password reset)
- [ ] Authorization checked server-side on every mutation
- [ ] Multi-tenancy isolation (users can only see their own data)
- [ ] Server Actions return `ActionResult { success, error?, data? }`
- [ ] Zod validation on all server action inputs
- [ ] Cache invalidation after mutations
- [ ] Loading states on all async operations
- [ ] Error boundaries on all pages
- [ ] 404 page exists

---

## AI Agent Checklist

> Applies to: Chat agents, AI personas, WhatsApp bots, web chatbots
> Stack: Next.js + AI SDK + Supabase

### AI Configuration

- [ ] System prompt written and tested
- [ ] AI provider configured (API key server-side only)
- [ ] Chat endpoint working (`/api/chat` or similar)
- [ ] Streaming responses working
- [ ] Temperature and model settings appropriate for use case

### AI Safety (CRITICAL)

- [ ] System prompt not exposed in client-side code
- [ ] No prompt injection vulnerabilities (test with adversarial inputs)
- [ ] `service_role` key NOT imported in any client component: `grep -r "service_role" app/ components/ src/`
- [ ] AI output sanitized before display
- [ ] Rate limiting on chat endpoint (per-user)
- [ ] `maxTokens` set on all AI calls
- [ ] Token budget monitoring in place

### Conversation Quality

- [ ] Agent stays in character / on topic
- [ ] Graceful handling of off-topic inputs
- [ ] Clear fallback responses for edge cases ("I can't help with that")
- [ ] Context window management (conversation doesn't exceed limits)
- [ ] Conversation history stored (if required)

### Integrations (if applicable)

- [ ] WhatsApp webhook verified and secure
- [ ] Webhook idempotency (duplicate messages handled)
- [ ] External API calls have timeout protection
- [ ] Error handling for third-party API failures

### Monitoring

- [ ] Error tracking configured (Sentry or logging)
- [ ] Token usage tracked and alerted
- [ ] Conversation logs stored for debugging
- [ ] Uptime monitoring active

---

## Voice Agent Checklist

> Applies to: Phone bots, voice assistants, IVR systems
> Stack: Retell AI + ElevenLabs + Supabase Edge Functions

### Voice Configuration

- [ ] Retell AI agent created and configured
- [ ] Voice provider selected and tested (Cartesia/ElevenLabs)
- [ ] STT provider configured (Gladia/Deepgram)
- [ ] LLM provider configured (Gemini/Claude/OpenAI)
- [ ] System prompt written for voice (concise, conversational)
- [ ] First message configured and sounds natural
- [ ] End-call message configured

### Voice UX

- [ ] Responses are SHORT (1-2 sentences max per turn)
- [ ] Agent confirms important info back to caller (dates, names, numbers)
- [ ] Interruption handling works (caller can cut in)
- [ ] Silence detection and timeout configured
- [ ] Escape route available ("say 'operator' for a human")
- [ ] Agent handles "I don't understand" gracefully

### Webhook & Tools

- [ ] Webhook endpoint deployed and accessible
- [ ] Webhook signature verification implemented (Retell webhook secret check)
- [ ] All tools defined, implemented, and tested
- [ ] Tool input validation with Zod
- [ ] Error handling for each tool (graceful degradation)
- [ ] Call logs stored in database

### Testing

- [ ] Test call from Retell AI dashboard successful
- [ ] Real phone call tested (if phone number configured)
- [ ] Edge cases tested (invalid dates, unavailable slots, etc.)
- [ ] Error scenarios tested (tool fails, API timeout)
- [ ] Multi-language tested (if applicable)

### Performance

- [ ] First response latency under 500ms
- [ ] Webhook response time under 300ms
- [ ] No audio gaps or awkward silences during tool execution
- [ ] Edge function cold start acceptable

### Deployment

- [ ] Cloudflare Worker deployed to production (or Vercel/Supabase)
- [ ] Retell AI agent updated with production webhook URL
- [ ] Phone number connected (if applicable)
- [ ] Webhook secrets set in production environment
- [ ] Final production test call successful

---

## Mobile App Checklist

> Applies to: iOS/Android apps
> Stack: React Native + Expo + Supabase

### App Basics

- [ ] App icon designed and configured (all required sizes)
- [ ] Splash screen configured
- [ ] App name and bundle identifier set
- [ ] Version number set correctly

### Functionality

- [ ] All screens implemented per requirements
- [ ] Navigation flows work correctly (forward, back, deep links)
- [ ] Forms validate correctly with error messages
- [ ] Pull-to-refresh on list screens
- [ ] Loading states on all async operations
- [ ] Empty states on all list screens
- [ ] Error handling with user-friendly messages

### Mobile-Specific

- [ ] Works on iOS (test on real device or simulator)
- [ ] Works on Android (test on real device or emulator)
- [ ] Keyboard handling correct (doesn't cover inputs)
- [ ] Safe area insets respected (notch, home indicator)
- [ ] Dark mode supported (if applicable)
- [ ] Orientation handling (portrait-only or both)
- [ ] Offline behavior defined (graceful degradation or offline-first)

### Push Notifications (if applicable)

- [ ] FCM configured for Android
- [ ] APNs configured for iOS
- [ ] Device token registration working
- [ ] Test notification received on real device
- [ ] Notification tap opens correct screen

### Security

- [ ] Sensitive data stored in SecureStore (not AsyncStorage)
- [ ] API keys not in client bundle
- [ ] Auth tokens have refresh logic
- [ ] Certificate pinning (if handling sensitive data)

### Store Submission

- [ ] App Store screenshots prepared (all required sizes)
- [ ] Play Store screenshots prepared
- [ ] App description written
- [ ] Privacy policy URL provided
- [ ] EAS Build configured and tested
- [ ] Test build distributed to client for approval
- [ ] Final build submitted to stores

### i18n & RTL (if applicable)

- [ ] All strings use message keys (no hardcoded text)
- [ ] Arabic text renders correctly (RTL layout)
- [ ] Icons flip correctly in RTL mode
- [ ] Western numerals (0-9) used everywhere (not Eastern Arabic)
- [ ] Date/time formatting locale-aware

---

## How to Use These Checklists

1. **At project start:** Copy the Universal Checklist + your project-type checklist into `COMPLETION_CHECKLIST.md` in your project root
2. **During development:** Check items off as you complete them
3. **Before shipping:** All items must be checked. Run `/review` for automated verification
4. **Manager review:** Fawzi reviews the checklist, signs off or returns with feedback
5. **After launch:** Keep the checklist in the repo as a record of what was verified

### Severity Guide

If an item can't be checked off, document WHY in the Notes section:

- **Blocker** — Must fix before launch (security, broken features)
- **Accepted Risk** — Acknowledged by Fawzi, documented, will fix later
- **N/A** — Doesn't apply to this project (e.g., no database = skip DB section)

---

_Last updated: 2026-03-23_
_Version: 1.0_
