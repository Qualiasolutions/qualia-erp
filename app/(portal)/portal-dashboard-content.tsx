'use client';

import { usePortalDashboard } from '@/lib/swr';
import { QualiaPortalHub } from '@/components/portal/qualia-portal-hub';
import dynamic from 'next/dynamic';
const PortalWelcomeTour = dynamic(
  () =>
    import('@/components/portal/portal-welcome-tour').then((m) => ({
      default: m.PortalWelcomeTour,
    })),
  { ssr: false }
);

interface PortalDashboardContentProps {
  clientId: string;
  displayName: string;
  companyName?: string | null;
  enabledApps?: string[];
  logoUrl?: string | null;
  showWelcomeTour?: boolean;
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
  logoUrl,
  showWelcomeTour = true,
}: PortalDashboardContentProps) {
  const { data, isLoading, isError } = usePortalDashboard(clientId);

  const stats = (data.stats as DashboardStats | null) || null;
  const projects = (data.projects as ProjectWithPhases[]) || [];

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

  const recentActivity = stats?.recentActivity || [];

  return (
    <>
      <PortalWelcomeTour
        displayName={displayName}
        companyName={companyName}
        enabledApps={enabledApps}
        logoUrl={logoUrl}
        enabled={showWelcomeTour}
      />
      <QualiaPortalHub
        stats={stats}
        projects={mappedProjects}
        recentActivity={recentActivity}
        isLoading={isLoading}
        isError={isError}
        clientId={clientId}
        displayName={displayName}
        companyName={companyName || undefined}
        enabledApps={enabledApps}
      />
    </>
  );
}
