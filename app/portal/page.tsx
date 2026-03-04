import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientDashboardData, getPortalAdminData } from '@/app/actions/client-portal';
import { getUserRole } from '@/lib/portal-utils';
import { PortalAdminPanel } from '@/components/portal/portal-admin-panel';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Folder, Lightbulb, Receipt, Activity } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

  // Admin view: management panel
  if (isAdmin) {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, status, project_type')
      .not('status', 'eq', 'Canceled')
      .order('name');

    const adminResult = await getPortalAdminData();
    const adminData = adminResult.success
      ? (adminResult.data as {
          clients: Array<{
            id: string;
            full_name: string | null;
            email: string | null;
            role: string;
            created_at: string;
          }>;
          assignments: Array<{
            id: string;
            client_id: string;
            project_id: string;
            access_level: string | null;
            invited_at: string | null;
            invited_by: string | null;
            client: { id: string; full_name: string | null; email: string | null } | null;
            project: {
              id: string;
              name: string;
              status: string | null;
              project_type: string | null;
            } | null;
          }>;
        })
      : { clients: [], assignments: [] };

    return (
      <div className={`space-y-8 ${fadeInClasses}`}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portal Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage client access, invite clients, and share project credentials
          </p>
        </div>
        <PortalAdminPanel
          projects={allProjects || []}
          clients={adminData.clients}
          assignments={adminData.assignments}
        />
      </div>
    );
  }

  // Client dashboard
  const result = await getClientDashboardData(user.id);
  const dashboard = result.success
    ? (result.data as {
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
      href: '/portal/invoices',
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

  return (
    <div className={`space-y-8 ${fadeInClasses}`}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your projects and activity</p>
      </div>

      {/* Stats cards */}
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

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/portal/requests">
          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-5 w-5 text-qualia-600" />
                <div>
                  <p className="font-medium text-foreground">Submit a Request</p>
                  <p className="text-xs text-muted-foreground">Request a new feature or change</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/support">
          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-qualia-600" />
                <div>
                  <p className="font-medium text-foreground">Get Support</p>
                  <p className="text-xs text-muted-foreground">Contact us or browse FAQ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent activity */}
      {dashboard.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-qualia-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatActivityLabel(activity.action_type)}
                      </p>
                      {activity.project && (
                        <p className="text-xs text-muted-foreground">{activity.project.name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
