# M4: Event Ingest & Story Builder - COMPLETE ✅

## Summary

Successfully implemented the complete event ingestion and story projection pipeline that connects the Go sidecar proxy to the SaaS backend.

## Components Created

### 1. Event Ingest API
**File**: `/apps/ui/src/app/api/ingest/events/route.ts`

- POST endpoint that receives batched events from sidecar
- Bearer token authentication (validates sidecar tokens)
- Zod schema validation for event structure
- Transforms sidecar events into canonical Event model
- Stores events append-only in database
- Associates events with active runs
- Updates token `lastSeenAt` (same as heartbeat)

**Key Features**:
- Accepts both `Authorization: Bearer <token>` and `X-Sidecar-Token` headers
- Compares plaintext tokens against bcrypt hashes
- Maps sidecar event types to canonical schema:
  - `ingest_throttled` → channel: policy, type: policy.violation
  - Secret detections → type: secret.detected
  - HTTP requests → channel: http with classification
- Builds `payloadRedacted` JSON with summary, headers, body preview
- Extracts secret matches and stores as JSON

### 2. Story Builder Service
**File**: `/apps/ui/src/lib/story-builder.ts`

Transforms raw events into narrative StorySteps for the Exploit Feed UI.

**Story Types**:
- `attempt`: Script attempted an action (e.g., "Suspicious external request")
- `confirmed`: Action succeeded with evidence (e.g., "🚨 Secret leaked")
- `blocked`: Action blocked by policy
- `quota`: Run stopped due to quota limits
- `info`: Informational checkpoint (e.g., script markers)

**Analysis Logic**:
1. **Script markers**: System events with type="marker" → info steps
2. **Secret detections**: type="secret.detected" → confirmed critical exploits
3. **Policy violations**: Throttling, blocking → quota/blocked steps
4. **Exfiltration attempts**: Requests to `attacker_sink` or `public_internet` destinations
   - Groups consecutive requests to same host
   - Marks as "confirmed" if secrets detected, "attempt" otherwise

**Functions**:
- `buildStoryForRun(runId)`: Analyzes all events and creates story steps
- `rebuildStoryForRun(runId)`: Deletes existing steps and rebuilds (useful after new events)
- `getStorySteps(runId)`: Retrieves ordered story steps
- `createStoryStep(input)`: Creates individual story step

### 3. Run Data Endpoints

#### GET /api/runs/[id]/story
**File**: `/apps/ui/src/app/api/runs/[id]/story/route.ts`

Returns story steps (narrative timeline) for a run. Ordered by sequence and timestamp.

#### GET /api/runs/[id]/events
**File**: `/apps/ui/src/app/api/runs/[id]/events/route.ts`

Returns raw events for a run. Ordered by sequence and timestamp. Used for evidence chain and debugging.

#### GET /api/runs/[id]/findings
**File**: `/apps/ui/src/app/api/runs/[id]/findings/route.ts`

Returns security findings for a run. Ordered by severity (critical first) and creation time.

### 4. SSE Live Stream
**File**: `/apps/ui/src/app/api/runs/[id]/stream/route.ts`

Server-Sent Events stream for real-time run updates.

**Streams**:
- `story_step`: New story steps as they're created
- `event`: New events (throttled to 10 per poll)
- `run_status`: Run status changes (queued → running → completed/failed)
- Auto-closes stream when run completes

**Implementation**:
- Polls database every 1 second for new data
- Tracks last seen timestamps to avoid duplicates
- Sends SSE formatted messages: `data: {type, data}\n\n`
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`

### 5. Database Client
**File**: `/apps/ui/src/lib/db.ts`

Re-exports Prisma client from `@cogumi/db` package. Single source of truth for database access.

## Database Schema

Already existed in `/packages/db/prisma/schema.prisma`:

### Event Model
```prisma
model Event {
  id                String   @id @default(uuid())
  orgId             String
  projectId         String
  runId             String?
  ts                DateTime
  seq               Int?
  channel           String    // http | system | policy
  type              String    // request | response | secret.detected | policy.violation | marker
  actor             String    // adversary | system
  host              String
  path              String?
  port              Int?
  classification    String?   // llm_provider | tool | internal_api | public_internet | attacker_sink
  method            String?
  statusCode        Int?
  bytesOut          Int?
  bytesIn           Int?
  durationMs        Int?
  payloadRedacted   Json?     // { summary, headers_redacted, body_redacted_preview }
  matches           Json?     // [{ kind, hash, preview, confidence }]
  integrityHash     String?
  createdAt         DateTime @default(now())
}
```

### StoryStep Model
```prisma
model StoryStep {
  id                String   @id @default(uuid())
  orgId             String
  runId             String
  ts                DateTime
  seqStart          Int?
  seqEnd            Int?
  scriptId          String?
  stepKind          String   // attempt | confirmed | blocked | quota | info
  severity          Severity // critical | high | medium | low | info
  status            String @default("open")
  claimTitle        String
  claimSummary      String
  attackStyle       String?
  evidenceEventIds  String[] @default([])
  createdAt         DateTime @default(now())
}
```

## Data Flow

1. **Sidecar** captures HTTP/HTTPS traffic → batches events every 5s
2. **POST /api/ingest/events** receives batch → validates token → transforms events → stores in DB
3. **Story Builder** (triggered by worker or API) analyzes events → creates StorySteps
4. **UI** connects to **GET /api/runs/:id/stream** → receives live updates via SSE
5. **UI** fetches initial data: story, events, findings from dedicated endpoints

## Security

- ✅ Multi-tenancy: All queries filter by `orgId`
- ✅ Token auth: Sidecar tokens validated via bcrypt comparison
- ✅ No raw secrets: Only hashes + previews stored in `matches` JSON
- ✅ Append-only events: Never mutate events after creation
- ✅ Session-based auth for UI endpoints

## Testing Notes

To test locally:
1. Generate Prisma client: `cd packages/db && npx prisma generate`
2. Push schema to DB: `npx prisma db push`
3. Start Next.js: `npm run dev` (already running on :3001)
4. Create a project + sidecar token via UI
5. Run sidecar (when Go is installed): `cd apps/sidecar && go run main.go`
6. Configure agent to use proxy: `HTTP_PROXY=http://localhost:8080 HTTPS_PROXY=http://localhost:8080`
7. Events will flow: sidecar → ingest → database → story builder → SSE → UI

## Next Steps: M5

Ready to proceed to **M5: Runs + Scripts + APG**:
- Worker service with BullMQ
- Red team scripts S1-S5 (prompt injection, jailbreak, secrets, exfil, escalation)
- Adversarial Prompt Generator (APG) with style variants
- Script execution engine
- Scoring and findings generation
- Run orchestration (queued → running → completed)
