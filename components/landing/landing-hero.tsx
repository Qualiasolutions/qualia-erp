'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Menu, X, CheckCircle2, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AnimatedGroup } from '@/components/ui/animated-group';

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 14 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
    },
  },
};

const navItems = [
  { name: 'Product', href: '#product' },
  { name: 'Workflow', href: '#workflow' },
  { name: 'Clients', href: '#clients' },
];

const heroLogos = [
  { src: '/logos/alkemy.png', alt: 'Alkemy', h: 20 },
  { src: '/logos/innrvo.png', alt: 'Innrvo', h: 18 },
  { src: '/logos/aquador.png', alt: 'Aquador', h: 22 },
  { src: '/logos/armenius.png', alt: 'Armenius', h: 22 },
  { src: '/logos/blackgold.webp', alt: 'Black Gold', h: 22 },
  { src: '/logos/zyprus.webp', alt: 'Zyprus', h: 18 },
  { src: '/logos/melon-auto.webp', alt: 'Melon Auto', h: 20 },
  { src: '/logos/glluztech.webp', alt: 'GlluzTech', h: 20 },
];

export function LandingHero() {
  return (
    <div className="relative h-screen w-full overflow-y-auto overflow-x-hidden bg-background">
      <LandingNav />
      <main>
        <section className="relative">
          {/* Ambient teal glow — only visible on dark */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden contain-strict lg:block"
          >
            <div className="absolute -left-32 top-0 h-[60rem] w-[40rem] -rotate-45 rounded-full bg-[radial-gradient(60%_60%_at_50%_40%,hsl(var(--primary)/0.18)_0%,hsl(var(--primary)/0.05)_45%,transparent_75%)]" />
            <div className="absolute -right-40 top-40 h-[55rem] w-[35rem] rotate-12 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--primary)/0.10)_0%,transparent_70%)]" />
          </div>

          {/* Subtle grid pattern */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          />

          <div className="relative pt-28 md:pt-36">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mx-auto max-w-4xl text-center">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="#product"
                    className="group mx-auto flex w-fit items-center gap-3 rounded-full border border-border/60 bg-card/40 px-4 py-1.5 shadow-[var(--elevation-resting)] backdrop-blur transition-colors duration-200 hover:border-primary/40"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <span className="text-xs font-medium tracking-wide text-foreground/80">
                      AI-native ERP for studios &amp; agencies
                    </span>
                    <span className="h-3 w-px bg-border/80" />
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      What&rsquo;s new
                      <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </Link>

                  <h1 className="mx-auto mt-10 max-w-3xl text-balance text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
                    The operating system for your{' '}
                    <span className="bg-gradient-to-br from-qualia-400 via-qualia-500 to-qualia-700 bg-clip-text text-transparent dark:from-qualia-200 dark:via-qualia-300 dark:to-qualia-500">
                      client work
                    </span>
                    .
                  </h1>

                  <p className="mx-auto mt-7 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Projects, tasks, finances, meetings and AI assistants — one private workspace
                    for your team and a clean portal for every client.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.07, delayChildren: 0.4 },
                      },
                    },
                    item: transitionVariants.item,
                  }}
                  className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
                >
                  <Button asChild size="lg" className="h-12 rounded-xl px-6 text-sm font-semibold">
                    <Link href="/auth/login">
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl px-6 text-sm font-semibold"
                  >
                    <Link href="/auth/signup">Create account</Link>
                  </Button>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={transitionVariants}
                  className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground/80"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Built on Supabase
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Real-time collaboration
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Branded client portal
                  </span>
                </AnimatedGroup>
              </div>
            </div>

            {/* Dashboard preview */}
            <AnimatedGroup
              variants={{
                container: {
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { delayChildren: 0.6 } },
                },
                item: {
                  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] as const },
                  },
                },
              }}
              className="mt-16 px-6 sm:mt-24"
            >
              <DashboardPreview />
            </AnimatedGroup>
          </div>
        </section>

        {/* Logos */}
        <section id="clients" className="border-t border-border/40 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
              Trusted by studios &amp; operators
            </p>
            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 items-center gap-x-12 gap-y-10 sm:grid-cols-4">
              {heroLogos.map((logo) => (
                <div key={logo.src} className="flex items-center justify-center">
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={120}
                    height={logo.h}
                    style={{ height: logo.h, width: 'auto' }}
                    className="opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 dark:invert dark:hover:invert-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-border/40">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.webp" alt="Qualia" width={22} height={22} className="rounded-md" />
              <span className="text-sm font-medium text-muted-foreground">
                Qualia Suite
                <span className="mx-2 text-border">·</span>
                <span className="text-xs">© {new Date().getFullYear()} Qualia Solutions</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="/auth/login" className="hover:text-foreground">
                Sign in
              </Link>
              <a
                href="https://qualiasolutions.net"
                className="hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                qualiasolutions.net
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Nav                                                                      */
/* ----------------------------------------------------------------------- */

function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <nav
        data-state={open ? 'active' : undefined}
        className={cn(
          'group flex w-full max-w-6xl items-center justify-between gap-4 rounded-2xl border border-transparent px-4 py-2.5 transition-all duration-300 lg:px-6',
          scrolled &&
            'border-border/50 bg-background/70 shadow-[var(--elevation-resting)] backdrop-blur-md'
        )}
      >
        <Link href="/" aria-label="Qualia" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary/10 ring-1 ring-primary/15">
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={28}
              height={28}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
            Qualia Suite
          </span>
        </Link>

        <ul className="hidden items-center gap-7 text-sm lg:flex">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm" className="h-9 rounded-lg px-4">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="h-9 rounded-lg px-4">
            <Link href="/auth/signup">Get started</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="relative z-10 -mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile dropdown */}
        {open && (
          <div className="absolute inset-x-3 top-[calc(100%+0.5rem)] rounded-2xl border border-border/60 bg-background/95 p-4 shadow-[var(--elevation-floating)] backdrop-blur-md lg:hidden">
            <ul className="space-y-1 pb-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
              <Button asChild variant="outline" size="sm" className="h-10 w-full rounded-lg">
                <Link href="/auth/login" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm" className="h-10 w-full rounded-lg">
                <Link href="/auth/signup" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

/* ----------------------------------------------------------------------- */
/* Dashboard preview — a stylized snapshot of the actual ERP shell          */
/* ----------------------------------------------------------------------- */

function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Top fade so the bottom of the preview blends into the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-40 bg-gradient-to-b from-transparent to-background"
      />
      {/* Outer frame with teal ring */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.25),var(--elevation-floating)] ring-1 ring-primary/10 backdrop-blur">
        <div className="grid h-[460px] grid-cols-[200px_1fr_240px] overflow-hidden rounded-xl bg-background sm:h-[520px] md:h-[600px]">
          <PreviewSidebar />
          <PreviewMain />
          <PreviewRightRail />
        </div>
      </div>
    </div>
  );
}

function PreviewSidebar() {
  const items = [
    { label: 'Home', icon: '◈', active: true },
    { label: 'Tasks', icon: '◆', count: 12 },
    { label: 'Projects', icon: '▤' },
    { label: 'Schedule', icon: '◇' },
    { label: 'Clients', icon: '◉' },
    { label: 'Knowledge', icon: '◍' },
    { label: 'Status', icon: '◐' },
    { label: 'Settings', icon: '⚙' },
  ];
  return (
    <aside className="hidden flex-col gap-1 border-r border-border/40 bg-card/40 p-3 lg:flex">
      <div className="flex items-center gap-2 px-2 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
          <Image src="/logo.webp" alt="" width={20} height={20} className="rounded" />
        </span>
        <span className="truncate text-[12px] font-semibold text-foreground">Qualia Suite</span>
      </div>
      <div className="my-2 h-px bg-border/40" />
      <p className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
        Workspace
      </p>
      {items.map((it) => (
        <div
          key={it.label}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px]',
            it.active
              ? 'bg-primary text-primary-foreground shadow-[var(--glow-teal-sm)]'
              : 'text-muted-foreground'
          )}
        >
          <span className="text-[11px] opacity-70">{it.icon}</span>
          <span className="flex-1 truncate font-medium">{it.label}</span>
          {it.count ? (
            <span
              className={cn(
                'inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold',
                it.active ? 'bg-primary-foreground/20' : 'bg-primary text-primary-foreground'
              )}
            >
              {it.count}
            </span>
          ) : null}
        </div>
      ))}
    </aside>
  );
}

