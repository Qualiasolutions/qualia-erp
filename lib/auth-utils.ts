import crypto from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks on API key validation.
 * Returns false if either value is null/undefined or lengths differ.
 */
export function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
