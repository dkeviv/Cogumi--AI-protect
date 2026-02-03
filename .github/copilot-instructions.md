# Copilot Instructions — COGUMI AI Protect

## Source of truth

- Requirements: spec/specifications.md
- Contracts & schemas: spec/CONTRACTS.md (do not invent shapes)
- UI behavior: spec/UI_MAP.md
- Tests/fixtures: spec/TESTS.md and /fixtures/*.json

## Architecture boundaries

- apps/ui: Next.js UI + API route handlers (only thin orchestration)
- apps/worker: BullMQ jobs (scripts/scoring/report/retention)
- apps/sidecar: Go proxy (capture/redact/classify/ship)
- packages/shared: Zod schemas + shared TS types (import from here)

Do not mix responsibilities across these boundaries.

## Fixture-first UI rule

- /runs/[runId] MUST render fully using fixtures when:
  NEXT_PUBLIC_USE_FIXTURES=true
- Use a RunDataSource abstraction with FixtureRunDataSource and ApiRunDataSource.
- Do not block UI progress on backend completion.

## Multi-tenancy and security

- Every DB row must include org_id and every query must filter org_id.
- Never store raw secrets. Store only hash + preview + confidence.
- Sidecar tokens are stored hashed; plaintext shown once.
- Env guardrails: prod runs disabled unless override enabled (per spec).

## Data modeling rules

- Events are append-only. Never mutate events.
- StorySteps are derived/projection. Keep creation deterministic.
- IDs are UUIDs in real code; fixtures may use string ids.

## Coding standards

TypeScript:

- strict mode on
- use Zod for request validation
- prefer pure functions for transforms
- handle empty/loading/error states in UI

Go:

- gofmt + goimports
- minimal dependencies
- context-aware HTTP calls, retries on ingest
- never log secrets

## Testing

- Implement golden-path tests from spec/TESTS.md.
- Prefer deterministic unit tests for scripts and evidence chain builder.

## UI requirements (non-negotiable)

- Narrative Exploit Feed first, not logs.
- Proof Drawer shows chain-of-evidence cards, not raw JSON.
- Replay syncs feed highlight + conversation + network cards by seq/time.
