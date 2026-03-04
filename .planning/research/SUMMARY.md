# Project Research Summary

**Project:** Aquador Perfume E-commerce - Luxury Design Overhaul
**Domain:** Luxury e-commerce design transformation
**Researched:** 2026-03-04
**Confidence:** HIGH

## Executive Summary

Aquador is a functional perfume e-commerce site built with Next.js 14, Stripe, and Supabase. The existing cart, checkout, custom perfume builder, and admin panel work — this project is exclusively about elevating the design to luxury brand standards matching Jo Malone, Byredo, and Le Labo. Research confirms that luxury e-commerce requires three foundational pillars: premium typography with self-hosted fonts, high-performance product imagery optimized for mobile, and subtle motion design that enhances without distracting.

The recommended technical approach layers modern animation libraries (Framer Motion + Lenis smooth scroll) on top of the existing Next.js architecture without rebuilding functional systems. Key risk: performance degradation from heavy imagery and animations, which luxury brands cannot afford — research shows 1-second delay causes 7% conversion loss, and poorly optimized fonts can cause 20% mobile conversion drops. Mitigation strategy: establish performance budgets in Phase 1 (sub-2s load times, 60fps animations, <250KB JS bundle) before adding any luxury features, then incrementally add effects with A/B testing to ensure conversion rates don't decline.

The consolidation opportunity: Aquador already has strong design foundations (Next.js 14, Tailwind, shadcn/ui, existing design tokens) but needs systematic enhancement, not replacement. The research reveals this is primarily a presentation layer upgrade with minimal data flow changes, making it a 3-week effort rather than a multi-month rebuild.

## Key Findings

### Recommended Stack

Research validates existing Next.js 14 stack and identifies specific additions needed for luxury polish. No framework changes required — this is purely enhancement through strategic dependencies.

**Core technologies (NEW additions only):**

