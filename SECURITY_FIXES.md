# Security Fixes — HIGH Priority Vulnerabilities

## Overview

This document outlines the security vulnerabilities identified and fixed in the COGUMI AI Protect codebase.

## 1. SSRF via agentTestUrl [HIGH] ✅ FIXED

### Vulnerability Description

Any authenticated user could set `agentTestUrl` to arbitrary URLs, allowing Server-Side Request Forgery (SSRF) attacks to:
- Access cloud metadata endpoints (AWS: 169.254.169.254, GCP: metadata.google.internal, Azure: metadata.azure.com)
- Target internal services on private networks (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Port scan internal infrastructure
- Exfiltrate data via non-HTTP protocols (file://, ftp://, dns://)

### Attack Scenarios

1. **Cloud Credential Theft**: User sets agentTestUrl to `http://169.254.169.254/latest/meta-data/iam/security-credentials/` to steal AWS credentials
2. **Internal Service Access**: User targets internal APIs at `http://192.168.1.100:8080/admin` to access internal-only endpoints
3. **Data Exfiltration**: User uses `file:///etc/passwd` or `ftp://attacker.com/` protocols

### Fix Implementation

Created comprehensive SSRF protection module: `packages/shared/src/url-security.ts`

#### Validation Rules

The `validateAgentUrl()` function blocks:

**Private IP Ranges (IPv4):**
- 10.0.0.0/8 (RFC1918)
- 172.16.0.0/12 (RFC1918)
- 192.168.0.0/16 (RFC1918)
- 127.0.0.0/8 (loopback)
- 169.254.0.0/16 (link-local)
- 0.0.0.0, 255.255.255.255

**Private IP Ranges (IPv6):**
- ::1 (loopback)
- fc00::/7 (unique local)
- fd00::/8 (unique local)
- fe80::/10 (link-local)
- ff00::/8 (multicast)

**Cloud Metadata Endpoints:**
- 169.254.169.254 (AWS, Azure, GCP, DigitalOcean)
- metadata.google.internal (GCP)
- metadata.azure.com (Azure)

**Protocol Restrictions:**
- Only `http:` and `https:` allowed
- Blocks: `file://`, `ftp://`, `data://`, `dns://`, etc.

**Environment-Aware Behavior:**
- **Development**: Allows localhost (127.0.0.1, ::1) for testing
- **Production**: Blocks localhost unless `ALLOW_LOCALHOST_AGENT=true`
- **Production**: Requires HTTPS unless `REQUIRE_HTTPS_AGENT=false`

#### Files Fixed

1. **packages/shared/src/url-security.ts** (NEW)
   - `validateAgentUrl()`: Main validation function
   - `isPrivateIP()`: IPv4/IPv6 private range detection
   - `getUrlValidationOptions()`: Environment-aware config

2. **apps/ui/src/app/api/projects/[projectId]/validate-agent/route.ts**
   - Added validation before fetch to agent endpoint
   - Returns 400 with security error if URL fails validation

3. **packages/scripts/src/executor.ts**
   - Added validation before sending prompts to agent
   - Throws error if agent URL is invalid

4. **apps/worker/src/index.ts**
   - Added validation before executing run scripts
   - Marks run as failed if agent URL is invalid

#### Usage

```typescript
import { validateAgentUrl } from '@cogumi/shared';

const result = validateAgentUrl('http://10.0.0.1/api');
if (!result.valid) {
  console.error(result.error);
  // "Private IP addresses are not allowed"
  console.log(result.securityNote);
  // "This prevents SSRF attacks against internal services..."
}
```

#### Testing

**Blocked URLs (should fail validation):**
```
http://169.254.169.254/latest/meta-data/
http://10.0.0.1/admin
http://192.168.1.100:8080/api
http://metadata.google.internal/
file:///etc/passwd
ftp://attacker.com/exfil
```

**Allowed URLs (should pass):**
```
https://api.example.com/agent
http://public-ip-address.com/webhook
http://localhost:3000/test (development only)
https://my-agent.app.com/chat
```

---

## 2. Unauthenticated Cron Endpoints [HIGH] ✅ FIXED

### Vulnerability Description

Two cleanup endpoints were accessible without proper authentication:
- `/api/cron/cleanup` - Only checked secret IF it was set (allowed unauthenticated access when CRON_SECRET not configured)
- `/api/cron/retention-cleanup` - Had default secret `'dev-secret-change-in-prod'` that was easily guessable

### Attack Scenarios

1. **Data Deletion**: Attacker calls cleanup endpoints to delete old runs/events prematurely
2. **DoS via Resource Exhaustion**: Repeatedly trigger expensive cleanup operations
3. **Default Secret Exploitation**: Use `'dev-secret-change-in-prod'` in production if not changed

### Fix Implementation

#### Changes

**Before:**
```typescript
// VULNERABLE: Optional auth
const expectedSecret = process.env.CRON_SECRET;
if (expectedSecret && cronSecret !== expectedSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// VULNERABLE: Default secret
const expectedSecret = process.env.CRON_SECRET || 'dev-secret-change-in-prod';
if (cronSecret !== expectedSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**After:**
```typescript
// SECURE: Always require secret
const cronSecret = request.headers.get('x-cron-secret');
const expectedSecret = process.env.CRON_SECRET;

if (!expectedSecret) {
  console.error('[Cron] CRON_SECRET environment variable not configured');
  return NextResponse.json(
    { error: 'Server misconfiguration: CRON_SECRET not set' },
    { status: 500 }
  );
}

if (!cronSecret || cronSecret !== expectedSecret) {
  console.warn('[Cron] Unauthorized cleanup attempt');
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### Files Fixed

1. **apps/ui/src/app/api/cron/cleanup/route.ts**
   - Removed optional check (now always requires CRON_SECRET)
   - Returns 500 if CRON_SECRET not configured
   - Logs unauthorized attempts

2. **apps/ui/src/app/api/cron/retention-cleanup/route.ts**
   - Removed default secret fallback
   - Returns 500 if CRON_SECRET not configured
   - Logs unauthorized attempts

#### Setup Instructions

**Required Environment Variable:**
```bash
# Generate a strong random secret
CRON_SECRET=$(openssl rand -hex 32)

# Or use:
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

**Calling the Endpoint:**
```bash
curl -X POST http://localhost:3001/api/cron/cleanup \
  -H "X-Cron-Secret: your-secret-here"
```

**Cron Job Configuration (GitHub Actions example):**
```yaml
name: Daily Cleanup
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/cleanup \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}"
```

---

## Additional Security Recommendations

### 1. IP Allowlisting (Optional Enhancement)

For additional security, restrict cron endpoints to specific IP addresses:

```typescript
const allowedIPs = process.env.CRON_ALLOWED_IPS?.split(',') || [];
const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip');

if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
  return NextResponse.json({ error: 'IP not allowed' }, { status: 403 });
}
```

### 2. Rate Limiting

Implement rate limiting on cron endpoints to prevent abuse:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 calls per hour
});

const { success } = await ratelimit.limit(`cron:${clientIP}`);
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

### 3. Signed JWTs (Alternative to Secret Header)

Use signed JWTs for more sophisticated authentication:

```typescript
import { verify } from 'jsonwebtoken';

const token = request.headers.get('authorization')?.replace('Bearer ', '');
try {
  const payload = verify(token, process.env.CRON_JWT_SECRET);
  // Validate payload...
} catch {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `CRON_SECRET` environment variable (use `openssl rand -hex 32`)
- [ ] Remove `ALLOW_LOCALHOST_AGENT=true` (only for development)
- [ ] Ensure `REQUIRE_HTTPS_AGENT` is not set to `false` (defaults to true in production)
- [ ] Configure cron job with proper `X-Cron-Secret` header
- [ ] Test SSRF protection:
  - Attempt to set agentTestUrl to `http://169.254.169.254/` (should fail)
  - Attempt to set agentTestUrl to `http://10.0.0.1/` (should fail)
  - Verify legitimate agent URLs work
- [ ] Test cron authentication:
  - Call `/api/cron/cleanup` without header (should return 401)
  - Call with wrong secret (should return 401)
  - Call with correct secret (should succeed)
- [ ] Monitor logs for unauthorized access attempts

---

## Security Contact

If you discover additional security vulnerabilities, please report them immediately to the security team.

**Do not:**
- Open public GitHub issues for security vulnerabilities
- Share exploits publicly before they are fixed

**Do:**
- Email security findings to security@cogumi.ai
- Provide detailed reproduction steps
- Allow time for fixes before public disclosure
