# Contracts & Schemas (Copilot Source of Truth)

This document defines the canonical API contracts, Sidecar ingest schema, and core domain schemas.
All services must conform to these shapes. Prefer Zod schemas in code generated from this spec.

---

## 0. Terminology

- Org: tenant boundary. All data scoped to org_id.
- Project: integration unit; sidecar token is project-scoped.
- Run: a single pentest execution with scripts S1..S5.
- Event: immutable evidence object emitted by sidecar and by system (agent responses, markers).
- StoryStep: narrative projection (claim-first) used by UI Exploit Feed.
- Finding: security outcome with evidence chain.
- PromptVariant: cached adversarial prompt variant (APG output), reused across runs.

---

## 1. Authentication and tenancy

### 1.1 Session auth

UI uses Google OAuth via NextAuth. API uses session cookies or a JWT session token (implementation choice).
All authenticated API requests must resolve:

- user_id
- current_org_id

### 1.2 Org membership & roles

Every request must enforce membership in current_org_id.

Roles:

- OWNER
- ADMIN
- MEMBER
- VIEWER

---

## 2. Sidecar token auth

Sidecar uses a project-scoped token.

- Token is shown once at creation.
- DB stores token_hash only.
- Ingest endpoints accept header: `X-Sidecar-Token: <plaintext token>`

Token resolves to:

- org_id
- project_id
- status (active/revoked)

---

## 3. Canonical Schemas

### 3.1 Event schema (canonical)

Events are immutable. Never store raw secrets; store `matches` only.

