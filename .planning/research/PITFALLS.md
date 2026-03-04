# Pitfalls Research

**Domain:** Luxury Design Integration for Existing Next.js E-commerce
**Researched:** 2026-03-04
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Animation Waterfall Destroying Performance

**What goes wrong:**
Performance drops from sub-500ms to 3+ seconds on product pages after adding luxury animations. GSAP/Framer Motion libraries reload on every page transition in App Router, causing animations to lag, ScrollTriggers to leak memory, and cumulative layout shift spikes.

**Why it happens:**
Developers add animation libraries without understanding Next.js App Router's component lifecycle. Each route transition re-initializes animation contexts, creating memory leaks. Heavy animations run on main thread instead of GPU, blocking paint and interaction.

**How to avoid:**

- Use CSS transforms and opacity (GPU-accelerated) instead of animating layout properties (top/left, width/height, margin)
- Initialize GSAP/Framer Motion contexts once at root layout, not per-page
- Implement proper cleanup in useEffect returns to prevent ScrollTrigger leaks
- Use `will-change: transform` CSS hint for animated elements
- Limit simultaneous animations: <100 on low-end Android, <500 on iOS
- Wrap animation libraries in React.memo() for list items

**Warning signs:**

- Lighthouse Performance score drops below 80
- Main thread blocking time increases >200ms
- Memory usage grows on each navigation
- Animations jank on mid-range devices
- Console warnings about unmounted components

**Phase to address:**
Phase 1 (Visual Foundation) - Establish animation patterns with performance budgets before building features

---

### Pitfall 2: High-Resolution Product Images Killing Mobile Load Times

**What goes wrong:**
Luxury product photography at 4K+ resolution causes mobile load times to balloon from 2s to 8+ seconds. Page abandonment increases 20-30% as images block First Contentful Paint. Despite Next.js Image component, developers serve oversized assets.

**Why it happens:**
Design team exports full-resolution images (2-5MB each) without optimization. Developers forget to configure remote image domains, use fill layout without sizes prop, or bypass Next.js Image entirely for "pixel-perfect" control. AVIF/WebP fallbacks not configured, serving PNG/JPEG to all browsers.

**How to avoid:**

- Configure Next.js Image with quality settings: 85 for hero images, 75 for grid thumbnails
- Set explicit `sizes` prop: `sizes="(max-width: 768px) 100vw, 50vw"` for responsive images
- Use Sharp compression (built into Next.js): 40-70% size reduction + format conversion (25-35% additional)
- Enable AVIF format first (20-30% better than WebP), fallback to WebP, then JPEG/PNG
- Implement blur placeholders: `placeholder="blur"` with low-quality image data URLs
- Lazy load below-fold product images: `loading="lazy"`
- Configure remote patterns in next.config.js for Supabase Storage URLs
- Set image caching headers: `Cache-Control: public, max-age=31536000, immutable`

**Warning signs:**

- Largest Contentful Paint (LCP) >2.5s on mobile
- Network tab shows 2MB+ images
- No .webp or .avif in network requests
- Images served from wrong domains (direct Supabase URLs)
- Cumulative Layout Shift as images load

**Phase to address:**
Phase 1 (Visual Foundation) - Set up image optimization pipeline before adding product galleries

---

### Pitfall 3: Custom Luxury Fonts Blocking Render and Killing Conversions

**What goes wrong:**
Premium serif/display fonts take 3+ seconds to load on mobile, causing Flash of Invisible Text (FOIT) or Flash of Unstyled Text (FOUT). Each font weight/style is a separate 150-250KB download. Research shows 1-second delay = 7% conversion drop; one study found 3s font load caused 20% mobile conversion loss.

**Why it happens:**
Designers specify 6+ font weights/styles without understanding web performance. Developers import entire font families from Google Fonts or self-host TTF/OTF instead of WOFF2. Font files block render by default. Subsetting not implemented, loading thousands of unused glyphs.

**How to avoid:**

- Limit to 2-3 font families, 3-4 weights maximum
- Use WOFF2 format exclusively (smallest, best browser support)
- Subset fonts to Latin + required punctuation using Google Fonts API or fonttools
- Preload critical fonts in layout.tsx: `<link rel="preload" href="/fonts/luxury.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />`
- Use `font-display: swap` to show fallback immediately while loading
- Implement local font loading with Next.js Font Optimization (next/font)
- Define fallback fonts with similar metrics to prevent layout shift: `font-family: 'Luxury', 'Georgia', serif`
- Variable fonts when possible (one file, multiple weights)

