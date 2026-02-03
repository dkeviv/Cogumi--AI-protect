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
`{
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
```

Rules:

* For HTTPS CONNECT tunnels, use `http.method="CONNECT"` and no body preview.
* `payload_redacted.summary` should be short and UI-friendly.
* `seq` monotonic per run_id. If run_id is null, seq can be 0 and ordering relies on ts.

### 3.2 StoryStep schema

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

* Never show raw secrets; show match preview/hashes only via evidence events.

### 3.3 Finding schema


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


### 3.4 PromptVariant schema

<pre class="overflow-visible! px-0!" data-start="4257" data-end="4569"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"id"</span><span>:</span><span></span><span>"uuid"</span><span>,</span><span>
  </span><span>"org_id"</span><span>:</span><span></span><span>"uuid"</span><span>,</span><span>
  </span><span>"project_id"</span><span>:</span><span></span><span>"uuid"</span><span>,</span><span>
  </span><span>"script_id"</span><span>:</span><span></span><span>"S1|S2|S3|S4|S5"</span><span>,</span><span>
  </span><span>"script_step_id"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
  </span><span>"style_id"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
  </span><span>"version"</span><span>:</span><span></span><span>"v1"</span><span>,</span><span>
  </span><span>"prompt_text"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
  </span><span>"source"</span><span>:</span><span></span><span>"builtin|generated|customer"</span><span>,</span><span>
  </span><span>"created_at"</span><span>:</span><span></span><span>"ISO-8601"</span><span>,</span><span>
  </span><span>"last_used_at"</span><span>:</span><span></span><span>"ISO-8601|null"</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

---

## 4. API Endpoints (SaaS API)

All endpoints are under `/api`. All require auth unless noted.

### 4.1 Me / org

#### GET /api/me

Response:

<pre class="overflow-visible! px-0!" data-start="4717" data-end="4814"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"user"</span><span>:</span><span></span><span>{</span><span></span><span>"id"</span><span>:</span><span>"uuid"</span><span>,</span><span>"email"</span><span>:</span><span>"string"</span><span>,</span><span>"name"</span><span>:</span><span>"string"</span><span></span><span>}</span><span>,</span><span></span><span>"current_org_id"</span><span>:</span><span>"uuid"</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/orgs

Response:

<pre class="overflow-visible! px-0!" data-start="4845" data-end="4902"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"orgs"</span><span>:</span><span></span><span>[</span><span>{</span><span></span><span>"id"</span><span>:</span><span>"uuid"</span><span>,</span><span>"name"</span><span>:</span><span>"string"</span><span></span><span>}</span><span>]</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/orgs/members

Response:

<pre class="overflow-visible! px-0!" data-start="4941" data-end="5042"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"members"</span><span>:</span><span></span><span>[</span><span>{</span><span></span><span>"user_id"</span><span>:</span><span>"uuid"</span><span>,</span><span>"email"</span><span>:</span><span>"string"</span><span>,</span><span>"role"</span><span>:</span><span>"OWNER|ADMIN|MEMBER|VIEWER"</span><span></span><span>}</span><span>]</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### PATCH /api/orgs/members/:user_id

Request:

<pre class="overflow-visible! px-0!" data-start="5091" data-end="5141"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"role"</span><span>:</span><span>"OWNER|ADMIN|MEMBER|VIEWER"</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

---

### 4.2 Projects & connect wizard

#### POST /api/projects

Request:

<pre class="overflow-visible! px-0!" data-start="5216" data-end="5356"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"name"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
  </span><span>"environment"</span><span>:</span><span></span><span>"sandbox|staging|prod"</span><span>,</span><span>
  </span><span>"tool_domains"</span><span>:</span><span></span><span>[</span><span>"string"</span><span>]</span><span>,</span><span>
  </span><span>"internal_suffixes"</span><span>:</span><span></span><span>[</span><span>"string"</span><span>]</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

Response:

<pre class="overflow-visible! px-0!" data-start="5367" data-end="5482"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"project"</span><span>:</span><span></span><span>{</span><span></span><span>"id"</span><span>:</span><span>"uuid"</span><span>,</span><span></span><span>"name"</span><span>:</span><span>"string"</span><span>,</span><span></span><span>"environment"</span><span>:</span><span>"sandbox"</span><span>,</span><span></span><span>"prod_override_enabled"</span><span>:</span><span>false</span><span></span><span>}</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/projects