function PreviewMain() {
  const tasks = [
    { title: 'Review Q3 brand refresh proposal', meta: 'Alkemy · today', priority: 'high' },
    { title: 'Approve invoice draft INV-2086', meta: 'Armenius · today', priority: 'med' },
    { title: 'Ship landing page polish', meta: 'Qualia · in progress', priority: 'high' },
    { title: 'Sync milestone phase-3 to GitHub', meta: 'Sakani · 14:30', priority: 'med' },
    { title: 'Send weekly digest to clients', meta: 'workflow · 17:00', priority: 'low' },
  ] as const;

  return (
    <section className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
            Today
          </p>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold text-foreground">
            Good afternoon, Fawzi
          </h3>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-md border border-border/50 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </span>
          <span className="h-7 w-7 rounded-full bg-gradient-to-br from-qualia-300 to-qualia-600" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-6 py-4">
        <Stat label="Open tasks" value="12" trend="+3" />
        <Stat label="Active projects" value="7" trend="0" />
        <Stat label="Receivables" value="€42k" trend="+8%" />
      </div>

      <div className="px-6">
        <div className="flex items-baseline justify-between pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Inbox
          </p>
          <span className="text-[11px] text-muted-foreground/70">5 of 12</span>
        </div>
        <ul className="overflow-hidden rounded-lg border border-border/40 bg-card/30">
          {tasks.map((t, i) => (
            <li
              key={t.title}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5',
                i !== tasks.length - 1 && 'border-b border-border/30'
              )}
            >
              <span
                className={cn(
                  'inline-block h-2 w-2 shrink-0 rounded-full',
                  t.priority === 'high' && 'bg-primary',
                  t.priority === 'med' && 'bg-amber-500/80',
                  t.priority === 'low' && 'bg-muted-foreground/40'
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-foreground">{t.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{t.meta}</p>
              </div>
              <span className="text-[11px] text-muted-foreground/70">↗</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-border/40 px-6 py-3 text-[11px] text-muted-foreground">
        Synced · 2 min ago
      </div>
    </section>
  );
}

function PreviewRightRail() {
  return (
    <aside className="hidden border-l border-border/40 bg-card/30 p-4 md:block">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Active project
      </p>
      <div className="mt-2 rounded-lg border border-border/40 bg-card/60 p-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-md bg-gradient-to-br from-qualia-400 to-qualia-700" />
          <span className="text-[12.5px] font-semibold text-foreground">Sakani · Phase 3</span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span className="font-mono text-foreground">68%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[68%] rounded-full bg-primary shadow-[var(--glow-teal-sm)]" />
          </div>
        </div>
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Activity
      </p>
      <ul className="mt-2 space-y-2.5">
        {[
          { who: 'Hasan', what: 'closed task', when: '12m' },
          { who: 'Rama', what: 'pushed phase-2', when: '38m' },
          { who: 'Moayad', what: 'commented', when: '1h' },
          { who: 'Sally', what: 'logged hours', when: '2h' },
        ].map((a) => (
          <li key={a.who + a.when} className="flex items-center gap-2 text-[11.5px]">
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-qualia-300 to-qualia-600 ring-1 ring-border/40" />
            <span className="min-w-0 flex-1 truncate text-foreground">
              <span className="font-medium">{a.who}</span>{' '}
              <span className="text-muted-foreground">{a.what}</span>
            </span>
            <span className="text-[10px] text-muted-foreground/70">{a.when}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        AI assistant
      </p>
      <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11.5px] text-muted-foreground">
        <span className="text-foreground">Want me to draft</span> the Q3 retainer email for
        Armenius?
      </div>
    </aside>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  const positive = trend.startsWith('+');
  return (
    <div className="rounded-lg border border-border/40 bg-card/30 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-foreground">{value}</span>
        <span
          className={cn(
            'text-[10px] font-medium',
            positive ? 'text-primary' : 'text-muted-foreground/70'
          )}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}
