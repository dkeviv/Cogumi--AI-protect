# 🚀 QUICK START - COGUMI AI Protect

**Get from zero to running demo in under 5 minutes.**

---

## Your Questions Answered

### 1. ✅ Email/Password Auth (No Google OAuth)
- Uses email + password authentication
- Email verification **disabled** in demo mode (auto-enabled)
- No email server needed for local testing

### 2. 🐳 Docker Setup Fixed
- Added missing `apps/ui/Dockerfile`
- Fixed worker Dockerfile issues
- Everything now works with `docker-compose up -d`

### 3. 🔧 What is "Deploy Sidecar"?
The **sidecar is a proxy** that:
- Sits between your AI agent and external APIs
- Captures network traffic metadata (no TLS decryption)
- Sends events to COGUMI platform for analysis
- Runs in your environment (not in the cloud)

**Think of it as:** A security camera for your AI agent's network calls.

### 4. 🧪 Testing with Agent
- **Demo agent included** - runs in Docker
- **Real-world agents** - configure URL in project settings
- **Agent URL** = HTTP endpoint that accepts chat messages

### 5. 🔌 Port 3000 Taken? Use Another Port!
```bash
# In your .env file:
WEB_PORT=3001  # or any available port
```

### 6. 🌐 Do Agents Always Have URLs?
**In real world:**
- ✅ **Agent API** - Yes, they have URLs (e.g., your chatbot endpoint)
- ✅ **Agent Service** - Yes, they have URLs (internal microservice)
- ❌ **Client-side AI** - No URL, runs in browser/app
- ❌ **CLI tools** - No URL, runs locally

**For testing those without URLs:**
- Wrap them in a simple HTTP server
- Or use our demo-agent pattern as template

### 7. 🎯 One-Click Demo After Login
**Implemented!** The seed script creates:
- ✅ Pre-configured demo project
- ✅ Ready-to-use sidecar token
- ✅ Demo agent already connected
- ✅ Just click "Run Tests" and watch!

---

## 5-Minute Setup

### Step 1: Configure Environment (30 seconds)

```bash
# Copy example env
cp .env.example .env

# Edit .env
nano .env
```

**Required changes:**
```bash
# Change port if 3000 is taken
WEB_PORT=3000  # or 3001, 8000, etc.

# Add OpenRouter key for demo agent
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Get OpenRouter key (free):** https://openrouter.ai/keys

**Optional - everything else has defaults:**
- ✅ `NEXTAUTH_SECRET` - auto-generated
- ✅ `SKIP_EMAIL_VERIFICATION=true` - already set
- ✅ `DATABASE_URL` - uses Docker Postgres
- ✅ `REDIS_URL` - uses Docker Redis

### Step 2: Start Everything (2 minutes)

```bash
# Start all services
docker-compose up -d

# Wait for services to be ready (check health)
docker-compose ps

# Should see:
# ✅ cogumi-postgres (healthy)
# ✅ cogumi-redis (healthy)
# ✅ cogumi-web (running)
# ✅ cogumi-worker (running)
# ✅ cogumi-demo-agent (running)
```

**If worker fails:** Missing Dockerfile was the issue - now fixed!

### Step 3: Initialize Database (1 minute)

```bash
# Run migrations
docker-compose exec web npx prisma migrate deploy

# Seed demo data
docker-compose exec web npm run db:seed
```

**You'll see:**
```
🎉 Demo database seeded successfully!

📧 LOGIN CREDENTIALS:
   Email:    demo@cogumi.ai
   Password: demo123

🔑 SIDECAR TOKEN (copy this):
   demo_abc123def456...
```

**Copy the sidecar token!** You'll need it in Step 5.

### Step 4: Login (30 seconds)

1. Open http://localhost:3000 (or your WEB_PORT)
2. Click "Sign up" (or "Login")
3. Email: `demo@cogumi.ai`
4. Password: `demo123`
5. ✅ You're in!

You'll see the pre-configured project: **"Demo Agent Security Test"**

### Step 5: Start Sidecar (1 minute)

**In a new terminal:**

```bash
cd apps/sidecar

# Start sidecar with your token from Step 3
./start-demo.sh demo_abc123def456...
```

**You'll see:**
```
🚀 Starting COGUMI Sidecar Proxy...
   Token: demo_abc123def456...
   API:   http://localhost:3000
   Port:  8080

