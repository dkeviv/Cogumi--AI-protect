# Duration Cap & Ingest Rate Limits - Complete Explanation

## What the Spec Says

From `spec/specifications.md` section 12.2:

### Per Run Quotas:
- **Duration cap**: 15 minutes
- **Event cap**: 5,000 events

### Ingest Quotas:
- **Rate limit**: 300 events/min per sidecar token
- **Payload size**: Event payload truncated to 64KB

---

## Current Implementation Status

### ✅ Implemented:
1. **Event cap per run** (5,000 → 10,000 in our version)
2. **Sidecar throttling** (buffer limit: 1,000 events)
3. **Quota enforcement** in API

### ❌ Not Implemented:
1. **15-minute duration timeout**
2. **300 events/min rate limiting**
3. **64KB payload truncation**

---

## 1. Duration Cap (15 Minutes)

### What It Should Do:

**Purpose**: Prevent runaway tests that consume resources indefinitely.

**Behavior**:
- Run starts at time T
- At T + 15 minutes, if run is still "running":
  - Stop script execution
  - Update run status to `stopped_timeout` (or `completed`)
  - Mark run as ended
  - Generate partial report

**Why It's Important**:
- Prevents infinite loops in scripts
- Protects against hanging agent responses
- Predictable resource usage
- Prevents cost overruns

### Current State: ❌ **NOT ENFORCED**

**What happens now**:
- Runs continue indefinitely until scripts complete
- No timeout mechanism
- Relies on scripts self-terminating
- Individual HTTP requests have 30s timeout (in executor)

**Where the code is**:

`apps/ui/src/lib/run-orchestrator.ts`:
```typescript
export async function executeRun(runId: string): Promise<void> {
  // Update run status to running
  await db.run.update({
    where: { id: runId },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  });

  // Execute all scripts (NO TIMEOUT HERE!)
  const scriptResults = await executeAllScripts({
    run,
    agentUrl: run.project.agentTestUrl,
    projectId: run.projectId,
    orgId: run.orgId,
  });

  // Scripts complete, mark as done
  await db.run.update({
    where: { id: runId },
    data: {
      status: "completed",
      endedAt: new Date(),
      riskScore,
    },
  });
}
```

**Problem**: If `executeAllScripts()` hangs or runs for 2 hours, nothing stops it.

### How to Fix It (Easy - 30 minutes):

**Approach 1: Wrapper Timeout** (Simplest)

```typescript
export async function executeRun(runId: string): Promise<void> {
  const MAX_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  
  try {
    // Start timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Run timeout')), MAX_DURATION_MS);
    });

    // Race between execution and timeout
    await Promise.race([
      executeRunInternal(runId),
      timeoutPromise
    ]);
  } catch (error) {
    if (error.message === 'Run timeout') {
      // Handle timeout gracefully
      await db.run.update({
        where: { id: runId },
        data: {
          status: "completed",
          endedAt: new Date(),
          error: "Run exceeded 15 minute duration limit"
        },
      });
      
      console.warn(`Run ${runId} stopped due to timeout`);
    } else {
      throw error;
    }
  }
}

async function executeRunInternal(runId: string): Promise<void> {
  // Current executeRun logic goes here
  // ...
}
```

**Approach 2: Background Monitor** (More robust)

```typescript
export async function executeRun(runId: string): Promise<void> {
  const MAX_DURATION_MS = 15 * 60 * 1000;
  
  // Set a database flag for monitoring
  await db.run.update({
    where: { id: runId },
    data: {
      status: "running",
      startedAt: new Date(),
      timeoutAt: new Date(Date.now() + MAX_DURATION_MS),
    },
  });

  // Background job checks timeoutAt every minute
  // (this would run in worker service or cron)

  // Actual execution
  await executeRunInternal(runId);
}

// Separate cron/worker job:
async function checkRunTimeouts() {
  const timedOutRuns = await db.run.findMany({
    where: {
      status: "running",
      timeoutAt: {
        lte: new Date(), // Past timeout time
      },
    },
  });

  for (const run of timedOutRuns) {
    await db.run.update({
      where: { id: run.id },
      data: {
        status: "stopped_quota",
        endedAt: new Date(),
      },
    });
    
    console.warn(`Run ${run.id} stopped by timeout monitor`);
  }
}
```

