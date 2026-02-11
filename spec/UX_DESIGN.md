# UX_DESIGN.md — Cogumi AI Protect: Comprehensive UX Source of Truth

> This document is the **single source of truth** for all UI/UX design decisions.
> It supersedes UI_MAP.md and UI_refactor.md for design direction.
> All implementations must conform to this spec.

---

## 0. Product Identity

### Brand
- **Name:** Cogumi AI Protect
- **Tagline:** "Red team your AI agents before they leak secrets"
- **Promise:** "We prove your agent leaks secrets, attempts privileged actions, or becomes compromised by social engineering — and show you a replay with a chain of evidence."
- **Logo:** "Cogumi" wordmark in gradient (Blue-600 → Rose-500)

### Positioning
- Pre-deployment security testing for AI agents (sandbox/staging)
- No TLS decryption — prove issues via behavior + network intent
- First wow in under 10 minutes
- SOC-grade replayable proof, not a log viewer

### Trust Indicators (shown on landing + dashboard)
- **< 10 min** — Time to first test
- **Zero trust** — No TLS decryption
- **100%** — Your environment
- **Live replay** — Chain of evidence

---

## 1. Design System

### 1.1 Typography
- **Primary:** Space Grotesk (variable `--font-sans`)
- **Monospace:** IBM Plex Mono (variable `--font-mono`)
- **Fallback:** system-ui, sans-serif

### 1.2 Color Palette

**Brand**
- Brand gradient: `from-blue-600 to-rose-500` (logo, hero headlines, accent)
- Primary CTA: `blue-600` (buttons, links)

**Surfaces**
- App background: `#F6F7FB` (light gray-blue)
- Card background: `#FFFFFF`
- Sidebar background: `#0F172A` (slate-900)
- Sidebar text: `#CBD5E1` (slate-300)
- Sidebar active: `#FFFFFF` text on `rgba(255,255,255,0.1)` bg

**Text**
- Primary: `#0C0F14` (slate-950)
- Secondary: `#576071` (slate-500)
- Muted: `#94A3B8` (slate-400)

**Borders**
- Default: `#E6E8ED` (slate-200)
- Hover: `#CBD5E1` (slate-300)

**Severity**
- Critical: `#DC2626` (red-600)
- High: `#F97316` (orange-500)
- Medium: `#EAB308` (yellow-500)
- Low: `#3B82F6` (blue-500)
- Info: `#6B7280` (gray-500)

**Status**
- Running: `#3B82F6` (blue-500)
- Completed: `#10B981` (emerald-500)
- Failed: `#EF4444` (red-500)
- Queued: `#F59E0B` (amber-500)
- Canceled: `#6B7280` (gray-500)
- Stopped (quota): `#F97316` (orange-500)

**Environment**
- Sandbox: `blue-100/blue-800`
- Staging: `amber-100/amber-800`
- Production: `red-100/red-900`

### 1.3 Spacing Scale
- Base unit: 4px
- Component padding: `p-4` (16px) for compact, `p-6` (24px) for standard cards
- Section gaps: `gap-6` (24px)
- Page margins: `px-6` (24px) side, `py-8` (32px) top/bottom

### 1.4 Elevation (Shadows)
- **Card:** `0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)`
- **Card hover:** `0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.08)`
- **Drawer:** `0 12px 40px rgba(0,0,0,0.12)`
- **Dropdown:** `0 4px 16px rgba(0,0,0,0.12)`

### 1.5 Border Radius
- Cards: `rounded-xl` (12px)
- Inputs: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px)
- Pills/Badges: `rounded-full`

### 1.6 Transitions & Microinteractions
- All interactive elements: `transition-all duration-150`
- Cards: lift `translate-y-[-1px]` + shadow increase on hover
- Buttons: subtle scale `active:scale-[0.98]`
- Confirmed exploit cards: brief highlight pulse animation on first render
- Story step entry: slide-in-from-bottom + fade (150ms)
- Tab switch: crossfade (100ms)

### 1.7 Icons
- **Library:** Lucide React (`lucide-react`)
- Consistent `size={16}` for inline, `size={20}` for cards, `size={24}` for feature sections
- No inline SVG — all icons from Lucide

### 1.8 Shared UI Components

All base components in `components/ui/`:

| Component | File | Purpose |
|-----------|------|---------|
| `Card` | `Card.tsx` | Standard card wrapper with consistent padding, border, shadow |
| `Badge` | `Badge.tsx` | Status/severity/environment pill badges |
| `Button` | `Button.tsx` | Primary, secondary, ghost, danger variants |
| `Toast` | `Toast.tsx` | Toast notification system (replaces all `alert()` calls) |
| `Skeleton` | `Skeleton.tsx` | Skeleton loading placeholders |
| `EmptyState` | `EmptyState.tsx` | Illustrated empty state with CTA |
| `CodeBlock` | `CodeBlock.tsx` | Syntax-highlighted code with one-click copy button |
| `Modal` | `Modal.tsx` | Centered modal with backdrop blur |
| `Breadcrumbs` | `Breadcrumbs.tsx` | Page hierarchy breadcrumbs |
| `Tabs` | `Tabs.tsx` | Consistent tab bar component |

