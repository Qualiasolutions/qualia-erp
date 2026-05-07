'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Menu, X } from 'lucide-react';

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
];

export function LandingHero() {
  return (
    <div className="relative flex min-h-[100svh] w-full flex-col overflow-y-auto overflow-x-hidden bg-background">
      <LandingNav />

      <section
        id="product"
        className="relative flex flex-1 flex-col justify-start pt-[clamp(5rem,11vh,7rem)] sm:justify-center sm:pt-0"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden contain-strict lg:block"
        >
          <div className="absolute -left-32 top-0 h-[60rem] w-[40rem] -rotate-45 rounded-full bg-[radial-gradient(60%_60%_at_50%_40%,hsl(var(--primary)/0.16)_0%,hsl(var(--primary)/0.05)_45%,transparent_75%)]" />
          <div className="absolute -right-40 top-40 h-[55rem] w-[35rem] rotate-12 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--primary)/0.10)_0%,transparent_70%)]" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)]"
        />

        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 sm:px-6">
          <div className="mx-auto w-full max-w-3xl text-center">
            <AnimatedGroup variants={transitionVariants}>
              <h1 className="text-balance text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-foreground">
                The operating system for your{' '}
                <span className="bg-gradient-to-br from-qualia-400 via-qualia-500 to-qualia-700 bg-clip-text text-transparent dark:from-qualia-200 dark:via-qualia-300 dark:to-qualia-500">
                  client work
                </span>
                .
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-balance text-[clamp(0.92rem,1.3vw,1.05rem)] leading-relaxed text-muted-foreground sm:mt-5">
                One workspace, three views — admins run the studio, employees ship the work, clients
                see what they need to see.
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
              className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-7 sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:w-auto"
              >
                <Link href="/auth/login">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:w-auto"
              >
                <Link href="/auth/signup">Create account</Link>
              </Button>
            </AnimatedGroup>

            <AnimatedGroup
              variants={transitionVariants}
              className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground/80 sm:mt-5"
            >
              <Chip>Built on Supabase</Chip>
              <Chip>Real-time collaboration</Chip>
              <Chip>Branded client portal</Chip>
            </AnimatedGroup>
          </div>

          <AnimatedGroup
            variants={{
              container: {
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.5 } },
              },
              item: {
                hidden: { opacity: 0, y: 32, filter: 'blur(8px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] as const },
                },
              },
            }}
            className="mt-6 grid w-full grid-cols-1 gap-4 sm:mt-8 md:grid-cols-3 md:gap-3 lg:gap-4"
          >
            <RoleCard role="admin" />
            <RoleCard role="employee" />
            <RoleCard role="client" />
          </AnimatedGroup>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.webp" alt="Qualia" width={18} height={18} className="rounded-md" />
            <span>Qualia Suite</span>
            <span className="text-border">·</span>
            <span>© {new Date().getFullYear()} Qualia Solutions</span>
          </div>
          <div className="flex items-center gap-5">
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
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------- */
/* Nav                                                                      */
/* ----------------------------------------------------------------------- */

function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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
            'border-border/50 bg-background/75 shadow-[var(--elevation-resting)] backdrop-blur-md'
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
/* Role cards — three views: admin, employee, client                         */
/* ----------------------------------------------------------------------- */

type Role = 'admin' | 'employee' | 'client';

const ROLE_CONFIG: Record<
  Role,
  {
    label: string;
    blurb: string;
    nav: { label: string; icon: string; active?: boolean; count?: number }[];
    main: React.ReactNode;
  }
> = {
  admin: {
    label: 'Admin',
    blurb: 'Run the studio',
    nav: [
      { label: 'Home', icon: '◈', active: true },
      { label: 'Workspace', icon: '◍' },
      { label: 'Clients', icon: '◉' },
      { label: 'Payments', icon: '€' },
      { label: 'Reports', icon: '◐' },
    ],
    main: <AdminMain />,
  },
  employee: {
    label: 'Employee',
    blurb: 'Ship the work',
    nav: [
      { label: 'Home', icon: '◈', active: true },
      { label: 'Tasks', icon: '◆', count: 8 },
      { label: 'Schedule', icon: '◇' },
      { label: 'Knowledge', icon: '▤' },
      { label: 'Settings', icon: '⚙' },
    ],
    main: <EmployeeMain />,
  },
  client: {
    label: 'Client',
    blurb: 'See what you need',
    nav: [
      { label: 'Workspace', icon: '◈', active: true },
      { label: 'Requests', icon: '◆', count: 2 },
      { label: 'Files', icon: '▤' },
      { label: 'Billing', icon: '€' },
      { label: 'Settings', icon: '⚙' },
    ],
    main: <ClientMain />,
  },
};

function RoleCard({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1 shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.22),var(--elevation-raised)] ring-1 ring-primary/5 backdrop-blur">
      <div className="flex h-full min-h-[clamp(320px,40vh,440px)] flex-col overflow-hidden rounded-xl bg-background">
        {/* Role pill header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary ring-1 ring-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {cfg.label}
          </span>
          <span className="text-[10px] text-muted-foreground/70">{cfg.blurb}</span>
        </div>

        {/* Sidebar + main */}
        <div className="grid flex-1 grid-cols-[110px_1fr] overflow-hidden">
          <RoleSidebar items={cfg.nav} />
          <div className="flex min-w-0 flex-col">{cfg.main}</div>
        </div>
      </div>
    </div>
  );
}

