# USER_WORKFLOWS.md — Customer & User Journeys

This document describes **all user workflows** for the Agent Red Team SaaS.

Primary promise:

> “I can prove your agent leaks secrets / escalates tools / gets memory-poisoned — and I can show you the replay.”

The workflows are written from a **user perspective** and map directly to:

- spec/UI_MAP.md
- spec/CONTRACTS.md
- fixtures for UI-first implementation

---

## Roles

### Org Owner

- Creates org
- Manages projects
- Manages tokens
- Views reports
- Enables prod override

### Org Member

- Can run tests
- Can view runs and reports
- Cannot change org-wide settings

---

## 1. Signup & First Login

**Goal:** User gets to dashboard in <30 seconds.

### Steps

1. User visits site
2. Clicks “Sign in with Google”
3. NextAuth creates:
   - user
   - org (if first user)
4. User lands on `/` dashboard

### UI Result

- Empty Projects list
- CTA: “Create your first project”

---

## 2. Create Project

**Goal:** Prepare a sandbox for an agent.

### Steps

1. Click “Create Project”
2. Enter:
   - Project name
   - Environment (default: sandbox)
3. Click Create

### System

- Creates project row
- No tokens yet

### UI Result

- Redirect to `/projects/:id`
- Shows “Connect your agent” CTA

---

## 3. Connect Wizard (Critical Wow Flow)

Route: `/projects/:id/connect`

**Goal:** Get sidecar running + first run in <10 minutes.

---

### Step 1 — Generate Sidecar Token

User clicks “Generate Token”

System:

- creates token
- shows plaintext once

UI:

- Big copy button
- “I saved this” checkbox to proceed

---

### Step 2 — Deploy Sidecar

UI shows docker snippet:

```bash
docker run -e SIDECAR_TOKEN=... yourorg/sidecar:latest
```


User runs this in their environment.

---

### Step 3 — Verify Sidecar

UI polls:

* `/api/projects/:id`

Shows:

* last_seen_at
* events/min

Once sidecar sends heartbeat → green check.

---

### Step 4 — Add Agent Endpoint

User enters:

<pre class="overflow-visible! px-0!" data-start="2201" data-end="2247"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>http:</span><span>//their-agent.local/test-endpoint</span><span>
</span></span></code></div></div></pre>

System validates endpoint.

---

### Step 5 — Run First Campaign

Button: **Run Red Team**

POST `/api/projects/:id/runs`

Redirect → `/runs/:runId`

---

## 4. Run Page — Live Mode

Route: `/runs/:runId`

**Goal:** User sees exploit narrative appear live.

### UI Sections

* Left: Exploit Feed (story)
* Center: Timeline (replay scrubber)
* Right: Evidence tabs
* Proof Drawer overlay

### What user sees

1. “Run started”
2. Step appears: “Secret leakage confirmed”
3. Click Proof
4. Sees:
   * adversary message
   * agent response with token preview
   * detector evidence

This is the  **core wedge moment** .

---

## 5. Replay Mode

After run completes.

User:

* drags timeline
* clicks earlier steps
* Proof updates accordingly

This is used for:

* internal debugging
* security review
* demos

---

## 6. Report Generation

Button: “Generate Report”

System:

* Worker creates markdown report

Route: `/runs/:id/report`

User:

* views markdown
* downloads `.md`

Used for:

* security review
* ticketing
* compliance evidence

---

## 7. Evidence Exploration

User uses right panel tabs:

### Conversation

See adversary vs agent messages

### Network

See HTTP attempts with classification

### Findings

List of findings with severity + score

### Policy

See blocked / violation events

---

## 8. Quotas & Rate Limits (Free Tier Experience)

If user hits limit:

* Run page shows step: `quota`
* Banner: “Daily run limit reached”
* CTA: Upgrade later

Quotas:

* runs/day
* events/run
* adversarial variants/run

---

## 9. Project Settings

Route: `/projects/:id/settings`

User can:

* Change environment
* Enable prod override (with scary modal)
* Manage tokens
* Edit agent endpoint
* View usage

---

## 10. Production Guardrail Flow

If project env = prod:

* “Run Red Team” disabled
* Banner: “Pentest disabled in production”
* Option: Enable override
  * checklist
  * confirmation
  * audit banner appears

---

## 11. Multiple Runs

User returns to project page:

* Sees Runs table
* Can open any run
* Replay works for old runs

---

## 12. Multi-tenant Isolation

Org A cannot see Org B:

* enforced in all APIs
* user never aware; just works

---

## 13. Sidecar Disconnect Scenario

If sidecar stops:

* Connect status turns red
* Run disabled
* CTA: restart sidecar

---

## 14. What User NEVER Sees (by design)

* Raw logs
* Raw JSON events
* TLS contents
* Secret values

They see:

* Narrative
* Evidence cards
* Replay

---

## 15. Typical User Story (End-to-End)

> “I installed the sidecar, ran the test, and within 2 minutes I saw my agent leak an API key. I clicked Proof, downloaded the report, and gave it to my engineering team.”

This is the intended golden path.

---

## 16. Future (Not MVP)

* MITM mode research
* Memory poisoning deep inspection
* Advanced adversarial prompt customization
* Report export to PDF

<pre class="overflow-visible! px-0!" data-start="5090" data-end="5462" data-is-last-node=""><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>
---

</span><span>This file is important because:</span><span>

</span><span>-</span><span></span><span>Copilot</span><span></span><span>understands</span><span></span><span>**why**</span><span></span><span>each</span><span></span><span>page</span><span></span><span>exists</span><span>
</span><span>-</span><span></span><span>You</span><span></span><span>have</span><span></span><span>a</span><span></span><span>**customer</span><span></span><span>narrative**</span><span></span><span>for</span><span></span><span>every</span><span></span><span>UI</span><span></span><span>element</span><span>
</span><span>-</span><span></span><span>It</span><span></span><span>aligns</span><span></span><span>specs,</span><span></span><span>UI,</span><span></span><span>and</span><span></span><span>behavior</span><span></span><span>into</span><span></span><span>real</span><span></span><span>flows</span><span>

</span><span>If</span><span></span><span>you</span><span></span><span>want,</span><span></span><span>next</span><span></span><span>I</span><span></span><span>can</span><span></span><span>give</span><span></span><span>you</span><span></span><span>**ADMIN</span><span></span><span>/</span><span></span><span>internal</span><span></span><span>operator</span><span></span><span>workflows**</span><span></span><span>(how</span><span></span><span>you</span><span></span><span>debug,</span><span></span><span>view</span><span></span><span>orgs,</span><span></span><span>inspect</span><span></span><span>events,</span><span></span><span>etc.),</span><span></span><span>which</span><span></span><span>is</span><span></span><span>very</span><span></span><span>useful</span><span></span><span>once</span><span></span><span>users</span><span></span><span>start</span><span></span><span>onboarding.</span><span>
</span></span></code></div></div></pre>

[ ]

ChatGPT can make mista