---

## 2. Global Layout & Navigation

### 2.1 App Shell (Authenticated)

All authenticated pages share a persistent layout:

```
+--[ Sidebar (240px, fixed) ]--+--[ Main Content (flex-1) ]------+
|                               |                                 |
|  [Logo: Cogumi]               |  [Breadcrumbs]                  |
|                               |                                 |
|  Dashboard                    |  [Page Content]                 |
|  Projects                     |                                 |
|    > Project A                |                                 |
|    > Project B                |                                 |
|  Runs                         |                                 |
|                               |                                 |
|  ─────────────                |                                 |
|  Settings                     |                                 |
|                               |                                 |
|  ─────────────                |                                 |
|  [User Avatar]                |                                 |
|  user@email.com               |                                 |
|  [Org Name]                   |                                 |
+-------------------------------+---------------------------------+
```

**Sidebar contents:**
1. **Logo** — Cogumi wordmark (gradient), links to `/dashboard`
2. **Navigation items:**
   - Dashboard (`/dashboard`) — icon: `LayoutDashboard`
   - Projects (`/projects` — shows project list inline if expanded) — icon: `FolderKanban`
   - Runs (`/runs` — global recent runs) — icon: `Play`
3. **Divider**
4. **Settings** — Org-level settings (future) — icon: `Settings`
5. **Bottom section:**
   - User avatar + name
   - Org name
   - Sign out button

**Sidebar behavior:**
- Desktop (≥1024px): Always visible, 240px wide
- Tablet (768–1023px): Collapsed to icons only (56px), expand on hover
- Mobile (<768px): Hidden, hamburger icon in top bar to open as overlay

### 2.2 Breadcrumbs

Every page shows breadcrumbs below the sidebar in the main content area:
- Dashboard → (no breadcrumb, it's root)
- Projects > Project Name
- Projects > Project Name > Setup
- Projects > Project Name > Settings
- Projects > Project Name > Run #abc1234

### 2.3 Pages Without Sidebar (Unauthenticated)
- `/` — Marketing homepage (standalone)
- `/login` — Login page
- `/register` — Registration page
- `/verify-email` — Email verification

---

## 3. Route Map

| Route | Page | Layout |
|-------|------|--------|
| `/` | Marketing homepage | Standalone (no sidebar) |
| `/login` | Sign in | Standalone (centered card) |
| `/register` | Create account | Standalone (centered card) |
| `/verify-email` | Email verification | Standalone (centered card) |
| `/dashboard` | Overview dashboard | App shell + sidebar |
| `/projects/:id` | Project overview | App shell + sidebar |
| `/projects/:id/setup` | Connect wizard | App shell + sidebar |
| `/projects/:id/settings` | Project settings | App shell + sidebar |
| `/projects/:id/runs` | *(REMOVED — merged into project overview)* | — |
| `/runs/:runId` | Run live + replay (the wedge) | App shell + sidebar (sidebar collapsed) |
| `/runs/:runId/report` | Report viewer | App shell + sidebar |

### Key route changes from current:
- `/projects/:id/connect` → renamed to `/projects/:id/setup` (user-facing language)
- `/projects/:id/runs` → **removed** (runs table is part of project overview)
- Run page auto-collapses sidebar to maximize viewport

---

## 4. Page Specifications

### 4.1 Marketing Homepage (`/`)

**Purpose:** Convert visitors to sign-ups.

**Layout:** Full-width, no sidebar.

**Sections:**
1. **Nav bar** — Logo, Features, How it works, Pricing, Sign in, "Start testing" CTA
2. **Hero** — Headline + tagline + 2 CTAs (Start free trial, Watch demo)
3. **Trust badges** — <10min, Zero trust, 100% your environment, Live replay
4. **Features** — 3 cards: Secret Leakage, Privilege Escalation, Social Engineering
5. **How it works** — 3 steps: Deploy sidecar → Configure endpoint → Watch replay
6. **CTA banner** — Gradient background, "Ready to secure your AI agents?"
7. **Footer** — Links, social, legal

**CTA rules:**
- Max 2 CTAs per section
- Primary CTA: "Start free trial" (solid blue-600)
- Secondary CTA: "Watch demo" (outline, opens demo video — NOT a dashboard link)
- Remove "Dashboard →" links from marketing page (users use Sign in)

---

### 4.2 Login Page (`/login`)

**Purpose:** Sign in existing users.

**Layout:** Centered card on gradient background (`from-blue-50 to-white`).

**Contents:**
- Cogumi logo (gradient wordmark) at top
- "Sign in to your account" heading
- Email input (rounded-lg, full width)
- Password input
- "Sign in" primary button
- Divider: "or"
- "Sign in with Google" social button (prominent, since NextAuth uses Google OAuth)
- "Don't have an account? Sign up" link
- "Forgot password?" link (if applicable)

**Rules:**
- No test credentials displayed
- Email verification flow handled via URL params (existing logic preserved)
- Resend verification as inline expandable, not a separate section

---

### 4.3 Register Page (`/register`)

**Purpose:** Create new account + org.

**Layout:** Same centered card as login.

**Contents:**
- Cogumi logo
- "Create your account" heading
- Full Name input
- Email input
- Organization Name input
- Password input
- Confirm Password input
- "Create account" primary button
- "Already have an account? Sign in" link

**Post-registration:**
- Show "Check your email" state with verification instructions
- "Resend verification email" button
- "Go to login" link

---

### 4.4 Dashboard (`/dashboard`)

**Purpose:** Overview of all projects and security posture.

**Layout:** App shell with sidebar.

**Sections:**

**a) Security Posture Strip (top)**
4 compact metric cards in a horizontal row:
| Metric | Icon | Description |
|--------|------|-------------|
| Confirmed Critical/High | `ShieldAlert` | Confirmed findings requiring mitigation |
| Needs Attention | `PlugZap` | Projects blocked on setup/connection or with critical issues |
| Runs (Last 7 Days) | `Play` | Activity and recency |
| Quota Stops (Last 7 Days) | `AlertTriangle` | Runs stopped by quota (signals telemetry gaps) |