Response:

<pre class="overflow-visible! px-0!" data-start="5517" data-end="5635"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"projects"</span><span>:</span><span></span><span>[</span><span></span><span>{</span><span></span><span>"id"</span><span>:</span><span>"uuid"</span><span>,</span><span>"name"</span><span>:</span><span>"string"</span><span>,</span><span>"environment"</span><span>:</span><span>"sandbox"</span><span>,</span><span>"last_seen_at"</span><span>:</span><span>"ISO-8601|null"</span><span></span><span>}</span><span></span><span>]</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/projects/:id

Response:

<pre class="overflow-visible! px-0!" data-start="5674" data-end="5902"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"project"</span><span>:</span><span></span><span>{</span><span>
    </span><span>"id"</span><span>:</span><span>"uuid"</span><span>,</span><span>"name"</span><span>:</span><span>"string"</span><span>,</span><span>"environment"</span><span>:</span><span>"sandbox"</span><span>,</span><span>
    </span><span>"prod_override_enabled"</span><span>:</span><span>false</span><span></span><span>,</span><span>
    </span><span>"agent_test_url"</span><span>:</span><span>"string|null"</span><span>,</span><span>
    </span><span>"tool_domains"</span><span>:</span><span>[</span><span>"string"</span><span>]</span><span>,</span><span>
    </span><span>"internal_suffixes"</span><span>:</span><span>[</span><span>"string"</span><span>]</span><span>
  </span><span>}</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

#### PATCH /api/projects/:id

Request (partial):

<pre class="overflow-visible! px-0!" data-start="5952" data-end="6257"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"name"</span><span>:</span><span>"string?"</span><span>,</span><span>
  </span><span>"environment"</span><span>:</span><span>"sandbox|staging|prod?"</span><span>,</span><span>
  </span><span>"prod_override_enabled"</span><span>:</span><span>"boolean?"</span><span>,</span><span>
  </span><span>"agent_test_url"</span><span>:</span><span>"string?"</span><span>,</span><span>
  </span><span>"tool_domains"</span><span>:</span><span>[</span><span>"string"</span><span>]</span><span>?</span><span>,</span><span>
  </span><span>"internal_suffixes"</span><span>:</span><span>[</span><span>"string"</span><span>]</span><span>?</span><span>,</span><span>
  </span><span>"redteam"</span><span>:</span><span></span><span>{</span><span></span><span>"enabled_style_ids"</span><span>:</span><span>[</span><span>"string"</span><span>]</span><span>,</span><span></span><span>"intensity"</span><span>:</span><span>"low|med|high"</span><span>,</span><span></span><span>"version_pin"</span><span>:</span><span>"v1"</span><span></span><span>}</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

Response: updated project.

#### POST /api/projects/:id/tokens

Creates a sidecar token (shown once).

Response:

<pre class="overflow-visible! px-0!" data-start="6369" data-end="6436"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"token"</span><span>:</span><span></span><span>"plaintext_shown_once"</span><span>,</span><span></span><span>"token_id"</span><span>:</span><span></span><span>"uuid"</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### POST /api/projects/:id/validate-agent-endpoint

Request:

<pre class="overflow-visible! px-0!" data-start="6499" data-end="6540"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"agent_test_url"</span><span>:</span><span>"string"</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

Response:

<pre class="overflow-visible! px-0!" data-start="6551" data-end="6611"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"ok"</span><span>:</span><span></span><span>true</span><span></span><span>,</span><span></span><span>"details"</span><span>:</span><span></span><span>{</span><span></span><span>"latency_ms"</span><span>:</span><span></span><span>123</span><span></span><span>}</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/projects/:id/connect-snippets

Response:

<pre class="overflow-visible! px-0!" data-start="6667" data-end="6901"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"snippets"</span><span>:</span><span></span><span>{</span><span>
    </span><span>"docker_compose"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
    </span><span>"env_vars"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
    </span><span>"sidecar_config_yaml"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
    </span><span>"agent_endpoint_examples"</span><span>:</span><span></span><span>{</span><span>
      </span><span>"node_express"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
      </span><span>"python_fastapi"</span><span>:</span><span></span><span>"string"</span><span>
    </span><span>}</span><span>
  </span><span>}</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

