import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientDashboardData, getClientDashboardProjects } from '@/app/actions/client-portal';
import { getUserRole } from '@/lib/portal-utils';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Folder, Lightbulb, Receipt, ArrowRight, Mail, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';

export default async function PortalDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userRole = await getUserRole(user.id);
  const isAdmin = userRole === 'admin';

  // For admins previewing, use first client's data or show empty state
  const clientId = user.id;

  // Get user profile for welcome message
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'there';

  // Fetch dashboard data + projects with phases in parallel
  const [dashResult, projectsResult] = await Promise.all([
    getClientDashboardData(clientId),
    getClientDashboardProjects(clientId),
  ]);

  const dashboard = dashResult.success
    ? (dashResult.data as {
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
      })
    : {
        projectCount: 0,
        pendingRequests: 0,
        unpaidInvoiceCount: 0,
        unpaidTotal: 0,
        recentActivity: [],
      };

  const projects = (projectsResult.success ? projectsResult.data : []) as Array<{
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
  }>;

  const stats = [
    {
      label: 'Active Projects',
      value: dashboard.projectCount,
      icon: Folder,
      href: '/portal/projects',
      color: 'text-blue-600 bg-blue-500/10',
    },
    {
      label: 'Pending Requests',
      value: dashboard.pendingRequests,
      icon: Lightbulb,
      href: '/portal/requests',
      color: 'text-amber-600 bg-amber-500/10',
    },
    {
      label: 'Unpaid Invoices',
      value: dashboard.unpaidInvoiceCount,
      icon: Receipt,
      href: '/portal/billing',
      color: 'text-red-600 bg-red-500/10',
      subtitle:
        dashboard.unpaidTotal > 0
          ? `${dashboard.unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })}`
          : undefined,
    },
  ];

  const formatActivityLabel = (type: string) => {
    switch (type) {
      case 'phase_submitted':
        return 'Phase submitted';
      case 'phase_approved':
        return 'Phase approved';
      case 'phase_changes_requested':
        return 'Changes requested';
      case 'task_completed':
        return 'Task completed';
      case 'comment_added':
        return 'Comment added';
      case 'file_uploaded':
        return 'File uploaded';
      case 'status_changed':
        return 'Status updated';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className={`space-y-8 ${fadeInClasses}`}>
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
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="card-interactive h-full" style={getStaggerDelay(index)}>
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                    stat.color
                  )}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {stat.subtitle && (
                    <p className="mt-0.5 text-xs font-medium text-red-600">{stat.subtitle}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Project Roadmaps */}
      {projects.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Project Roadmaps</h2>
            <Link
              href="/portal/projects"
              className="flex items-center gap-1 text-xs font-medium text-qualia-600 hover:text-qualia-700"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, index) => (
              <Link key={project.id} href={`/portal/projects/${project.id}`}>
                <Card
                  className="card-interactive h-full"
                  style={index < 6 ? getStaggerDelay(index + 3) : undefined}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-foreground">{project.name}</h3>
                      <Badge
                        className={cn(
                          'shrink-0 text-[10px]',
                          getProjectStatusColor(project.status)
                        )}
                      >
                        {project.status}
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    {project.totalPhases > 0 && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {project.completedPhases}/{project.totalPhases} phases
                          </span>
                          <span className="font-medium text-foreground">{project.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-qualia-600 transition-all duration-500"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Current phase */}
                    {project.currentPhase && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Current:</span>
                        <span className="font-medium text-foreground">
                          {project.currentPhase.name}
                        </span>
                      </div>
                    )}
                    {project.nextPhase && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Next:</span>
                        <span className="text-muted-foreground">{project.nextPhase.name}</span>
                      </div>
                    )}

                    {/* No phases */}
                    {project.totalPhases === 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Roadmap not yet available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

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
        <a href="mailto:support@qualiasolutions.io">
          <Card className="card-interactive">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-qualia-600/10">
                <Mail className="h-4 w-4 text-qualia-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Contact Support</p>
                <p className="text-xs text-muted-foreground">support@qualiasolutions.io</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Recent activity */}
      {dashboard.recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link
                href="/portal/messages"
                className="flex items-center gap-1 text-xs font-medium text-qualia-600 hover:text-qualia-700"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-qualia-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatActivityLabel(activity.action_type)}
                      </p>
                      {activity.project && (
                        <p className="text-xs text-muted-foreground">{activity.project.name}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for new clients */}
      {!isAdmin && dashboard.projectCount === 0 && dashboard.recentActivity.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-qualia-600/10">
              <Folder className="h-8 w-8 text-qualia-600/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Welcome to your portal</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Your projects and activity will appear here once your team gets started. In the
              meantime, feel free to submit requests or reach out to us.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