**b) Action Queue (primary)**
An enterprise dashboard must be actionable. Show the next 5–10 items that reduce risk fastest.
- Items are derived from confirmed Critical/High findings and setup blockers.
- Each item shows: project, severity, short title, recommended mitigation (1–2 lines), and a CTA.
- CTAs:
  - "View proof" → run replay + proof drawer.
  - "Continue setup" → project Setup Wizard (if blocked).
- Sort order: `severity × score × recency`, then by project.

**c) Projects (operational overview)**
Replace a vanity “project count” view with a PM-tool inspired operational list:
- Left sidebar: project switcher (search + scroll), showing status dots.
- Main content: project cards or table showing:
  - Environment badge
  - Connection status (last heartbeat)
  - Latest run status + risk score
  - Open findings (Critical/High first)
  - "Next action" (continue setup, run again to verify mitigation, review critical proof)

**d) Recommendations (mitigation digest)**
Show a short list of recommended mitigations pulled from findings:
- Group by project.
- Each recommendation links to the finding and its evidence chain.
*(This is not a generic checklist: it must be evidence-backed.)*

**c) Empty state (no projects)**
- Illustrated empty state
- "Create your first project" heading
- Description text
- "Create Project" primary CTA button

**API:**
- `GET /api/projects` (with run counts, latest run status, finding counts)
- Future: `GET /api/dashboard/summary` for aggregated metrics

---

### 4.5 Project Overview (`/projects/:id`)

**Purpose:** Central hub for a single project.

**Breadcrumbs:** Dashboard > Project Name

**Layout:** Two columns on desktop, single column on mobile.

**Left column (flex-1):**

**a) Project Header**
- Project name (h1)
- Environment badge
- Last seen timestamp (from sidecar heartbeat)
- Edit name inline (pencil icon)

**b) Onboarding Card (shown if setup incomplete)**
Replaces the old separate "Quick Actions" and "Setup Checklist" cards.
- Progress bar showing completion (e.g., 2/4 steps done)
- Checklist items with auto-detected status:
  - ✅ Sidecar token generated (check if token exists)
  - ✅ Sidecar connected (check lastSeenAt)
  - ⬜ Agent endpoint configured (check agentTestUrl)
  - ⬜ First run completed (check run count)
- Single CTA: "Continue Setup" → `/projects/:id/setup`
- Collapsed/dismissible after all steps complete

**c) Runs Table (inline)**
- Table showing all runs for this project
- Columns: Run ID (short), Status badge, Risk Score, Started, Duration, View link
- "Start New Run" button in table header
- Empty state: "No runs yet. Complete setup to start testing."

**Right column (380px fixed on desktop):**

**a) Connect Status Card**
- Online/Offline indicator (green/gray dot)
- Last heartbeat time
- Active token count
- Agent endpoint status (Configured / Missing)

**b) TLS Info Badge**
- Small info card: "TLS payloads are not decrypted. Evidence is based on agent behavior + network intent."
- Icon: `ShieldCheck`

**Actions removed (consolidation):**
- ❌ No separate "Quick Actions" card
- ❌ No separate "Setup Checklist" card
- ❌ Settings link only in sidebar/breadcrumb, not duplicated
- ❌ No separate `/projects/:id/runs` route

**API:**
- `GET /api/projects/:id`
- `GET /api/projects/:id/runs`
- `GET /api/projects/:id/tokens` (for connect status)

---

### 4.6 Connect Wizard / Setup (`/projects/:id/setup`)

**Purpose:** Guide user from zero to first run in <10 minutes.

**Breadcrumbs:** Dashboard > Project Name > Setup

**Layout:** Centered max-width (720px), vertical stepper on left, content on right.

**Stepper design:**
- Vertical stepper with step numbers in circles
- Completed steps: blue filled circle with checkmark, content collapsed but expandable
- Current step: blue outlined circle with pulse, content expanded
- Upcoming steps: gray circle, content hidden