```json
{
  "id": "uuid",
  "org_id": "uuid",
  "project_id": "uuid",
  "run_id": "uuid|null",
  "ts": "2026-02-02T12:34:56.789Z",
  "seq": 123,

  "channel": "http|system|policy",
  "type": "request|response|blocked|marker|secret.detected|policy.violation|agent.message",
  "actor": "target|adversary|system",

  "destination": {
    "host": "string",
    "path": "string|null",
    "port": 443,
    "classification": "llm_provider|tool|internal_api|public_internet|attacker_sink|unknown"
  },

  "http": {
    "method": "GET|POST|PUT|PATCH|DELETE|CONNECT|null",
    "status_code": 200,
    "bytes_out": 1234,
    "bytes_in": 5678,
    "duration_ms": 42
  },

  "payload_redacted": {
    "summary": "string",
    "headers_redacted": { "authorization": "[REDACTED]" },
    "body_redacted_preview": "string|null"
  },

  "matches": [
    { "kind": "OPENAI_KEY|AWS_ACCESS_KEY|JWT|HIGH_ENTROPY|OTHER", "hash": "sha256", "preview": "sk-…d9", "confidence": 0.95 }
  ],

  "integrity_hash": "sha256(redacted_payload)"
}
Rules:

For HTTPS CONNECT tunnels, use http.method="CONNECT" and no body preview.

payload_redacted.summary should be short and UI-friendly.

seq monotonic per run_id. If run_id is null, seq can be 0 and ordering relies on ts.

3.2 StoryStep schema
StorySteps are claim-first narrative items for Exploit Feed.

{
  "id": "uuid",
  "org_id": "uuid",
  "run_id": "uuid",
  "ts": "ISO-8601",
  "seq_start": 120,
  "seq_end": 140,

  "script_id": "S1|S2|S3|S4|S5|null",
  "step_kind": "attempt|confirmed|blocked|info|quota",
  "severity": "critical|high|medium|low|info",
  "status": "open|resolved",

  "claim_title": "string",
  "claim_summary": "string",

  "attack_style": "string|null",
  "evidence_event_ids": ["uuid","uuid"]
}
Rules:

Never show raw secrets; show match preview/hashes only via evidence events.

3.3 Finding schema
{
  "id": "uuid",
  "org_id": "uuid",
  "run_id": "uuid",
  "script_id": "S1|S2|S3|S4|S5",
  "title": "string",
  "severity": "critical|high|medium|low|info",
  "status": "confirmed|attempted|suspected",
  "score": 0,
  "confidence": 0.0,

  "summary": "string",
  "evidence_event_ids": ["uuid"],
  "narrative_steps": [
    { "label": "Adversary request", "event_id": "uuid" },
    { "label": "Agent response", "event_id": "uuid" },
    { "label": "Network attempt", "event_id": "uuid" }
  ],
  "remediation_md": "string (markdown)"
}
3.4 PromptVariant schema
{
  "id": "uuid",
  "org_id": "uuid",
  "project_id": "uuid",
  "script_id": "S1|S2|S3|S4|S5",
  "script_step_id": "string",
  "style_id": "string",
  "version": "v1",
  "prompt_text": "string",
  "source": "builtin|generated|customer",
  "created_at": "ISO-8601",
  "last_used_at": "ISO-8601|null"
}
4. API Endpoints (SaaS API)
All endpoints are under /api. All require auth unless noted.

4.1 Me / org
GET /api/me
Response:

{ "user": { "id":"uuid","email":"string","name":"string" }, "current_org_id":"uuid" }
GET /api/orgs
Response:

{ "orgs": [{ "id":"uuid","name":"string" }] }
GET /api/orgs/members
Response:

{ "members": [{ "user_id":"uuid","email":"string","role":"OWNER|ADMIN|MEMBER|VIEWER" }] }
PATCH /api/orgs/members/:user_id
Request:

{ "role":"OWNER|ADMIN|MEMBER|VIEWER" }
4.2 Projects & connect wizard
POST /api/projects
Request:

{
  "name": "string",
  "environment": "sandbox|staging|prod",
  "tool_domains": ["string"],
  "internal_suffixes": ["string"]
}
Response:

{ "project": { "id":"uuid", "name":"string", "environment":"sandbox", "prod_override_enabled":false } }
GET /api/projects
Response:

{ "projects": [ { "id":"uuid","name":"string","environment":"sandbox","last_seen_at":"ISO-8601|null" } ] }
GET /api/projects/:id
Response:

{
  "project": {
    "id":"uuid","name":"string","environment":"sandbox",
    "prod_override_enabled":false,
    "agent_test_url":"string|null",
    "tool_domains":["string"],
    "internal_suffixes":["string"]
  }
}
PATCH /api/projects/:id
Request (partial):

{
  "name":"string?",
  "environment":"sandbox|staging|prod?",
  "prod_override_enabled":"boolean?",
  "agent_test_url":"string?",
  "tool_domains":["string"]?,
  "internal_suffixes":["string"]?,
  "redteam": { "enabled_style_ids":["string"], "intensity":"low|med|high", "version_pin":"v1" }
}
Response: updated project.

POST /api/projects/:id/tokens
Creates a sidecar token (shown once).
Response:

{ "token": "plaintext_shown_once", "token_id": "uuid" }
POST /api/projects/:id/validate-agent-endpoint
Request:

{ "agent_test_url":"string" }
Response:

{ "ok": true, "details": { "latency_ms": 123 } }
GET /api/projects/:id/connect-snippets
Response:

{
  "snippets": {
    "docker_compose": "string",
    "env_vars": "string",
    "sidecar_config_yaml": "string",
    "agent_endpoint_examples": {
      "node_express": "string",
      "python_fastapi": "string"
    }
  }
}
4.3 Sidecar endpoints (token-auth; no session auth)
POST /api/ingest/events
Headers:

X-Sidecar-Token: token

Request:

{
  "project_id":"uuid",
  "run_id":"uuid|null",
  "sidecar_version":"string",
  "events":[ /* Event input objects without org_id/id; API fills those */ ]
}
Response:

{ "ok": true, "accepted": 100, "dropped": 0 }
Errors:

401 invalid token

403 revoked token

429 org storage cap exceeded or ingest throttled

POST /api/projects/:id/sidecar/heartbeat
Headers: X-Sidecar-Token
Request:

{
  "project_id":"uuid",
  "sidecar_version":"string",
  "counters": { "events_sent_1m":123, "events_dropped_1m":5 }
}
Response:

{ "ok": true }
4.4 Runs
POST /api/projects/:id/runs
Request:

{ "mode":"campaign" }
Response:

{ "run": { "id":"uuid","status":"queued" } }
Errors:

403 if env=prod and prod_override_disabled

429 if runs/day exceeded

GET /api/runs/:id
Response:

{ "run": { "id":"uuid","status":"running","risk_score": null, "started_at":"ISO-8601", "ended_at":null } }
POST /api/runs/:id/cancel
Response:

{ "ok": true }
GET /api/runs/:id/story
Response:

{ "steps": [ /* StoryStep */ ] }
GET /api/runs/:id/events?after_seq=0&limit=200
Response:

{ "events": [ /* Event */ ], "next_after_seq": 200 }
GET /api/runs/:id/findings
Response:

{ "findings": [ /* Finding */ ] }
POST /api/runs/:id/report
Response:

{ "ok": true, "report_id":"uuid" }
GET /api/runs/:id/report
Response:

{ "report": { "format":"markdown", "content_md":"string" } }
4.5 Realtime (SSE)
GET /api/runs/:id/stream
SSE events:

run.status

story.step.created

finding.created

quota.warning

Example SSE payload:

event: story.step.created
data: {"step":{...}}
5. Agent Test Endpoint Contract (customer-owned)
Required for scripts.

POST {AGENT_TEST_URL}/message
Request:

{
  "run_id":"uuid",
  "session_id":"uuid",
  "actor":"adversary",
  "message":"string",
  "metadata":{ "script_id":"S1", "step":1, "attack_style":"incident_urgent" }
}
Response:

{ "message":"string", "done":true, "metadata":{} }
Recommended:

POST /health returns 200

6. Rate Limits & Quotas (Free tier)
API must enforce:

Projects: 2

Runs/day: 5

Retention: 7 days default

Stored events cap: 50,000 rolling per org

Events per run cap: 5,000

Run duration cap: 15 min

Sidecar must enforce:

Ingest events/min per token: 300

Event payload max 64KB (truncate)

Emit policy.violation reason=ingest_throttled

7. Future Research (Not planned)
TLS decryption / MITM deep inspection.


---

## `spec/UI_MAP.md`

```md
# spec/UI_MAP.md — UI Routes, Components, and Wow Requirements

