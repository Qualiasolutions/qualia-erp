'use client';

import { QualiaHomeView } from '@/components/portal/qualia-home-view';

interface AdminDashboardContentProps {
  displayName: string;
  userId: string;
}

export function AdminDashboardContent({ displayName, userId }: AdminDashboardContentProps) {
  return <QualiaHomeView role="admin" displayName={displayName} userId={userId} />;
}
