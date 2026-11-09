import { createHash } from 'node:crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Seconds until the window frees a slot (for Retry-After). */
  readonly retryAfterSeconds: number;
}

export type RateLimiter = (key: string) => Promise<RateLimitResult>;

/** Raw IPs are never stored: the key is a salted SHA-256 of the address. */
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export interface UpstashConfig {
  readonly url: string;
  readonly token: string;
  readonly limit: number;
  /** Window in Upstash duration syntax, e.g. "1 h". */
  readonly window: `${number} ${'s' | 'm' | 'h'}`;
}

export function createUpstashLimiter(config: UpstashConfig): RateLimiter {
  const ratelimit = new Ratelimit({
    redis: new Redis({ url: config.url, token: config.token }),
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: 'portfolio:contact',
    analytics: false,
  });
  return async (key) => {
    const result = await ratelimit.limit(key);
    return {
      allowed: result.success,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  };
}
