/**
 * Auth Rate Limiter
 * 
 * Simple in-memory rate limiter for authentication endpoints.
 * Protects against brute force attacks and abuse.
 * 
 * For production with multiple instances, consider using Redis-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class AuthRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   */
  check(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number; retryAfter: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No previous entry or expired - allow and create new entry
    if (!entry || entry.resetAt < now) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
        retryAfter: 0,
      };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    // Under limit - allow
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
      retryAfter: 0,
    };
  }

  /**
   * Reset rate limit for an identifier (e.g., after successful operation)
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Remove expired entries from memory
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
const authRateLimiter = new AuthRateLimiter();

// Preset configurations for different auth operations
export const AuthRateLimitPresets = {
  // Login attempts
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  
  // Registration
  register: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 registrations per hour
  
  // Email verification resend
  emailResend: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 resends per hour
  
  // Password reset request
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
};

/**
 * Get client identifier from request (IP address + optional email)
 */
export function getClientIdentifier(request: Request, email?: string): string {
  // Try X-Forwarded-For (behind proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  let ip = 'unknown';
  
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else {
    // Try X-Real-IP
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      ip = realIp;
    }
  }

  // Combine IP with email for more granular limiting
  return email ? `${ip}:${email}` : ip;
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  remaining: number,
  resetAt: number,
  retryAfter: number
): Record<string, string> {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetAt).toISOString(),
    'Retry-After': retryAfter.toString(),
  };
}

/**
 * Check rate limit and return result
 */
export function checkAuthRateLimit(
  request: Request,
  preset: keyof typeof AuthRateLimitPresets,
  email?: string
): { allowed: boolean; remaining: number; resetAt: number; retryAfter: number } {
  const identifier = getClientIdentifier(request, email);
  const config = AuthRateLimitPresets[preset];
  return authRateLimiter.check(identifier, config.maxRequests, config.windowMs);
}

/**
 * Reset rate limit for successful operation
 */
export function resetAuthRateLimit(request: Request, email?: string): void {
  const identifier = getClientIdentifier(request, email);
  authRateLimiter.reset(identifier);
}

export default authRateLimiter;
