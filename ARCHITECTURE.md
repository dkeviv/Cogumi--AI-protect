# COGUMI AI Protect - Architecture Overview

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         User's Browser                        │
│                    (React/Next.js Frontend)                   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ HTTPS
                            │
┌───────────────────────────┴──────────────────────────────────┐
│                      Web Application                          │
│               (Next.js App Router + API Routes)               │
│                                                                │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐          │
│  │  Auth      │  │  Projects   │  │    Runs      │          │
│  │  (NextAuth)│  │    CRUD     │  │  Execution   │          │
│  └────────────┘  └─────────────┘  └──────────────┘          │
│                                                                │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐          │
│  │  Ingest    │  │   Story     │  │   Reports    │          │
│  │   API      │  │  Builder    │  │  Generator   │          │
│  └────────────┘  └─────────────┘  └──────────────┘          │
└────────┬───────────────────┬───────────────────────┬─────────┘
         │                   │                       │
         │                   │                       │
   ┌─────▼─────┐      ┌──────▼────────┐      ┌──────▼──────┐
   │  Postgres │      │   Redis       │      │   Cron      │
   │   (DB)    │      │  (Optional)   │      │   Jobs      │
   └───────────┘      └───────────────┘      └─────────────┘
                                                      │
                                              ┌───────▼───────┐
                                              │  Retention    │
                                              │   Cleanup     │
                                              └───────────────┘

                      ┌─────────────────────────────────┐
                      │      Go Sidecar Proxy           │
                      │                                 │
                      │  ┌─────────────────────────┐   │
                      │  │  HTTP/HTTPS Proxy       │   │
                      │  │  (Metadata Only)        │   │
                      │  └─────────────────────────┘   │
                      │                                 │
                      │  ┌─────────────────────────┐   │
                      │  │  Secret Detection       │   │
                      │  └─────────────────────────┘   │
                      │                                 │
                      │  ┌─────────────────────────┐   │
                      │  │  Event Batching         │   │
                      │  │  & Shipping             │   │
                      │  └──────────┬──────────────┘   │
                      └─────────────┼──────────────────┘
                                    │
                                    │ POST /api/ingest/events
                                    │
                            ┌───────▼────────┐
                            │   AI Agent     │
                            │   Under Test   │
                            └────────────────┘
```

---

## Components

### 1. Web Application (Next.js)

**Location**: `apps/ui/`

**Responsibilities**:
- User authentication (NextAuth with Google OAuth)
- Multi-tenant organization management
- Project & sidecar token management
- Run orchestration (create, execute, monitor)
- Real-time updates via Server-Sent Events (SSE)
- Report generation
- API endpoints for all operations

**Tech Stack**:
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React, Tailwind CSS
- **Auth**: NextAuth.js
- **Database**: Prisma ORM
- **Validation**: Zod schemas

**Key Routes**:
- `/api/projects` - Project CRUD
- `/api/runs/:id` - Run management
- `/api/ingest/events` - Event ingestion from sidecar
- `/api/cron/retention-cleanup` - Data retention cleanup
- `/runs/:id` - Run viewer UI

### 2. Sidecar Proxy (Go)

**Location**: `apps/sidecar/`

**Responsibilities**:
- HTTP forward proxy
- HTTPS CONNECT tunnel (metadata only, no TLS decryption)
- Secret detection (API keys, credentials)
- Traffic classification (LLM provider, tool, internal, public, attacker_sink)
- Event batching and shipping to SaaS
- Heartbeat to maintain connection status
- Throttling when quota exceeded

**Tech Stack**:
- **Language**: Go 1.21
- **Dependencies**: Standard library only (zero external deps)
- **Transport**: HTTP/1.1 proxy

**Event Types**:
- `http.request` - HTTP request captured
- `https.connect` - HTTPS tunnel metadata
- `secret.detected` - Secret found in traffic
- `ingest_throttled` - Quota exceeded

### 3. Database (PostgreSQL)

**Location**: `packages/db/prisma/schema.prisma`

**Models**:
- `Organization` - Multi-tenant org with quotas
- `User` - User accounts
- `Membership` - User-org relationships with roles
- `Project` - AI agent testing projects
- `SidecarToken` - Hashed auth tokens for sidecar
- `Run` - Pentest run instances
- `Event` - Captured traffic events (append-only)
- `StoryStep` - Narrative exploit feed items (projection)
- `ScriptResult` - Test script execution results
- `Finding` - Detected vulnerabilities
- `Report` - Generated markdown reports
- `PromptVariant` - Adversarial prompt variations

**Indexes**:
- `orgId` on all tables (multi-tenancy)
- `projectId`, `runId` for lookups
- Composite indexes for common queries

### 4. Background Jobs (Optional: Redis + BullMQ)

**Location**: `apps/worker/` (to be implemented)

**Future jobs**:
- Async report generation
- Batch event processing
- Scheduled run execution
- Email notifications

---

## Data Flow

### 1. Run Execution

```
User → "New Run" Button
  ↓