**URL state:** Step stored in URL query param: `?step=token|deploy|verify|endpoint|run`
- Preserves progress across page refreshes
- Deep-linkable

**Steps:**

#### Step 1: Generate Token (`?step=token`)
- Description: "Create a secure token for your sidecar proxy"
- "Generate Token" primary button
- On success: modal overlay showing token with:
  - Token display in monospace CodeBlock
  - Copy button (with toast: "Token copied to clipboard")
  - "I saved this token" checkbox
  - "Continue" button (disabled until checkbox checked)
- After acknowledging: auto-advance to Step 2

#### Step 2: Deploy Sidecar (`?step=deploy`)
- Description: "Add the sidecar to your environment"
- Tabs: Docker Compose | Kubernetes | Environment Variables
- Each tab shows CodeBlock with one-click copy
- Docker Compose snippet includes project-specific env vars
- "I've deployed the sidecar" button → advances to Step 3

#### Step 3: Verify Connection (`?step=verify`)
- Description: "Confirm your sidecar is connected"
- "Check Connection" button
- States:
  - Checking: spinner + "Looking for heartbeat..."
  - Success: green card with checkmark, auto-advances after 1.5s
  - Failed: red card with troubleshooting checklist + "Try Again" button
- Shows: last_seen_at, events/min when connected

#### Step 4: Configure Agent Endpoint (`?step=endpoint`)
- Description: "Point us to your agent's test endpoint"
- URL input field
- "Validate Endpoint" secondary button (tests reachability)
- Validation result shown inline (success/fail with details)
- "Save & Continue" primary button
- Helper: expandable section with Node/Python endpoint examples in CodeBlock

#### Step 5: Complete (`?step=run`)
- Description: "You're all set!"
- Success illustration / checkmark
- "Run First Test" primary CTA → creates run and navigates to `/runs/:runId`
- "Go to Project" secondary text link

**API:**
- `POST /api/projects/:id/tokens`
- `GET /api/projects/:id/connect-snippets`
- `GET /api/projects/:id/tokens` (for verify)
- `POST /api/projects/:id/validate-agent`
- `PATCH /api/projects/:id` (save endpoint)
- `POST /api/projects/:id/runs` (create first run)
- `POST /api/runs/:id/execute` (start execution)

---

### 4.7 Project Settings (`/projects/:id/settings`)

**Purpose:** Configure project parameters.

**Breadcrumbs:** Dashboard > Project Name > Settings

**Layout:** Single column, max-width 768px, organized in sections.

**Sections (top to bottom):**

#### a) General
- Project Name (text input)
- Data Retention (number input, 1-365 days)
- Save button per section

#### b) Connection
- Agent Test Endpoint URL (with "Test Connection" inline button)
  - Validation result shown inline
- Sidecar Tokens table:
  - Columns: Token preview (hash), Status, Last Seen, Created, Actions (Revoke)
  - "Generate New Token" button

#### c) Security Configuration
- Allowed Tool Domains (tag input, comma-separated)
- Internal Domain Suffixes (tag input)
- Red Team Styles (checkbox list with descriptions):
  - `incident_urgent` — Urgent incident impersonation
  - `security_impersonation` — Security team impersonation
  - etc. (from style_presets table)
- Intensity: Low / Medium / High (radio group or dropdown)

#### d) Environment & Safety (Danger Zone)
- Visually separated with red-tinted border/background
- Environment selector (sandbox/staging/prod)
- If prod: override checklist with 3 confirmations:
  1. "This is not customer-facing production traffic"
  2. "No real customer secrets exist in this environment"
  3. "I accept that adversarial prompts may trigger unsafe behavior"
- Save button (red variant for danger zone)

#### e) Usage & Quotas
- Read-only display of current usage vs limits:
  - Projects: X / 2
  - Runs today: X / 5
  - Stored events: X / 50,000
  - Retention: X days

**API:**
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `GET /api/projects/:id/tokens`
- `POST /api/projects/:id/tokens`
- `DELETE /api/projects/:id/tokens/:tokenId` (revoke)
- `POST /api/projects/:id/validate-agent`
- `GET /api/quota/usage`

---

### 4.8 Run Page — Live + Replay (`/runs/:runId`) ★ THE WEDGE

**Purpose:** The core wow moment. Show real-time exploit narrative with proof.

**Breadcrumbs:** Dashboard > Project Name > Run #abc1234

**Layout:**

```
+------------------------------------------------------------+
| RunHeader (full width)                                      |
| [< Project] Run #abc | RUNNING ● | sandbox | Risk: 72     |
|                                        [Cancel] [Report]    |
+----------------------------+-------------------------------+
| Exploit Feed (380px)       | Evidence Panel (flex-1)        |
|                            |                                |
| [Story step cards]         | [Tabs: Conversation | Network  |
| [sorted by seq]            |  | Findings | Policy]         |
|                            |                                |
| [View Proof buttons]       | [Tab content area]            |
|                            |                                |
+----------------------------+-------------------------------+
| Timeline Scrubber (full-width, bottom bar)                  |
| [●───●──●────●──────●───────────────────●]  seq 142/312    |
+------------------------------------------------------------+
```