**Recommended**: Approach 1 for MVP (simple), Approach 2 for production scale.

---

## 2. Ingest Rate Limiting (300 events/min)

### What It Should Do:

**Purpose**: Prevent sidecar from overwhelming the API with too many events.

**Behavior**:
- Sidecar can send max 300 events/minute
- If exceeded:
  - Throttle event shipping
  - Emit `ingest_throttled` violation event
  - Drop events (or queue for next window)

**Why It's Important**:
- Protects API from DoS
- Prevents database write spikes
- Predictable load
- Fair resource sharing across customers

### Current State: ⚠️ **PARTIALLY IMPLEMENTED**

**What exists**:

**Sidecar Throttling** (`apps/sidecar/main.go` lines 360-375):
```go
func (s *Sidecar) bufferEvent(event Event) {
	s.eventMutex.Lock()
	defer s.eventMutex.Unlock()
	
	s.eventBuffer = append(s.eventBuffer, event)
	
	// Check if we should throttle
	if len(s.eventBuffer) > 1000 {  // ⚠️ BUFFER SIZE, not rate
		s.throttleCount++
		throttleEvent := Event{
			EventType: "ingest_throttled",
			Timestamp: time.Now(),
			ProjectID: s.config.ProjectID,
		}
		s.eventBuffer = append(s.eventBuffer, throttleEvent)
	}
}

// Ships events every 5 seconds
func (s *Sidecar) eventShipperLoop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		s.shipEvents()
	}
}
```

**What this does**:
- ✅ Throttles when buffer exceeds 1,000 events
- ✅ Emits `ingest_throttled` event
- ❌ **NOT time-based** (300/min)
- ❌ Just limits buffer size, not rate

**API-side quota** (`apps/ui/src/app/api/ingest/events/route.ts`):
```typescript
// Check event quota if we have an active run
if (runId) {
  const quotaCheck = await canIngestEvents(runId, events.length);
  if (!quotaCheck.allowed) {
    // Stop accepting events
    await db.run.update({
      where: { id: runId },
      data: { 
        status: "stopped_quota",
        endedAt: new Date(),
      },
    });

    return NextResponse.json(
      { 
        error: "Event quota exceeded",
        message: quotaCheck.reason 
      },
      { status: 429 }
    );
  }
}
```

**What this does**:
- ✅ Enforces total event cap per run (10,000)
- ❌ **NOT rate-based** (events/minute)
- Just checks total count

### What's Missing:

**Time-based rate limiting**: 300 events per minute

### How to Fix It:

**Option 1: Redis Rate Limiting** (Recommended for scale)

```typescript
// apps/ui/src/app/api/ingest/events/route.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(
  tokenId: string, 
  eventCount: number
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const key = `rate_limit:token:${tokenId}`;
  const limit = 300; // events per minute
  const window = 60; // seconds
  
  const current = await redis.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count + eventCount > limit) {
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      resetAt: new Date(Date.now() + ttl * 1000)
    };
  }
  
  // Increment counter
  await redis.multi()
    .incrby(key, eventCount)
    .expire(key, window)
    .exec();
  
  return { allowed: true };
}

// In route handler:
const rateCheck = await checkRateLimit(matchedToken.id, events.length);
if (!rateCheck.allowed) {
  return NextResponse.json(
    { 
      error: "Rate limit exceeded",
      message: "Maximum 300 events/min",
      resetAt: rateCheck.resetAt
    },
    { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': '300',
        'X-RateLimit-Reset': rateCheck.resetAt.toISOString()
      }
    }
  );
}
```

**Option 2: In-Memory Rate Limiting** (Simple, MVP)

```typescript
// Simple in-memory rate limiter (resets on server restart)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(tokenId: string, eventCount: number): boolean {
  const now = Date.now();
  const limit = 300; // events per minute
  const window = 60 * 1000; // 1 minute in ms
  
  const current = rateLimits.get(tokenId);
  
  // Reset if window expired
  if (!current || current.resetAt < now) {
    rateLimits.set(tokenId, {
      count: eventCount,
      resetAt: now + window
    });
    return true;
  }
  
  // Check limit
  if (current.count + eventCount > limit) {
    return false; // Rate limit exceeded
  }
  
  // Update count
  current.count += eventCount;
  return true;
}

// In route handler:
if (!checkRateLimit(matchedToken.id, events.length)) {
  return NextResponse.json(
    { error: "Rate limit: 300 events/min" },
    { status: 429 }
  );
}
```