POST /api/projects/:id/runs
  ↓
Create Run (status: queued)
  ↓
POST /api/runs/:id/execute
  ↓
┌─────────────────────────────────┐
│  Run Orchestrator               │
│                                 │
│  1. Update run → "running"      │
│  2. Execute S1-S5 scripts       │
│  3. Send prompts to agent       │
│  4. Capture responses as events │
│  5. Read sidecar events         │
│  6. Score & create findings     │
│  7. Build story steps           │
│  8. Calculate risk score        │
│  9. Update run → "completed"    │
└─────────────────────────────────┘
  ↓
SSE stream updates to browser
```

### 2. Event Capture (Sidecar → SaaS)

```
AI Agent makes HTTP request
  ↓
Proxied through Sidecar (HTTP_PROXY=localhost:8080)
  ↓
┌─────────────────────────────────┐
│  Sidecar captures:              │
│  - Method, URL, headers         │
│  - Body (HTTP only, <10KB)      │
│  - Status code, timing          │
│  - Classify destination         │
│  - Detect secrets (regex)       │
└─────────────────────────────────┘
  ↓
Batch events (every 5s or 100 events)
  ↓
POST /api/ingest/events
  ↓
Store in Event table (runId, seq, ts, ...)
  ↓
SSE broadcast to listening browser
```

### 3. Story Builder (Events → Narrative)

```
buildStoryForRun(runId)
  ↓
Fetch all events for run
  ↓
Analyze patterns:
  - Marker events → info steps
  - Secret detections → confirmed critical
  - Policy violations → quota steps
  - Exfiltration attempts → confirmed/attempted
  - Suspicious requests → attempt steps
  ↓
Create StoryStep records:
  - seqStart/seqEnd (event sequence range)
  - claimTitle, claimSummary (narrative)
  - evidenceEventIds (proof chain)
  - severity, attackStyle
  ↓
Return ordered narrative for Exploit Feed
```

---

## Security Architecture

### 1. Multi-Tenancy

**Every database row** includes `orgId` and **every query** filters by `orgId` to prevent cross-tenant access.

**Session middleware** (`getOrgId()`) extracts current org from NextAuth session.

### 2. Secrets Handling

**Never store raw secrets**:
- Sidecar detects secrets → stores `hash + preview + confidence`
- Sidecar tokens stored as bcrypt hash
- Plaintext token shown once on creation

### 3. Environment Guardrails

**Production runs disabled by default**:
- `prodOverrideEnabled` must be true
- User checklist confirmation required
- Audit log of override events

### 4. Quotas

Enforced at three levels:
1. **API**: Check before creating project/run
2. **Worker**: Check during script execution
3. **Sidecar**: Throttle event shipping, emit `ingest_throttled`

**Graceful degradation**:
- Run status → `stopped_quota` when limit hit
- Events rejected with 429, but run completes analysis on existing data

### 5. Retention & Compliance

**Automatic cleanup**:
- Cron job runs daily (POST `/api/cron/retention-cleanup`)
- Deletes events/runs older than `project.retentionDays`
- Archives reports before deletion

**Customer portability**:
- Self-hosted docker-compose available
- Standard PostgreSQL (easy export)
- Markdown reports (human-readable)

---

## Scalability Considerations

### Current (MVP) Scale

- **Concurrent users**: 100+
- **Runs/day**: 1,000+
- **Events/sec**: 100+
- **Storage**: 10GB+

### Bottlenecks & Solutions

1. **Event ingestion**
   - **Bottleneck**: Single DB writes
   - **Solution**: Batch inserts (done), eventual: Redis queue

2. **Story builder**
   - **Bottleneck**: Full table scans
   - **Solution**: Indexed queries on (runId, seq), materialized views

3. **SSE connections**
   - **Bottleneck**: Single server memory
   - **Solution**: Redis pub/sub for multi-server

4. **Database size**
   - **Bottleneck**: Event table growth
   - **Solution**: Partitioning by month, archival to S3

### Horizontal Scaling

**Stateless design** allows multiple web replicas:
```
Load Balancer
  ├─> Web Instance 1
  ├─> Web Instance 2
  └─> Web Instance 3
       ↓
   Shared Postgres + Redis
