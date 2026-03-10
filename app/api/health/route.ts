import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
 * Returns application health status for monitoring and CI/CD
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

  // Check database connectivity
  try {
    const supabase = await createClient();
    const dbStart = Date.now();

    // Simple query to verify connection
    const { error } = await supabase.from('profiles').select('id').limit(1);

    const latency = Date.now() - dbStart;

    if (error) {
      health.checks.database = {
        status: 'down',
        latency,
        error: error.message,
      };
      health.status = 'unhealthy';
    } else {
      health.checks.database = {
        status: 'up',
        latency,
      };
    }
  } catch (error) {
    health.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}
