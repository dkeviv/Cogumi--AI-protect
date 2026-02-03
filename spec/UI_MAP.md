# spec/UI_MAP.md — Implementation-Grade UI Map (Copilot Ready)

This is the UI source-of-truth. It defines:

- routes
- page layouts
- components and file paths
- props/state/events
- API calls
- rendering rules for "Exploit Feed → Proof → Replay"
- live vs replay behaviors
- loading/empty/error states

Tech assumptions:

- Next.js App Router
- TypeScript
- Tailwind
- No heavy UI libs required (optional shadcn later)

---

## Color Scheme & Branding

### Primary Colors
- **Brand Gradient**: Blue-600 → Rose-500 (subtle red team reference)
  - `bg-gradient-to-r from-blue-600 to-rose-500`
- **Primary CTA**: Blue-600 / Blue-700 (solid buttons)
- **Hero Background**: Blue-50 gradient to white
- **Text on colored backgrounds**: Blue-100 (subtle text on blue backgrounds)

### Feature Accents
- **Security/Trust features**: Blue-600 (e.g., Secret Detection)
- **Advanced features**: Indigo-600 (e.g., Privilege Escalation)
- **Red Team features**: Rose-600 (e.g., Social Engineering)

### Usage
- Logo: Blue-600 → Rose-500 gradient text
- Headlines: Blue-600 → Rose-500 gradient for emphasis
- CTAs: Solid Blue-600 for primary actions
- Cards: Hover states use respective accent colors (blue-300, indigo-300, rose-300)
- Step indicators: Blue-600 solid circles
- Footer: Blue-400 → Rose-400 gradient for logo

### Marketing Copy
- **Hero tagline**: "Battle test your agents to make sure they don't leak secrets, attempt privileged actions, or become compromised by social engineering — with a replay and chain of evidence."
- **Positioning**: Pre-deployment testing, no production deployment required
- **Trust indicators**: <10min to first test, Zero trust (no TLS decryption), 100% your environment, Live replay

---

## 0) UX Principles (Non-negotiable)

1) Default view is NARRATIVE (Exploit Feed), not a logs table.
2) Proof is a CHAIN OF EVIDENCE card stack, not raw JSON.
3) Replay is a synchronized "movie mode":
   - feed highlights
   - conversation bubbles
   - network cards
     all sync to the same `currentSeq` (or `currentTs` if seq absent).
4) Attempts are first-class evidence.
5) Never show raw secrets. Only show match kind + preview (e.g. "sk-…d9") + confidence.

---

## 1) Routes & Pages

### 1.1 `/` Org Dashboard

**File:** `apps/ui/app/page.tsx`

**Layout**

- Top: Org header + user menu
- Main: two columns on desktop
  - Left: Projects list
  - Right: Recent runs + top findings

**Components**

- `components/nav/AppHeader.tsx`
- `components/org/ProjectsList.tsx`
- `components/org/RecentRunsList.tsx`
- `components/org/TopFindingsPreview.tsx`

**API**

- GET `/api/projects`
- (optional) GET `/api/projects/:id/runs?limit=5` for each project OR a single endpoint later

**States**

- Loading skeletons
- Empty: "Create your first project" CTA
- Error: retry button

---

### 1.2 `/projects/:projectId` Project Overview

**File:** `apps/ui/app/projects/[projectId]/page.tsx`

**Layout**

- Header: Project name + environment badge + last seen
- Body: 2 columns
  - Left: Connect status + quick actions
  - Right: Runs table

**Components**

- `components/project/ProjectHeader.tsx`
- `components/project/ConnectStatusCard.tsx`
- `components/project/QuickActions.tsx` (Connect / Run / Settings)
- `components/project/RunsTable.tsx`

**API**

- GET `/api/projects/:id`
- GET `/api/projects/:id/runs` (implement)
- Uses `last_seen_at` derived from sidecar token heartbeat or last event time

**States**

- If no token exists: show "Generate token" CTA
- If no agent_test_url: show "Add Agent Endpoint" CTA

---

### 1.3 `/projects/:projectId/connect` Connect Wizard

**File:** `apps/ui/app/projects/[projectId]/connect/page.tsx`

**Goal:** first wow in <10 mins.

**Components**

