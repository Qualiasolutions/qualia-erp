const UPTIMEROBOT_API_URL = 'https://api.uptimerobot.com/v2';
const BETTERSTACK_API_URL = 'https://uptime.betterstack.com/api/v2';
const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2';

export type MonitorStatus = 0 | 1 | 2 | 8 | 9;
// 0 = paused, 1 = not checked yet, 2 = up, 8 = seems down, 9 = down

export type MonitorSource = 'uptimerobot' | 'betterstack' | 'railway';

export type Monitor = {
  id: number | string;
  friendly_name: string;
  url: string;
  status: MonitorStatus;
  source: MonitorSource;
  create_datetime: number;
  all_time_uptime_ratio: string;
  custom_uptime_ratio: string;
  average_response_time: string;
  logs?: MonitorLog[];
};

export type MonitorLog = {
  type: number; // 1=down, 2=up, 98=started, 99=paused
  datetime: number;
  duration: number;
  reason?: { code: string; detail: string };
};

type UptimeResponse = {
  stat: 'ok' | 'fail';
  monitors: Array<Omit<Monitor, 'source'>>;
  pagination: { offset: number; limit: number; total: number };
};

// ─── UptimeRobot ────────────────────────────────────────────────────────────

async function getUptimeRobotMonitors(): Promise<Monitor[]> {
  const key = process.env.UPTIMEROBOT_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(`${UPTIMEROBOT_API_URL}/getMonitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        format: 'json',
        all_time_uptime_ratio: '1',
        custom_uptime_ratios: '7-30-90',
        response_times: '1',
        response_times_average: '1',
        logs: '1',
        logs_limit: '10',
      }),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data: UptimeResponse = await res.json();
    if (data.stat !== 'ok') return [];

    return data.monitors.map((m) => ({ ...m, source: 'uptimerobot' as const }));
  } catch {
    return [];
  }
}

// ─── Better Stack ───────────────────────────────────────────────────────────

async function getBetterStackMonitors(): Promise<Monitor[]> {
  const key = process.env.BETTERSTACK_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(`${BETTERSTACK_API_URL}/monitors`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((m: { id: string; attributes: Record<string, unknown> }) => ({
      id: m.id,
      friendly_name: (m.attributes.pronounceable_name as string) || '',
      url: (m.attributes.url as string) || '',
      status: mapBetterStackStatus(m.attributes.status as string),
      source: 'betterstack' as const,
      create_datetime: Math.floor(
        new Date((m.attributes.created_at as string) || '').getTime() / 1000
      ),
      all_time_uptime_ratio: '0',
      custom_uptime_ratio: '',
      average_response_time: '0',
    }));
  } catch {
    return [];
  }
}

function mapBetterStackStatus(status: string): MonitorStatus {
  switch (status) {
    case 'up':
      return 2;
    case 'down':
      return 9;
    case 'paused':
      return 0;
    case 'pending':
      return 1;
    case 'maintenance':
      return 0;
    default:
      return 8; // degraded/validating
  }
}

// ─── Railway ────────────────────────────────────────────────────────────────

type RailwayService = {
  projectName: string;
  serviceName: string;
  domain: string | null;
  status: string;
};

async function getRailwayMonitors(): Promise<Monitor[]> {
  const key = process.env.RAILWAY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        query: `query {
          projects {
            edges {
              node {
                id name
                services {
                  edges {
                    node {
                      id name
                      serviceInstances {
                        edges {
                          node {
                            domains { serviceDomains { domain } }
                            latestDeployment { status }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      }),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();

    const services: RailwayService[] = [];
    for (const projEdge of data.data?.projects?.edges || []) {
      const proj = projEdge.node;
      for (const svcEdge of proj.services?.edges || []) {
        const svc = svcEdge.node;
        const inst = svc.serviceInstances?.edges?.[0]?.node;
        const domain = inst?.domains?.serviceDomains?.[0]?.domain || null;
        const status = inst?.latestDeployment?.status || 'UNKNOWN';
        services.push({
          projectName: proj.name,
          serviceName: svc.name,
          domain,
          status,
        });
      }
    }

    return services.map((svc, i) => ({
      id: `railway-${i}`,
      friendly_name: svc.serviceName,
      url: svc.domain ? `https://${svc.domain}` : '',
      status: mapRailwayStatus(svc.status),
      source: 'railway' as const,
      create_datetime: 0,
      all_time_uptime_ratio: '0',
      custom_uptime_ratio: '',
      average_response_time: '0',
    }));
  } catch {
    return [];
  }
}

function mapRailwayStatus(status: string): MonitorStatus {
  switch (status) {
    case 'SUCCESS':
      return 2;
    case 'FAILED':
    case 'CRASHED':
      return 9;
    case 'DEPLOYING':
    case 'BUILDING':
    case 'INITIALIZING':
      return 1;
    case 'REMOVED':
    case 'SLEEPING':
      return 0;
    default:
      return 8;
  }
}

// ─── Combined ───────────────────────────────────────────────────────────────

export async function getMonitors(): Promise<Monitor[]> {
  const [uptimeRobot, betterStack, railway] = await Promise.all([
    getUptimeRobotMonitors(),
    getBetterStackMonitors(),
    getRailwayMonitors(),
  ]);

  return [...uptimeRobot, ...betterStack, ...railway].sort((a, b) =>
    a.friendly_name.localeCompare(b.friendly_name)
  );
}

export function getStatusLabel(status: MonitorStatus): string {
  switch (status) {
    case 0:
      return 'Paused';
    case 1:
      return 'Pending';
    case 2:
      return 'Operational';
    case 8:
      return 'Degraded';
    case 9:
      return 'Down';
    default:
      return 'Unknown';
  }
}

export function getOverallStatus(monitors: Monitor[]): {
  label: string;
  allUp: boolean;
  downCount: number;
  degradedCount: number;
} {
  const downCount = monitors.filter((m) => m.status === 9).length;
  const degradedCount = monitors.filter((m) => m.status === 8).length;
  const allUp = downCount === 0 && degradedCount === 0;

  let label = 'All Systems Operational';
  if (downCount > 0) label = `${downCount} system${downCount > 1 ? 's' : ''} down`;
  else if (degradedCount > 0)
    label = `${degradedCount} system${degradedCount > 1 ? 's' : ''} degraded`;

  return { label, allUp, downCount, degradedCount };
}
