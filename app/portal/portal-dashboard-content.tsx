'use client';

import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardStats } from '@/components/portal/portal-dashboard-stats';
import { PortalRecentActivity } from '@/components/portal/portal-recent-activity';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Mail, Plus, Receipt } from 'lucide-react';
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
          {greeting}, <span className="text-qualia-600">{displayName}</span>
        </h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
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
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
          Quick Actions
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/portal/requests" className="group">
            <Card className="card-interactive">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qualia-500/15 to-qualia-600/5 ring-1 ring-qualia-500/10">
                  <Plus className="h-4 w-4 text-qualia-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-qualia-700">
                    Submit Request
                  </p>
                  <p className="text-xs text-muted-foreground">New feature or change</p>
                </div>
                <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-qualia-600" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/portal/billing" className="group">
            <Card className="card-interactive">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qualia-500/15 to-qualia-600/5 ring-1 ring-qualia-500/10">
                  <Receipt className="h-4 w-4 text-qualia-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-qualia-700">
                    View Billing
                  </p>
                  <p className="text-xs text-muted-foreground">Invoices and payments</p>
                </div>
                <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-qualia-600" />
              </CardContent>
            </Card>
          </Link>
          <a href="mailto:support@qualiasolutions.net" className="group">
            <Card className="card-interactive">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qualia-500/15 to-qualia-600/5 ring-1 ring-qualia-500/10">
                  <Mail className="h-4 w-4 text-qualia-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-qualia-700">
                    Contact Support
                  </p>
                  <p className="text-xs text-muted-foreground">support@qualiasolutions.net</p>
                </div>
                <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-qualia-600" />
              </CardContent>
            </Card>
          </a>
        </div>
      </div>
    </div>
  );
}