Goal: UI must feel like "SOC-grade replayable proof", not logs.

---

## 1) Routes

### / (Org Dashboard)
Purpose: overview.
Components:
- OrgSwitcher (optional MVP)
- ProjectsList
- RecentRunsList
- TopFindingsPreview

APIs:
- GET /api/projects
- (optional) GET /api/projects/:id/runs (for recent)

---

### /projects/:projectId (Project Overview)
Components:
- ProjectHeader (env badge + last seen)
- ConnectStatusCard
- RedTeamConfigCard
- RunsTable

APIs:
- GET /api/projects/:id
- GET /api/projects/:id/runs (or /api/projects/:id + runs list)

---

### /projects/:projectId/connect (Connect Wizard)
Steps UI: a stepper.

Step 1: Create/Confirm Project
- shows env, tool domains, internal suffixes

Step 2: Deploy Sidecar
- SnippetPanel (tabs: Docker Compose / K8s / Manual)
- Copy buttons
- shows SIDECAR_TOKEN (only on creation) with "I saved it" checkbox

Step 3: Verify Sidecar
- VerifyStatusCard
  - button: "Verify Connection"
  - display: last_seen_at, last_event_at, events/min

Step 4: Agent Test Endpoint
- EndpointInput
- button: Validate endpoint
- show latency + ok/fail

Step 5: First Run
- button: "Run Pre-deploy Pentest"
- if env=prod and override false -> show guardrail block + link to settings

APIs:
- GET /api/projects/:id/connect-snippets
- POST /api/projects/:id/validate-agent-endpoint
- POST /api/projects/:id/runs

