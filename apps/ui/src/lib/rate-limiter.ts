/**
 * Rate Limiter Service
 * 
 * Implements sliding window rate limiting for event ingestion.
 * Uses Redis for distributed rate limiting across multiple instances.
 */

import { Redis } from "ioredis";

// Initialize Redis client
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if a token can ingest the specified number of events
 * Uses sliding window rate limiting
 */
export async function checkIngestRateLimit(
  tokenId: string,
  eventCount: number = 1
): Promise<RateLimitResult> {
  // Get configurable rate limit (default 300 events/min)
  const limit = parseInt(process.env.MAX_EVENTS_PER_MINUTE || "300", 10);
  const windowSeconds = 60; // 1 minute

  // If Redis is not available, use in-memory fallback
  if (!redis) {
    return checkIngestRateLimitInMemory(tokenId, eventCount, limit, windowSeconds);
  }

  const key = `rate_limit:ingest:${tokenId}`;
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);

  try {
    // Use Redis sorted set to track events in sliding window
    const multi = redis.multi();

    // Remove old entries outside the window
    multi.zremrangebyscore(key, 0, windowStart);

    // Count current entries in window
    multi.zcard(key);

    // Add new event(s) with current timestamp
    for (let i = 0; i < eventCount; i++) {
      multi.zadd(key, now + i, `${now}-${i}`);
    }

    // Set expiry on the key
    multi.expire(key, windowSeconds * 2);

    const results = await multi.exec();

    if (!results) {
      throw new Error("Redis multi exec failed");
    }

    // Get count before adding new events
    const currentCount = (results[1][1] as number) || 0;
    const newTotal = currentCount + eventCount;

    // Calculate remaining and reset time
    const remaining = Math.max(0, limit - newTotal);
    const resetAt = new Date(now + (windowSeconds * 1000));

    // If over limit, remove the events we just added
    if (newTotal > limit) {
      await redis.zremrangebyscore(key, now, now + eventCount);
      
      return {
        allowed: false,
        limit,
        remaining: Math.max(0, limit - currentCount),
        resetAt,
      };
    }

    return {
      allowed: true,
      limit,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error("Redis rate limiting error:", error);
    // Fail open - allow the request if Redis is down
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: new Date(now + (windowSeconds * 1000)),
    };
  }
}

/**
 * In-memory rate limiter fallback (for development/single instance)
 * WARNING: This resets when the process restarts
 */
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function checkIngestRateLimitInMemory(
  tokenId: string,
  eventCount: number,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const key = `ingest:${tokenId}`;
  const current = inMemoryStore.get(key);

  // Reset if window expired
  if (!current || current.resetAt < now) {
    const resetAt = now + (windowSeconds * 1000);
    inMemoryStore.set(key, {
      count: eventCount,
      resetAt,
    });

    return {
      allowed: true,
      limit,
      remaining: limit - eventCount,
      resetAt: new Date(resetAt),
    };
  }

  // Check limit
  const newTotal = current.count + eventCount;
  
  if (newTotal > limit) {
    return {
      allowed: false,
      limit,
      remaining: Math.max(0, limit - current.count),
      resetAt: new Date(current.resetAt),
    };
  }

  // Update count
  current.count = newTotal;

  return {
    allowed: true,
    limit,
    remaining: limit - newTotal,
    resetAt: new Date(current.resetAt),
  };
}

/**
 * Clean up old in-memory entries periodically
 */
if (!redis) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of inMemoryStore.entries()) {
      if (value.resetAt < now) {
        inMemoryStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}