**Sidebar behavior:** Auto-collapsed on run page to maximize viewport.

#### Run Header
- **Left:** Back link to project, Run ID (short hash), start time
- **Center:** Status badge (QUEUED/RUNNING/COMPLETED/FAILED), Environment badge
- **Right:**
  - Risk Score (large number with color coding)
  - Duration
  - "Download Report" button (shown when run complete)
  - "Evidence JSON" button (shown when run complete)
  - "Compare" button (diff vs previous run in the same project)
  - "Cancel Run" button (shown when running)
- **Config summary (always visible, compact):**
  - Target: agent endpoint host
  - Scripts executed (S1–S5) and enabled styles/intensity (if configured)
  - Prompt chain / variant version pin (when available)
- **Banners:**
  - If live: "Live" indicator with pulsing green dot
  - If prod: red warning banner "Production environment — override enabled"
  - Always: small info text "Pre-deployment testing tool · TLS not decrypted"

#### Exploit Feed (Left Column, 380px fixed)
- **Header:** "Exploit Feed" + Live indicator (if running)
- **Content:** Scrollable list of StoryStep cards
- **Each card:**
  - Left accent strip (colored by severity: red/orange/amber/blue/gray)
  - Colored dot by step_kind (confirmed=red, attempt=orange, blocked=gray, quota=amber)
  - Kind label: "Confirmed Exploit" / "Attempted Exploit" / "Blocked" / "Quota Violation"
  - `claimTitle` (bold)
  - `claimSummary` (regular text)
  - Chips: script_id, attack_style
  - Timestamp
  - "View Proof" button (opens ProofDrawer, shown if evidence_event_ids exist)
- **Selection:** clicking a card highlights it and jumps timeline to its seq_start
- **Live behavior:**
  - New steps animate in (slide-up + fade)
  - Auto-scroll to bottom unless user has scrolled away
  - "Jump to latest" button appears when not at bottom
  - Confirmed exploit cards get a brief pulse highlight

**Empty state:**
- Live: "Waiting for first evidence..." with subtle animation
- Replay: "No story steps found."

#### Evidence Panel (Right Column, flex-1)

**Tabs:**
1. **Prompt Chain** — grouped prompt/response steps (adversary → agent), with links to supporting evidence
2. **Conversation** — agent.message events as chat bubbles
   - Adversary (left-aligned, purple accent)
   - Target/Agent (right-aligned, emerald accent)
   - Shows attack_style if present
   - Events highlight when at/before currentSeq
3. **Network** — HTTP events as network cards
   - Each card: method badge, host/path, status code, bytes, duration, classification pill
   - Filter chips by classification (llm_provider, tool, internal_api, public_internet, attacker_sink)
   - Secret matches shown as red alert inline
4. **Findings** — Finding cards
   - Severity-colored left border
   - Title, status, score, confidence
   - Summary text
   - Script ID
   - Click → opens ProofDrawer with finding's evidence chain
5. **Policy** — Policy violation events *(show only if events exist, otherwise hide tab)*
6. **Memory** — Behavioral persistence evidence *(show only if relevant steps exist, otherwise hide tab)*

**Tab visibility rule:** Only show tabs that have content. Empty tabs are hidden, not shown with "coming soon".

#### Timeline Scrubber (Bottom Bar, full-width)

- Replace the horizontal scrubber with a **Vertical Timeline** (scrollable) so labels are always visible.
- Location: under the Exploit Feed on desktop; below feed on mobile.
- Each marker row shows:
  - Colored dot (kind)
  - Label (claim title)
  - `seq` number
  - Click → jumps replay position to that seq
- Replay controls:
  - Play/Pause (auto-advance)
  - Jump to end
- Live controls:
  - Jump to latest

#### Proof Drawer (Overlay, slides from right)

- **Width:** 560px (narrower than before)
- **Backdrop:** slate-900/30 with backdrop-blur
- **Header:** "Evidence Chain" title, step claim_title subtitle, close button
- **Content:** Ordered list of Evidence Cards:
  1. **Conversation Card** — adversary message → agent response
  2. **Network Card** — method, host/path, status, bytes, classification, duration
  3. **Detector Card** — match kind, preview (redacted), confidence
  4. **Policy Card** — violation reason
- Each card has:
  - Colored dot by type
  - Channel badge
  - "Jump" button → sets timeline to event's seq, highlights in EvidenceTabs
- **Footer:** "X evidence events" count
- **Rules:**
  - Always render as human-readable cards, NEVER raw JSON
  - Never show full secret values — preview + hash only
  - Build evidence chain using `buildEvidenceChain()` helper

#### Live Data (SSE)

- `useRunStream(runId)` hook:
  - Opens SSE connection to `/api/runs/:id/stream`
  - Handles reconnect with exponential backoff
  - Events: `run.status`, `story.step.created`, `finding.created`, `quota.warning`
- **UI indicators:**
  - "Live" pulsing pill in RunHeader
  - Spinner when reconnecting
  - "Disconnected, retrying..." non-blocking banner