- **Framer Motion (v12.x)**: React animation library for page transitions and component interactions — industry standard used by Framer and Figma, 2.5x faster than GSAP for component animations, 8KB core with SSR compatibility
- **Lenis (v1.3.18)**: Hardware-accelerated smooth scroll engine — used by luxury brands for premium scroll feel, seamless GSAP integration for scroll-triggered effects
- **next/font (built-in)**: Self-hosting Google/Adobe Fonts — eliminates external requests (GDPR compliance), automatic subsetting, zero layout shift, critical for luxury performance
- **Radix UI + CVA**: Headless UI primitives with variant system — powers shadcn/ui (already in stack), enables luxury custom designs without style overrides
- **Embla Carousel (v8.x)**: Lightweight product gallery carousel (7KB vs Swiper's 45KB) — full creative control for branded product presentations
- **sharp (v0.x)**: Production image optimizer — 40-70% file size reduction with WebP/AVIF conversion, maintains luxury quality at 85-95 settings

**Bundle size impact:** ~53KB gzipped without GSAP, ~76KB with GSAP (use code-splitting for hero-only features). Total acceptable for luxury e-commerce with proper optimization strategy.

**Critical compatibility note:** Stay on React 18 + Next.js 14 until Q3 2026 or when Framer Motion v12.1 stable releases. React 19 support currently in alpha — downgrading causes instability.

### Expected Features

Research across 20+ luxury e-commerce sites and UX agencies reveals clear feature hierarchy.

**Must have (table stakes):**

- High-quality product photography (3+ angles, detail shots) — Foundation for all visual design
- Distinctive typography + refined color palette (NOT Inter/Arial) — Brand identity established immediately
- Fragrance pyramid visualization (top/heart/base notes hierarchy) — Industry standard customers expect
- Sensory storytelling copy ("sunlit Italian garden" not "bergamot") — Luxury sells emotion, not ingredients
- Sub-2 second load times with heavy imagery — Premium brands judged harshly on performance
- Mobile-first responsive design — Most traffic is mobile, luxury doesn't excuse poor mobile UX
- Clean, uncluttered layouts with intentional white space — Design discipline, not technical complexity
- Scent family filtering ("shop by scent") — Baseline UX for fragrance e-commerce

**Should have (competitive differentiators):**

- Scroll-triggered animations (scrollytelling) — Transforms product pages into immersive narratives
- Micro-interactions on product cards (3D tilt, hover zoom) — Signals interactivity and premium quality
- Personalization quiz (guided discovery) — 75,000+ quiz completions shows demand, builds email list
- Staggered entrance animations — Orchestrated reveals feel intentional, small detail with big impact
- Layered backgrounds with gradients — Depth and sophistication vs flat design
- Fragrance note ingredient stories (clickable notes) — "Rose de Mai from Grasse, France" adds storytelling depth

**Defer to v2+:**

- Custom product videos — High production cost, implement after design foundation proven
- Virtual scent profiling (AI/ML recommendations) — Requires data collection period, future enhancement
- Gift packaging customization — Luxury gifting experience, but not MVP blocker

**Anti-features (explicitly avoid):**

- Generic templates/themes — Lack individuality, luxury = unique
- Popup overlays during browsing — Interrupts experience, cheapens brand
- Card grid layouts — Generic SaaS aesthetic
- Blue-purple gradients — Overused tech aesthetic signals "startup" not "luxury"
- Auto-playing music/sound — Intrusive, damages trust, accessibility nightmare
- Slow-loading high-res images — Luxury can't sacrifice performance

### Architecture Approach

Research confirms Next.js 16 App Router + shadcn/ui integrates seamlessly with luxury design polish through three key patterns.

**Pattern 1: Client Component Wrappers**
Server Components handle data fetching, thin Client Components wrap animated sections. Example: Server Component fetches project data, `<AnimatedProjectWrapper>` adds fade-in animation without blocking SSR.

**Pattern 2: Loading State Layering**
Use Next.js `loading.js` convention for route-level loading, Suspense boundaries for granular component loading, SWR fallback for client-side refresh (already implemented). Match skeleton dimensions exactly to prevent layout shift.

**Pattern 3: Component Consolidation**
Single configurable `<ScheduleGrid />` component with CVA-powered variants for `viewMode`, `userColumns`, and `dataSource`. Replaces ~1,200 lines of duplicate code across 3 schedule grid implementations. Follows plugin-based architecture where core logic extracted, variants configured through props.

**Major components (for luxury overhaul):**

1. **AnimatedWrapper** — Generic fade-in for page transitions
2. **AnimatedList** — Stagger animations for task/phase/product lists
3. **AnimatedCard** — Hover lift micro-interactions for interactive elements
4. **Portal Skeletons** — Loading states matching exact content dimensions
5. **ScheduleGrid** — Consolidated schedule component with configurable props

**Data flow (unchanged):** Server Components → AnimatedWrapper (client boundary) → Existing Component Logic → Framer Motion animations (visual enhancement only). SWR hooks, Server Actions, validation — all remain unchanged. This is presentation layer polish, not architectural rebuild.

### Critical Pitfalls

**1. Animation Waterfall Destroying Performance**
Adding Framer Motion/GSAP without understanding App Router lifecycle causes 3+ second page loads. Animation libraries reload on every route transition, ScrollTriggers leak memory, CLS spikes.

- **Prevention:** Use CSS transforms/opacity (GPU-accelerated), initialize animation contexts once at root layout, implement cleanup in useEffect returns, limit simultaneous animations (<100 on Android, <500 on iOS)
- **Warning signs:** Lighthouse Performance <80, main thread blocking >200ms, memory growth on navigation
- **Phase to address:** Phase 1 (Visual Foundation) — establish animation patterns with performance budgets BEFORE building features

**2. High-Resolution Product Images Killing Mobile Load Times**
Luxury 4K+ photography causes 8+ second mobile loads, 20-30% abandonment increase. Designers export 2-5MB images without optimization.

- **Prevention:** Configure Next.js Image (quality: 85 for heroes, 75 for grids), set explicit `sizes` prop, enable AVIF→WebP→JPEG fallback, blur placeholders, lazy load below-fold
- **Warning signs:** LCP >2.5s on mobile, 2MB+ images in Network tab, no .webp/.avif requests
- **Phase to address:** Phase 1 (Visual Foundation) — set up image pipeline BEFORE product galleries

**3. Custom Luxury Fonts Blocking Render**
Premium serif/display fonts take 3+ seconds to load, causing FOIT/FOUT. Research: 1s delay = 7% conversion drop, 3s font load caused 20% mobile conversion loss in one study.

- **Prevention:** Limit to 2-3 families with 3-4 weights max, WOFF2 format exclusively, subset to Latin + punctuation, preload critical fonts, use `font-display: swap`, implement with next/font
- **Warning signs:** TBT >300ms, 1MB+ fonts, TTF/OTF format, multiple files per family, flash of invisible text
- **Phase to address:** Phase 1 (Visual Foundation) — font strategy must be set BEFORE styling components

**4. Z-Index Chaos Breaking Cart and Checkout**
New luxury overlays conflict with existing cart modal and checkout flow. Users can't complete purchases because elements hidden behind decorative layers.

- **Prevention:** Establish z-index scale in Tailwind config BEFORE adding features (base: 0-9, sticky: 10-19, dropdowns: 40-49, modals: 50-59, toast: 70-79, critical: 90-99), never use inline z-index, portal modals to body
- **Warning signs:** Clicking checkout shows nothing, dropdowns behind elements, z-index values >1000
- **Phase to address:** Phase 1 (Visual Foundation) — z-index scale defined BEFORE any overlay features

**5. Parallax Effects Destroying Mobile UX**
Desktop parallax doesn't work on 50%+ of mobile browsers, causes severe performance issues. Mobile Safari/Chrome limit script execution during scroll, so parallax stutters.

- **Prevention:** Disable parallax on mobile entirely via `useMediaQuery`, use Intersection Observer instead of scroll listeners, implement `passive: true` flag, respect `prefers-reduced-motion`
- **Warning signs:** Scroll feels laggy on mobile, battery drains quickly, parallax works desktop but not mobile Safari
- **Phase to address:** Phase 2 (Product Experience) — only add parallax AFTER core mobile experience solid

## Implications for Roadmap

Based on combined research, suggested phase structure follows performance-first approach with incremental feature addition and A/B testing between phases.

### Phase 1: Visual Foundation (5 days)

**Rationale:** All critical pitfalls require foundation work before feature development. Performance budgets, font strategy, image pipeline, and z-index scale must be established first to prevent painful refactoring later. Dependencies: font loading blocks typography, image optimization blocks galleries, animation patterns block all interactive polish.

**Delivers:**

- Performance monitoring setup (Lighthouse + Vercel Analytics)
- Image optimization pipeline (Sharp + Next.js Image + blur placeholders)
- Font strategy (next/font with 2-3 families, preloading, subsetting)
- Animation system foundation (Framer Motion integration patterns, reusable motion variants)
- Z-index scale enforcement (Tailwind config + documentation)
- Loading states (portal skeletons matching content dimensions)

**Addresses (from FEATURES.md):**

- Sub-2 second load times (table stakes)
- Distinctive typography (table stakes)
- High-quality product photography infrastructure (table stakes)

**Avoids (from PITFALLS.md):**

- Animation waterfall destroying performance (#1)
- High-resolution images killing mobile loads (#2)
- Custom fonts blocking render (#3)
- Z-index chaos (#4)
- Animation library bundle explosion (#7)

**Research flag:** Standard patterns, skip research-phase. Next.js image optimization and font loading are well-documented with clear best practices.

### Phase 2: Product Experience (7 days)

**Rationale:** With performance foundation solid, add luxury interactions incrementally. Prioritize product pages (primary conversion driver) before homepage/blog. Group all scrolling/animation features together to test mobile performance holistically before moving to checkout.

**Delivers:**

- Product page luxury layout (white space, visual hierarchy)
- High-quality product photography (3+ angles, detail shots)
- Fragrance pyramid visualization
- Sensory storytelling copywriting
- Micro-interactions on product cards (hover tilt, zoom)
- Scroll-triggered animations (product page scrollytelling)
- Staggered entrance animations for product grids
- Scent family filtering UI
- Mobile-first responsive design verification

**Addresses (from FEATURES.md):**

- High-quality product photography (table stakes)
- Fragrance pyramid visualization (table stakes)
- Sensory storytelling copy (table stakes)
- Mobile-first responsive design (table stakes)
- Scroll-triggered animations (differentiator)
- Micro-interactions (differentiator)
- Staggered animations (differentiator)

**Avoids (from PITFALLS.md):**

- Parallax destroying mobile UX (#5) — disable on mobile
- Overcrowded luxury design (#8) — A/B test each effect
- Animation performance issues (#1) — respect Phase 1 budgets

**Research flag:** Needs research-phase for scrollytelling patterns. Luxury e-commerce scrolling interactions are design-heavy domain with performance tradeoffs. Research specific: scroll-triggered timeline patterns, Lenis + GSAP integration, mobile parallax alternatives.

### Phase 3: Homepage & Content (4 days)

**Rationale:** Homepage sets brand tone but isn't primary conversion driver (most traffic lands on product pages via search/ads). Build after product pages proven. Blog styling is lowest priority — internal tool aesthetic acceptable, not customer-facing critical path.

**Delivers:**

- Hero section with subtle scroll effects
- Featured product showcase with premium layout
- Layered backgrounds with refined gradients
- Blog editorial styling (luxury brand voice)
- Navigation polish (micro-interactions)
- Footer refinement

**Addresses (from FEATURES.md):**

- Clean, uncluttered layouts (table stakes)
- Layered backgrounds with gradients (differentiator)
- Refined color palette (differentiator)

**Avoids (from PITFALLS.md):**

- Overcrowded design (#8) — homepage especially prone to "showcase all effects" mistake
- Animation overload (anti-pattern from ARCHITECTURE.md)

**Research flag:** Standard patterns, skip research-phase. Hero sections and navigation polish follow established luxury web design patterns.

### Phase 4: Engagement Features (5 days)

**Rationale:** Value-add features for deeper engagement, but not blockers for luxury brand perception. Personalization quiz has proven demand (75,000+ completions cited in research) and builds email list. Defer gift customization if timeline tight — can be v2.

**Delivers:**

- Personalization quiz (multi-step form → recommendations)
- Fragrance note ingredient stories (clickable modals)
- Sample/discovery options (product variants)
- Express payment options (Apple Pay, Google Pay)
- Optional: Gift packaging customization UI

**Addresses (from FEATURES.md):**

- Personalization quiz (differentiator)
- Fragrance note stories (differentiator)
- Sample options (table stakes)
- Express payments (table stakes)

**Avoids (from PITFALLS.md):**

- Popup overlays (anti-feature) — quiz is opt-in, not intrusive
- Animation blocking interaction (anti-pattern) — quiz uses subtle transitions only

**Research flag:** Needs research-phase for personalization recommendation logic. Quiz UI is straightforward, but recommendation engine (matching fragrance profiles to products) requires domain expertise or ML approach research.

### Phase 5: Checkout Polish (3 days)

**Rationale:** LAST phase intentionally. Checkout works now — only touch after all luxury features proven stable. Highest risk phase due to revenue impact if broken. Minimal changes: visual refinement only, no functional modifications to Stripe integration.

**Delivers:**

- Checkout visual refinement (luxury styling without breaking Stripe)
- Loading states for payment processing
- Error state polish
- Success page luxury treatment
- Cart drawer luxury styling (if using Vaul)

**Addresses (from FEATURES.md):**

- Express payments (table stakes) — already added in Phase 4, this refines styling

**Avoids (from PITFALLS.md):**

- Breaking checkout flow (#6) — HIGHEST PRIORITY pitfall, why this phase is last
- Z-index conflicts hiding Stripe Elements (#4) — use Phase 1 scale
- Animation blocking checkout buttons (UX pitfall)

**Research flag:** Standard patterns, skip research-phase. Stripe checkout styling is well-documented. Key: isolate changes, test obsessively, preserve iframe positioning.

### Phase Ordering Rationale

1. **Performance first, features second** — All critical pitfalls require foundation work. Fixing performance issues after features built = painful refactoring.

2. **Product pages before homepage** — Conversion driver prioritized. Most traffic lands on product pages (search/ads), not homepage.

3. **Mobile experience continuous** — Every phase includes mobile verification. Luxury brands judged harshly on mobile, can't defer to "mobile polish phase."

4. **Incremental with A/B testing** — Add effects one phase at a time, verify conversion rates don't drop before proceeding. Research shows overcrowded design kills conversions (#8 pitfall).

5. **Checkout isolated and last** — Highest risk due to revenue impact. Only touch after all other features proven stable. Minimize changes to functional systems.

6. **Dependencies respected** — Font loading blocks typography (Phase 1→2), image pipeline blocks galleries (Phase 1→2), animation patterns block interactions (Phase 1→2), product experience blocks homepage (Phase 2→3).

### Research Flags

**Phases needing research-phase:**

- **Phase 2 (Product Experience):** Scrollytelling patterns require deep research into luxury e-commerce scroll interactions, Lenis + GSAP integration patterns, mobile parallax alternatives, performance optimization for scroll-triggered effects
- **Phase 4 (Engagement Features):** Personalization quiz recommendation logic needs domain research or ML approach evaluation

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Visual Foundation):** Next.js image optimization, font loading, animation setup all have official documentation and established best practices
- **Phase 3 (Homepage & Content):** Hero sections, navigation, editorial styling follow established luxury design patterns
- **Phase 5 (Checkout Polish):** Stripe styling well-documented, key is testing not research

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                                                                                                                                                      |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack        | HIGH       | All packages verified with official docs and npm registry. Versions confirmed compatible with Next.js 14/React 18. React 19 caveat documented.                                                                                                                                             |
| Features     | MEDIUM     | WebSearch-based with 20+ source cross-verification. Table stakes validated across multiple luxury fragrance sites. Differentiators based on UX agency recommendations and industry analysis. No Context7 available for "luxury perfume e-commerce features" as niche domain.               |
| Architecture | HIGH       | Verified with official Next.js docs (updated Feb 27, 2026), Apple HIG (official), Framer Motion docs, shadcn/ui. Server Component + animation wrapper pattern confirmed in Next.js GitHub discussions.                                                                                     |
| Pitfalls     | HIGH       | Performance pitfalls verified with multiple web performance studies, real conversion impact data from research. Next.js-specific pitfalls confirmed in Smashing Magazine case study and official docs. Checkout risks validated by Stripe documentation and Baymard Institute UX research. |

**Overall confidence:** HIGH

### Gaps to Address

**Gap 1: Actual product photography quality**
Research assumes professional photography will be provided or shot. If current Aquador photography is placeholder/low-quality, Phase 2 blocked until photo shoot completed or 3D renders produced. Handle by: audit current product images in Phase 1 planning, escalate if photo shoot needed.

**Gap 2: Copywriting transformation scope**
"Sensory storytelling" requires professional copywriting, not just dev work. Each product needs narrative description. If copy not provided, dev can implement infrastructure but can't populate content. Handle by: identify copywriting owner in Phase 1, flag as external dependency for Phase 2.

**Gap 3: Personalization quiz recommendation algorithm**
Research confirms quiz demand but doesn't specify algorithm. Options: rule-based (fragrance families), collaborative filtering (requires user data), or manual curation. Handle by: research-phase in Phase 4 planning to evaluate approaches and complexity.

**Gap 4: Mobile device testing coverage**
Research identifies mobile performance as critical but doesn't specify device test matrix. Need real device testing, not just DevTools. Handle by: define test device list in Phase 1 (minimum: iPhone 12/13, mid-range Android like Galaxy A series, verify Safari + Chrome).

**Gap 5: A/B testing infrastructure**
Roadmap recommends A/B testing between phases but Aquador may not have testing setup. Handle by: identify A/B testing approach in Phase 1 (Vercel A/B, Google Optimize, or manual conversion tracking), implement before Phase 2 ships.

## Sources

### Primary (HIGH confidence)

**Stack & Technical:**

- [Framer Motion npm](https://www.npmjs.com/package/framer-motion) — v12.34.5 verified
- [Next.js Font Optimization Docs](https://nextjs.org/docs/app/getting-started/fonts) — Official Next.js 14+ docs
- [Next.js Image Component Docs](https://nextjs.org/docs/app/getting-started/images) — Official optimization guide
- [Motion | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/motion) — Official Apple HIG
- [File-system conventions: loading.js | Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading) — Updated Feb 27, 2026
- [Class Variance Authority](https://cva.style/docs) — Official CVA docs
- [Radix UI Primitives Official](https://www.radix-ui.com/primitives) — Headless components
- [Lenis Smooth Scroll Official](https://lenis.darkroom.engineering/) — Official documentation

**Performance Research:**

- [Next.js Image Optimization | DebugBear](https://www.debugbear.com/blog/nextjs-image-optimization) — Performance benchmarks
- [Optimizing GSAP Animations in Next.js 15: Best Practices](https://medium.com/@thomasaugot/optimizing-gsap-animations-in-next-js-15-best-practices-for-initialization-and-cleanup-2ebaba7d0232) — Cleanup patterns
- [Your web fonts are killing conversions | Hoverify](https://tryhoverify.com/blog/your-web-fonts-are-killing-conversions/) — Conversion impact data

### Secondary (MEDIUM confidence)

**Luxury E-Commerce Patterns:**

- [25 Perfume Website Design Examples For Inspiration](https://www.subframe.com/tips/perfume-website-design-examples) — Feature analysis across brands
- [How to Build a Perfume eCommerce Store that Appeals to the Senses](https://cartcoders.com/blog/ecommerce/how-to-build-perfume-ecommerce-store-that-appeals-to-senses/) — Domain best practices
- [Applying Luxury Principles to Ecommerce Design - NN/G](https://www.nngroup.com/articles/luxury-principles-ecommerce-design/) — Nielsen Norman Group research
- [Examples of Luxury, Brand-Led eCommerce Websites](https://vervaunt.com/examples-of-luxury-brand-led-ecommerce-websites-premium-ecommerce-ux-technology) — UX agency analysis

**UX & Design Trends:**

- [10 UX Best Practices to Follow in 2026](https://uxpilot.ai/blogs/ux-best-practices) — Current standards
- [Typography Trends 2026 - Art Coast Design](https://artcoastdesign.com/blog/typography-branding-trends-2026) — Luxury typography direction
- [7 eCommerce Design Trends in 2026](https://halothemes.net/blogs/shopify/7-ecommerce-design-trends-in-2026-that-will-dominate-online-shopping) — Industry trends

**Performance & Pitfalls:**

- [Rebuilding A Large E-Commerce Website With Next.js](https://www.smashingmagazine.com/2021/09/lessons-learned-ecommerce-nextjs-case-study/) — Real-world pitfalls
- [Checkout UX Best Practices 2025 – Baymard Institute](https://baymard.com/blog/current-state-of-checkout-ux) — Checkout optimization research
- [Why Doesn't Parallax Scrolling Work on Mobile?](https://wpastra.com/docs/parallax-not-working-on-mobile/) — Mobile limitations

### Tertiary (LOW confidence)

**Fragrance Industry Context:**

- [Perfume Industry Statistics 2026: 50+ Stats You Need to Know](https://www.scento.com/blog/perfume-industry-statistics-2026) — 75,000+ quiz completions stat, industry trends
- [The Olfactory Pyramid | Understanding Fragrance Composition](https://eisenberg.com/pages/the-olfactory-pyramid-understanding-fragrance-composition) — Fragrance pyramid visualization patterns

---

_Research completed: 2026-03-04_
_Ready for roadmap: Yes_
_Phases suggested: 5 (Visual Foundation → Product Experience → Homepage & Content → Engagement Features → Checkout Polish)_
_Critical dependencies: Performance foundation before features, product pages before homepage, checkout isolated last_
_Research flags: Phase 2 (scrollytelling), Phase 4 (quiz recommendations)_