---

### 4.3 Sidecar endpoints (token-auth; no session auth)

#### POST /api/ingest/events

Headers:

* X-Sidecar-Token: token

Request:

<pre class="overflow-visible! px-0!" data-start="7038" data-end="7206"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"project_id"</span><span>:</span><span>"uuid"</span><span>,</span><span>
  </span><span>"run_id"</span><span>:</span><span>"uuid|null"</span><span>,</span><span>
  </span><span>"sidecar_version"</span><span>:</span><span>"string"</span><span>,</span><span>
  </span><span>"events"</span><span>:</span><span>[</span><span></span><span>/* Event input objects without org_id/id; API fills those */</span><span></span><span>]</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

Response:

<pre class="overflow-visible! px-0!" data-start="7218" data-end="7275"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"ok"</span><span>:</span><span></span><span>true</span><span></span><span>,</span><span></span><span>"accepted"</span><span>:</span><span></span><span>100</span><span>,</span><span></span><span>"dropped"</span><span>:</span><span></span><span>0</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

Errors:

* 401 invalid token
* 403 revoked token
* 429 org storage cap exceeded or ingest throttled

#### POST /api/projects/:id/sidecar/heartbeat

Headers: X-Sidecar-Token

Request:

<pre class="overflow-visible! px-0!" data-start="7457" data-end="7587"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"project_id"</span><span>:</span><span>"uuid"</span><span>,</span><span>
  </span><span>"sidecar_version"</span><span>:</span><span>"string"</span><span>,</span><span>
  </span><span>"counters"</span><span>:</span><span></span><span>{</span><span></span><span>"events_sent_1m"</span><span>:</span><span>123</span><span>,</span><span></span><span>"events_dropped_1m"</span><span>:</span><span>5</span><span></span><span>}</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

Response:

<pre class="overflow-visible! px-0!" data-start="7598" data-end="7624"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"ok"</span><span>:</span><span></span><span>true</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

---

### 4.4 Runs

#### POST /api/projects/:id/runs

Request:

<pre class="overflow-visible! px-0!" data-start="7687" data-end="7720"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"mode"</span><span>:</span><span>"campaign"</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

Response:

<pre class="overflow-visible! px-0!" data-start="7731" data-end="7787"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"run"</span><span>:</span><span></span><span>{</span><span></span><span>"id"</span><span>:</span><span>"uuid"</span><span>,</span><span>"status"</span><span>:</span><span>"queued"</span><span></span><span>}</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

Errors:

* 403 if env=prod and prod_override_disabled
* 429 if runs/day exceeded

#### GET /api/runs/:id

Response:

<pre class="overflow-visible! px-0!" data-start="7903" data-end="8021"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"run"</span><span>:</span><span></span><span>{</span><span></span><span>"id"</span><span>:</span><span>"uuid"</span><span>,</span><span>"status"</span><span>:</span><span>"running"</span><span>,</span><span>"risk_score"</span><span>:</span><span></span><span>null</span><span></span><span>,</span><span></span><span>"started_at"</span><span>:</span><span>"ISO-8601"</span><span>,</span><span></span><span>"ended_at"</span><span>:</span><span>null</span><span></span><span>}</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### POST /api/runs/:id/cancel

Response:

<pre class="overflow-visible! px-0!" data-start="8064" data-end="8090"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"ok"</span><span>:</span><span></span><span>true</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/runs/:id/story

Response:

<pre class="overflow-visible! px-0!" data-start="8131" data-end="8175"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"steps"</span><span>:</span><span></span><span>[</span><span></span><span>/* StoryStep */</span><span></span><span>]</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/runs/:id/events?after_seq=0&limit=200

Response:

<pre class="overflow-visible! px-0!" data-start="8239" data-end="8303"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"events"</span><span>:</span><span></span><span>[</span><span></span><span>/* Event */</span><span></span><span>]</span><span>,</span><span></span><span>"next_after_seq"</span><span>:</span><span></span><span>200</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/runs/:id/findings

Response:

<pre class="overflow-visible! px-0!" data-start="8347" data-end="8392"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"findings"</span><span>:</span><span></span><span>[</span><span></span><span>/* Finding */</span><span></span><span>]</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### POST /api/runs/:id/report

Response:

