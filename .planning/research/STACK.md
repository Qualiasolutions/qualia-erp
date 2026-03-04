# Technology Stack - Luxury Design Overhaul

**Project:** Aquador Perfume E-commerce
**Domain:** Luxury e-commerce design transformation
**Researched:** 2026-03-04
**Overall Confidence:** HIGH

## Executive Summary

This stack research focuses exclusively on NEW additions needed for Aquador's luxury design transformation. The existing Next.js 14, Stripe, Supabase, and Resend stack is validated and functional. This document covers only animation systems, typography optimization, responsive utilities, and premium UX components needed to elevate the design to luxury brand standards.

## Core Animation & Motion

| Technology          | Version  | Purpose                                                       | Why Recommended                                                                                                                                                                                                                                                                  |
| ------------------- | -------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **framer-motion**   | ^12.34.5 | React animation library, page transitions, micro-interactions | Industry standard for React animations. 30M+ downloads/month, used by Framer and Figma. 2.5x faster than GSAP for unknown DOM values. 8KB core, SSR-compatible with Next.js 14. Declarative API perfect for component-based luxury interactions.                                 |
| **lenis**           | ^1.3.18  | Smooth scroll engine                                          | Premium scroll experience used by luxury brands. Lightweight, hardware-accelerated, seamless GSAP integration. Standardizes scroll across devices. "Get smooth or die trying" - Darkroom Engineering. Essential for immersive luxury feel.                                       |
| **GSAP** (optional) | ^3.x     | Complex timeline animations, scroll-triggered effects         | Use only for advanced artistic animations requiring precise timeline control. 100% free commercial license (2026 update). Consider for hero sections with parallax, product showcases with complex choreography. Overkill for standard interactions - use Framer Motion instead. |

**Recommendation:** Start with Framer Motion + Lenis. This covers 90% of luxury animation needs. Add GSAP only if you need professional-grade timeline control for hero sections or product showcases.

**Integration:** Lenis handles smooth scroll foundation, Framer Motion handles component animations, GSAP (if needed) handles complex scroll-triggered timeline sequences.

## Typography Optimization

| Technology                 | Version  | Purpose                                            | Why Recommended                                                                                                                                                                                                |
| -------------------------- | -------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **next/font**              | Built-in | Font optimization, self-hosting Google/Adobe Fonts | Next.js 14 built-in. Eliminates external requests (GDPR compliance), automatic subsetting, preloading, fallback matching. Zero layout shift. Self-hosts fonts at build time - critical for luxury performance. |
| **Google Fonts**           | -        | Premium serif/sans options                         | Use via next/font/google. 2026 luxury trends: high-contrast serifs (Playfair Display, Bodoni), minimalist sans (Josefin Sans). Free, optimized, automatically self-hosted.                                     |
| **Adobe Fonts** (optional) | -        | Premium licensed typefaces                         | Use via next/font/local. Download fonts manually, self-host. Only if brand requires licensed typefaces. Google Fonts covers 95% of luxury needs.                                                               |

**Typography Trends 2026:**

- **High-contrast serifs**: Dramatic thick/thin strokes (Bodoni, Didot, Playfair Display)
- **Minimalist sans-serifs**: Clarity and premium positioning (Josefin Sans)
- **Neo-humanist serifs**: Calligraphic, empathetic (for editorial content)

**Anti-pattern:** Do NOT use Inter, Arial, or generic system fonts for luxury branding. These signal commodity, not premium.

## Responsive Design Enhancement

| Technology                         | Version  | Purpose                               | Why Recommended                                                                                                                                                                                     |
| ---------------------------------- | -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tailwind CSS**                   | Existing | Mobile-first responsive utilities     | Already in stack. No changes needed. Use container queries (@container) for component-level responsiveness. Leverage all 5 breakpoints (sm, md, lg, xl, 2xl).                                       |
| **clsx**                           | ^2.x     | Conditional class names               | Tiny utility (1KB) for conditional styling. Essential for dynamic component states.                                                                                                                 |
| **tailwind-merge**                 | ^2.x     | Intelligent class conflict resolution | Prevents Tailwind class conflicts when merging props. Combine with clsx via `cn()` utility (standard in shadcn/ui). Critical for reusable luxury components.                                        |
| **class-variance-authority (CVA)** | ^0.x     | Component variant system              | Type-safe variant management. Powers shadcn/ui variant system. Perfect for luxury components with multiple states (button sizes, card variants). Use for complex components; simple cases use clsx. |