- `components/connect/ConnectWizard.tsx` (state machine)
- `components/connect/WizardStepper.tsx`
- `components/connect/SnippetPanel.tsx`
- `components/connect/VerifySidecarCard.tsx`
- `components/connect/AgentEndpointCard.tsx`
- `components/connect/RunFirstCampaignCard.tsx`

**Wizard steps**

1. Project basics
2. Deploy sidecar
3. Verify sidecar
4. Agent endpoint
5. First run

**API**

- GET `/api/projects/:id`
- GET `/api/projects/:id/connect-snippets`
- POST `/api/projects/:id/tokens` (if none)
- POST `/api/projects/:id/validate-agent-endpoint`
- POST `/api/projects/:id/runs`

**Rendering rules**

- Show `SIDECAR_TOKEN` only once right after creation (modal with "I saved it" checkbox)
- Copy buttons must copy raw text
- Verify sidecar shows:
  - last_seen_at
  - last_event_at
  - events/min in last 1m
- First run CTA disabled until:
  - sidecar verified
  - agent endpoint validated
  - env gating allows (or override)

---

### 1.4 `/projects/:projectId/settings` Project Settings

**File:** `apps/ui/app/projects/[projectId]/settings/page.tsx`

**Components**

- `components/settings/EnvironmentCard.tsx`
- `components/settings/ProdOverrideModal.tsx`
- `components/settings/AgentEndpointSettings.tsx`
- `components/settings/DomainsSettings.tsx`
- `components/settings/RedTeamStylesSettings.tsx`
- `components/settings/TokensManager.tsx`
- `components/settings/UsageLimitsCard.tsx`

**API**

- GET `/api/projects/:id`
- PATCH `/api/projects/:id`
- POST `/api/projects/:id/tokens`

**Prod override flow**

- toggle "Enable runs in prod"
- opens modal with checklist (3 checkboxes)
- confirm -> PATCH project with `prod_override_enabled=true`
- show audit banner "Prod override enabled" (read-only display; no audit UI MVP)

---

### 1.5 `/runs/:runId` Run Live + Replay (The Wedge)

**File:** `apps/ui/app/runs/[runId]/page.tsx`

This page must work in both modes:

- live: run.status in {queued,running}
- replay: completed/failed

**Global page state**

- `run` object (status, env badge, risk_score)
- `steps: StoryStep[]`
- `findings: Finding[]`
- `eventsCache` paged store keyed by seq ranges
- `currentSeq` (int) OR `currentTs` fallback

**Layout (desktop)**

- Header (full width)
- Body 3-column grid:
  - Left: Exploit Feed (fixed width)
  - Center: Timeline + context highlight (flex)
  - Right: Evidence Tabs (fixed width)
- Proof drawer overlays from right

**Components**

- `components/run/RunHeader.tsx`
- `components/run/ExploitFeed.tsx`
- `components/run/TimelineScrubber.tsx`
- `components/run/EvidenceTabs.tsx`
- `components/run/ProofDrawer.tsx`
- `components/run/LiveSseClient.tsx` (hook/component)
- `components/run/ReplayControls.tsx` (optional)

**API**

- GET `/api/runs/:id`
- GET `/api/runs/:id/story`
- GET `/api/runs/:id/findings`
- GET `/api/runs/:id/events?after_seq&limit`
- SSE GET `/api/runs/:id/stream` (live only)
- POST `/api/runs/:id/report`
- GET `/api/runs/:id/report`

**Live behavior**

- On SSE `story.step.created`: append to steps and auto-scroll feed unless user scrolled away
- On SSE `finding.created`: toast + update findings list
- Provide "Jump to latest" button in timeline

**Replay behavior**

- No SSE
- timeline scrubber controls `currentSeq`
- play/pause increments `currentSeq` through marker ranges

---

### 1.6 `/runs/:runId/report`

**File:** `apps/ui/app/runs/[runId]/report/page.tsx`

**Components**

- `components/report/MarkdownReportViewer.tsx`
- `components/report/DownloadMdButton.tsx`

**API**

- GET `/api/runs/:id/report`

---

## 2) Run Page Component Specs (Detailed)

### 2.1 `ExploitFeed`

**File:** `components/run/ExploitFeed.tsx`

Props:

- `steps: StoryStep[]`
- `selectedStepId?: string`
- `onSelectStep(step: StoryStep)`
- `onOpenProof(step: StoryStep)`
- `live: boolean`