<pre class="overflow-visible! px-0!" data-start="8435" data-end="8481"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"ok"</span><span>:</span><span></span><span>true</span><span></span><span>,</span><span></span><span>"report_id"</span><span>:</span><span>"uuid"</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

#### GET /api/runs/:id/report

Response:

<pre class="overflow-visible! px-0!" data-start="8523" data-end="8595"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"report"</span><span>:</span><span></span><span>{</span><span></span><span>"format"</span><span>:</span><span>"markdown"</span><span>,</span><span></span><span>"content_md"</span><span>:</span><span>"string"</span><span></span><span>}</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

---

### 4.5 Realtime (SSE)

#### GET /api/runs/:id/stream

* SSE events:
  * `run.status`
  * `story.step.created`
  * `finding.created`
  * `quota.warning`

Example SSE payload:

<pre class="overflow-visible! px-0!" data-start="8776" data-end="8830"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>event: story.step.created
data: {</span><span>"step"</span><span>:{...}}
</span></span></code></div></div></pre>

---

## 5. Agent Test Endpoint Contract (customer-owned)

Required for scripts.

### POST/message

Request:

<pre class="overflow-visible! px-0!" data-start="8956" data-end="9136"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"run_id"</span><span>:</span><span>"uuid"</span><span>,</span><span>
  </span><span>"session_id"</span><span>:</span><span>"uuid"</span><span>,</span><span>
  </span><span>"actor"</span><span>:</span><span>"adversary"</span><span>,</span><span>
  </span><span>"message"</span><span>:</span><span>"string"</span><span>,</span><span>
  </span><span>"metadata"</span><span>:</span><span>{</span><span></span><span>"script_id"</span><span>:</span><span>"S1"</span><span>,</span><span></span><span>"step"</span><span>:</span><span>1</span><span>,</span><span></span><span>"attack_style"</span><span>:</span><span>"incident_urgent"</span><span></span><span>}</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

Response:

<pre class="overflow-visible! px-0!" data-start="9148" data-end="9210"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span></span><span>"message"</span><span>:</span><span>"string"</span><span>,</span><span></span><span>"done"</span><span>:</span><span>true</span><span></span><span>,</span><span></span><span>"metadata"</span><span>:</span><span>{</span><span>}</span><span></span><span>}</span><span>
</span></span></code></div></div></pre>

Recommended:

* POST /health returns 200

---

## 6. Rate Limits & Quotas (Free tier)

API must enforce:

* Projects: 2
* Runs/day: 5
* Retention: 7 days default
* Stored events cap: 50,000 rolling per org
* Events per run cap: 5,000
* Run duration cap: 15 min

Sidecar must enforce:

* Ingest events/min per token: 300
* Event payload max 64KB (truncate)
* Emit policy.violation reason=ingest_throttled

---

## 7. Future Research (Not planned)

* TLS decryption / MITM deep inspection.

<pre class="overflow-visible! px-0!" data-start="9696" data-end="14720"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>
---

</span><span>## `spec/UI_MAP.md`</span><span>

