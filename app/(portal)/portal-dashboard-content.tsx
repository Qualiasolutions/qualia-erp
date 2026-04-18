'use client';

import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardV2 } from '@/components/portal/portal-dashboard-v2';
import { PortalWelcomeTour } from '@/components/portal/portal-welcome-tour';

interface PortalDashboardContentProps {
  clientId: string;
  displayName: string;
  companyName?: string | null;
  enabledApps?: string[];
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

export function PortalDashboardContent({
  clientId,
  displayName,
  companyName,
  enabledApps,
}: PortalDashboardContentProps) {
  const { data, isLoading, isError } = usePortalDashboard(clientId);

  const stats = (data.stats as DashboardStats | null) || null;
  const projects = (data.projects as ProjectWithPhases[]) || [];

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

  // Extract recent activity from stats
  const recentActivity = stats?.recentActivity || [];

  return (
    <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      {/* Welcome tour for first-time clients */}
      <PortalWelcomeTour
        displayName={displayName}
        companyName={companyName}
        enabledApps={enabledApps}
      />

      <PortalDashboardV2
        stats={stats}
        projects={mappedProjects}
        recentActivity={recentActivity}
        isLoading={isLoading}
        isError={isError}
        clientId={clientId}
        displayName={displayName}
        companyName={companyName || undefined}
      />
    </div>
  );
}
