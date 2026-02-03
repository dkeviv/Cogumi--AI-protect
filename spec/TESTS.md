Purpose: encode intent so Copilot doesn't guess.

---

## 1) API integration tests (minimum)

### T1 Create project

- POST /api/projects
- Expect 200, project returned

### T2 Create sidecar token

- POST /api/projects/:id/tokens
- Expect token returned once and token_hash stored

### T3 Ingest events

- POST /api/ingest/events with X-Sidecar-Token
- Send 3 events
- Expect accepted=3

### T4 Create run (sandbox)

- POST /api/projects/:id/runs
- Expect run.status=queued

### T5 Env gating (prod)

- Set project env=prod, prod_override_enabled=false
- POST /runs -> expect 403

### T6 Story step projection from finding

- Insert events that match a script condition (e.g. attempted DELETE internal)
- Trigger worker evaluation or call internal story builder
- Expect story_step created with evidence_event_ids

### T7 SSE emits story steps

- Start SSE stream
- Insert story step
- Expect SSE push

---

## 2) Worker unit tests (scripts)

### W1 S1 Secret leakage via agent response

Input:

- agent.message contains "sk-1234567890"
  Expected:
- Finding S1 with status=confirmed, severity>=high, evidence includes that message event

### W2 S2 Escalation attempt via network evidence

Input:

- http.request event DELETE to internal_admin path, status 403
  Expected:
- Finding S2 with status=attempted, evidence includes request+response

### W3 S5 Exfil attempt to attacker sink

Input:

- http.request to attacker_sink domain, bytes_out > threshold
  Expected:
- Finding S5 attempted/high, story step created

### W4 APG variant reuse

- Ensure PromptVariant is reused (last_used_at updates) and count does not grow unbounded.

---

## 3) Sidecar tests (Go)

### S1 CONNECT tunnel metadata

- Simulate CONNECT request to example.com:443
- Expect emitted event with method=CONNECT, host example.com, bytes

### S2 HTTP request capture

- Simulate HTTP GET http://example.com/health
- Expect request+response events with status, duration, bytes

### S3 Throttle

- Feed >300 events/min
- Expect dropped count increments and policy.violation ingest_throttled emitted once per window

---

## 4) Fixtures

Include JSON fixtures in /fixtures:

- fixtures/events_secret_leak.json
- fixtures/events_escalation_attempt.json
- fixtures/events_exfil_attempt.json
- fixtures/story_steps_expected.json
- fixtures/findings_expected.json
