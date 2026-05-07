'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CheckSquare,
  FolderKanban,
  Home,
  Inbox,
  Menu,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { m, AnimatePresence } from '@/lib/lazy-motion';

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
        className="relative flex flex-1 flex-col justify-start pb-8 pt-[clamp(5.5rem,10vh,7rem)]"
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
              <h1 className="text-balance text-[clamp(1.875rem,4.4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
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
              className="mt-6 flex flex-col items-center justify-center gap-2 sm:mt-7"
            >
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-xl px-7 text-sm font-semibold shadow-[var(--glow-teal-sm)] sm:w-auto"
              >
                <a href="mailto:info@qualiasolutions.net?subject=Qualia%20Suite%20walkthrough&body=Hi%20Qualia%20team%2C%20I%27d%20like%20to%20see%20a%20walkthrough.%0A%0AAbout%20us%3A%20%0ATeam%20size%3A%20%0AWhat%20we%20use%20today%3A%20">
                  Book a walkthrough
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <p className="text-[11px] text-muted-foreground/80">
                20-min live demo · no deck, no slides · with a real human
              </p>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </AnimatedGroup>

            <AnimatedGroup
              variants={transitionVariants}
              className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground/80 sm:mt-6"
            >
              <Chip>Built on Supabase</Chip>
              <Chip>Real-time collaboration</Chip>
              <Chip>Branded client portal</Chip>
            </AnimatedGroup>
          </div>

          <m.div
            initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.0, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 w-full sm:mt-9"
          >
            <DashboardPreview />
          </m.div>
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
            <a href="mailto:info@qualiasolutions.net?subject=Qualia%20Suite%20walkthrough">
              Book a walkthrough
            </a>
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
              <Button asChild size="sm" className="h-10 w-full rounded-lg">
                <a
                  href="mailto:info@qualiasolutions.net?subject=Qualia%20Suite%20walkthrough"
                  onClick={() => setOpen(false)}
                >
                  Book a walkthrough
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-10 w-full rounded-lg">
                <Link href="/auth/login" onClick={() => setOpen(false)}>
                  Sign in
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
/* Dashboard preview — single large frame with role toggle                   */
/* ----------------------------------------------------------------------- */

type Role = 'admin' | 'employee' | 'client';

const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: 'admin', label: 'Admin', blurb: 'Run the studio' },
  { id: 'employee', label: 'Employee', blurb: 'Ship the work' },
  { id: 'client', label: 'Client', blurb: 'See what you need' },
];

