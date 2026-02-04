/**
 * Simple rate limiter for demo agent
 * Prevents abuse by limiting requests per IP
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

const REQUESTS_PER_MINUTE = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '20', 10);
const REQUESTS_PER_HOUR = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '100', 10);
const WINDOW_MINUTE = 60 * 1000; // 1 minute
const WINDOW_HOUR = 60 * 60 * 1000; // 1 hour

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.resetTime < now) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export function checkRateLimit(identifier: string, window: 'minute' | 'hour' = 'minute'): RateLimitResult {
  const now = Date.now();
  const limit = window === 'minute' ? REQUESTS_PER_MINUTE : REQUESTS_PER_HOUR;
  const windowMs = window === 'minute' ? WINDOW_MINUTE : WINDOW_HOUR;
  const key = `${identifier}:${window}`;

  let entry = rateLimits.get(key);

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimits.set(key, entry);
  }

  // Check limit
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment and allow
  entry.count++;

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}
