# 📚 API Documentation

Complete API reference for COGUMI AI Protect.

---

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3001
```

---

## Authentication

### Session-Based (Web UI)

Uses NextAuth with session cookies. Login via:
- Email/password
- Google OAuth (if configured)

### Token-Based (Sidecar)

Uses Bearer token authentication for sidecar event ingestion.

```http
Authorization: Bearer <sidecar_token>
```

Or:

```http
X-Sidecar-Token: <sidecar_token>
```

---

## Endpoints

### Health Check

```http
GET /api/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T10:00:00Z",
  "version": "1.0.0",
  "database": "connected"
}
```

---

### Projects

#### List Projects

```http
GET /api/projects
```

**Response** (200 OK):
```json
[
  {
    "id": "proj_abc123",
    "orgId": "org_xyz789",
    "name": "Production API",
    "environment": "prod",
    "agentTestUrl": "https://api.example.com/agent",
    "retentionDays": 7,
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

#### Create Project

```http
POST /api/projects
Content-Type: application/json

{
  "name": "My Test Project",
  "environment": "sandbox",
  "agentTestUrl": "http://localhost:8000/agent",
  "toolDomains": ["api.example.com"],
  "internalSuffixes": [".internal"],
  "retentionDays": 7,
  "prodOverrideEnabled": false
}
```

**Response** (201 Created):
```json
{
  "id": "proj_abc123",
  "name": "My Test Project",
  "environment": "sandbox",
  ...
}
```

**Errors**:
- `429 Quota Exceeded`: Maximum projects reached
- `400 Bad Request`: Invalid input

---

### Tokens

#### List Tokens

```http
GET /api/projects/{projectId}/tokens
```

**Response** (200 OK):
```json
[
  {
    "id": "tok_xyz",
    "projectId": "proj_abc",
    "status": "active",
    "lastSeenAt": "2026-02-03T09:00:00Z",
    "createdAt": "2026-01-15T10:00:00Z"
  }
]
```

#### Create Token

```http
POST /api/projects/{projectId}/tokens
```

**Response** (201 Created):
```json
{
  "id": "tok_xyz",
  "token": "sidecar_abc123def456...",
  "projectId": "proj_abc",
  "status": "active",
  "createdAt": "2026-02-03T10:00:00Z"
}
```

⚠️ **Important**: The `token` field is only shown once! Save it securely.

---

### Runs

#### List Runs

```http
GET /api/projects/{projectId}/runs
```

**Response** (200 OK):
```json
[
  {
    "id": "run_123",
    "projectId": "proj_abc",
    "status": "completed",
    "riskScore": 75,
    "startedAt": "2026-02-03T08:00:00Z",
    "endedAt": "2026-02-03T08:05:23Z",
    "createdAt": "2026-02-03T07:59:00Z"
  }
]
```

#### Create Run

```http
POST /api/projects/{projectId}/runs
Content-Type: application/json

{
  "mode": "campaign"
}
```

**Response** (201 Created):
```json
{
  "id": "run_123",
  "status": "queued",
  "createdAt": "2026-02-03T10:00:00Z"
}
```

**Errors**:
- `429 Quota Exceeded`: Daily or monthly limit reached
- `403 Forbidden`: Production runs disabled

#### Get Run Details

```http
GET /api/runs/{runId}
```

**Response** (200 OK):
```json
{
  "id": "run_123",
  "projectId": "proj_abc",
  "status": "completed",
  "riskScore": 75,
  "startedAt": "2026-02-03T08:00:00Z",
  "endedAt": "2026-02-03T08:05:23Z"
}
```

#### Execute Run

```http
POST /api/runs/{runId}/execute
```

Starts script execution for a queued run.

**Response** (200 OK):
```json
{
  "success": true,
  "runId": "run_123",
  "status": "running"
}
```

#### Cancel Run

```http
POST /api/runs/{runId}/cancel
```

**Response** (200 OK):
```json
{
  "success": true,
  "runId": "run_123",
  "status": "canceled"
}
```

---

### Story Steps

```http
GET /api/runs/{runId}/story
```

**Response** (200 OK):
```json
[
  {
    "id": "step_1",
    "runId": "run_123",
    "seq": 1,
    "seqStart": 1,
    "seqEnd": 5,
    "ts": "2026-02-03T08:00:15Z",
    "type": "attempt",
    "claimTitle": "Attempted prompt injection",
    "claimSummary": "Agent received adversarial prompt",
    "severity": "high",
    "confidence": 0.85,
    "evidenceEventIds": ["evt_1", "evt_2"]
  }
]
```

---

### Events

```http
GET /api/runs/{runId}/events
```

**Response** (200 OK):
```json
[
  {
    "id": "evt_1",
    "runId": "run_123",
    "ts": "2026-02-03T08:00:15Z",
    "seq": 1,
    "channel": "http",
    "type": "http.request",
    "actor": "adversary",
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "host": "api.openai.com",
    "classification": "llm_provider"
  }
]
```

---

### Findings

```http
GET /api/runs/{runId}/findings
```

**Response** (200 OK):
```json
[
  {
    "id": "find_1",
    "runId": "run_123",
    "severity": "critical",
    "status": "confirmed",
    "confidence": 0.92,
    "title": "Secret Leaked to External API",
    "description": "Agent exposed API key in request to attacker-controlled endpoint",
    "remediation": "Implement secret detection and output filtering",
    "createdAt": "2026-02-03T08:05:00Z"
  }
]
```

---

### Reports

#### Generate Report

```http
POST /api/runs/{runId}/report
```

Generates a markdown report for the run (if not already generated).

**Response** (200 OK):
```json
{
  "markdown": "# COGUMI AI Protect - Security Assessment Report\n\n...",
  "generatedAt": "2026-02-03T10:00:00Z"
}
```

#### Get Report

```http
GET /api/runs/{runId}/report
```

Retrieves existing report.

**Response** (200 OK):
```json
{
  "markdown": "# COGUMI AI Protect - Security Assessment Report\n\n...",
  "generatedAt": "2026-02-03T09:00:00Z"
}
```

**Errors**:
- `404 Not Found`: Report not yet generated
- `400 Bad Request`: Run not completed yet

---

### Quota Usage

```http
GET /api/quotas
```

**Response** (200 OK):
```json
{
  "projects": {
    "current": 3,
    "limit": 5,
    "percentage": 60
  },
  "runsPerMonth": {
    "current": 45,
    "limit": 100,
    "percentage": 45
  },
  "storage": {
    "current": 250,
    "limit": 1000,
    "percentage": 25
  }
}
```

---

### Event Ingestion (Sidecar)

```http
POST /api/ingest/events
Authorization: Bearer <sidecar_token>
Content-Type: application/json

{
  "events": [
    {
      "event_type": "http.request",
      "timestamp": "2026-02-03T10:00:00Z",
      "project_id": "proj_abc",
      "method": "POST",
      "url": "https://api.openai.com/v1/chat/completions",
      "host": "api.openai.com",
      "path": "/v1/chat/completions",
      "status_code": null,
      "headers": {
        "Authorization": "Bearer sk-***",
        "Content-Type": "application/json"
      },
      "body": "{\"messages\":[...]}",
      "body_truncated": false,
      "destination_type": "llm_provider",
      "secret_matches": [],
      "protocol": "https"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "message": "Events ingested successfully",
  "count": 1
}
```

**Errors**:
- `401 Unauthorized`: Invalid token
- `429 Quota Exceeded`: Event quota exceeded for run

---

### Server-Sent Events (SSE)

#### Live Run Updates

```http
GET /api/runs/{runId}/stream
```

Streams real-time updates for an active run.

**Event Types**:

```javascript
// Story step created
event: story_step
data: {"id":"step_1","type":"attempt",...}

// Finding created
event: finding
data: {"id":"find_1","severity":"critical",...}

// Run status changed
event: run_status
data: {"runId":"run_123","status":"completed"}
```

**Example** (JavaScript):
```javascript
const eventSource = new EventSource(`/api/runs/${runId}/stream`);

eventSource.addEventListener('story_step', (e) => {
  const step = JSON.parse(e.data);
  console.log('New story step:', step);
});

eventSource.addEventListener('finding', (e) => {
  const finding = JSON.parse(e.data);
  console.log('New finding:', finding);
});

eventSource.addEventListener('run_status', (e) => {
  const update = JSON.parse(e.data);
  if (update.status === 'completed') {
    eventSource.close();
  }
});
```

---

### Cron (Internal)

#### Retention Cleanup

```http
POST /api/cron/cleanup
X-Cron-Secret: <cron_secret>
```

Runs retention cleanup for all organizations.

**Response** (200 OK):
```json
{
  "success": true,
  "orgsProcessed": 5,
  "eventsDeleted": 1234,
  "runsDeleted": 45,
  "timestamp": "2026-02-03T02:00:00Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "current": 10,
  "limit": 10
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (invalid input) |
| `401` | Unauthorized (missing/invalid auth) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `429` | Too Many Requests (quota exceeded) |
| `500` | Internal Server Error |
| `503` | Service Unavailable (health check failed) |

---

## Rate Limits

| Resource | Limit |
|----------|-------|
| Projects per org | 5 |
| Runs per day (per project) | 10 |
| Runs per month (org) | 100 |
| Events per run | 10,000 |
| API requests per minute | 60 |

Exceeding limits returns `429 Too Many Requests`.

---

## Webhooks (Future)

Coming in M13:
- Run completed
- Finding created (critical only)
- Quota exceeded

---

## SDK Examples

### Python

```python
import requests

BASE_URL = "https://cogumi.yourcompany.com"
SESSION_COOKIE = "your_session_cookie"

# Create project
response = requests.post(
    f"{BASE_URL}/api/projects",
    json={
        "name": "Test Project",
        "environment": "sandbox",
        "agentTestUrl": "http://localhost:8000/agent"
    },
    cookies={"next-auth.session-token": SESSION_COOKIE}
)
project = response.json()

# Create run
response = requests.post(
    f"{BASE_URL}/api/projects/{project['id']}/runs",
    json={"mode": "campaign"},
    cookies={"next-auth.session-token": SESSION_COOKIE}
)
run = response.json()

# Poll for completion
import time
while True:
    response = requests.get(
        f"{BASE_URL}/api/runs/{run['id']}",
        cookies={"next-auth.session-token": SESSION_COOKIE}
    )
    run_status = response.json()
    if run_status['status'] == 'completed':
        break
    time.sleep(5)

# Download report
response = requests.post(
    f"{BASE_URL}/api/runs/{run['id']}/report",
    cookies={"next-auth.session-token": SESSION_COOKIE}
)
report = response.json()
with open('report.md', 'w') as f:
    f.write(report['markdown'])
```

### Node.js

```javascript
const axios = require('axios');

const BASE_URL = 'https://cogumi.yourcompany.com';
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

async function createAndRunTest() {
  // Create project
  const { data: project } = await client.post('/api/projects', {
    name: 'Test Project',
    environment: 'sandbox',
    agentTestUrl: 'http://localhost:8000/agent'
  });

  // Create run
  const { data: run } = await client.post(
    `/api/projects/${project.id}/runs`,
    { mode: 'campaign' }
  );

  // Stream updates
  const EventSource = require('eventsource');
  const es = new EventSource(`${BASE_URL}/api/runs/${run.id}/stream`);
  
  es.addEventListener('story_step', (e) => {
    console.log('Story step:', JSON.parse(e.data));
  });
  
  es.addEventListener('run_status', (e) => {
    const { status } = JSON.parse(e.data);
    if (status === 'completed') {
      es.close();
      downloadReport(run.id);
    }
  });
}

async function downloadReport(runId) {
  const { data } = await client.post(`/api/runs/${runId}/report`);
  require('fs').writeFileSync('report.md', data.markdown);
}
```

---

## Support

For API questions:
- **Email**: api-support@cogumi.ai
- **Slack**: [cogumi-community.slack.com](https://cogumi-community.slack.com)
