'use client';

import { FolderKanban, Users, Building2, TrendingUp } from 'lucide-react';
import { PortalWorkspaceGrid } from '@/components/portal/portal-workspace-grid';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { cn } from '@/lib/utils';
import { InboxWidget } from '@/components/portal/inbox-widget';
import { AdminUpdatesPanel } from '@/components/today-dashboard/admin-updates-panel';

interface AdminDashboardContentProps {
  workspaces: ClientWorkspace[];
  displayName: string;
  workspaceId: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/* Stat Card — premium left-accent treatment                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  accentColor,
  delay,
}: {
  label: string;
  value: number;
  icon: typeof FolderKanban;
  accentColor: string;
  delay: number;
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card',
        'transition-all duration-200 hover:border-border hover:shadow-sm'
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Left accent */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-[3px] transition-all duration-200',
          accentColor,
          'group-hover:w-[4px]'
        )}
      />

      <div className="flex items-center justify-between px-5 py-5 pl-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <Icon
          className="h-5 w-5 text-muted-foreground/15 transition-colors duration-200 group-hover:text-muted-foreground/25"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin Dashboard                                                     */
/* ------------------------------------------------------------------ */

export function AdminDashboardContent({
  workspaces,
  displayName,
  workspaceId,
}: AdminDashboardContentProps) {
  const firstName = displayName.split(' ')[0];
  const totalProjects = workspaces.reduce((sum, ws) => sum + ws.projectCount, 0);
  const activeProjects = workspaces.reduce(
    (sum, ws) => sum + ws.projects.filter((p) => p.status === 'Active').length,
    0
  );
  const portalActiveCount = workspaces.filter((ws) => ws.portalUserId).length;

  return (
    <div className="space-y-8 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      {/* Greeting */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
          {formatDate()}
        </p>
        <h1 className="mt-2 text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-foreground">
          {getGreeting()}, <span className="text-primary">{firstName}</span>
        </h1>
      </section>

      {/* Stats */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '60ms', animationFillMode: 'both' }}
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Clients"
            value={workspaces.length}
            icon={Building2}
            accentColor="bg-primary/40"
            delay={0}
          />
          <StatCard
            label="Projects"
            value={totalProjects}
            icon={FolderKanban}
            accentColor="bg-primary/30"
            delay={30}
          />
          <StatCard
            label="Active"
            value={activeProjects}
            icon={TrendingUp}
            accentColor="bg-emerald-500/40"
            delay={60}
          />
          <StatCard
            label="Portal Users"
            value={portalActiveCount}
            icon={Users}
            accentColor="bg-violet-500/30"
            delay={90}
          />
        </div>
      </section>

      {/* Inbox + Updates — side-by-side on lg+, stacked on mobile */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <InboxWidget />
          {workspaceId ? (
            <AdminUpdatesPanel workspaceId={workspaceId} />
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Join a workspace to post team updates.
            </div>
          )}
        </div>
      </section>

      {/* Workspace grid */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '180ms', animationFillMode: 'both' }}
      >
        <PortalWorkspaceGrid workspaces={workspaces} />
      </section>
    </div>
  );
}