function DashboardPreview() {
  const [role, setRole] = useState<Role>('admin');
  const [interacted, setInteracted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-cycle until the user clicks the toggle
  useEffect(() => {
    if (interacted) return;
    intervalRef.current = setInterval(() => {
      setRole((r) => {
        const i = ROLES.findIndex((x) => x.id === r);
        return ROLES[(i + 1) % ROLES.length].id;
      });
    }, 4500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [interacted]);

  const onSelect = (id: Role) => {
    setInteracted(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRole(id);
  };

  const cfg = ROLES.find((r) => r.id === role)!;

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-24 bg-gradient-to-b from-transparent to-background"
      />
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 shadow-[0_30px_80px_-22px_hsl(var(--primary)/0.28),var(--elevation-floating)] ring-1 ring-primary/10 backdrop-blur">
        {/* Top bar with workspace label + role toggle */}
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
              <Image src="/logo.webp" alt="" width={14} height={14} className="rounded" />
            </span>
            <span className="truncate text-[11px] font-semibold text-foreground">Qualia Suite</span>
            <span className="hidden text-[10px] text-muted-foreground/70 sm:inline">
              · {cfg.blurb}
            </span>
          </div>
          <RoleToggle role={role} onSelect={onSelect} />
        </div>

        {/* Big preview frame */}
        <div className="relative h-[clamp(300px,42vh,440px)] overflow-hidden rounded-xl bg-background">
          <AnimatePresence mode="wait">
            <m.div
              key={role}
              initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 grid grid-cols-[160px_1fr] md:grid-cols-[180px_1fr_240px]"
            >
              <RoleSidebar role={role} />
              <RoleMain role={role} />
              <RoleRightRail role={role} />
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function RoleToggle({ role, onSelect }: { role: Role; onSelect: (r: Role) => void }) {
  return (
    <div
      className="relative inline-flex items-center gap-0.5 rounded-full border border-border/50 bg-card/60 p-0.5 shadow-[var(--elevation-resting)] backdrop-blur"
      role="tablist"
      aria-label="Role view"
    >
      {ROLES.map((r) => {
        const active = r.id === role;
        return (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(r.id)}
            className="relative z-10 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-colors duration-200 sm:px-3"
          >
            {active && (
              <m.span
                layoutId="role-toggle-pill"
                className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[var(--glow-teal-sm)]"
                transition={{
                  duration: 0.32,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
              />
            )}
            <span className={active ? 'text-primary-foreground' : 'text-muted-foreground'}>
              {r.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* --- Sidebar (per-role nav) -------------------------------------------- */

const NAV_BY_ROLE: Record<
  Role,
  { label: string; Icon: LucideIcon; active?: boolean; count?: number }[]
> = {
  admin: [
    { label: 'Home', Icon: Home, active: true },
    { label: 'Workspace', Icon: FolderKanban },
    { label: 'Clients', Icon: Users, count: 13 },
    { label: 'Projects', Icon: CheckSquare },
    { label: 'Payments', Icon: Wallet },
    { label: 'Reports', Icon: BarChart3 },
    { label: 'Settings', Icon: Settings },
  ],
  employee: [
    { label: 'Home', Icon: Home, active: true },
    { label: 'Tasks', Icon: CheckSquare, count: 8 },
    { label: 'Projects', Icon: FolderKanban },
    { label: 'Schedule', Icon: Calendar },
    { label: 'Knowledge', Icon: Sparkles },
    { label: 'Settings', Icon: Settings },
  ],
  client: [
    { label: 'Workspace', Icon: Home, active: true },
    { label: 'Updates', Icon: Inbox },
    { label: 'Files', Icon: FolderKanban },
    { label: 'Requests', Icon: CheckSquare, count: 2 },
    { label: 'Billing', Icon: Wallet },
    { label: 'Settings', Icon: Settings },
  ],
};

function RoleSidebar({ role }: { role: Role }) {
  const items = NAV_BY_ROLE[role];
  return (
    <aside className="flex flex-col gap-2 border-r border-border/40 bg-card/30 p-3">
      <p className="px-2 pb-1 pt-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {role === 'admin' ? 'Admin · Workspace' : role === 'employee' ? 'Studio' : 'Your portal'}
      </p>
      <div className="h-px bg-border/40" />
      <m.ul
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
        }}
        className="flex flex-col gap-2 pt-1"
      >
        {items.map((it) => (
          <li
            key={it.label}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] transition-colors',
              it.active
                ? 'bg-primary text-primary-foreground shadow-[var(--glow-teal-sm)]'
                : 'text-muted-foreground'
            )}
          >
            <it.Icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.75} />
            <span className="flex-1 truncate font-medium">{it.label}</span>
            {it.count ? (
              <span
                className={cn(
                  'inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[9px] font-semibold',
                  it.active ? 'bg-primary-foreground/20' : 'bg-primary text-primary-foreground'
                )}
              >
                {it.count}
              </span>
            ) : null}
          </li>
        ))}
      </m.ul>
    </aside>
  );
}

/* --- Main pane (per-role content) -------------------------------------- */

function RoleMain({ role }: { role: Role }) {
  if (role === 'admin') return <AdminMain />;
  if (role === 'employee') return <EmployeeMain />;
  return <ClientMain />;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function AdminMain() {
  const team = [
    { who: 'Hasan', load: 92, role: 'eng' },
    { who: 'Rama', load: 74, role: 'design' },
    { who: 'Moayad', load: 58, role: 'eng' },
    { who: 'Sally', load: 41, role: 'ops' },
  ];
  return (
    <m.section
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="flex min-w-0 flex-col"
    >
      <m.div
        variants={fadeUp}
        className="flex items-center justify-between border-b border-border/40 px-5 py-3"
      >
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Studio overview
          </p>
          <h3 className="mt-0.5 truncate text-[13px] font-semibold text-foreground">
            Good afternoon, Fawzi
          </h3>
        </div>
        <span className="rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </span>
      </m.div>
      <m.div variants={fadeUp} className="grid grid-cols-3 gap-2 px-5 py-3">
        <Stat label="Receivables" value="€42k" trend="+8%" />
        <Stat label="Active proj." value="7" trend="+1" />
        <Stat label="Pipeline" value="€18k" trend="+4%" />
      </m.div>
      <div className="px-5 pb-3">
        <m.p
          variants={fadeUp}
          className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Team capacity · this week
        </m.p>
        <ul className="space-y-2.5">
          {team.map((m_) => (
            <li key={m_.who} className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-qualia-300 to-qualia-600 text-[9px] font-semibold text-white ring-1 ring-border/40">
                {m_.who[0]}
              </span>
              <span className="w-16 truncate text-[11px] font-medium text-foreground">
                {m_.who}
              </span>
              <span className="hidden w-10 text-[9.5px] uppercase tracking-wide text-muted-foreground/70 sm:inline">
                {m_.role}
              </span>
              <span className="flex-1">
                <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                  <m.span
                    initial={{ width: 0 }}
                    animate={{ width: `${m_.load}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'block h-full rounded-full',
                      m_.load > 80 ? 'bg-amber-500/80' : 'bg-primary shadow-[var(--glow-teal-sm)]'
                    )}
                  />
                </span>
              </span>
              <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">
                {m_.load}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </m.section>
  );
}

function EmployeeMain() {
  const tasks = [
    { title: 'Review Q3 brand refresh proposal', meta: 'Alkemy · today', priority: 'high' },
    { title: 'Approve invoice draft INV-2086', meta: 'Armenius · today', priority: 'med' },
    { title: 'Ship landing page polish', meta: 'Qualia · in progress', priority: 'high' },
    { title: 'Sync milestone phase-3 to GitHub', meta: 'Sakani · 14:30', priority: 'med' },
    { title: 'Send weekly digest to clients', meta: 'workflow · 17:00', priority: 'low' },
  ] as const;
  return (
    <m.section
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="flex min-w-0 flex-col"
    >
      <m.div
        variants={fadeUp}
        className="flex items-center justify-between border-b border-border/40 px-5 py-3"
      >
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Today
          </p>
          <h3 className="mt-0.5 truncate text-[13px] font-semibold text-foreground">
            Hi, Hasan · <span className="font-mono text-primary">04:32</span> on shift
          </h3>
        </div>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
          clocked in
        </span>
      </m.div>
      <m.div variants={fadeUp} className="grid grid-cols-3 gap-2 px-5 py-3">
        <Stat label="My tasks" value="8" trend="+2" />
        <Stat label="Done today" value="3" trend="+3" />
        <Stat label="Hours" value="4.5h" trend="+4.5" />
      </m.div>
      <div className="px-5 pb-3">
        <m.div variants={fadeUp} className="flex items-baseline justify-between pb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inbox
          </p>
          <span className="text-[10px] text-muted-foreground/70">5 of 8</span>
        </m.div>
        <ul className="overflow-hidden rounded-lg border border-border/40 bg-card/30">
          {tasks.map((t, i) => (
            <li
              key={t.title}
              className={cn(
                'flex items-center gap-3 px-3 py-2',
                i !== tasks.length - 1 && 'border-b border-border/30'
              )}
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
                <p className="truncate text-[11.5px] font-medium text-foreground">{t.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{t.meta}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/70">↗</span>
            </li>
          ))}
        </ul>
      </div>
    </m.section>
  );
}

function ClientMain() {
  return (
    <m.section
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="flex min-w-0 flex-col"
    >
      <m.div
        variants={fadeUp}
        className="flex items-center justify-between border-b border-border/40 px-5 py-3"
      >
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Your project
          </p>
          <h3 className="mt-0.5 truncate text-[13px] font-semibold text-foreground">
            Brand refresh — Q3
          </h3>
        </div>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
          on track
        </span>
      </m.div>
      <m.div variants={fadeUp} className="px-5 py-3">
        <div className="rounded-lg border border-border/40 bg-card/40 p-3">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-muted-foreground">Phase 2 of 4 · Visual system</span>
            <span className="font-mono text-foreground">68%</span>
          </div>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
            <m.span
              initial={{ width: 0 }}
              animate={{ width: '68%' }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="block h-full rounded-full bg-primary shadow-[var(--glow-teal-sm)]"
            />
          </span>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Next milestone <span className="text-foreground">System review</span> · 12 May
          </p>
        </div>
      </m.div>
      <div className="px-5 pb-3">
        <m.p
          variants={fadeUp}
          className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Recent activity
        </m.p>
        <ul className="space-y-2">
          {[
            { label: 'Logo concepts shared', meta: 'Files · 2h ago', dot: 'bg-primary' },
            { label: 'Invoice INV-2086 issued', meta: 'Billing · 1d ago', dot: 'bg-amber-500/80' },
            { label: 'Discovery call notes added', meta: 'Updates · 3d ago', dot: 'bg-primary/60' },
            {
              label: 'Welcome to Qualia Suite',
              meta: 'Updates · 6d ago',
              dot: 'bg-muted-foreground/40',
            },
          ].map((a) => (
            <li key={a.label} className="flex items-center gap-2.5 rounded-md px-1 py-1">
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', a.dot)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium text-foreground">{a.label}</p>
                <p className="truncate text-[10px] text-muted-foreground">{a.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </m.section>
  );
}

/* --- Right rail (per-role widgets) ------------------------------------- */

function RoleRightRail({ role }: { role: Role }) {
  if (role === 'admin') return <AdminRail />;
  if (role === 'employee') return <EmployeeRail />;
  return <ClientRail />;
}

function AdminRail() {
  const projects = [
    { name: 'Sakani · Phase 3', pct: 68, due: '3w' },
    { name: 'Armenius · CMS', pct: 42, due: '6w' },
    { name: 'Underdog · v2', pct: 91, due: '5d' },
  ];
  return (
    <m.aside
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="hidden border-l border-border/40 bg-card/30 p-4 md:block"
    >
      <m.p
        variants={fadeUp}
        className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Active projects
      </m.p>
      <ul className="mt-2 space-y-2">
        {projects.map((p) => (
          <li key={p.name} className="rounded-lg border border-border/40 bg-card/60 p-2.5">
            <div className="flex items-center justify-between">
              <span className="truncate text-[11.5px] font-semibold text-foreground">{p.name}</span>
              <span className="text-[10px] text-muted-foreground">{p.due}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <m.span
                  initial={{ width: 0 }}
                  animate={{ width: `${p.pct}%` }}
                  transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="block h-full rounded-full bg-primary"
                />
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{p.pct}%</span>
            </div>
          </li>
        ))}
      </ul>
      <m.p
        variants={fadeUp}
        className="mt-4 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        AI assistant
      </m.p>
      <m.div
        variants={fadeUp}
        className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground"
      >
        <span className="text-foreground">Want me to draft</span> the Q3 retainer email for
        Armenius?
      </m.div>
    </m.aside>
  );
}

function EmployeeRail() {
  return (
    <m.aside
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="hidden border-l border-border/40 bg-card/30 p-4 md:block"
    >
      <m.p
        variants={fadeUp}
        className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Today&rsquo;s schedule
      </m.p>
      <ul className="mt-2 space-y-2">
        {[
          { time: '10:00', label: 'Standup', tag: 'Studio' },
          { time: '13:00', label: 'Sakani sprint review', tag: 'Sakani' },
          { time: '15:30', label: 'Design crit · brand', tag: 'Alkemy' },
        ].map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/60 p-2"
          >
            <span className="font-mono text-[10px] text-muted-foreground">{s.time}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-foreground">{s.label}</p>
              <p className="truncate text-[9.5px] text-muted-foreground">{s.tag}</p>
            </div>
          </li>
        ))}
      </ul>
      <m.p
        variants={fadeUp}
        className="mt-4 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Activity
      </m.p>
      <ul className="mt-2 space-y-2">
        {[
          { who: 'Rama', what: 'pushed phase-2', when: '12m' },
          { who: 'Moayad', what: 'commented on T-204', when: '38m' },
          { who: 'Sally', what: 'logged 1.5h', when: '1h' },
        ].map((a) => (
          <li key={a.who + a.when} className="flex items-center gap-2 text-[11px]">
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-qualia-300 to-qualia-600 ring-1 ring-border/40" />
            <span className="min-w-0 flex-1 truncate text-foreground">
              <span className="font-medium">{a.who}</span>{' '}
              <span className="text-muted-foreground">{a.what}</span>
            </span>
            <span className="text-[10px] text-muted-foreground/70">{a.when}</span>
          </li>
        ))}
      </ul>
    </m.aside>
  );
}

function ClientRail() {
  return (
    <m.aside
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="hidden border-l border-border/40 bg-card/30 p-4 md:block"
    >
      <m.p
        variants={fadeUp}
        className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Your team
      </m.p>
      <m.ul variants={stagger} className="mt-2 space-y-2">
        {[
          { who: 'Fawzi', role: 'Lead' },
          { who: 'Rama', role: 'Design' },
          { who: 'Hasan', role: 'Engineering' },
        ].map((m_) => (
          <li
            key={m_.who}
            className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/60 p-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-qualia-300 to-qualia-600 text-[10px] font-semibold text-white ring-1 ring-border/40">
              {m_.who[0]}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-foreground">{m_.who}</p>
              <p className="truncate text-[9.5px] text-muted-foreground">{m_.role}</p>
            </div>
          </li>
        ))}
      </m.ul>
      <m.p
        variants={fadeUp}
        className="mt-4 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Open requests
      </m.p>
      <m.div
        variants={fadeUp}
        className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5"
      >
        <p className="text-[11px] font-semibold text-foreground">Add Spanish landing page</p>
        <p className="mt-0.5 text-[9.5px] text-muted-foreground">Awaiting estimate · 1 of 2</p>
      </m.div>
    </m.aside>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  const positive = trend.startsWith('+');
  return (
    <div className="rounded-lg border border-border/40 bg-card/30 px-2.5 py-1.5">
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">{value}</span>
        <span
          className={cn(
            'text-[9.5px] font-medium',
            positive ? 'text-primary' : 'text-muted-foreground/70'
          )}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}