Rendering:

- Card for each step, newest at bottom (or top; choose one and keep consistent)
- Each card shows:
  - icon by step_kind
  - severity badge
  - title + summary
  - chips: script_id, attack_style
  - "Proof" button
- When a step is selected:
  - highlight
  - trigger timeline jump to seq_start/seq_end

Empty state:

- "Waiting for first evidence…" (live)
- "No story steps found." (replay)

---

### 2.2 `TimelineScrubber`

**File:** `components/run/TimelineScrubber.tsx`

Props:

- `markers: { seq:number; label:string; kind:'script'|'confirmed'|'attempt'|'quota' }[]`
- `currentSeq: number`
- `minSeq: number`
- `maxSeq: number`
- `onChangeSeq(seq:number)`
- `onJumpLatest()`
- `live:boolean`

Rules:

- Markers clickable -> jump to marker seq
- In live mode, maxSeq updates as new steps arrive

Fallback:

- If seq is missing, use ts-based slider (v2). MVP assumes seq exists for run events.

---

### 2.3 `EvidenceTabs`

**File:** `components/run/EvidenceTabs.tsx`

Props:

- `runId: string`
- `currentSeq: number`
- `onOpenProofFromEvent(eventId: string)`
- `eventsProvider: (range) => Promise<Event[]>` (or hook)

Tabs and their filtering:

#### ConversationTab

- show events where type == `agent.message`
- show bubble alignment:
  - adversary left
  - target right
- show `attack_style` if present in payload summary

#### NetworkProofTab

- show events where channel == `http` AND type in {request,response,blocked}
- render `NetworkCard`:
  - method
  - host/path
  - status (if response)
  - bytes_out/in
  - duration
  - classification pill

Filters:

- classification chip filters
- method chip filters (optional)

#### FindingsTab

- list findings
- click -> open proof drawer using finding.evidence_event_ids

#### PolicyTab

- show events where type == policy.violation OR blocked
- show reasons and counts

#### MemoryTab

- MVP: show story/finding that indicates poisoning. No explicit memory integration required.

---

### 2.4 `ProofDrawer`

**File:** `components/run/ProofDrawer.tsx`

Props:

- `open: boolean`
- `title: string`
- `subtitle?: string`
- `evidence: EvidenceCardModel[]`
- `onClose()`
- `onJump(seqStart?:number, seqEnd?:number, eventId?:string)`

EvidenceCardModel:

- `kind: 'conversation'|'network'|'detector'|'policy'|'info'`
- `headline: string`
- `bodyLines: string[]`
- `eventId?: string`
- `jump: { seqStart?:number; seqEnd?:number }`

Rendering rules:

- Always render as cards, never JSON.
- If matches exist, show:
  - kind + preview + confidence
- Never reveal secret contents.

---

## 3) Evidence Chain Construction Rules

The ProofDrawer should be driven by a helper:

- `buildEvidenceChain(stepOrFinding, eventsById) => EvidenceCardModel[]`

Rules:

- Preferred chain (when available):
  1) Adversary message event
  2) Target message event
  3) Network attempt request/response events
  4) Detector match event (secret.detected or matches on message)
- If only network exists: show network attempt + narrative explanation.
- If only conversation exists: show conversation + "No network attempt observed".

---

## 4) Live Data Handling (SSE)

### `useRunStream(runId)`

- opens SSE stream
- handles reconnect with exponential backoff
- on message:
  - update run status
  - append story steps
  - append findings

### UX

- show "Live" pill in header
- show spinner when reconnecting
- show "Disconnected, retrying…" banner (non-blocking)

---

## 5) Loading/Error/Empty States (must implement)

Every page:

- skeleton loading
- error panel with retry

Run page:

- if run.status=queued:
  - show "Queued… waiting for worker"
- if failed:
  - show reason and still allow replay of any collected steps/events

---

## 6) “Not decrypting TLS” Messaging (Feature)

Add a small info badge on:

- Project settings
- Run header

Text:

- "TLS payloads are not decrypted. Evidence is based on agent behavior + network intent."

---

## 7) Minimum CSS/Design requirements (wow without heavy design)

- Cards with subtle shadows
- Clear severity colors
- Animations:
  - step enters with slide/fade
  - confirmed exploit gets brief highlight pulse
- Timeline markers visually distinct