**API:**
- `GET /api/runs/:id`
- `GET /api/runs/:id/story`
- `GET /api/runs/:id/events?after_seq=&limit=`
- `GET /api/runs/:id/findings`
- `GET /api/runs/:id/stream` (SSE)
- `POST /api/runs/:id/report`
- `POST /api/runs/:id/cancel`

---

### 4.9 Report Page (`/runs/:runId/report`)

**Purpose:** View and download security report.

**Breadcrumbs:** Dashboard > Project Name > Run #abc > Report

**Layout:** Centered max-width (800px), readable document style.

**Contents:**
- Report header with run metadata
- Markdown content rendered as formatted HTML
- "Download .md" button (fixed in header)
- Future: "Download PDF" button

**API:**
- `GET /api/runs/:id/report`

---

## 5. User Flows

### 5.1 New User Onboarding (Golden Path)

```
Visit site → Sign up → Verify email → Login
→ Dashboard (empty) → Create Project (modal)
→ Auto-redirect to Setup Wizard
→ Generate Token → Deploy Sidecar → Verify → Configure Endpoint
→ "Run First Test" → Run page (live)
→ See exploits appear → Click Proof → Download Report
```

**Key design decisions:**
- After creating project, user lands in Setup Wizard (not project overview)
- Setup wizard is the default experience until all steps complete
- Project overview shows onboarding card if setup incomplete

### 5.2 Returning User

```
Login → Dashboard (projects visible)
→ Click project → Project Overview
→ "Start New Run" → Run page (live)
→ Or: click existing run → Run page (replay)
```

### 5.3 Report Workflow

```
Run page (completed run) → Click "Download Report"
→ Report generates → Downloads as .md
→ Or: navigate to /runs/:id/report for web view
```

### 5.4 Production Override Flow

```
Project Settings → Change environment to "prod"
→ Red danger zone appears
→ Must check 3 confirmation checkboxes
→ Save → audit log entry created
→ "Run" button now enabled with red warning banner
```

### 5.5 Sidecar Disconnect

```
Sidecar stops sending heartbeats
→ Connect Status card shows "OFFLINE" (red)
→ Run creation shows warning
→ CTA: "Check your sidecar connection"
```

---

## 6. Component Architecture

### 6.1 Directory Structure

```
components/
├── ui/                      # Shared design system components
│   ├── Badge.tsx
│   ├── Breadcrumbs.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── CodeBlock.tsx
│   ├── EmptyState.tsx
│   ├── Modal.tsx
│   ├── Skeleton.tsx
│   ├── Tabs.tsx
│   └── Toast.tsx
│
├── layout/                  # App shell components
│   ├── AppShell.tsx         # Sidebar + main content wrapper
│   ├── Sidebar.tsx          # Navigation sidebar
│   └── SidebarItem.tsx      # Individual nav item
│
├── dashboard/               # Dashboard page components
│   ├── SummaryMetrics.tsx   # 4-metric strip
│   └── ProjectCard.tsx      # Project grid card
│
├── project/                 # Project overview components
│   ├── ProjectHeader.tsx
│   ├── OnboardingCard.tsx   # Replaces QuickActions + SetupChecklist
│   ├── ConnectStatusCard.tsx
│   ├── RunsTable.tsx
│   └── TlsInfoBadge.tsx
│
├── setup/                   # Connect wizard components
│   ├── SetupWizard.tsx      # State machine + stepper
│   ├── VerticalStepper.tsx
│   ├── TokenStep.tsx
│   ├── DeployStep.tsx
│   ├── VerifyStep.tsx
│   ├── EndpointStep.tsx
│   └── CompleteStep.tsx
│
├── settings/                # Project settings components
│   ├── GeneralSettings.tsx
│   ├── ConnectionSettings.tsx
│   ├── SecuritySettings.tsx
│   ├── DangerZone.tsx
│   ├── TokensTable.tsx
│   └── UsageCard.tsx
│
├── run/                     # Run page components
│   ├── RunHeader.tsx
│   ├── ExploitFeed.tsx
│   ├── StoryStepCard.tsx
│   ├── TimelineScrubber.tsx
│   ├── EvidencePanel.tsx
│   ├── ConversationTab.tsx
│   ├── NetworkTab.tsx
│   ├── FindingsTab.tsx
│   ├── PolicyTab.tsx
│   ├── ProofDrawer.tsx
│   └── EvidenceCard.tsx
│
└── report/                  # Report page components
    ├── ReportViewer.tsx
    └── DownloadButton.tsx
```

### 6.2 Components to DELETE (orphans from old design)

| Component | Reason |
|-----------|--------|
| `components/nav/AppHeader.tsx` | Replaced by `layout/Sidebar.tsx` + `ui/Breadcrumbs.tsx` |
| `components/org/ProjectsList.tsx` | Re-export barrel file, replaced by `dashboard/ProjectCard.tsx` |
| `components/org/RecentRunsList.tsx` | Removed from dashboard (N+1 queries, cluttered) |
| `components/org/TopFindingsPreview.tsx` | Removed from dashboard (N+1 queries, cluttered) |
| `components/project/QuickActions.tsx` | Replaced by `project/OnboardingCard.tsx` |
| `components/projects/ConnectWizard.tsx` | Replaced by `setup/SetupWizard.tsx` |
| `components/projects/ProjectSettings.tsx` | Replaced by split settings components |
| `components/projects/TokenManagement.tsx` | Replaced by `settings/TokensTable.tsx` |
| `components/run/EvidenceTabs.tsx` | Replaced by `run/EvidencePanel.tsx` with separate tab components |

