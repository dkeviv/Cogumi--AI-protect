
# AGENTS.md — Universal Agent Red Team SaaS (Go Sidecar + Node SaaS)

# Implementation Order

1. UI fixtures + Run page (wow wedge)
2. contracts + DB models
3. ingest pipeline
4. worker scripts/scoring
5. sidecar

## Tech Stack (MVP → Scalable)

### Monorepo layout

- /apps/ui: Next.js (App Router) + TypeScript (UI + API Route Handlers)
- /apps/worker: Node.js + TypeScript + BullMQ (pentest scripts, scoring, reports, retention)
- /apps/sidecar: Go (HTTP proxy + HTTPS CONNECT metadata tunnel, no TLS decryption)
- /packages/shared: shared TS types + Zod schemas derived from spec/CONTRACTS.md
- /packages/db: Prisma schema + client
- /spec: specifications.md + CONTRACTS.md + UI_MAP.md + TESTS.md
- /fixtures: fixture JSON for UI-first build

### Core dependencies

UI/API:

- Next.js + TypeScript
- Tailwind CSS
- NextAuth (Google OAuth)

Worker:

- Node.js + TypeScript
- BullMQ + Redis

DB:

- Postgres
- Prisma ORM + migrations

Realtime:

- SSE for live exploit feed and replay updates

### Deployment targets

MVP:

- Docker Compose local
- Railway:
  - web: apps/ui (UI+API)
  - worker: apps/worker
  - Postgres plugin
  - Redis plugin

Scale later:

- Kubernetes (Helm), separate apps/api service if needed
- Horizontal worker replicas, Redis-backed queues
- Postgres indexing/partitioning for events, optional read replica

### Security + safety defaults

- No TLS decryption (no MITM) in MVP
- Sidecar token stored hashed; plaintext shown once
- Never store raw secrets; store hash + preview only
- Pre-deployment positioning with environment guardrails (prod runs disabled unless override)
- Quotas enforced via Redis + API + worker + sidecar throttling

---

## Repo Layout

/apps
  /ui
  /api
  /worker
  /sidecar
/kits
  /agent-test-endpoint-node
  /agent-test-endpoint-python
/docker
  docker-compose.yml
  docker-compose.customer.yml
/packages
  /shared (types, zod schemas)
  /scripts (S1-S5 definitions)
  /story (story builder)
  /reporting (md generator)
  /detectors (secret detection + entropy scoring)
  /policy (limits + gating)

---

## Milestones

M1 Multi-tenancy + auth + org context
M2 Projects + tokens + Connect Wizard + guardrails
M3 Go sidecar proxy + event shipper + throttle
M4 Ingest + Event store + StoryStep projection + SSE
M5 Runs + Worker + scripts + APG variants + scoring
M6 Wow UI: Exploit Feed + Evidence Drawer + Replay scrubber
M7 Report generation
M8 Free-tier quotas + retention cleanup + portability docs

---

## M1 — Auth & tenancy

- Implement NextAuth (Google).
- Create: organizations, users, memberships.
- Session includes current_org_id.
- API middleware enforces org_id on all requests.

Acceptance:

- Login works.
- Cross-org access denied.

---

## M2 — Projects, tokens, wizard, guardrails

DB:

- projects: environment, prod_override_enabled, agent_test_url, tool_domains, internal_suffixes, retention_days
- sidecar_tokens: token_hash, status, last_seen_at

API:

- CRUD projects
- create token (plaintext once)
- heartbeat endpoint (token auth)
- validate agent endpoint
- connect snippets generator

UI:

- Connect Wizard steps (create→deploy→verify→endpoint→run)
- Environment badge + prod override flow w/ checklist
- Token mgmt view

Acceptance:

- Wizard produces working compose/env.
- Verify connection shows last_seen.
- Prod override logged.

---

## M3 — Sidecar (Go)

Sidecar features:

- HTTP forward proxy
- HTTPS CONNECT tunnel (no decrypt)
- capture metadata for both
- redact headers
- capture HTTP body when plaintext
- classify destination
- secret match detection (HTTP only)
- batch ship events to /ingest/events
- throttle shipping and emit ingest_throttled violation
- heartbeat every 30s

Acceptance:

- Works with HTTP_PROXY/HTTPS_PROXY.
- Events arrive in SaaS.
- Throttle works.

---

## M4 — Ingest + events + story + SSE

DB:

- events append-only
- story_steps projection

API:

- /ingest/events token auth
- /runs/:id/stream SSE
- /runs/:id/story + /events + /findings

Story builder:

- create attempt steps from script markers
- create confirmed/attempted steps from findings
- create quota steps
- evidence_event_ids must be populated

Acceptance:

- Live steps stream.
- Replay loads story + evidence.

---

## M5 — Runs + scripts + APG

DB:

- runs, script_results, findings
- style_presets, prompt_variants, project_redteam_config

Worker:

- create run -> execute scripts S1..S5
- send messages to agent_test_url
- store agent responses as events
- read sidecar events during run window
- score and create findings + story steps
- compute risk score

APG:

- builtin styles + finite prompt variants stored
- select variants based on enabled styles & intensity
- reuse variants; update last_used_at

Acceptance:

- A run produces story steps, findings, results deterministically with variant selection.

---

## M6 — Wow UI

Run page:

- left Exploit Feed (StorySteps)
- center scrubber w markers
- right tabs: Conversation / Network Proof / Findings / Policy / Memory
- proof drawer builds chain-of-evidence cards and jump links
- live animation for confirmed exploits

Acceptance:

- Not a log viewer.
- Proof chain is clear and clickable.
- Replay is smooth.

---

## M7 — Reports

- markdown template includes environment + limitation note
- endpoint to generate and download

Acceptance:

- Report generated for completed run.

---

## M8 — Quotas, retention, portability

Quotas:

- projects cap, runs/day, event caps, retention days
- enforce in API/Worker
- sidecar throttle enforced

Retention cleanup:

- cron job in worker deletes old runs/events per retention_days

Docs:

- Local compose and Railway deploy instructions
- Customer compose with dummy agent endpoint

Acceptance:

- Quotas enforced, run stops gracefully.
- Full stack runs on docker-compose.

---

## UI-first fixture mode

- The /runs/:runId page must render entirely from /fixtures when NEXT_PUBLIC_USE_FIXTURES=true.
- Implement a RunDataSource abstraction:
  - FixtureRunDataSource loads and normalizes fixtures and optionally simulates live streaming.
  - ApiRunDataSource uses real endpoints later without changing UI components.
- This enables building Exploit Feed → Proof Drawer → Replay before backend is complete.
