import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
import { getMonitors, getOverallStatus, type Monitor } from '@/lib/uptime';
import { StatusDashboard, type ProjectInfo } from '@/components/status/status-dashboard';

export const metadata = { title: 'System Status' };

// Monitor names to hide from the status page
const HIDDEN_MONITORS = ['faris', 'melon', 'qualia-erp', 'qualia erp'];

function matchMonitorToProject(
  monitor: Monitor,
  projects: Array<{
    name: string;
    logo_url: string | null;
    vercelUrl: string | null;
    githubUrl: string | null;
  }>
): ProjectInfo | undefined {
  if (!monitor.url) return undefined;
  const monitorHost = (() => {
    try {
      return new URL(monitor.url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  if (!monitorHost) return undefined;

  for (const p of projects) {
    if (!p.vercelUrl) continue;
    try {
      const projectHost = new URL(
        p.vercelUrl.startsWith('http') ? p.vercelUrl : `https://${p.vercelUrl}`
      ).hostname.toLowerCase();
      if (
        monitorHost === projectHost ||
        monitorHost.includes(projectHost.replace(/\.vercel\.app$/, ''))
      ) {
        return {
          name: p.name,
          logoUrl: p.logo_url,
          vercelUrl: p.vercelUrl,
          githubUrl: p.githubUrl,
        };
      }
    } catch {
      // skip
    }
  }

  // Fallback: match by monitor friendly_name containing project name
  const monitorNameLower = monitor.friendly_name.toLowerCase();
  for (const p of projects) {
    const projNameLower = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const monitorClean = monitorNameLower.replace(/[^a-z0-9]/g, '');
    if (projNameLower.length > 3 && monitorClean.includes(projNameLower)) {
      return {
        name: p.name,
        logoUrl: p.logo_url,
        vercelUrl: p.vercelUrl,
        githubUrl: p.githubUrl,
      };
    }
  }

  return undefined;
}

function shouldHideMonitor(monitor: Monitor): boolean {
  const name = monitor.friendly_name.toLowerCase();
  const url = monitor.url?.toLowerCase() || '';
  return HIDDEN_MONITORS.some((hidden) => name.includes(hidden) || url.includes(hidden));
}

export default async function PortalStatusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const role = await getUserRole(user.id);
  // Only admin, manager, employee can access status
  if (role === 'client') redirect('/');

  let monitors: Monitor[] = [];
  let error: string | null = null;

  try {
    monitors = await getMonitors();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch status';
  }

  // Filter out hidden monitors. Both admins and employees see every remaining
  // monitor — we used to scope employees to their assigned projects, but the
  // whole-team visibility is more useful when someone needs to help debug
  // another project on short notice.
  monitors = monitors.filter((m) => !shouldHideMonitor(m));

  // Fetch all projects with integrations for mapping
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, logo_url, project_integrations(service_type, external_url)')
    .not('status', 'in', '("Archived","Canceled")');

  const projectData = (projects || []).map((p) => {
    const integrations = Array.isArray(p.project_integrations) ? p.project_integrations : [];
    const vercel = integrations.find((i: { service_type: string }) => i.service_type === 'vercel');
    const github = integrations.find((i: { service_type: string }) => i.service_type === 'github');
    return {
      name: p.name,
      logo_url: p.logo_url,
      vercelUrl: (vercel as { external_url?: string } | undefined)?.external_url || null,
      githubUrl: (github as { external_url?: string } | undefined)?.external_url || null,
    };
  });

  // Build monitor -> project mapping
  const projectMap: Record<string, ProjectInfo> = {};
  for (const m of monitors) {
    const project = matchMonitorToProject(m, projectData);
    if (project) {
      projectMap[String(m.id)] = project;
    }
  }

  const overall = getOverallStatus(monitors);

  return (
    <StatusDashboard monitors={monitors} overall={overall} error={error} projectMap={projectMap} />
  );
}