```

**Session affinity** not required (JWT tokens, no in-memory sessions).

---

## Code Organization

```
/apps
  /ui                 # Next.js web app
    /src
      /app           # App Router pages & API routes
        /api         # REST API endpoints
        /runs        # Run viewer pages
        /projects    # Project management pages
      /components    # React components
        /run         # Run-specific UI (Exploit Feed, etc.)
      /lib           # Business logic
        /scripts     # S1-S5 script definitions
        story-builder.ts
        run-orchestrator.ts
        quota-service.ts
        retention-cleanup.ts

  /sidecar           # Go proxy
    main.go          # Entry point
    Dockerfile       # Container build

  /worker            # Background jobs (future)
    /jobs            # BullMQ job definitions

/packages
  /db                # Prisma schema & client
    /prisma
      schema.prisma  # Database models
  /shared            # Shared TypeScript types
    /src
      types.ts       # Zod schemas

/spec                # Specifications
  CONTRACTS.md       # API contracts
  UI_MAP.md          # UI component map
  TESTS.md           # Test scenarios
  specifications.md  # Requirements

/fixtures            # Test data for UI-first dev
  events_*.json      # Sample events
  story_steps_expected.json
  findings_expected.json
```

---

## Development Workflow

### Local Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres
docker-compose up -d postgres

# 3. Run migrations
cd packages/db && npx prisma migrate dev

# 4. Start dev server
cd apps/ui && pnpm dev

# 5. (Optional) Start sidecar
cd apps/sidecar && go run main.go
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests (future)
pnpm test:e2e

# Fixture mode (UI development without backend)
NEXT_PUBLIC_USE_FIXTURES=true pnpm dev
```

---

## Monitoring & Observability

### Health Checks

- **Web**: `GET /api/health`
- **Sidecar**: `GET /health`
- **Database**: `SELECT 1`

### Metrics (Future)

- Run execution time
- Event ingestion rate
- Quota usage per org
- API endpoint latency

### Logging

- **Structured JSON logs** in production
- **Console logs** in development
- **Log levels**: error, warn, info, debug

---

## Future Enhancements

1. **Worker Service** (BullMQ)
   - Async report generation
   - Scheduled runs
   - Email notifications

2. **Advanced APG**
   - More prompt variants (currently finite)
   - Fine-tuned attack models
   - Custom script uploading

3. **Replay UI**
   - Time scrubber with markers
   - Synchronized conversation + network tabs
   - Proof drawer with jump links

4. **Integrations**
   - Slack/Discord notifications
   - CI/CD pipeline hooks
   - SIEM exports

5. **Enterprise Features**
   - SAML/OIDC SSO
   - RBAC (fine-grained permissions)
   - Audit logs
   - API rate limiting per user

---

## References

- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./API.md)
- [User Workflows](./spec/USER_WORKFLOWS.md)
- [AGENTS.md](./AGENTS.md) - Original milestone plan