</span><span>```md</span><span>
</span><span># spec/UI_MAP.md — UI Routes, Components, and Wow Requirements</span><span>

</span><span>Goal:</span><span></span><span>UI</span><span></span><span>must</span><span></span><span>feel</span><span></span><span>like</span><span></span><span>"SOC-grade replayable proof"</span><span>,</span><span></span><span>not</span><span></span><span>logs.</span><span>

---

</span><span>## 1) Routes</span><span>

</span><span>### / (Org Dashboard)</span><span>
</span><span>Purpose:</span><span></span><span>overview.</span><span>
</span><span>Components:</span><span>
</span><span>-</span><span></span><span>OrgSwitcher</span><span></span><span>(optional</span><span></span><span>MVP)</span><span>
</span><span>-</span><span></span><span>ProjectsList</span><span>
</span><span>-</span><span></span><span>RecentRunsList</span><span>
</span><span>-</span><span></span><span>TopFindingsPreview</span><span>

</span><span>APIs:</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/projects</span><span>
</span><span>-</span><span></span><span>(optional)</span><span></span><span>GET</span><span></span><span>/api/projects/:id/runs</span><span></span><span>(for</span><span></span><span>recent)</span><span>

---

</span><span>### /projects/:projectId (Project Overview)</span><span>
</span><span>Components:</span><span>
</span><span>-</span><span></span><span>ProjectHeader</span><span></span><span>(env</span><span></span><span>badge</span><span></span><span>+</span><span></span><span>last</span><span></span><span>seen)</span><span>
</span><span>-</span><span></span><span>ConnectStatusCard</span><span>
</span><span>-</span><span></span><span>RedTeamConfigCard</span><span>
</span><span>-</span><span></span><span>RunsTable</span><span>

</span><span>APIs:</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/projects/:id</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/projects/:id/runs</span><span></span><span>(or</span><span></span><span>/api/projects/:id</span><span></span><span>+</span><span></span><span>runs</span><span></span><span>list)</span><span>

---

</span><span>### /projects/:projectId/connect (Connect Wizard)</span><span>
</span><span>Steps UI:</span><span></span><span>a</span><span></span><span>stepper.</span><span>

</span><span>Step 1:</span><span></span><span>Create/Confirm</span><span></span><span>Project</span><span>
</span><span>-</span><span></span><span>shows</span><span></span><span>env,</span><span></span><span>tool</span><span></span><span>domains,</span><span></span><span>internal</span><span></span><span>suffixes</span><span>

</span><span>Step 2:</span><span></span><span>Deploy</span><span></span><span>Sidecar</span><span>
</span><span>-</span><span></span><span>SnippetPanel (tabs:</span><span></span><span>Docker</span><span></span><span>Compose</span><span></span><span>/</span><span></span><span>K8s</span><span></span><span>/</span><span></span><span>Manual)</span><span>
</span><span>-</span><span></span><span>Copy</span><span></span><span>buttons</span><span>
</span><span>-</span><span></span><span>shows</span><span></span><span>SIDECAR_TOKEN</span><span></span><span>(only</span><span></span><span>on</span><span></span><span>creation)</span><span></span><span>with</span><span></span><span>"I saved it"</span><span></span><span>checkbox</span><span>

</span><span>Step 3:</span><span></span><span>Verify</span><span></span><span>Sidecar</span><span>
</span><span>-</span><span></span><span>VerifyStatusCard</span><span>
  </span><span>-</span><span></span><span>button:</span><span></span><span>"Verify Connection"</span><span>
  </span><span>-</span><span></span><span>display:</span><span></span><span>last_seen_at,</span><span></span><span>last_event_at,</span><span></span><span>events/min</span><span>

</span><span>Step 4:</span><span></span><span>Agent</span><span></span><span>Test</span><span></span><span>Endpoint</span><span>
</span><span>-</span><span></span><span>EndpointInput</span><span>
</span><span>-</span><span></span><span>button:</span><span></span><span>Validate</span><span></span><span>endpoint</span><span>
</span><span>-</span><span></span><span>show</span><span></span><span>latency</span><span></span><span>+</span><span></span><span>ok/fail</span><span>

</span><span>Step 5:</span><span></span><span>First</span><span></span><span>Run</span><span>
</span><span>-</span><span></span><span>button:</span><span></span><span>"Run Pre-deploy Pentest"</span><span>
</span><span>-</span><span></span><span>if</span><span></span><span>env=prod</span><span></span><span>and</span><span></span><span>override</span><span></span><span>false</span><span></span><span>-></span><span></span><span>show</span><span></span><span>guardrail</span><span></span><span>block</span><span></span><span>+</span><span></span><span>link</span><span></span><span>to</span><span></span><span>settings</span><span>

</span><span>APIs:</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/projects/:id/connect-snippets</span><span>
</span><span>-</span><span></span><span>POST</span><span></span><span>/api/projects/:id/validate-agent-endpoint</span><span>
</span><span>-</span><span></span><span>POST</span><span></span><span>/api/projects/:id/runs</span><span>

---

</span><span>### /projects/:projectId/settings (Project Settings)</span><span>
</span><span>Components:</span><span>
</span><span>-</span><span></span><span>EnvironmentCard</span><span></span><span>(env</span><span></span><span>select</span><span></span><span>+</span><span></span><span>prod</span><span></span><span>override</span><span></span><span>checklist</span><span></span><span>flow)</span><span>
</span><span>-</span><span></span><span>AgentEndpointCard</span><span>
</span><span>-</span><span></span><span>DomainsCard</span><span></span><span>(tool</span><span></span><span>domains</span><span></span><span>+</span><span></span><span>internal</span><span></span><span>suffixes)</span><span>
</span><span>-</span><span></span><span>RedTeamStylesCard</span><span>
</span><span>-</span><span></span><span>TokensCard</span><span></span><span>(create/revoke)</span><span>
</span><span>-</span><span></span><span>UsageLimitsCard</span><span></span><span>(free</span><span></span><span>tier</span><span></span><span>usage)</span><span>

</span><span>APIs:</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/projects/:id</span><span>
</span><span>-</span><span></span><span>PATCH</span><span></span><span>/api/projects/:id</span><span>
</span><span>-</span><span></span><span>POST</span><span></span><span>/api/projects/:id/tokens</span><span>

---

</span><span>### /runs/:runId (Run Live + Replay)</span><span>
</span><span>This</span><span></span><span>is</span><span></span><span>THE</span><span></span><span>wedge</span><span></span><span>screen.</span><span>

</span><span>Layout:</span><span>
</span><span>Header:</span><span>
</span><span>-</span><span></span><span>RunHeader</span><span>
  </span><span>-</span><span></span><span>project</span><span></span><span>name,</span><span></span><span>env</span><span></span><span>badge</span><span>
  </span><span>-</span><span></span><span>run</span><span></span><span>status</span><span>
  </span><span>-</span><span></span><span>risk</span><span></span><span>score</span><span></span><span>meter</span><span></span><span>(when</span><span></span><span>complete)</span><span>
  </span><span>-</span><span></span><span>"Generate Report"</span><span></span><span>button</span><span>
  </span><span>-</span><span></span><span>"Open Report"</span><span></span><span>button</span><span></span><span>if</span><span></span><span>exists</span><span>

</span><span>Left column:</span><span>
</span><span>-</span><span></span><span>ExploitFeed</span><span>
  </span><span>-</span><span></span><span>renders</span><span></span><span>StorySteps</span><span>
  </span><span>-</span><span></span><span>each card shows:</span><span>
    </span><span>-</span><span></span><span>step_kind</span><span></span><span>icon</span><span></span><span>(attempt/confirmed/blocked/quota)</span><span>
    </span><span>-</span><span></span><span>severity</span><span></span><span>badge</span><span>
    </span><span>-</span><span></span><span>claim_title</span><span></span><span>+</span><span></span><span>claim_summary</span><span>
    </span><span>-</span><span></span><span>script_id</span><span></span><span>label</span><span>
    </span><span>-</span><span></span><span>attack_style</span><span></span><span>chip</span><span></span><span>if</span><span></span><span>present</span><span>
    </span><span>-</span><span></span><span>Proof</span><span></span><span>button</span><span>

</span><span>Center:</span><span>
</span><span>-</span><span></span><span>TimelineScrubber</span><span>
  </span><span>-</span><span></span><span>markers:</span><span>
    </span><span>-</span><span></span><span>script</span><span></span><span>starts</span><span>
    </span><span>-</span><span></span><span>confirmed</span><span></span><span>steps</span><span>
  </span><span>-</span><span></span><span>controls:</span><span>
    </span><span>-</span><span></span><span>jump</span><span></span><span>to</span><span></span><span>latest</span><span></span><span>(live)</span><span>
    </span><span>-</span><span></span><span>play/pause</span><span></span><span>(replay</span><span></span><span>"movie mode"</span><span>)</span><span>

</span><span>Right:</span><span>
</span><span>-</span><span></span><span>EvidenceTabs</span><span>
  </span><span>Tabs:</span><span>
  </span><span>1</span><span>)</span><span></span><span>ConversationTab</span><span>
  </span><span>2</span><span>)</span><span></span><span>NetworkProofTab</span><span>
  </span><span>3</span><span>)</span><span></span><span>FindingsTab</span><span>
  </span><span>4</span><span>)</span><span></span><span>PolicyTab</span><span>
  </span><span>5) MemoryTab (MVP:</span><span></span><span>behavioral</span><span></span><span>only)</span><span>

</span><span>Overlay:</span><span>
</span><span>-</span><span></span><span>ProofDrawer</span><span>
  </span><span>-</span><span></span><span>shows Chain of Evidence cards:</span><span>
    </span><span>1</span><span>)</span><span></span><span>Adversary</span><span></span><span>message</span><span>
    </span><span>2</span><span>)</span><span></span><span>Agent</span><span></span><span>response</span><span>
    </span><span>3</span><span>)</span><span></span><span>Network</span><span></span><span>attempt</span><span></span><span>(host/path/method/status/bytes/class)</span><span>
    </span><span>4</span><span>)</span><span></span><span>Detector</span><span></span><span>card</span><span></span><span>(matches)</span><span>
  </span><span>-</span><span></span><span>Each card has Jump button:</span><span>
    </span><span>-</span><span></span><span>sets</span><span></span><span>timeline</span><span></span><span>to</span><span></span><span>seq</span><span></span><span>range</span><span>
    </span><span>-</span><span></span><span>highlights</span><span></span><span>the</span><span></span><span>event</span><span></span><span>in</span><span></span><span>tab</span><span>

</span><span>Live behavior:</span><span>
</span><span>-</span><span></span><span>SSE</span><span></span><span>stream</span><span></span><span>updates</span><span></span><span>ExploitFeed</span><span></span><span>in</span><span></span><span>real</span><span></span><span>time</span><span>
</span><span>-</span><span></span><span>Confirmed</span><span></span><span>exploits</span><span></span><span>animate</span><span></span><span>+</span><span></span><span>optionally</span><span></span><span>"pin"</span><span></span><span>in</span><span></span><span>feed</span><span>
</span><span>-</span><span></span><span>Quota</span><span></span><span>warnings</span><span></span><span>appear</span><span></span><span>as</span><span></span><span>steps_kind=quota</span><span>

</span><span>APIs:</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/runs/:id</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/runs/:id/story</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/runs/:id/events</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/runs/:id/findings</span><span>
</span><span>-</span><span></span><span>SSE</span><span></span><span>GET</span><span></span><span>/api/runs/:id/stream</span><span>
</span><span>-</span><span></span><span>POST</span><span></span><span>/api/runs/:id/report</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/runs/:id/report</span><span>

---

</span><span>### /runs/:runId/report</span><span>
</span><span>Components:</span><span>
</span><span>-</span><span></span><span>MarkdownReportViewer</span><span>
</span><span>-</span><span></span><span>DownloadButton</span><span></span><span>(.md)</span><span>

</span><span>APIs:</span><span>
</span><span>-</span><span></span><span>GET</span><span></span><span>/api/runs/:id/report</span><span>

---

</span><span>## 2) Component Interfaces (props)</span><span>

</span><span>### ExploitFeed</span><span>
</span><span>Props:</span><span>
</span><span>-</span><span></span><span>steps:</span><span></span><span>StoryStep[]</span><span>
</span><span>-</span><span></span><span>onOpenProof(stepId)</span><span>
</span><span>-</span><span></span><span>live:</span><span></span><span>boolean</span><span>

</span><span>### ProofDrawer</span><span>
</span><span>Props:</span><span>
</span><span>-</span><span></span><span>open:</span><span></span><span>boolean</span><span>
</span><span>-</span><span></span><span>evidenceEvents:</span><span></span><span>Event[]</span><span>
</span><span>-</span><span></span><span>narrativeSteps:</span><span></span><span>array</span><span></span><span>from</span><span></span><span>Finding</span><span></span><span>or</span><span></span><span>StoryStep</span><span>
</span><span>-</span><span></span><span>onJumpTo(seqStart,</span><span></span><span>seqEnd)</span><span>
</span><span>Rules:</span><span>
</span><span>-</span><span></span><span>Must</span><span></span><span>render</span><span></span><span>cards,</span><span></span><span>not</span><span></span><span>raw</span><span></span><span>JSON</span><span>
</span><span>-</span><span></span><span>Must</span><span></span><span>not</span><span></span><span>display</span><span></span><span>raw</span><span></span><span>secrets</span><span></span><span>(matches</span><span></span><span>preview</span><span></span><span>only)</span><span>

</span><span>### TimelineScrubber</span><span>
</span><span>Props:</span><span>
</span><span>-</span><span></span><span>markers:</span><span> [{</span><span>seq</span><span>, </span><span>label</span><span>, </span><span>kind</span><span>}]
</span><span>-</span><span></span><span>currentSeq</span><span>
</span><span>-</span><span></span><span>onChangeSeq</span><span>
</span><span>-</span><span></span><span>onJumpLatest</span><span>

</span><span>### ConversationTab</span><span>
</span><span>Input:</span><span>
</span><span>-</span><span></span><span>events</span><span></span><span>filtered</span><span></span><span>where</span><span></span><span>type=agent.message</span><span></span><span>OR</span><span></span><span>(system</span><span></span><span>markers)</span><span>
</span><span>Display:</span><span>
</span><span>-</span><span></span><span>chat</span><span></span><span>bubbles</span><span></span><span>with</span><span></span><span>actor</span><span></span><span>labels</span><span>

</span><span>### NetworkProofTab</span><span>
</span><span>Input:</span><span>
</span><span>-</span><span></span><span>events</span><span></span><span>filtered</span><span></span><span>where</span><span></span><span>channel=http</span><span>
</span><span>Display:</span><span>
</span><span>-</span><span></span><span>cards</span><span></span><span>grouped</span><span></span><span>by</span><span></span><span>destination_class</span><span>
</span><span>-</span><span></span><span>each card:</span><span></span><span>method,</span><span></span><span>host/path,</span><span></span><span>status,</span><span></span><span>bytes,</span><span></span><span>duration</span><span>
</span><span>-</span><span></span><span>filter chips:</span><span></span><span>llm_provider,</span><span></span><span>internal_api,</span><span></span><span>public_internet,</span><span></span><span>attacker_sink</span><span>

</span><span>### FindingsTab</span><span>
</span><span>-</span><span></span><span>list</span><span></span><span>findings,</span><span></span><span>click</span><span></span><span>opens</span><span></span><span>ProofDrawer</span><span></span><span>w/</span><span></span><span>finding</span><span></span><span>chain</span><span>

</span><span>### EnvironmentCard</span><span>
</span><span>-</span><span></span><span>env</span><span></span><span>select</span><span>
</span><span>-</span><span></span><span>prod</span><span></span><span>override</span><span></span><span>toggle</span><span></span><span>triggers</span><span></span><span>checklist</span><span></span><span>modal</span><span>

---

</span><span>## 3) Wow Factor Requirements (non-negotiable)</span><span>

</span><span>1</span><span>.</span><span></span><span>Default</span><span></span><span>view</span><span></span><span>on</span><span></span><span>run</span><span></span><span>page</span><span></span><span>is</span><span></span><span>Exploit</span><span></span><span>Feed</span><span></span><span>(narrative).</span><span>
</span><span>2</span><span>.</span><span></span><span>Proof</span><span></span><span>is</span><span></span><span>a</span><span></span><span>Chain-of-Evidence</span><span></span><span>card</span><span></span><span>stack,</span><span></span><span>not</span><span></span><span>logs.</span><span>
</span><span>3. Replay is time-synced across:</span><span>
   </span><span>-</span><span></span><span>exploit</span><span></span><span>feed</span><span></span><span>highlight</span><span>
   </span><span>-</span><span></span><span>conversation</span><span>
   </span><span>-</span><span></span><span>network</span><span></span><span>proof</span><span>
</span><span>4</span><span>.</span><span></span><span>“Attempt”</span><span></span><span>steps</span><span></span><span>are</span><span></span><span>first-class</span><span></span><span>and</span><span></span><span>clearly</span><span></span><span>labeled.</span><span>
</span><span>5</span><span>.</span><span></span><span>“Not</span><span></span><span>decrypting</span><span></span><span>TLS”</span><span></span><span>is stated as a feature on settings/run pages:</span><span>
   </span><span>-</span><span></span><span>"We prove intent + behavior without decrypting traffic."</span><span>

---

</span><span>## 4) Accessibility and performance</span><span>
</span><span>-</span><span></span><span>Use</span><span></span><span>virtualization</span><span></span><span>for</span><span></span><span>events</span><span></span><span>list</span><span></span><span>></span><span></span><span>1000</span><span>.</span><span>
</span><span>-</span><span></span><span>SSE</span><span></span><span>reconnect</span><span></span><span>logic</span><span></span><span>with</span><span></span><span>last_event_id.</span><span>
</span><span>-</span><span></span><span>Server-side</span><span></span><span>pagination</span><span></span><span>for</span><span></span><span>/events.</span></span></code></div></div></pre>