**Warning signs:**

- Total Blocking Time (TBT) >300ms
- Network tab shows 1MB+ fonts
- TTF or OTF format in use
- Multiple font files per family (separate italic/bold/etc)
- Flash of invisible text on page load
- Layout shift as fonts swap in

**Phase to address:**
Phase 1 (Visual Foundation) - Font strategy must be set before styling components

---

### Pitfall 4: Z-Index Chaos Breaking Cart and Checkout Modals

**What goes wrong:**
New luxury overlays, product quick-views, and animated elements conflict with existing cart modal, checkout flow, and navigation. Users can't complete purchases because clickable elements are hidden behind decorative layers. Mobile hamburger menu appears behind product overlays.

**Why it happens:**
Developers add z-index values ad-hoc (9999, 99999) without understanding stacking contexts. Position: sticky, transform, and filter properties create new stacking contexts, trapping child z-index values. Existing Stripe checkout modal (usually z-index: 1000) gets buried under new luxury effects.

**How to avoid:**

- Establish z-index scale in Tailwind config BEFORE adding features:
  - Base content: 0-9
  - Sticky headers: 10-19
  - Dropdowns: 40-49
  - Modals: 50-59
  - Popovers: 55-59
  - Toast notifications: 70-79
  - Critical overlays (checkout): 90-99
- Document scale in design system
- Never use inline z-index or arbitrary values
- Avoid creating unintended stacking contexts with transform/filter on parent containers
- Place modals/overlays at root level (portal to body) to escape nested contexts
- Use browser DevTools "Show Layers" to debug stacking contexts
- Test checkout flow on mobile after every overlay feature added

**Warning signs:**

- Clicking checkout button shows nothing (modal behind overlay)
- Dropdown menus appear behind other elements
- Mobile menu doesn't overlay content
- Can see modal shadow but not modal content
- DevTools shows z-index arms race (values >1000)

**Phase to address:**
Phase 1 (Visual Foundation) - Z-index scale must be defined before any overlay features

---

### Pitfall 5: Parallax Effects Destroying Mobile UX

**What goes wrong:**
Luxury parallax scrolling effects that look stunning on desktop don't work on 50%+ of mobile browsers, cause severe performance issues, or become invisible when user's hand blocks the screen. Mobile Safari and Chrome limit script execution during scroll, so parallax stutters or doesn't run until scrolling stops.

**Why it happens:**
Developers implement parallax assuming desktop-first usage patterns. Most mobile browsers don't support background-attachment: fixed for performance reasons. Touch interactions differ from mouse scrolling - parallax calculations desync. Script execution throttled during momentum scroll. Effects require reflow calculations 60 times/second, draining battery.

**How to avoid:**

- Disable parallax on mobile devices entirely: use `useMediaQuery` or `window.matchMedia`
- Alternative: Use subtle transform animations triggered on viewport intersection, not scroll position
- If parallax required: Use CSS-only solutions (background-attachment on Firefox only) with fallback to static positioning
- Implement Intersection Observer API instead of scroll listeners for performance
- Use `passive: true` flag on scroll listeners to prevent blocking
- Test on actual low-end Android devices (Galaxy A series), not just dev tools
- Consider CSS-only solutions: background-size with fixed positioning (limited browser support)
- Provide "reduce motion" respect via `prefers-reduced-motion` media query

**Warning signs:**

- Scroll feels laggy or stuttery on mobile
- Battery drains quickly during browsing
- Parallax works on desktop but not mobile Safari
- Scroll events fire after scrolling stops, not during
- Animation frame rate drops below 30fps on mobile
- Touch events conflict with parallax scroll calculations

**Phase to address:**
Phase 2 (Product Experience) - Only add parallax after core mobile experience is solid

---

### Pitfall 6: Breaking Existing Checkout Flow with Design Changes

**What goes wrong:**
Luxury design refresh introduces CSS animations, overlays, or form styling that breaks Stripe checkout integration. Form validation animations prevent form submission. New button styles disable click events. Animated overlays hide error messages. Cart abandonment spikes from 70% to 85%+.

**Why it happens:**
Developers modify checkout components without testing complete flow end-to-end. CSS animations use pointer-events: none during animation, blocking clicks. New z-index rules hide Stripe Elements iframe. Custom form styling overrides Stripe's validation states. Loading animations never clear on API errors. Payment form re-renders destroy Stripe Elements mount state.

**How to avoid:**

