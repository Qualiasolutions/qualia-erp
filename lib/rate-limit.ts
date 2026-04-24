/**
 * Distributed rate limiter backed by Upstash Redis.
 * Uses sliding-window algorithm. Env vars UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN (provisioned by the Vercel Marketplace Upstash
 * Redis integration, or set manually per environment).
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

const hasRedisEnv = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasRedisEnv ? Redis.fromEnv() : null;

function createRatelimit(options: RateLimitOptions): Ratelimit {
  if (!redis) {
    throw new Error('Upstash Redis rate limit env vars are not configured');
  }

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
  if (!redis) {
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit,
      reset: Date.now() + options.windowSeconds * 1000,
    };
  }

  const limiter = createRatelimit(options);
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}

export function createRateLimiter(options: RateLimitOptions) {
  const limiter = redis ? createRatelimit(options) : null;
  return async (identifier: string): Promise<RateLimitResult> => {
    if (!limiter) {
      return {
        success: true,
        limit: options.limit,
        remaining: options.limit,
        reset: Date.now() + options.windowSeconds * 1000,
      };
    }

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
// BH-C1/C2: Rate limiter for AI-adjacent endpoints (embeddings, TTS)
export const aiRateLimiter = createRateLimiter({
  limit: 20,
  windowSeconds: 60,
  prefix: 'ratelimit:ai',
});
export const ttsRateLimiter = createRateLimiter({
  limit: 10,
  windowSeconds: 60,
  prefix: 'ratelimit:tts',
});
