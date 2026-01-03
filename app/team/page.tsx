'use client';

import { useState } from 'react';
import {
  Sun,
  Moon,
  Phone,
  FileText,
  Receipt,
  Settings,
  Code,
  Bot,
  Globe,
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Coffee,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const morningTasks = [
  {
    icon: Phone,
    title: 'Client Communication',
    description: 'Reach out to clients, follow up on leads, schedule meetings',
  },
  {
    icon: FileText,
    title: 'Paperwork & Documentation',
    description: 'Contracts, proposals, project briefs, and documentation',
  },
  {
    icon: Receipt,
    title: 'Invoices & Finances',
    description: 'Send invoices, track payments, manage expenses',
  },
  {
    icon: Settings,
    title: 'System & Operations',
    description: 'Update CRM, organize files, manage project boards',
  },
];

const eveningTasks = [
  {
    icon: Bot,
    title: 'AI Agent Development',
    description: 'Build voice agents, chatbots, and automation workflows',
  },
  {
    icon: Globe,
    title: 'Website Development',
    description: 'Design and build client websites and web applications',
  },
  {
    icon: Code,
    title: 'Technical Implementation',
    description: 'Coding, integrations, API development, and testing',
  },
  {
    icon: Rocket,
    title: 'Deployment & Launch',
    description: 'Deploy projects, configure hosting, go live with clients',
  },
];

const principles = [
  {
    title: 'Structure Creates Freedom',
    description:
      'By organizing our day into focused blocks, we eliminate decision fatigue and maximize productivity.',
  },
  {
    title: 'Operations First',
    description:
      'Morning admin work ensures smooth business operations and keeps clients happy and informed.',
  },
  {
    title: 'Deep Work in the Evening',
    description:
      'Complex development tasks need uninterrupted focus. Evening sessions are for building.',
  },
  {
    title: 'Quality Over Speed',
    description: 'We deliver excellence. Take the time needed to do things right the first time.',
  },
];

export default function TeamWorkflowPage() {
  const [activeSection, setActiveSection] = useState<'morning' | 'evening'>('morning');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/5 via-background to-background px-6 py-16 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Welcome to the Team
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            How We Work at{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Qualia
            </span>
          </h1>

          <p className="text-lg text-muted-foreground">
            A structured approach to maximize productivity and deliver exceptional results for our
            clients.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Daily Schedule Overview */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            Daily Schedule Overview
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Morning Block */}
            <button
              onClick={() => setActiveSection('morning')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300',
                activeSection === 'morning'
                  ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5 shadow-lg shadow-amber-500/10'
                  : 'border-border/50 bg-card/50 hover:border-amber-500/30 hover:bg-amber-500/5'
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'rounded-xl p-3 transition-colors',
                      activeSection === 'morning' ? 'bg-amber-500/20' : 'bg-muted'
                    )}
                  >
                    <Sun
                      className={cn(
                        'h-6 w-6',
                        activeSection === 'morning' ? 'text-amber-500' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Morning Session</h3>
                    <p className="text-sm text-muted-foreground">Operations & Admin</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                    activeSection === 'morning'
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  2-3 hours
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coffee className="h-4 w-4" />
                <span>Start fresh, handle business essentials</span>
              </div>
            </button>

            {/* Evening Block */}
            <button
              onClick={() => setActiveSection('evening')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300',
                activeSection === 'evening'
                  ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 shadow-lg shadow-indigo-500/10'
                  : 'border-border/50 bg-card/50 hover:border-indigo-500/30 hover:bg-indigo-500/5'
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'rounded-xl p-3 transition-colors',
                      activeSection === 'evening' ? 'bg-indigo-500/20' : 'bg-muted'
                    )}
                  >
                    <Moon
                      className={cn(
                        'h-6 w-6',
                        activeSection === 'evening' ? 'text-indigo-500' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Evening Session</h3>
                    <p className="text-sm text-muted-foreground">Development & Building</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                    activeSection === 'evening'
                      ? 'bg-indigo-500/20 text-indigo-500'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  4-5 hours
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Rocket className="h-4 w-4" />
                <span>Deep focus, build amazing things</span>
              </div>
            </button>
          </div>
        </div>

        {/* Task Details */}
        <div className="mb-16">
          <div
            className={cn(
              'rounded-2xl border p-8 transition-all duration-500',
              activeSection === 'morning'
                ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent'
                : 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent'
            )}
          >
            <div className="mb-6 flex items-center gap-3">
              {activeSection === 'morning' ? (
                <Sun className="h-8 w-8 text-amber-500" />
              ) : (
                <Moon className="h-8 w-8 text-indigo-500" />
              )}
              <div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {activeSection === 'morning' ? 'Morning Tasks' : 'Evening Tasks'}
                </h3>
                <p className="text-muted-foreground">
                  {activeSection === 'morning'
                    ? 'Handle operations to keep the business running smoothly'
                    : 'Focus on building and creating value for clients'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(activeSection === 'morning' ? morningTasks : eveningTasks).map((task, index) => (
                <div
                  key={task.title}
                  className="group flex gap-4 rounded-xl border border-border/50 bg-card/50 p-4 transition-all duration-300 hover:border-border hover:bg-card"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                      activeSection === 'morning'
                        ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20'
                    )}
                  >
                    <task.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{task.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            A Day at Qualia
          </h2>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-amber-500 via-muted to-indigo-500" />

            <div className="space-y-8">
              {/* Morning Start */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-3 rounded-full border border-amber-500/50 bg-amber-500/10 px-6 py-2">
                  <Sun className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-amber-500">Morning Start</span>
                </div>
              </div>

              {/* Morning Tasks */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex justify-end md:pr-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">Calls & Emails</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Contact clients and follow up on opportunities
                    </p>
                  </div>
                </div>
                <div className="md:pl-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-amber-500">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Admin Work</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invoices, contracts, and system updates
                    </p>
                  </div>
                </div>
              </div>

              {/* Break */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Break & Recharge</span>
                </div>
              </div>

              {/* Evening Start */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-3 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-6 py-2">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium text-indigo-500">Evening Session</span>
                </div>
              </div>

              {/* Evening Tasks */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex justify-end md:pr-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-indigo-500">
                      <Bot className="h-4 w-4" />
                      <span className="font-medium">AI Development</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Build voice agents and automation systems
                    </p>
                  </div>
                </div>
                <div className="md:pl-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-indigo-500">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Web Development</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Design and build client websites
                    </p>
                  </div>
                </div>
              </div>

              {/* End */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-emerald-500">Day Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Principles */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            Our Principles
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((principle, index) => (
              <div
                key={principle.title}
                className="rounded-xl border border-border/50 bg-card/50 p-6 transition-all duration-300 hover:border-border hover:bg-card"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-foreground">{principle.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{principle.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8">
            <Users className="mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">Ready to Get Started?</h3>
            <p className="mb-6 max-w-md text-muted-foreground">
              Work together to build amazing things for our clients. Structure and consistency lead
              to success.
            </p>
            <div className="flex items-center gap-2 text-primary">
              <span className="font-medium">Let&apos;s do this</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
