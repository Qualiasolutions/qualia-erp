const UPTIMEROBOT_API_URL = 'https://api.uptimerobot.com/v2';

export type MonitorStatus = 0 | 1 | 2 | 8 | 9;
// 0 = paused, 1 = not checked yet, 2 = up, 8 = seems down, 9 = down

export type Monitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: MonitorStatus;
  create_datetime: number;
  all_time_uptime_ratio: string;
  custom_uptime_ratio: string; // "7-30-90" day ratios
  average_response_time: string;
  logs?: MonitorLog[];
};

export type MonitorLog = {
  type: number; // 1=down, 2=up, 98=started, 99=paused
  datetime: number;
  duration: number;
  reason?: { code: string; detail: string };
};

export type UptimeResponse = {
  stat: 'ok' | 'fail';
  monitors: Monitor[];
  pagination: { offset: number; limit: number; total: number };
};

function getApiKey(): string {
  const key = process.env.UPTIMEROBOT_API_KEY;
  if (!key) throw new Error('UPTIMEROBOT_API_KEY not configured');
  return key;
}

export async function getMonitors(): Promise<Monitor[]> {
  const res = await fetch(`${UPTIMEROBOT_API_URL}/getMonitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: getApiKey(),
      format: 'json',
      all_time_uptime_ratio: '1',
      custom_uptime_ratios: '7-30-90',
      response_times: '1',
      response_times_average: '1',
      logs: '1',
      logs_limit: '10',
    }),
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`UptimeRobot API error: ${res.status}`);

  const data: UptimeResponse = await res.json();
  if (data.stat !== 'ok') throw new Error('UptimeRobot API returned error');

  return data.monitors.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
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