---

### /projects/:projectId/settings (Project Settings)
Components:
- EnvironmentCard (env select + prod override checklist flow)
- AgentEndpointCard
- DomainsCard (tool domains + internal suffixes)
- RedTeamStylesCard
- TokensCard (create/revoke)
- UsageLimitsCard (free tier usage)

APIs:
- GET /api/projects/:id
- PATCH /api/projects/:id
- POST /api/projects/:id/tokens

---

### /runs/:runId (Run Live + Replay)
This is THE wedge screen.

Layout:
Header:
- RunHeader
  - project name, env badge
  - run status
  - risk score meter (when complete)
  - "Generate Report" button
  - "Open Report" button if exists

Left column:
- ExploitFeed
  - renders StorySteps
  - each card shows:
    - step_kind icon (attempt/confirmed/blocked/quota)
    - severity badge
    - claim_title + claim_summary
    - script_id label
    - attack_style chip if present
    - Proof button

Center:
- TimelineScrubber
  - markers:
    - script starts
    - confirmed steps
  - controls:
    - jump to latest (live)
    - play/pause (replay "movie mode")

Right:
- EvidenceTabs
  Tabs:
  1) ConversationTab
  2) NetworkProofTab
  3) FindingsTab
  4) PolicyTab
  5) MemoryTab (MVP: behavioral only)

Overlay:
- ProofDrawer
  - shows Chain of Evidence cards:
    1) Adversary message
    2) Agent response
    3) Network attempt (host/path/method/status/bytes/class)
    4) Detector card (matches)
  - Each card has Jump button:
    - sets timeline to seq range
    - highlights the event in tab

Live behavior:
- SSE stream updates ExploitFeed in real time
- Confirmed exploits animate + optionally "pin" in feed
- Quota warnings appear as steps_kind=quota

APIs:
- GET /api/runs/:id
- GET /api/runs/:id/story
- GET /api/runs/:id/events
- GET /api/runs/:id/findings
- SSE GET /api/runs/:id/stream
- POST /api/runs/:id/report
- GET /api/runs/:id/report

---

### /runs/:runId/report
Components:
- MarkdownReportViewer
- DownloadButton (.md)

APIs:
- GET /api/runs/:id/report

---

## 2) Component Interfaces (props)

### ExploitFeed
Props:
- steps: StoryStep[]
- onOpenProof(stepId)
- live: boolean

### ProofDrawer
Props:
- open: boolean
- evidenceEvents: Event[]
- narrativeSteps: array from Finding or StoryStep
- onJumpTo(seqStart, seqEnd)
Rules:
- Must render cards, not raw JSON
- Must not display raw secrets (matches preview only)

### TimelineScrubber
Props:
- markers: [{seq, label, kind}]
- currentSeq
- onChangeSeq
- onJumpLatest

### ConversationTab
Input:
- events filtered where type=agent.message OR (system markers)
Display:
- chat bubbles with actor labels

### NetworkProofTab
Input:
- events filtered where channel=http
Display:
- cards grouped by destination_class
- each card: method, host/path, status, bytes, duration
- filter chips: llm_provider, internal_api, public_internet, attacker_sink

### FindingsTab
- list findings, click opens ProofDrawer w/ finding chain

### EnvironmentCard
- env select
- prod override toggle triggers checklist modal

---

## 3) Wow Factor Requirements (non-negotiable)

1. Default view on run page is Exploit Feed (narrative).
2. Proof is a Chain-of-Evidence card stack, not logs.
3. Replay is time-synced across:
   - exploit feed highlight
   - conversation
   - network proof
4. “Attempt” steps are first-class and clearly labeled.
5. “Not decrypting TLS” is stated as a feature on settings/run pages:
   - "We prove intent + behavior without decrypting traffic."

---

## 4) Accessibility and performance
- Use virtualization for events list > 1000.
- SSE reconnect logic with last_event_id.
- Server-side pagination for /events.
```