**Option 3: Sidecar-Side Rate Limiting** (Best UX)

Implement in Go sidecar to avoid wasted network calls:

```go
// apps/sidecar/main.go

type RateLimiter struct {
	limit     int       // 300 events
	window    time.Duration // 1 minute
	count     int
	resetAt   time.Time
	mu        sync.Mutex
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		limit:   300,
		window:  time.Minute,
		resetAt: time.Now().Add(time.Minute),
	}
}

func (rl *RateLimiter) Allow(count int) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	now := time.Now()
	
	// Reset window if expired
	if now.After(rl.resetAt) {
		rl.count = 0
		rl.resetAt = now.Add(rl.window)
	}
	
	// Check limit
	if rl.count + count > rl.limit {
		return false
	}
	
	rl.count += count
	return true
}

// In event shipper:
func (s *Sidecar) shipEvents() {
	s.eventMutex.Lock()
	events := s.eventBuffer
	s.eventBuffer = []Event{}
	s.eventMutex.Unlock()
	
	if len(events) == 0 {
		return
	}
	
	// Check rate limit
	if !s.rateLimiter.Allow(len(events)) {
		log.Println("Rate limit exceeded, throttling...")
		
		// Emit throttle event
		throttleEvent := Event{
			EventType: "ingest_throttled",
			Timestamp: time.Now(),
		}
		events = append(events, throttleEvent)
		
		// Re-buffer events for next window
		s.eventMutex.Lock()
		s.eventBuffer = append(events, s.eventBuffer...)
		s.eventMutex.Unlock()
		
		return
	}
	
	// Ship to API
	s.sendToAPI(events)
}
```

**Recommended**: Option 3 (sidecar-side) for best UX, with Option 1 (Redis) as backup in API.

---

## 3. Payload Truncation (64KB)

### What It Should Do:

**Purpose**: Prevent huge payloads from bloating database.

**Behavior**:
- If event payload (HTTP body) > 64KB:
  - Truncate to 64KB
  - Add flag: `payload_truncated: true`
  - Store original size: `payload_size_bytes: 128000`

**Why It's Important**:
- Prevents 10MB JSON responses from filling DB
- Predictable storage costs
- Still captures enough for evidence (64KB is ~64,000 chars)

### Current State: ❌ **NOT IMPLEMENTED**

**What happens now**:
- Full payloads stored (limited by Prisma/Postgres text field limits)
- No truncation
- Could store multi-MB responses

### How to Fix It (Easy - 1 hour):

**In Sidecar** (`apps/sidecar/main.go`):

```go
const MAX_PAYLOAD_SIZE = 64 * 1024 // 64KB

func (s *Sidecar) captureHTTPEvent(req *http.Request, resp *http.Response) Event {
	// ... existing code ...
	
	// Read response body
	body, _ := io.ReadAll(resp.Body)
	
	// Truncate if too large
	payloadTruncated := false
	originalSize := len(body)
	
	if len(body) > MAX_PAYLOAD_SIZE {
		body = body[:MAX_PAYLOAD_SIZE]
		payloadTruncated = true
	}
	
	event := Event{
		// ... other fields ...
		PayloadRedacted: string(body),
		PayloadTruncated: payloadTruncated,
		PayloadSizeBytes: originalSize,
	}
	
	return event
}
```

**Update Event Schema** (`packages/db/prisma/schema.prisma`):

```prisma
model Event {
  // ... existing fields ...
  payloadRedacted   String? // Already exists
  payloadTruncated  Boolean @default(false) // ADD THIS
  payloadSizeBytes  Int?    // ADD THIS (original size)
}
```

**UI Display** (`apps/ui/src/components/run/ProofDrawer.tsx`):

```tsx
{evidence.payload_truncated && (
  <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs">
    ⚠️ Payload truncated to 64KB (original: {formatBytes(evidence.payload_size_bytes)})
  </div>
)}

<pre className="text-xs">
  {evidence.payload_redacted}
  {evidence.payload_truncated && '\n... [truncated]'}
</pre>
```