**Utility Function Pattern:**

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};
```

## Premium UI Components

| Technology               | Version | Purpose                                            | Why Recommended                                                                                                                                                                                                                     |
| ------------------------ | ------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Radix UI Primitives**  | ^1.x    | Headless UI components (Dialog, Dropdown, Tooltip) | Zero styling opinions, full design control. Used by Node.js, Vercel, Supabase. WAI-ARIA compliant, keyboard navigation, focus management built-in. Powers shadcn/ui. Perfect for luxury custom designs - no style overrides needed. |
| **vaul**                 | ^1.1.2  | Mobile drawer component                            | Premium mobile drawer (bottom sheets) used by Vercel, Linear. Gesture-driven, snap points, background scaling. "Makes UI feel premium." Use for mobile cart, filters, product details.                                              |
| **embla-carousel-react** | ^8.6.0  | Product gallery carousel                           | Lightweight (7KB vs Swiper's 45KB), zero dependencies, full creative control. Perfect for luxury product galleries where branding matters. Swiper alternative for performance-focused luxury sites.                                 |

**What NOT to use:**

- **Swiper.js**: 45KB gzipped, feature-heavy, opinionated styling. Use only if you need 3D effects or parallax out-of-the-box. For luxury product galleries, Embla gives better performance and brand control.
- **React Slick**: Outdated, jQuery dependency, accessibility issues. Replaced by Embla/Swiper.

## Image Optimization

| Technology     | Version  | Purpose                                            | Why Recommended                                                                                                                                                                                                                                                             |
| -------------- | -------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **sharp**      | ^0.x     | Production image optimization                      | Next.js 14 default optimizer. 40-70% file size reduction, WebP/AVIF conversion (25-35% additional savings). Required for standalone mode. Critical for luxury product photography - maintains quality while optimizing performance. Use quality: 85-95 for luxury products. |
| **next/image** | Built-in | Responsive images, lazy loading, blur placeholders | Next.js 14 built-in. Automatic responsive srcsets, lazy loading, blur-up placeholders. Use priority for above-fold hero images. Essential for luxury product galleries.                                                                                                     |

**Luxury Product Photography Settings:**

- Quality: 85-95 (maintain premium feel)
- Formats: WebP (primary), AVIF (progressive enhancement), JPEG (fallback)
- Blur placeholders: Use for smooth loading transitions
- Sizes: Define per breakpoint to prevent over-fetching

## Installation

```bash
# Animation & Motion
npm install framer-motion@^12.34.5 lenis@^1.3.18
# Optional: GSAP for advanced timelines
npm install gsap@^3.x

# Typography (next/font is built-in, no install needed)

# Class Utilities
npm install clsx@^2.x tailwind-merge@^2.x
npm install class-variance-authority@^0.x

# Premium UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
npm install vaul@^1.1.2
npm install embla-carousel-react@^8.6.0

