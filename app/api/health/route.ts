import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    environment: {
      status: 'ok' | 'missing';
      missing?: string[];
    };
  };
}

/**
 * Health Check Endpoint
 * Uses direct REST call to Supabase (no cookie-based auth needed).
 * Safe for cron uptime checks and external monitoring.
 */
export async function GET() {
  const startTime = Date.now();

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    checks: {
      database: { status: 'up' },
      environment: { status: 'ok' },
    },
  };

  // Check required environment variables
  const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    health.checks.environment = {
      status: 'missing',
      missing: missingEnvVars,
    };
    health.status = 'degraded';
  }

  // Check database connectivity via direct REST (no cookies needed)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      health.checks.database = { status: 'down', error: 'Missing Supabase config' };
      health.status = 'unhealthy';
    } else {
      const dbStart = Date.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - dbStart;

      if (res.ok) {
        health.checks.database = { status: 'up', latency };
      } else {
        health.checks.database = { status: 'down', latency, error: `HTTP ${res.status}` };
        health.status = 'unhealthy';
      }
    }
  } catch (error) {
    health.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}
