/**
 * UptimeRobot adapter.
 *
 * Fetches the full monitor list once per process via `getMonitors`, caches it
 * in-memory for 60 seconds, and exposes a `matchMonitorForProject` helper that
 * resolves a monitor to a project by URL (primary) or friendly_name (fallback).
 *
 * Used server-side only — called from `getClientDashboardProjects` to enrich
 * each portal project with a `serverStatus` flag. The dashboard MUST keep
 * rendering even when the API is unreachable, so every public function returns
 * `null` on failure instead of throwing.
 *
 * Must only be imported from server contexts (server actions, route handlers,
 * RSC). It reads `process.env.UPTIMEROBOT_API_KEY`, which Next.js does not
 * expose to the browser.
 */

/* ----------------------------------------------------------------------------
 * UptimeRobot API types
 * ------------------------------------------------------------------------- */

interface UptimeRobotMonitor {
  id: number;
  friendly_name: string;
  url: string;
  /** 0=paused, 1=not checked yet, 2=up, 8=seems down, 9=down. */
  status: 0 | 1 | 2 | 8 | 9;
}

interface UptimeRobotResponse {
  stat: 'ok' | 'fail';
  monitors?: UptimeRobotMonitor[];
  error?: { type?: string; message?: string };
}

export type ServerStatus = 'online' | 'offline' | null;

/* ----------------------------------------------------------------------------
 * In-memory cache (module scope — persists across server-action calls within
 * a single Node process / serverless instance).
 * ------------------------------------------------------------------------- */

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  monitors: UptimeRobotMonitor[];
  fetchedAt: number;
};

let monitorCache: CacheEntry | null = null;
let inflight: Promise<UptimeRobotMonitor[] | null> | null = null;

/* ----------------------------------------------------------------------------
 * Fetch + cache
 * ------------------------------------------------------------------------- */

async function fetchMonitorsFromApi(apiKey: string): Promise<UptimeRobotMonitor[] | null> {
  try {
    const body = new URLSearchParams({ api_key: apiKey, format: 'json' });
    const res = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      // Disable Next.js fetch cache — we manage our own in-memory cache.
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[uptimerobot] getMonitors HTTP error', res.status, res.statusText);
      return null;
    }

    const json = (await res.json()) as UptimeRobotResponse;
    if (json.stat !== 'ok' || !Array.isArray(json.monitors)) {
      console.error('[uptimerobot] getMonitors API error', json.error ?? json);
      return null;
    }

    return json.monitors;
  } catch (err) {
    console.error('[uptimerobot] getMonitors fetch failed', err);
    return null;
  }
}

/**
 * Return all monitors, using the in-memory cache when fresh. Returns `null`
 * when the API key is missing or the API call fails — callers must treat that
 * as "no signal" and skip status pills, never crash.
 */
export async function getMonitors(): Promise<UptimeRobotMonitor[] | null> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) return null;

  const now = Date.now();
  if (monitorCache && now - monitorCache.fetchedAt < CACHE_TTL_MS) {
    return monitorCache.monitors;
  }

  if (inflight) return inflight;

  inflight = fetchMonitorsFromApi(apiKey).then((monitors) => {
    if (monitors) {
      monitorCache = { monitors, fetchedAt: Date.now() };
    }
    inflight = null;
    return monitors;
  });

  return inflight;
}

/* ----------------------------------------------------------------------------
 * Matching helpers
 * ------------------------------------------------------------------------- */

/**
 * Normalize a URL to a comparable host+path string:
 * - lowercased
 * - protocol stripped
 * - leading `www.` stripped
 * - trailing slash stripped
 */
export function normalizeUrl(input: string | null | undefined): string {
  if (!input) return '';
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.replace(/^www\./, '');
  value = value.replace(/\/+$/, '');
  return value;
}

function statusFromCode(code: UptimeRobotMonitor['status']): ServerStatus {
  if (code === 2) return 'online';
  if (code === 8 || code === 9) return 'offline';
  return null;
}

/**
 * Match a monitor to a project by URL (primary) or friendly_name substring
 * (fallback). Returns `'online'`, `'offline'`, or `null` when no monitor
 * matches or the matched monitor has no signal yet.
 *
 * Substring fallback requires both the project name and the monitor's
 * friendly_name to be at least 3 chars after trimming to avoid false matches
 * like "ai" colliding with every product.
 */
export function matchMonitorForProject(
  monitors: UptimeRobotMonitor[],
  options: { projectName: string; deploymentUrl: string | null | undefined }
): ServerStatus {
  const { projectName, deploymentUrl } = options;

  // Primary match: deployment URL → monitor URL.
  const normalizedDeployment = normalizeUrl(deploymentUrl);
  if (normalizedDeployment) {
    const urlMatch = monitors.find((m) => normalizeUrl(m.url) === normalizedDeployment);
    if (urlMatch) return statusFromCode(urlMatch.status);
  }

  // Fallback: lowercased substring compare between project name and
  // monitor.friendly_name. Both sides must be ≥3 chars to avoid false hits.
  const needle = projectName.trim().toLowerCase();
  if (needle.length >= 3) {
    const nameMatch = monitors.find((m) => {
      const haystack = m.friendly_name.trim().toLowerCase();
      if (haystack.length < 3) return false;
      return haystack.includes(needle) || needle.includes(haystack);
    });
    if (nameMatch) return statusFromCode(nameMatch.status);
  }

  return null;
}
