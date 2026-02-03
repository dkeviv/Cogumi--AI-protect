# Cogumi AI Protect - Sidecar Proxy

A lightweight Go HTTP/HTTPS proxy that captures AI agent traffic and ships security events to the Cogumi platform.

## Features

- **HTTP Proxy**: Forwards HTTP requests and captures full request/response
- **HTTPS CONNECT Tunnel**: Tunnels HTTPS traffic without TLS decryption (metadata only)
- **Secret Detection**: Identifies API keys, tokens, and credentials in HTTP bodies
- **Destination Classification**: Categorizes traffic as tool/internal/external
- **Header Redaction**: Automatically redacts sensitive headers
- **Event Batching**: Buffers and ships events in batches every 5 seconds
- **Throttling**: Prevents event flooding with automatic throttling
- **Heartbeat**: Sends connection status to SaaS every 30 seconds

## Environment Variables

```bash
COGUMI_TOKEN=cog_xxx          # Required: Sidecar authentication token
COGUMI_API_URL=http://...     # Optional: SaaS API URL (default: http://localhost:3001)
COGUMI_PROJECT_ID=uuid        # Required: Project ID
LISTEN_ADDR=:8080             # Optional: Proxy listen address (default: :8080)
```

## Build & Run

### Local Development
```bash
go run main.go
```

### Docker Build
```bash
docker build -t cogumi/sidecar:latest .
```

### Docker Run
```bash
docker run -d \
  -e COGUMI_TOKEN=your_token \
  -e COGUMI_API_URL=http://host.docker.internal:3001 \
  -e COGUMI_PROJECT_ID=your_project_id \
  -p 8080:8080 \
  cogumi/sidecar:latest
```

## Usage with AI Agents

Configure your AI agent to use the sidecar as a proxy:

```bash
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
```

Or in Docker Compose:
```yaml
services:
  your-agent:
    image: your-agent:latest
    environment:
      - HTTP_PROXY=http://cogumi-sidecar:8080
      - HTTPS_PROXY=http://cogumi-sidecar:8080
    depends_on:
      - cogumi-sidecar
```

## Event Types

- `http_request`: Outgoing HTTP request
- `http_response`: HTTP response received
- `https_connect`: HTTPS tunnel established (metadata only)
- `ingest_throttled`: Event buffer overflow

## Secret Detection

Automatically detects and reports:
- OpenAI API keys (`sk-...`)
- AWS access keys (`AKIA...`)
- Generic API keys
- Custom patterns (configurable)

**Note**: Full secret values are NEVER stored. Only type, preview, and confidence are reported.

## Security

- No TLS decryption (HTTPS traffic is tunneled, not inspected)
- Headers with sensitive names are redacted
- Secrets in bodies are detected but not logged in full
- Token is required for all API communication
- Event buffer size limits prevent memory exhaustion
