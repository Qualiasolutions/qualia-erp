'use client';

import { QualiaToday } from '@/components/portal/qualia-today';

interface EmployeeDashboardContentProps {
  userId: string;
  displayName: string;
}

// userId is passed through for future use (per-employee filtering); QualiaToday
// currently derives tasks + projects from SWR hooks that already respect auth.
export function EmployeeDashboardContent({ displayName }: EmployeeDashboardContentProps) {
  return <QualiaToday role="employee" displayName={displayName} />;
}