function RoleSidebar({
  items,
}: {
  items: { label: string; icon: string; active?: boolean; count?: number }[];
}) {
  return (
    <aside className="flex flex-col gap-2 border-r border-border/40 bg-card/30 p-2.5">
      <div className="flex items-center gap-1.5 px-2 pb-1.5 pt-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
          <Image src="/logo.webp" alt="" width={12} height={12} className="rounded" />
        </span>
        <span className="truncate text-[10px] font-semibold text-foreground">Qualia</span>
      </div>
      <div className="h-px bg-border/40" />
      <div className="flex flex-col gap-1.5 pt-1">
        {items.map((it) => (
          <div
            key={it.label}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-2 text-[10.5px] transition-colors',
              it.active
                ? 'bg-primary text-primary-foreground shadow-[var(--glow-teal-sm)]'
                : 'text-muted-foreground'
            )}
          >
            <span className="text-[10px] opacity-75">{it.icon}</span>
            <span className="flex-1 truncate font-medium">{it.label}</span>
            {it.count ? (
              <span
                className={cn(
                  'inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-1 text-[8.5px] font-semibold',
                  it.active ? 'bg-primary-foreground/20' : 'bg-primary text-primary-foreground'
                )}
              >
                {it.count}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </aside>
  );
}

/* --- Per-role main content --------------------------------------------- */

function AdminMain() {
  return (
    <>
      <div className="px-4 pb-2 pt-3">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Workspace
        </p>
        <h3 className="mt-0.5 text-[12px] font-semibold text-foreground">Studio overview</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4">
        <Stat label="Receivables" value="€42k" trend="+8%" />
        <Stat label="Active proj." value="7" trend="+1" />
      </div>
      <div className="mt-3 px-4 pb-3">
        <p className="pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Team capacity
        </p>
        <ul className="space-y-2">
          {[
            { who: 'Hasan', load: 92, role: 'eng' },
            { who: 'Rama', load: 74, role: 'design' },
            { who: 'Moayad', load: 58, role: 'eng' },
            { who: 'Sally', load: 41, role: 'ops' },
          ].map((m) => (
            <li key={m.who} className="flex items-center gap-2">
              <span className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-br from-qualia-300 to-qualia-600 ring-1 ring-border/40" />
              <span className="w-14 truncate text-[10.5px] font-medium text-foreground">
                {m.who}
              </span>
              <span className="flex-1">
                <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      m.load > 80 ? 'bg-amber-500/80' : 'bg-primary shadow-[var(--glow-teal-sm)]'
                    )}
                    style={{ width: `${m.load}%` }}
                  />
                </span>
              </span>
              <span className="w-7 text-right font-mono text-[9px] text-muted-foreground">
                {m.load}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function EmployeeMain() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Today
          </p>
          <h3 className="mt-0.5 truncate text-[12px] font-semibold text-foreground">
            Hi, Hasan · <span className="font-mono text-primary">04:32</span>
          </h3>
        </div>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
          on shift
        </span>
      </div>
      <div className="px-4 pb-2 pt-3">
        <p className="pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Inbox
        </p>
        <ul className="space-y-1.5">
          {[
            { title: 'Review Q3 brand proposal', meta: 'Alkemy', priority: 'high' },
            { title: 'Approve INV-2086', meta: 'Armenius', priority: 'med' },
            { title: 'Sync milestone phase-3', meta: 'Sakani', priority: 'high' },
            { title: 'Weekly digest draft', meta: 'workflow', priority: 'low' },
          ].map((t) => (
            <li
              key={t.title}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/30"
            >
              <span
                className={cn(
                  'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                  t.priority === 'high' && 'bg-primary',
                  t.priority === 'med' && 'bg-amber-500/80',
                  t.priority === 'low' && 'bg-muted-foreground/40'
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] font-medium text-foreground">{t.title}</p>
                <p className="truncate text-[9px] text-muted-foreground">{t.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ClientMain() {
  return (
    <>
      <div className="px-4 pb-2 pt-3">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Your project
        </p>
        <h3 className="mt-0.5 text-[12px] font-semibold text-foreground">Brand refresh — Q3</h3>
      </div>
      <div className="mx-4 rounded-lg border border-border/40 bg-card/40 p-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Phase 2 of 4</span>
          <span className="font-mono text-foreground">68%</span>
        </div>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-[68%] rounded-full bg-primary shadow-[var(--glow-teal-sm)]" />
        </span>
        <p className="mt-2 text-[9.5px] text-muted-foreground">
          Next milestone <span className="text-foreground">Visual system review</span> · 12 May
        </p>
      </div>
      <div className="mt-3 px-4 pb-3">
        <p className="pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Recent activity
        </p>
        <ul className="space-y-1.5">
          {[
            { label: 'Logo concepts shared', when: '2h' },
            { label: 'Invoice INV-2086 issued', when: '1d' },
            { label: 'Discovery call notes', when: '3d' },
          ].map((a) => (
            <li
              key={a.label}
              className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span className="truncate text-[10.5px] text-foreground">{a.label}</span>
              </span>
              <span className="text-[9px] text-muted-foreground">{a.when}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  const positive = trend.startsWith('+');
  return (
    <div className="rounded-lg border border-border/40 bg-card/30 px-2.5 py-1.5">
      <p className="text-[8.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
        {label}
      </p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">{value}</span>
        <span
          className={cn(
            'text-[9px] font-medium',
            positive ? 'text-primary' : 'text-muted-foreground/70'
          )}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}
