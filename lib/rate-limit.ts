/**
 * Distributed rate limiter backed by Upstash Redis.
 * Uses sliding-window algorithm. Env vars KV_REST_API_URL + KV_REST_API_TOKEN
 * are provisioned by the Vercel Marketplace Upstash integration.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Key prefix for this limiter (keeps different limiters isolated) */
  prefix?: string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Reset time as Unix ms timestamp */
  reset: number;
}

const redis = Redis.fromEnv();

function createRatelimit(options: RateLimitOptions): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, `${options.windowSeconds} s`),
    prefix: options.prefix ?? 'ratelimit',
    analytics: true,
  });
}

export async function rateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowSeconds: 60 }
): Promise<RateLimitResult> {
  const limiter = createRatelimit(options);
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}

export function createRateLimiter(options: RateLimitOptions) {
  const limiter = createRatelimit(options);
  return async (identifier: string): Promise<RateLimitResult> => {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return { success, limit, remaining, reset };
  };
}

export const chatRateLimiter = createRateLimiter({
  limit: 20,
  windowSeconds: 60,
  prefix: 'ratelimit:chat',
});
export const apiRateLimiter = createRateLimiter({
  limit: 100,
  windowSeconds: 60,
  prefix: 'ratelimit:api',
});