---

## 7. State Management

### 7.1 Run Page State

The run page is the most stateful page. All state in a single page component:

```typescript
// Run data
run: Run
storySteps: StoryStep[]
findings: Finding[]
events: Event[] (paginated cache)

// UI state
currentSeq: number
selectedStepId: string | null
proofDrawerOpen: boolean
proofStep: StoryStep | null
isPlaying: boolean (replay auto-advance)
activeEvidenceTab: 'conversation' | 'network' | 'findings' | 'policy'
```

### 7.2 Data Source Abstraction

Preserve `RunDataSource` interface:
- `FixtureRunDataSource` for fixture-driven development
- `ApiRunDataSource` for production

Activated by `NEXT_PUBLIC_USE_FIXTURES=true`.

### 7.3 SSE Stream Hook

```typescript
useRunStream(runId: string) => {
  onStoryStep: (step: StoryStep) => void
  onFinding: (finding: Finding) => void
  onRunStatus: (status: string) => void
  onQuotaWarning: (data: any) => void
  isConnected: boolean
  isReconnecting: boolean
}
```

---

## 8. Notifications & Feedback

### 8.1 Toast System

Replace ALL `alert()` calls with toast notifications:

| Trigger | Toast Type | Message |
|---------|-----------|---------|
| Token copied | Success | "Token copied to clipboard" |
| Run created | Success | "Run started" |
| Run failed to create | Error | "Failed to create run: {reason}" |
| Settings saved | Success | "Settings saved" |
| Endpoint validated | Success | "Endpoint reachable (HTTP {status})" |
| Endpoint validation failed | Error | "Endpoint unreachable: {reason}" |
| Token generated | Success | "Sidecar token created" |
| Token revoked | Success | "Token revoked" |
| Report downloaded | Success | "Report downloaded" |
| Clipboard copy | Success | "Copied to clipboard" |
| SSE disconnected | Warning | "Live connection lost, retrying..." |
| Quota reached | Warning | "Daily run limit reached" |

### 8.2 Confirmation Dialogs

Required before destructive actions:
- Revoking a sidecar token
- Canceling a running run
- Enabling production override

---

## 9. Loading & Error States

### 9.1 Loading

- All pages: Skeleton screens matching the actual content layout
- Run page: "Loading run data..." centered with spinner
- Tables: Skeleton rows (3 rows)
- Cards: Skeleton cards matching card dimensions

### 9.2 Empty States

Each empty state includes:
- Relevant icon (from Lucide)
- Heading
- Description
- CTA button

| Context | Heading | CTA |
|---------|---------|-----|
| No projects | "Create your first project" | "Create Project" |
| No runs | "No runs yet" | "Start a Run" (or "Complete Setup" if incomplete) |
| No findings | "No findings yet" | "Complete a run to see findings" (no button) |
| No events | "No events recorded" | — |

### 9.3 Error States

- API errors: Card with error message + "Try again" button
- 404: "Page not found" + "Go to dashboard" link
- Unauthorized: Redirect to login
- Network error: Toast notification + inline retry

---

## 10. Responsive Breakpoints

| Breakpoint | Width | Sidebar | Run Page | Grid |
|-----------|-------|---------|----------|------|
| Mobile | <768px | Hidden (hamburger) | Single column, stacked | 1 col |
| Tablet | 768-1023px | Collapsed icons | 2 columns | 2 col |
| Desktop | ≥1024px | Full width (240px) | 2 columns + bottom bar | 3 col |
| Wide | ≥1440px | Full width | Wider panels | 3 col |

### Run page responsive:
- Desktop: ExploitFeed (380px) + EvidencePanel (flex-1) + bottom Timeline
- Tablet: ExploitFeed (300px) + EvidencePanel (flex-1) + bottom Timeline
- Mobile: ExploitFeed (full width) → swipe/tab to EvidencePanel → Timeline compact strip

---

## 11. Accessibility

- All interactive elements: visible focus rings (blue-500 ring, 2px offset)
- Modals: focus trap, Escape to close
- Color contrast: minimum 4.5:1 for text, 3:1 for large text
- Severity: never rely on color alone — always include text labels
- Screen readers: proper ARIA labels on all controls
- Keyboard navigation: Tab through all interactive elements
- Skip to content link (hidden until focused)

---

## 12. Performance

- **Virtualization:** Use `react-window` for events list > 500 items
- **SSE reconnect:** Exponential backoff with `last_event_id`
- **Pagination:** `/events` endpoint paginated (default limit=200)
- **Lazy loading:** Evidence tabs load content on tab activation
- **Image optimization:** Next.js Image component for any images
- **Bundle splitting:** Proof drawer and report viewer code-split