[Sidecar] Proxy listening on :8080
[Sidecar] Connected to COGUMI platform
[Sidecar] Heartbeat started
```

**Keep this terminal open!** The sidecar needs to run during tests.

### Step 6: Run Demo! (30 seconds)

**Back in the browser:**

1. Click on **"Demo Agent Security Test"** project
2. Click **"Run Tests"** button
3. Select all test types (S1-S5) or use default
4. Click **"Start Run"**

**Watch the magic! ✨**

- Exploit feed updates in real-time
- See secrets being leaked
- Watch network calls to external domains
- Evidence chains build automatically
- Risk scores calculate live

---

## What You're Seeing

### Left Panel: Exploit Feed
Narrative timeline of attacks:
- 🎯 "Attempt: Prompt injection via role override"
- ✅ "Confirmed: Secret leaked in agent response"
- ⚠️ "Attempted: Data exfiltration to untrusted domain"
- 🔴 "Confirmed: Privileged operation executed"

### Center: Timeline
- Time scrubber with markers
- Click to jump to specific events
- Syncs conversation + network views

### Right Panel: Tabs
- **Conversation**: Chat messages with agent
- **Network Proof**: HTTP calls with evidence
- **Findings**: Scored vulnerabilities
- **Policy**: Violations detected
- **Memory**: Context usage

### Proof Drawer
Click any exploit in the feed:
- See full chain of evidence
- Jump to related events
- Review detection logic
- See remediation suggestions

---

## Understanding the Demo

### What is the Demo Agent?

A simple AI chatbot that:
- Uses Llama 70B via OpenRouter
- **Intentionally vulnerable** to demonstrate detection
- Responds to all attack types (S1-S5)
- Simulates real-world agent behaviors

**Vulnerabilities it has:**
- ✅ Leaks secrets when prompted (S3)
- ✅ Accepts prompt injections (S1)
- ✅ Falls for jailbreaks (S2)
- ✅ Exfiltrates data to external URLs (S4)
- ✅ Executes privileged operations (S5)

### What is the Sidecar?

**The sidecar is a security proxy:**

```
Your Agent → Sidecar Proxy → External APIs
                 ↓
            COGUMI Platform
            (analysis)
```

**What it does:**
- Captures HTTP request/response metadata
- Captures HTTPS connection metadata (no decryption!)
- Detects secrets in HTTP bodies
- Classifies destinations (tool vs attacker)
- Ships events to platform
- Rate limits to prevent abuse

**What it doesn't do:**
- ❌ No TLS decryption (no man-in-the-middle)
- ❌ No credential interception
- ❌ No blocking (observes only)

### Agent URL Explained

**The agent URL is where your AI agent accepts messages.**

**Examples in real world:**

| Scenario | Agent URL Example |
|----------|-------------------|
| Custom chatbot API | `https://api.yourapp.com/v1/chat` |
| Internal microservice | `http://agent-service:8000/message` |
| OpenAI wrapper | `http://localhost:3000/api/openai-proxy` |
| LangChain server | `http://langchain:8080/invoke` |
| Demo agent | `http://demo-agent:3001/chat` |

**What if my agent doesn't have a URL?**

Wrap it in a simple HTTP server:

```typescript
// Simple Express wrapper
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  const response = await myAgent.chat(message);
  res.json({ response });
});
```

See `apps/demo-agent/src/server.ts` as a template!

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Stop other service or use different port
WEB_PORT=3001 docker-compose up -d

# Access at http://localhost:3001
```

### Docker Worker Failed to Read Dockerfile

**Fixed!** Created `apps/ui/Dockerfile`. 

If still failing:
```bash
# Rebuild
docker-compose build worker
docker-compose up -d
```

### Email Verification Error

Email verification is **disabled in demo mode**.

Check `.env`:
```bash
SKIP_EMAIL_VERIFICATION=true
```

### Sidecar Won't Start

```bash
# From apps/sidecar directory:

# Option 1: Use the script
./start-demo.sh YOUR_TOKEN

# Option 2: Run directly
go run cmd/sidecar/main.go \
  --token=YOUR_TOKEN \
  --api-url=http://localhost:3000 \
  --port=8080

# Option 3: Build then run
go build -o sidecar cmd/sidecar/main.go
./sidecar --token=YOUR_TOKEN
```

### Demo Agent Not Responding

```bash
# Check if it's running
docker-compose ps cogumi-demo-agent

