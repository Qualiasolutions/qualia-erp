'use client';

import Link from 'next/link';
import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardV2 } from '@/components/portal/portal-dashboard-v2';
import { PortalWelcomeTour } from '@/components/portal/portal-welcome-tour';
import { FolderKanban, Settings2, Users } from 'lucide-react';

interface PortalDashboardContentProps {
  clientId: string;
  displayName: string;
  companyName?: string | null;
  isAdmin?: boolean;
}

interface DashboardStats {
  projectCount: number;
  pendingRequests: number;
  unpaidInvoiceCount: number;
  unpaidTotal: number;
  recentActivity: Array<{
    id: string;
    action_type: string;
    action_data: Record<string, unknown>;
    created_at: string;
    project: { id: string; name: string } | null;
  }>;
}

interface ProjectWithPhases {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  description: string | null;
  progress: number;
  totalPhases: number;
  completedPhases: number;
  currentPhase: { name: string; status: string } | null;
  nextPhase: { name: string } | null;
}

function AdminWelcome({ displayName }: { displayName: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are viewing the client portal as an admin. This is how your clients see their
          dashboard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/portal"
          className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:border-primary/30 hover:bg-primary/[0.02]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-150 group-hover:bg-primary/15">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Manage Portal Clients</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Grant access, assign projects, reset passwords
            </p>
          </div>
        </Link>

        <Link
          href="/portal/projects"
          className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:border-primary/30 hover:bg-primary/[0.02]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-150 group-hover:bg-primary/15">
            <FolderKanban className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">View Projects</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Browse projects as clients see them
            </p>
          </div>
        </Link>

        <Link
          href="/portal/settings"
          className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:border-primary/30 hover:bg-primary/[0.02]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-150 group-hover:bg-primary/15">
            <Settings2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Portal Settings</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure portal appearance and preferences
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function PortalDashboardContent({
  clientId,
  displayName,
  companyName,
  isAdmin,
}: PortalDashboardContentProps) {
  const { data, isLoading, isError } = usePortalDashboard(clientId);

  const stats = (data.stats as DashboardStats | null) || null;
  const projects = (data.projects as ProjectWithPhases[]) || [];

  // Admin users won't have client dashboard data — show a welcome/admin view
  if (isAdmin && !isLoading && projects.length === 0 && !stats?.projectCount) {
    return <AdminWelcome displayName={displayName} />;
  }

  // Map projects to the shape expected by PortalDashboardV2
  const mappedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    project_type: p.project_type || '',
    description: p.description || undefined,
    progress: p.progress,
    totalPhases: p.totalPhases,
    completedPhases: p.completedPhases,
    currentPhase: p.currentPhase?.name,
  }));

  return (
    <>
      {/* Welcome tour for first-time clients */}
      {!isAdmin && <PortalWelcomeTour displayName={displayName} companyName={companyName} />}

      <PortalDashboardV2
        stats={stats}
        projects={mappedProjects}
        isLoading={isLoading}
        isError={isError}
        clientId={clientId}
        displayName={displayName}
        companyName={companyName || undefined}
      />
    </>
  );
}
