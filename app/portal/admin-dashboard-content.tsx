'use client';

import { FolderKanban, Users, Zap, Building2 } from 'lucide-react';
import { PortalWorkspaceGrid } from '@/components/portal/portal-workspace-grid';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { cn } from '@/lib/utils';

interface AdminDashboardContentProps {
  workspaces: ClientWorkspace[];
  displayName: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  const now = new Date();
  return now
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FolderKanban;
}) {
  return (
    <div className="rounded-xl border border-border/50 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardContent({ workspaces, displayName }: AdminDashboardContentProps) {
  const firstName = displayName.split(' ')[0];
  const totalProjects = workspaces.reduce((sum, ws) => sum + ws.projectCount, 0);
  const activeProjects = workspaces.reduce(
    (sum, ws) => sum + ws.projects.filter((p) => p.status === 'Active').length,
    0
  );
  const portalActiveCount = workspaces.filter((ws) => ws.portalUserId).length;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <section
        className={cn('animate-fade-in-up')}
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {formatDate()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {getGreeting()}, <span className="text-primary">{firstName}</span>
        </h1>
      </section>

      {/* Stats row */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '60ms', animationFillMode: 'both' }}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Clients" value={workspaces.length} icon={Building2} />
          <StatCard label="Total Projects" value={totalProjects} icon={FolderKanban} />
          <StatCard label="Active" value={activeProjects} icon={Zap} />
          <StatCard label="Portal Active" value={portalActiveCount} icon={Users} />
        </div>
      </section>

      {/* Workspace grid */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        <PortalWorkspaceGrid workspaces={workspaces} />
      </section>
    </div>
  );
}