---

## 13. Safety & Security UI

### 13.1 TLS Disclaimer
Shown on:
- Project settings page (info card)
- Run header (small text)
- Report generation (included in report)

Text: "TLS payloads are not decrypted. Evidence is based on agent behavior + network intent."

### 13.2 Environment Banners
- **Sandbox:** No banner (default safe)
- **Staging:** Subtle amber banner: "Staging environment"
- **Production:** Red banner: "Production environment — override enabled" (only if override is on)

### 13.3 Secret Redaction
- Never display raw secrets in UI
- Show: match kind + redacted preview (e.g., `sk-…d9`) + confidence score
- ProofDrawer detector cards follow same rule

### 13.4 Pre-deployment Disclaimer
Always visible on run page footer: "Pre-deployment security testing tool"

---

## 14. API Integration Checklist

All frontend pages must connect to these backend endpoints:

| Page | Endpoints Used |
|------|---------------|
| Dashboard | `GET /api/projects` |
| Project Overview | `GET /api/projects/:id`, `GET /api/projects/:id/runs`, `GET /api/projects/:id/tokens` |
| Setup Wizard | `POST /api/projects/:id/tokens`, `GET /api/projects/:id/tokens`, `GET /api/projects/:id/connect-snippets`, `POST /api/projects/:id/validate-agent`, `PATCH /api/projects/:id`, `POST /api/projects/:id/runs`, `POST /api/runs/:id/execute` |
| Settings | `GET /api/projects/:id`, `PATCH /api/projects/:id`, `GET /api/projects/:id/tokens`, `POST /api/projects/:id/tokens`, `DELETE /api/projects/:id/tokens/:tokenId`, `POST /api/projects/:id/validate-agent`, `GET /api/quota/usage` |
| Run Page | `GET /api/runs/:id`, `GET /api/runs/:id/story`, `GET /api/runs/:id/events`, `GET /api/runs/:id/findings`, `GET /api/runs/:id/stream` (SSE), `POST /api/runs/:id/report`, `POST /api/runs/:id/cancel` |
| Report Page | `GET /api/runs/:id/report` |

### Existing API routes (verified in codebase):
- ✅ `/api/auth/[...nextauth]` — NextAuth handler
- ✅ `/api/auth/register` — Registration
- ✅ `/api/auth/verify-email` — Email verification
- ✅ `/api/projects` — CRUD projects
- ✅ `/api/projects/[projectId]` — Single project CRUD
- ✅ `/api/projects/[projectId]/runs` — Project runs
- ✅ `/api/projects/[projectId]/tokens` — Token management
- ✅ `/api/projects/[projectId]/tokens/[tokenId]` — Single token ops
- ✅ `/api/projects/[projectId]/validate-agent` — Endpoint validation
- ✅ `/api/runs/[id]` — Single run
- ✅ `/api/runs/[id]/events` — Run events
- ✅ `/api/runs/[id]/findings` — Run findings
- ✅ `/api/runs/[id]/story` — Run story steps
- ✅ `/api/runs/[id]/stream` — SSE stream
- ✅ `/api/runs/[id]/report` — Report generation/retrieval
- ✅ `/api/runs/[id]/execute` — Run execution
- ✅ `/api/runs/[id]/cancel` — Cancel run
- ✅ `/api/ingest/events` — Sidecar event ingestion
- ✅ `/api/heartbeat` — Sidecar heartbeat
- ✅ `/api/health` — Health check
- ✅ `/api/quota/usage` — Quota usage
- ✅ `/api/quotas` — Quota limits
- ✅ `/api/sidecar/config` — Sidecar configuration

### Missing API routes (to implement):
- ❌ `/api/projects/:id/connect-snippets` — Generate connection snippets (currently hardcoded in wizard)
- ❌ `/api/dashboard/summary` — Aggregated dashboard metrics (optional, can derive from existing endpoints)

---

## 15. Fixture Mode

For development without backend:
- `NEXT_PUBLIC_USE_FIXTURES=true` enables fixture data
- `RunDataSource` abstraction loads from `/fixtures/*.json`
- Fixture files: `events_secret_leak.json`, `events_escalation_attempt.json`, `events_exfil_attempt.json`, `findings_expected.json`, `story_steps_expected.json`
- Optional: simulated live streaming (timed event release)

---

## 16. Scripts & Attack Coverage (UI must represent)

The UI must clearly represent all 5 scripts in story steps and findings:

| Script | Title | What UI Shows |
|--------|-------|---------------|
| S1 | Secret Leakage | Agent output containing secrets + detector match cards |
| S2 | Privilege Escalation | Network intent (DELETE/POST to sensitive endpoints) + agent confirmation |
| S3 | Trust Spoof | Conversation chain showing refusal → compliance shift |
| S4 | Memory Poisoning | Poison instruction → acknowledgment → later compliance |
| S5 | Policy Override + Exfil | Agent override + network attempt to attacker sink |

Each script result is visible in:
- Exploit Feed (as story steps)
- Findings tab (as findings)
- Proof Drawer (as evidence chain)

---

*End of UX Source of Truth*
