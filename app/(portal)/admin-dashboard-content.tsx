'use client';

import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { QualiaToday } from '@/components/portal/qualia-today';

interface AdminDashboardContentProps {
  workspaces: ClientWorkspace[];
  displayName: string;
  workspaceId: string | null;
}

export function AdminDashboardContent({ workspaces, displayName }: AdminDashboardContentProps) {
  return <QualiaToday role="admin" displayName={displayName} workspaces={workspaces} />;
}
