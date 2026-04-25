'use client';

import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { QualiaHomeView } from '@/components/portal/qualia-home-view';

interface AdminDashboardContentProps {
  workspaces: ClientWorkspace[];
  displayName: string;
  workspaceId: string | null;
}

export function AdminDashboardContent({ workspaces, displayName }: AdminDashboardContentProps) {
  return <QualiaHomeView role="admin" displayName={displayName} workspaces={workspaces} />;
}