- Isolate checkout flow from luxury design changes initially
- Never apply pointer-events: none to checkout buttons
- Test complete purchase flow after every design change: add to cart → checkout → payment → confirmation
- Preserve Stripe Elements iframe z-index and positioning (don't wrap in animated containers)
- Use Stripe webhooks (checkout.session.completed) for fulfillment, never redirect callbacks
- Implement loading states that clear on error, not just success
- Log all form validation errors to console during development
- Place error messages above input fields (accessible during keyboard interaction)
- Avoid transforms/filters on checkout form containers (creates stacking context issues)
- Test with intentional failures: declined cards, network errors, timeout scenarios
- Monitor checkout abandonment rate before and after design changes

**Warning signs:**

- Checkout abandonment rate increases >5%
- Support tickets about "payment not working"
- Stripe Elements not visible or clickable
- Form submits but payment doesn't process
- Error messages hidden behind overlays
- Loading spinner never clears on error
- Console errors about Stripe Element mounting

**Phase to address:**
Phase 3 (Checkout Polish) - Only touch checkout after core luxury features proven stable

---

### Pitfall 7: Animation Library Bundle Size Explosion

**What goes wrong:**
Adding Framer Motion or GSAP for luxury animations increases JavaScript bundle size by 100-300KB, pushing total bundle over 500KB. First Load JS on mobile exceeds Next.js warning threshold. Time to Interactive (TTI) increases 2-3 seconds on 3G connections, directly impacting mobile conversions.

**Why it happens:**
Developers import entire animation libraries when only using 10% of features. Framer Motion includes full physics engine, gesture handlers, and layout animations by default. GSAP plugins imported globally. Tree-shaking fails due to barrel imports. Animation code included in initial page bundle instead of code-split per route.

**How to avoid:**

- Use CSS animations + Intersection Observer for 80% of effects (zero JS cost)
- If animation library needed:
  - Framer Motion: Import specific components: `import { motion } from 'framer-motion'` not `import * as motion`
  - GSAP: Load only required plugins, use dynamic imports for non-critical animations
  - Motion One: Lighter alternative (5KB) with similar API
- Dynamic import animation library for non-critical features: `const AnimatedComponent = dynamic(() => import('./AnimatedComponent'), { ssr: false })`
- Code-split per route: Keep animation libraries in route-specific bundles
- Use next/bundle-analyzer to track bundle impact: `npm run build -- --analyze`
- Set performance budgets: Max 250KB initial JS bundle, warn at 200KB
- Consider CSS-only alternatives: Tailwind CSS animations, keyframes, view transitions API

**Warning signs:**

- Build output shows "First Load JS shared by all" >150KB
- Lighthouse flags "Reduce unused JavaScript"
- Bundle analyzer shows animation library in main chunk
- Time to Interactive >5s on Fast 3G throttling
- Large hydration time on mobile
- Webpack bundle size warnings during build

**Phase to address:**
Phase 1 (Visual Foundation) - Choose animation strategy before building components to avoid refactoring

---

### Pitfall 8: Overcrowded Luxury Design Killing Conversions

**What goes wrong:**
Adding too many premium effects (parallax + animations + video backgrounds + complex hover states) creates cognitive overload. Users can't find "Add to Cart" button. Conversion rate drops 10-95% when pages become cluttered. Research shows visitors hesitate when they can't identify next step quickly.

**Why it happens:**
Designer wants to showcase all luxury capabilities at once. Each stakeholder adds "just one more effect." No hierarchy of visual importance. Every element animated/highlighted equally, so nothing stands out. Call-to-action buttons buried in visual noise.

**How to avoid:**

- Follow luxury website principle: "Less is more" - leave space for content to breathe
- Establish visual hierarchy:
  - Level 1: Primary CTA (Add to Cart) - most prominent, minimal animation
  - Level 2: Product images - high quality but static unless interacted with
  - Level 3: Secondary info - subtle reveals on scroll
  - Level 4: Decorative effects - barely noticeable, enhance don't distract
- Limit animations per viewport:
  - Desktop: 2-3 major animations visible simultaneously
  - Mobile: 1 animation max (plus micro-interactions)
- A/B test conversion rates before/after each luxury feature addition
- Implement analytics events: Track CTA visibility, clicks, scroll depth
- User test with 5+ people unfamiliar with site - time to complete purchase
- "Does this effect help user make purchase decision?" test for every feature

**Warning signs:**

- Conversion rate drops >5% after design updates
- Heatmaps show users not clicking primary CTAs
- Session recordings show confusion/hesitation
- Bounce rate increases on product pages
- Time to purchase increases significantly
- Support asks "where is buy button?"

**Phase to address:**
Phase 2 (Product Experience) - Add effects incrementally with A/B tests between additions

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut                               | Immediate Benefit                          | Long-term Cost                                | When Acceptable                                                 |
| -------------------------------------- | ------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------- |
| Import entire animation library        | Faster development, access to all features | 100-300KB bundle increase, slower mobile load | Never - always import specific components                       |
| Skip image optimization "temporarily"  | Speeds up initial build                    | 3-5s mobile load times, 20% conversion loss   | Never - set up pipeline first                                   |
| Use inline z-index values              | Quick fix for layering issue               | Z-index chaos, unmaintainable stacking        | Never - always use design system scale                          |
| Duplicate Stripe integration styles    | Get custom look immediately                | Breaks on Stripe updates, payment failures    | Never - use Stripe's customization API                          |
| Skip mobile parallax testing           | Works in Chrome DevTools                   | Broken UX on 50%+ of mobile traffic           | Never - test on real devices                                    |
| Load fonts from CDN without subsetting | Easiest setup                              | 150-250KB per font, 3s render blocking        | Only for rapid prototyping, never production                    |
| Apply animations to all list items     | Consistent UX                              | Re-renders entire list on single change       | Only for lists <20 items, virtualize larger                     |
| Use client components everywhere       | Easier state management                    | Larger JS bundle, slower hydration            | Only when interactivity required, use Server Components default |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration      | Common Mistake                                  | Correct Approach                                                                              |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Stripe Checkout  | Wrapping Stripe Elements in animated containers | Keep Stripe iframe in stable DOM position, no transform ancestors                             |
| Supabase Storage | Using direct publicUrl for product images       | Proxy through Next.js Image API with remote patterns configured                               |
| Next.js Image    | Not configuring remote domains for Supabase     | Add `remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }]` in next.config.js    |
| Google Fonts     | Importing full font families                    | Use next/font with specific weights: `weight: ['400', '600', '700']`                          |
| Framer Motion    | Importing from 'framer-motion' barrel           | Import specific: `import { motion, AnimatePresence } from 'framer-motion/dist/framer-motion'` |
| GSAP             | Adding ScrollTrigger without cleanup            | Always `ScrollTrigger.getAll().forEach(t => t.kill())` in useEffect return                    |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap                                  | Symptoms                   | Prevention                                                   | When It Breaks              |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------ | --------------------------- |
| Animating all product grid items      | Smooth with 10 products    | Virtualize lists with @tanstack/react-virtual, memoize items | 50+ products                |
| Loading all images eagerly            | Fast on desktop            | Lazy load below-fold images, progressive loading             | 20+ product images          |
| Running animations on scroll listener | Fluid on desktop           | Use Intersection Observer or passive scroll listeners        | Mobile, low-end devices     |
| Client-side filtering of products     | Instant with small catalog | Server-side pagination + filtering, cache results            | 200+ products               |
| Unoptimized font loading              | Acceptable on fiber        | Preload critical fonts, use font-display: swap               | Mobile 3G/4G                |
| No animation limits                   | Impressive on new MacBook  | Limit simultaneous animations, use CSS when possible         | Mid-range Android devices   |
| High-quality images for all viewports | Crisp on desktop           | Responsive images with srcset/sizes, Next.js Image           | Mobile, metered connections |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake                                 | Risk                              | Prevention                                           |
| --------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Exposing Supabase Storage URLs directly | Image hotlinking, bandwidth theft | Proxy through API route with auth checks             |
| Allowing arbitrary remote images        | Next.js image optimization abuse  | Restrict remotePatterns to specific domains          |
| Not validating Stripe webhooks          | Fake payment confirmations        | Always verify webhook signatures with secret         |
| Storing payment info in local state     | XSS can steal payment data        | Use Stripe Elements, never touch payment data        |
| Client-side price calculations          | Price manipulation via DevTools   | Calculate totals server-side, validate before Stripe |
| Public Supabase RLS bypass in admin     | Unauthorized access to orders     | Separate admin API routes, verify role server-side   |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall                                     | User Impact                           | Better Approach                                                           |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| Auto-playing product videos                 | Annoying, drains battery, uses data   | Play on hover (desktop) or tap (mobile), muted by default                 |
| Parallax on mobile                          | Jittery, broken, or invisible effects | Disable on mobile, use subtle fade-in instead                             |
| Animations blocking interaction             | Can't click button during animation   | Use pointer-events: auto on interactive elements, animate containers only |
| No loading states on luxury animations      | Unclear if site is working            | Show skeleton screens or subtle loaders                                   |
| Flash of unstyled content (FOUC) with fonts | Unprofessional, layout shift          | Use font-display: swap with similar fallback metrics                      |
| Overcomplicated checkout animations         | Distraction during critical flow      | Minimal animations on checkout, focus on clarity                          |
| High-res images without blur placeholder    | Large white boxes during load         | Implement blur-up effect with base64 previews                             |
| Missing "reduce motion" respect             | Accessibility issue, motion sickness  | Respect prefers-reduced-motion media query                                |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Image Optimization:** Often missing AVIF format, sizes prop, and blur placeholders — verify Network tab shows .avif/.webp + blur effect on load
- [ ] **Font Loading:** Often missing preload, font-display, subsetting — verify <3s LCP with fonts, no FOIT/FOUT
- [ ] **Mobile Testing:** Often tested only in DevTools — verify on real iOS Safari, Android Chrome, low-end devices
- [ ] **Checkout Flow:** Often tested only happy path — verify with declined cards, network errors, timeout scenarios
- [ ] **Animation Performance:** Often tested only on dev MacBook — verify 60fps on mid-range Android, <100ms TBT
- [ ] **Z-Index Scale:** Often has scale defined but not enforced — verify no inline z-index, all values from design system
- [ ] **Bundle Size:** Often no monitoring set up — verify bundle analyzer run, performance budgets configured
- [ ] **Accessibility:** Often missing keyboard navigation, reduced motion — verify Tab navigation works, respects prefers-reduced-motion
- [ ] **Loading States:** Often only handles success — verify error states, loading timeouts, retry mechanisms
- [ ] **Conversion Tracking:** Often no before/after metrics — verify analytics events firing, A/B test results collected

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall                      | Recovery Cost | Recovery Steps                                                                               |
| ---------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| Animation performance issues | MEDIUM        | Profile with React DevTools, identify re-renders, memoize components, move to CSS animations |
| Image loading too slow       | LOW           | Implement progressive loading, add blur placeholders, enable AVIF format                     |
| Font blocking render         | LOW           | Add font-display: swap, preload critical fonts, remove unused weights                        |
| Z-index conflicts            | MEDIUM        | Audit all z-index values, create global scale, refactor to use Tailwind classes              |
| Broken checkout flow         | HIGH          | Rollback design changes, isolate Stripe integration, test end-to-end before redeploy         |
| Mobile parallax broken       | LOW           | Disable parallax on mobile via media query, replace with simpler scroll effects              |
| Bundle too large             | MEDIUM        | Run bundle analyzer, dynamic import heavy libraries, code-split per route                    |
| Overcrowded design           | MEDIUM        | A/B test removing effects one by one, user testing to identify confusion points              |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall                | Prevention Phase            | Verification                                                              |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------- |
| Animation performance  | Phase 1: Visual Foundation  | Lighthouse Performance >85, TBT <200ms on mobile                          |
| Image optimization     | Phase 1: Visual Foundation  | LCP <2.5s, AVIF/WebP in Network tab, blur placeholders visible            |
| Font loading issues    | Phase 1: Visual Foundation  | No FOIT/FOUT, <3s LCP with fonts loaded                                   |
| Z-index conflicts      | Phase 1: Visual Foundation  | No z-index >100, all values from Tailwind config, modals functional       |
| Parallax mobile issues | Phase 2: Product Experience | 60fps scroll on Android mid-range, parallax disabled on mobile            |
| Broken checkout        | Phase 3: Checkout Polish    | End-to-end payment test with declined card, error states visible          |
| Bundle size explosion  | Phase 1: Visual Foundation  | Bundle analyzer <250KB initial JS, dynamic imports for heavy libs         |
| Overcrowded design     | Phase 2: Product Experience | A/B test shows no conversion rate decrease, user testing confirms clarity |

## Sources

**Performance & Next.js:**

- [React & Next.js Best Practices in 2026: Performance, Scale & Cleaner Code](https://fabwebstudio.com/blog/react-nextjs-best-practices-2026-performance-scale)
- [Optimizing GSAP Animations in Next.js 15: Best Practices](https://medium.com/@thomasaugot/optimizing-gsap-animations-in-next-js-15-best-practices-for-initialization-and-cleanup-2ebaba7d0232)
- [Rebuilding A Large E-Commerce Website With Next.js](https://www.smashingmagazine.com/2021/09/lessons-learned-ecommerce-nextjs-case-study/)
- [Next.js Image Optimization | DebugBear](https://www.debugbear.com/blog/nextjs-image-optimization)
- [Next.js Image Optimization: A Guide for Web Developers](https://strapi.io/blog/nextjs-image-optimization-developers-guide)

**Luxury Design & Performance:**

- [Avoiding Common Web Design Mistakes: A 2026 Guide](https://designedge.ca/avoiding-common-web-design-mistakes-a-2026-guide-for-businesses/)
- [26 fancy website examples luxury brands can learn from](https://blog.hubspot.com/website/luxury-websites)
- [8 Common Website Design Mistakes to Avoid in 2026](https://www.zachsean.com/post/8-common-website-design-mistakes-to-avoid-in-2026-for-better-conversions-and-user-experience)
- [Top 10 Web Design Mistakes & How To Avoid Them In 2025](https://www.digitalsilk.com/digital-trends/web-design-mistakes/)

**Animation Performance:**

- [Choosing a React Animation Library: Performance Trade-Offs](https://www.syncfusion.com/blogs/post/react-animation-libraries-comparison)
- [Animations with React: How a simple component can affect your performance](https://dev.to/fedekau/animations-with-react-how-a-simple-component-can-affect-your-performance-2a41)
- [Framer Help: Troubleshooting animation issues](https://www.framer.com/help/articles/troubleshooting-animation-issues/)
- [Framer Help: Optimizing your site for speed and performance](https://www.framer.com/help/articles/site-optimization/)
- [Performant Parallaxing | Chrome for Developers](https://developer.chrome.com/blog/performant-parallaxing)

**Checkout & E-commerce:**

- [Checkout UX Best Practices 2025 – Baymard Institute](https://baymard.com/blog/current-state-of-checkout-ux)
- [Checkout Optimization Best Practices for 2026 Success](https://www.bigcommerce.com/articles/ecommerce/checkout-optimization/)
- [Stripe Payment Integration: Complete Dev Guide 2026](https://www.digitalapplied.com/blog/stripe-payment-integration-developer-guide-2026)
- [Stripe Changelog | Stripe Documentation](https://docs.stripe.com/changelog)

**Font Performance:**

- [Why custom fonts are tanking your site's performance](https://www.oncecoupled.com/why-custom-fonts-are-tanking-your-sites-performance-the-hidden-cost-of-visual-appeal/)
- [Preventing the Performance Hit from Custom Fonts](https://css-tricks.com/preventing-the-performance-hit-from-custom-fonts/)
- [Custom Fonts on Shopify Without Slowing Down Your Store](https://www.task4store.com/blogs/blogs/custom-fonts-on-shopify-without-slowing-down-your-store)
- [Your web fonts are killing conversions | Hoverify](https://tryhoverify.com/blog/your-web-fonts-are-killing-conversions/)

**Mobile & Parallax:**

- [Why Doesn't Parallax Scrolling Work on Mobile?](https://wpastra.com/docs/parallax-not-working-on-mobile/)
- [What Parallax Lacks - Nielsen Norman Group](https://www.nngroup.com/articles/parallax-usability/)
- [Why parallax scrolling needs to die - Fast Company](https://www.fastcompany.com/90309395/why-parallax-scrolling-needs-to-die)

**Z-Index & Stacking:**

- [4 reasons your z-index isn't working (and how to fix it)](https://coder-coder.com/z-index-isnt-working/)
- [Why Z-Index Isn't Working: CSS Stacking Contexts](https://playfulprogramming.com/posts/css-stacking-context/)
- [CSS Position Sticky Z-Index Issue: Modal Behind Overlay](https://www.codegenes.net/blog/css-position-sticky-and-z-index-overlay-modal/)

**Refactoring & Integration:**

- [Refactoring vs. Replatforming: Big Differences + Top Options](https://www.bigcommerce.com/articles/ecommerce-website-development/refactoring-vs-replatforming/)
- [Code Refactoring: When to Refactor and How to Avoid Mistakes](https://www.tembo.io/blog/code-refactoring)
- [Outgrowing Your Theme? The 2026 Guide to Scaling E-Commerce](https://www.hristovdevelopment.com/post/scaling-e-commerce-infrastructure-guide-2026)

---

_Pitfalls research for: Aquador luxury design integration_
_Researched: 2026-03-04_