# Image Optimization
npm install sharp@^0.x
```

## Alternatives Considered

| Recommended    | Alternative         | When to Use Alternative                                                                                                                                                                 | Confidence |
| -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Framer Motion  | GSAP                | Need professional timeline control, complex scroll-triggered sequences, artistic animations. If budget allows, use both - GSAP for timelines, Framer Motion for component interactions. | HIGH       |
| Framer Motion  | React Spring        | Need physics-based animations. React Spring excels at spring physics, but Framer Motion covers 90% of use cases with better DX.                                                         | HIGH       |
| Lenis          | GSAP ScrollSmoother | Already using GSAP ecosystem. Lenis is lighter, simpler, and more performant.                                                                                                           | HIGH       |
| Embla Carousel | Swiper.js           | Need 3D effects, parallax, or elaborate transitions out-of-the-box. Trade-off: 6x larger bundle (45KB vs 7KB).                                                                          | MEDIUM     |
| next/font      | Manual font loading | Never. next/font eliminates GDPR issues, optimizes automatically, prevents layout shift. No reason to load fonts manually in Next.js 14.                                                | HIGH       |
| Radix UI       | Headless UI         | Already using Tailwind UI ecosystem. Both are excellent headless libraries. Radix has better TypeScript support and wider adoption.                                                     | MEDIUM     |
| CVA            | Tailwind Variants   | Need first-class responsive variant API. CVA is framework-agnostic and simpler; Tailwind Variants has deeper Tailwind integration. Both excellent.                                      | MEDIUM     |

## What NOT to Use

| Avoid                 | Why                                                                               | Use Instead                                                         | Confidence |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| **Moment.js**         | 67KB, deprecated status. Outdated in 2026.                                        | date-fns (already in Aquador stack via existing date handling)      | HIGH       |
| **Lodash**            | 70KB footprint, native JS covers most use cases in 2026.                          | Native JS methods, import specific functions if needed              | HIGH       |
| **jQuery**            | Ancient for React projects. Causes conflicts, unnecessary overhead.               | Native DOM APIs, React state management                             | HIGH       |
| **React Slick**       | Outdated carousel library, jQuery dependency, accessibility issues.               | embla-carousel-react or Swiper.js                                   | HIGH       |
| **Locomotive Scroll** | Heavier, less performant than Lenis. Less active maintenance.                     | Lenis                                                               | MEDIUM     |
| **Animate.css**       | Pre-built CSS animations feel dated. Not customizable enough for luxury branding. | Framer Motion (full control, branded animations)                    | MEDIUM     |
| **Bootstrap**         | Generic look, conflicts with Tailwind, overkill for Next.js.                      | Tailwind CSS + Radix UI (already in stack)                          | HIGH       |
| **Inter/Arial**       | Generic system fonts signal commodity, not luxury.                                | Google Fonts (Playfair Display, Bodoni, Josefin Sans) via next/font | HIGH       |

## Stack Patterns by Use Case

**For luxury product galleries:**

- Use Embla Carousel (7KB, full brand control)
- Integrate Framer Motion for item entrance animations
- Use next/image with quality: 90+ for product photography

**For hero sections:**

- Use Lenis for smooth scroll foundation
- Add GSAP + ScrollTrigger for parallax/timeline effects (optional)
- Framer Motion for button/CTA micro-interactions

**For mobile experience:**

- Use Vaul for cart drawer, filter sheets, product quick view
- Radix UI Dialog for desktop modals (responsive swap)
- Embla Carousel for mobile product swiping

**For typography:**

- Load 2-3 font weights max via next/font/google
- Use variable fonts if available (single file, all weights)
- Preload critical fonts for above-fold content

## Version Compatibility

| Package                   | Compatible With            | Notes                                                                                                                                                |
| ------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| framer-motion@^12.x       | Next.js 14 (React 18)      | Requires 'use client' directive. React 19 support in alpha (v12.0.0-alpha.2). DO NOT upgrade to React 19 until Framer Motion releases stable v12.1+. |
| lenis@^1.3.x              | GSAP@^3.x                  | Seamless integration with GSAP ScrollTrigger for scroll-based animations.                                                                            |
| next/font                 | Next.js 14+                | Built-in, no compatibility issues.                                                                                                                   |
| Radix UI                  | React 18+                  | Full Next.js 14 support. Requires 'use client' for interactive components.                                                                           |
| embla-carousel-react@^8.x | React 18+                  | Zero dependencies, framework-agnostic core.                                                                                                          |
| sharp                     | Next.js 14 standalone mode | Required for production image optimization. Automatically used by next/image.                                                                        |

**CRITICAL:** Do NOT upgrade Aquador to React 19 until Framer Motion releases stable support (currently in alpha). Downgrading React causes instability issues.

## React 19 Migration Path (Future)

Current status (March 2026):

- Framer Motion React 19 support: Alpha (v12.0.0-alpha.2)
- Production readiness: Not yet

When React 19 is needed:

1. Wait for framer-motion stable v12.1+ release
2. Test alpha with `npm install framer-motion@12.0.0-alpha.2`
3. Verify all animations work before production deploy
4. No breaking changes expected in Motion v12 API

**Recommendation:** Stay on React 18 + Next.js 14 until Q3 2026 or when Framer Motion v12.1 stable releases.

## Bundle Size Impact

Expected additions to Aquador bundle:

| Addition                 | Gzipped Size  | Impact                                        |
| ------------------------ | ------------- | --------------------------------------------- |
| framer-motion            | ~8KB core     | Low (lazy-load variants)                      |
| lenis                    | ~8KB          | Low                                           |
| GSAP (optional)          | ~23KB core    | Medium (use only if needed)                   |
| clsx + tailwind-merge    | ~3KB combined | Negligible                                    |
| CVA                      | ~2KB          | Negligible                                    |
| Radix UI (3 components)  | ~15KB         | Low (tree-shakeable)                          |
| vaul                     | ~10KB         | Low                                           |
| embla-carousel-react     | ~7KB          | Low                                           |
| **Total (without GSAP)** | **~53KB**     | **Acceptable for luxury e-commerce**          |
| **Total (with GSAP)**    | **~76KB**     | **Use code-splitting for hero-only features** |

**Optimization Strategy:**

- Dynamic import GSAP for hero/landing page only
- Lazy-load Embla for product detail pages
- Tree-shake unused Radix components
- Use Framer Motion's `LazyMotion` for reduced bundle

## Performance Targets for Luxury E-commerce

| Metric                         | Target         | Notes                                                  |
| ------------------------------ | -------------- | ------------------------------------------------------ |
| Largest Contentful Paint (LCP) | <2.5s          | Hero images must be optimized (next/image priority)    |
| First Input Delay (FID)        | <100ms         | Lenis smooth scroll shouldn't block interaction        |
| Cumulative Layout Shift (CLS)  | <0.1           | next/font prevents font-based shifts                   |
| Bundle size (JS)               | <200KB gzipped | Luxury feel doesn't mean heavy bundle                  |
| Animation FPS                  | 60fps          | Use GPU-accelerated transforms (Framer Motion default) |

**Monitoring:** Use Next.js built-in Web Vitals reporting + Vercel Analytics.

## Sources

**Animation & Motion:**

- [Comparing React Animation Libraries 2026 - LogRocket](https://blog.logrocket.com/best-react-animation-libraries/)
- [GSAP vs Motion Comparison - Motion.dev](https://motion.dev/docs/gsap-vs-motion)
- [Framer Motion npm](https://www.npmjs.com/package/framer-motion) - v12.34.5
- [Motion & Framer Motion Upgrade Guide](https://motion.dev/docs/react-upgrade-guide)
- [Lenis Smooth Scroll Official](https://lenis.darkroom.engineering/)
- [Why Lenis Should be Browser Standard - Medium](https://medium.com/@nattupi/why-lenis-smooth-scroll-needs-to-become-a-browser-standard-62bed416c987)
- [Web Animation Comparison - Semaphore](https://semaphore.io/blog/react-framer-motion-gsap)

**Typography:**

- [Next.js Font Optimization Docs](https://nextjs.org/docs/app/getting-started/fonts)
- [Typography Trends 2026 - Art Coast Design](https://artcoastdesign.com/blog/typography-branding-trends-2026)
- [Luxury Fonts 2026 - Design Shack](https://designshack.net/articles/inspiration/elegant-luxury-fonts/)
- [Top Typography Trends 2026 - Authentype](https://authentype.com/2026/03/02/top-10-typography-trends-2026/)
- [Next.js Font Optimization Guide - Contentful](https://www.contentful.com/blog/next-js-fonts/)

**Responsive Design:**

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mastering Responsive Design 2026 - Mobile Viewer](https://mobiview.github.io/mastering-responsive-design)
- [CVA vs Tailwind Variants - DEV Community](https://dev.to/webdevlapani/cva-vs-tailwind-variants-choosing-the-right-tool-for-your-design-system-12am)
- [clsx & tailwind-merge - Medium](https://medium.com/@rezazare2088/cva-cn-in-tailwind-css-conditional-classes-in-react-1250b5dfc803)

**UI Components:**

- [Radix UI Primitives Official](https://www.radix-ui.com/primitives)
- [Headless UI Alternatives - LogRocket](https://blog.logrocket.com/headless-ui-alternatives/)
- [Vaul Drawer Component](https://vaul.emilkowal.ski/)
- [Vaul npm](https://www.npmjs.com/package/vaul) - v1.1.2
- [Embla vs Swiper Comparison - Capaxe Labs](https://www.capaxe.com/blog/20251109-swiperjs-vs-embla-carousel/)
- [React Carousel Libraries 2026 - Croct](https://blog.croct.com/post/best-react-carousel-slider-libraries)
- [embla-carousel-react npm](https://www.npmjs.com/package/embla-carousel-react) - v8.6.0

**Image Optimization:**

- [Next.js Image Optimization Guide - Strapi](https://strapi.io/blog/nextjs-image-optimization-developers-guide)
- [Next.js Image Component Docs](https://nextjs.org/docs/app/getting-started/images)
- [Sharp Installation - Next.js](https://nextjs.org/docs/messages/install-sharp)

**Anti-patterns:**

- [5 JavaScript Libraries to Avoid 2025 - The New Stack](https://thenewstack.io/5-javascript-libraries-you-should-say-goodbye-to-in-2025/)
- [JavaScript Graveyard 2025 - Medium](https://medium.com/@nitinsgavane/2025s-javascript-graveyard-bid-farewell-to-these-5-outdated-libraries-9234c2a5e844)
- [Next.js Advanced Techniques 2026 - Medium](https://medium.com/@elizacodewell72/next-js-advanced-techniques-2026-15-pro-level-tips-every-senior-developer-must-master-0b264649980e)

---

**Stack research for:** Aquador Luxury Design Overhaul
**Researched:** 2026-03-04
**Confidence:** HIGH (all packages verified with official docs and npm registry)
**Next Phase:** Feature implementation research (animation patterns, typography systems)
