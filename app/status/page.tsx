import { getMonitors, getOverallStatus, type Monitor } from '@/lib/uptime';
import { StatusDashboard } from '@/components/status/status-dashboard';

export const metadata = {
  title: 'System Status',
};

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  let monitors: Monitor[] = [];
  let error: string | null = null;

  try {
    monitors = await getMonitors();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch status';
  }

  const overall = getOverallStatus(monitors);

  return <StatusDashboard monitors={monitors} overall={overall} error={error} />;
}
