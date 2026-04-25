'use client';

import { QualiaHomeView } from '@/components/portal/qualia-home-view';

interface EmployeeDashboardContentProps {
  userId: string;
  displayName: string;
}

export function EmployeeDashboardContent({ userId, displayName }: EmployeeDashboardContentProps) {
  return <QualiaHomeView role="employee" displayName={displayName} userId={userId} />;
}