# Check logs
docker-compose logs demo-agent

# Check OpenRouter key
docker-compose exec demo-agent env | grep OPENROUTER

# Test directly
curl http://localhost:3001/health
```

### Tests Not Running

```bash
# Check worker logs
docker-compose logs -f worker

# Check Redis
docker-compose exec redis redis-cli PING

# Restart worker
docker-compose restart worker
```

---

## After the Demo

### Export Report

1. Wait for run to complete
2. Click "Export Report"
3. Get Markdown file with:
   - Executive summary
   - Detailed findings
   - Evidence chains
   - Remediation steps

### Review Findings

Click "Findings" tab to see:
- Risk scores (Critical/High/Medium/Low)
- Attack types detected
- Evidence links
- Recommendations

### Run Again

- Click "Run Tests" again
- Previous runs saved in history
- Compare results over time

---

## Testing with Your Own Agent

### Step 1: Create New Project

1. Click "New Project"
2. Name it (e.g., "My Production Agent Test")
3. Environment: `sandbox` (start here)
4. Agent Test URL: `https://your-agent.com/chat`

### Step 2: Configure Domains

**Tool Domains** - APIs your agent should call:
```
api.stripe.com
api.github.com
api.slack.com
```

**Internal Suffixes** - Your organization's domains:
```
yourcompany.com
internal.yourcompany.net
```

This helps classify network calls as "expected" vs "suspicious".

### Step 3: Generate Token

1. Go to Settings → Tokens
2. Click "Generate Token"
3. Copy it (shown only once!)

### Step 4: Deploy Sidecar

**In your agent's environment:**

```bash
# Download sidecar
# (build from source or get binary)

# Run it
HTTP_PROXY=http://localhost:8080 \
HTTPS_PROXY=http://localhost:8080 \
./sidecar \
  --token=YOUR_TOKEN \
  --api-url=https://your-cogumi-instance.com \
  --port=8080
```

**Configure your agent to use proxy:**

```bash
# Node.js
process.env.HTTP_PROXY = 'http://localhost:8080';
process.env.HTTPS_PROXY = 'http://localhost:8080';

# Python
os.environ['HTTP_PROXY'] = 'http://localhost:8080'
os.environ['HTTPS_PROXY'] = 'http://localhost:8080'

# Go
os.Setenv("HTTP_PROXY", "http://localhost:8080")
os.Setenv("HTTPS_PROXY", "http://localhost:8080")
```

### Step 5: Test!

Run your red team tests and review findings.

---

## Production Checklist

Before testing production agents:

- [ ] Review security policy
- [ ] Get stakeholder approval
- [ ] Use `production` environment
- [ ] Complete 3-checkbox override flow
- [ ] Set conservative quotas
- [ ] Monitor run duration (30min cap)
- [ ] Review findings before sharing
- [ ] Export and archive reports

---

## Quick Commands Reference

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f [service]

# Rebuild service
docker-compose build [service]
docker-compose up -d [service]

# Run migrations
docker-compose exec web npx prisma migrate deploy

# Seed demo data
docker-compose exec web npm run db:seed

# Access database
docker-compose exec postgres psql -U postgres cogumi_ai_protect

# Check Redis
docker-compose exec redis redis-cli

# Restart sidecar
cd apps/sidecar
./start-demo.sh YOUR_TOKEN
```

---

## Next Steps

1. ✅ **Run the demo** - See it work end-to-end
2. 📚 **Read specs** - See `spec/` folder for details
3. 🔧 **Customize tests** - Edit scripts in `packages/scripts`
4. 🚀 **Deploy production** - See `SHIPPING.md`
5. 🤝 **Test your agent** - Follow "Testing with Your Own Agent"

---

## Support

**Questions?**
- 📖 Full demo: [DEMO.md](./DEMO.md)
- 📦 Shipping guide: [SHIPPING.md](./SHIPPING.md)
- 🏗️ Architecture: [AGENTS.md](./AGENTS.md)
- 📋 Specifications: [spec/](./spec/)

**Issues?**
- Check docker-compose logs
- Verify .env configuration
- Ensure ports are available
- Check OpenRouter API key

---

**Ready?** `docker-compose up -d` and visit http://localhost:3000! 🚀