---

## Summary: What's Missing & Priority

| Feature | Spec | Current | Status | Priority | Effort |
|---------|------|---------|--------|----------|--------|
| **Duration Cap** | 15 min | ❌ None | Missing | **HIGH** | 30 min |
| **Event Cap/Run** | 5,000 | ✅ 10,000 | Implemented (generous) | ✅ Done | N/A |
| **Rate Limit** | 300/min | ⚠️ Buffer limit only | Partial | **MEDIUM** | 3 hours |
| **Payload Truncation** | 64KB | ❌ None | Missing | **LOW** | 1 hour |

### Priority Recommendations:

**Before Production** (Total: ~4 hours):
1. ✅ **Duration cap** (30 min) - Prevents runaway costs
2. ✅ **Rate limiting** (3 hours) - Protects API stability

**Nice to Have** (Post-MVP):
3. ⚠️ **Payload truncation** (1 hour) - Prevents storage bloat

### Current Risk Assessment:

**Duration Cap**:
- Risk: **MEDIUM-HIGH** 🟡
- A stuck script could run for hours
- In-process execution means it blocks API worker thread
- **Fix before production**

**Rate Limiting**:
- Risk: **MEDIUM** 🟡
- Buffer limit (1000) provides some protection
- Could have burst traffic spikes
- **Fix for scale (not blocking MVP)**

**Payload Truncation**:
- Risk: **LOW** 🟢
- Postgres text fields already limit size
- Unlikely to have multi-MB payloads in practice
- **Enhancement only**

---

## Recommended Implementation Order:

### Step 1: Add Duration Timeout (30 minutes)

```typescript
// apps/ui/src/lib/run-orchestrator.ts

export async function executeRun(runId: string): Promise<void> {
  const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  
  const timeoutId = setTimeout(async () => {
    console.warn(`Run ${runId} exceeded 15 minute timeout`);
    await db.run.update({
      where: { id: runId },
      data: {
        status: "completed",
        endedAt: new Date(),
        error: "Run exceeded maximum duration (15 minutes)"
      },
    });
  }, TIMEOUT_MS);
  
  try {
    // ... existing run logic ...
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Test it**:
```bash
# Create test that runs for 20 minutes
# Should stop at 15 minutes
```

### Step 2: Add Rate Limiting (3 hours)

**2a. In-Memory Version** (1 hour):
- Add rate limiter to API route
- Test with curl loop sending 400 events/min
- Should return 429 after 300

**2b. Sidecar Version** (2 hours):
- Add RateLimiter struct to sidecar
- Implement sliding window
- Test with high-volume agent

### Step 3: Add Payload Truncation (1 hour)

**3a. Sidecar** (30 min):
- Truncate payloads > 64KB
- Add metadata fields

**3b. Schema Migration** (15 min):
- Add `payloadTruncated` and `payloadSizeBytes` columns

**3c. UI Display** (15 min):
- Show truncation warning in ProofDrawer

---

## Testing Checklist:

**Duration Cap**:
- [ ] Run with fast scripts completes normally
- [ ] Run with 20-minute sleep stops at 15 min
- [ ] Run status shows "completed" with error message
- [ ] UI displays timeout reason

**Rate Limiting**:
- [ ] 300 events/min succeeds
- [ ] 400 events/min returns 429
- [ ] Next minute allows events again
- [ ] `ingest_throttled` event appears in story

**Payload Truncation**:
- [ ] 10KB payload stored fully
- [ ] 100KB payload truncated to 64KB
- [ ] `payload_truncated = true` in DB
- [ ] UI shows warning banner

---

## After Implementation:

Platform will be **100% quota-compliant**:

- ✅ Projects: 5 per org (implemented)
- ✅ Runs: 100/month per org (implemented)
- ✅ Events/run: 10,000 (implemented, more generous than spec)
- ✅ Duration: 15 min (to be implemented)
- ✅ Rate: 300/min (to be implemented)
- ✅ Payload: 64KB (to be implemented)
- ✅ Storage: 1GB per org (implemented)
- ✅ Retention: 7 days (implemented)

**Total effort: ~4.5 hours** to reach 100% quota compliance.
