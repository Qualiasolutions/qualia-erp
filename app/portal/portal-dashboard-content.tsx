'use client';

import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardStats } from '@/components/portal/portal-dashboard-stats';
import { PortalRecentActivity } from '@/components/portal/portal-recent-activity';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Plus, Receipt } from 'lucide-react';
import Link from 'next/link';

interface PortalDashboardContentProps {
  clientId: string;
  displayName: string;
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

export function PortalDashboardContent({ clientId, displayName }: PortalDashboardContentProps) {
  const { data, isLoading, isValidating } = usePortalDashboard(clientId);

  const stats = (data.stats as DashboardStats | null) || null;
  const projects = (data.projects as ProjectWithPhases[]) || [];

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats row */}
      <PortalDashboardStats stats={stats} isLoading={isLoading} />

      {/* Project Roadmaps */}
      <PortalRecentActivity projects={projects} isLoading={isLoading} isValidating={isValidating} />

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/portal/requests">
          <Card className="card-interactive">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-qualia-600/10">
                <Plus className="h-4 w-4 text-qualia-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Submit Request</p>
                <p className="text-xs text-muted-foreground">New feature or change</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/billing">
          <Card className="card-interactive">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-qualia-600/10">
                <Receipt className="h-4 w-4 text-qualia-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">View Billing</p>
                <p className="text-xs text-muted-foreground">Invoices and payments</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <a href="mailto:support@qualiasolutions.net">
          <Card className="card-interactive">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-qualia-600/10">
                <Mail className="h-4 w-4 text-qualia-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Contact Support</p>
                <p className="text-xs text-muted-foreground">support@qualiasolutions.net</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>
    </div>
  );
}
