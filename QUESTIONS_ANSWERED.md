# ✅ Your Questions - All Answered

This document directly answers all 7 questions you asked.

---

## 1. Email Signup (No Google OAuth)

**Q: We implemented email sign up and no google auth right? So we need to setup email to test that flow**

**A: You use email/password auth, but NO email server needed for demo!**

✅ **What's Implemented:**
- Email + password authentication (no Google OAuth)
- Password hashing with bcrypt
- Email verification check in code

✅ **What I Fixed:**
- Added `SKIP_EMAIL_VERIFICATION=true` env var
- Demo mode bypasses email verification
- Seed script creates pre-verified demo user

**To test:**
```bash
# In .env:
SKIP_EMAIL_VERIFICATION=true

# Start platform
docker-compose up -d

# Seed demo user (pre-verified)
docker-compose exec web npm run db:seed

# Login:
Email: demo@cogumi.ai
Password: demo123
```

**No email server needed!** ✨

---

## 2. Docker Compose Error - "Failed to Read Dockerfile"

**Q: For local testing for me, I just ran docker-compose up -d and got canceled worker internal . failed to read docker file**

**A: Missing Dockerfile - NOW FIXED!**

✅ **What Was Wrong:**
- `apps/ui/Dockerfile` didn't exist
- docker-compose.yml referenced it
- Build failed

✅ **What I Fixed:**
- Created `apps/ui/Dockerfile` with multi-stage build
- Includes Prisma generation
- Optimized for production

**Test it now:**
```bash
docker-compose build
docker-compose up -d

# Should see:
# ✅ cogumi-web (running)
# ✅ cogumi-worker (running)
# ✅ cogumi-demo-agent (running)
```

---

## 3. What is "Deploy Sidecar"?

**Q: Explain deploy sidecar -> explain**

**A: Sidecar is a security proxy that captures your agent's network activity.**

### What It Does

The **sidecar** is a Go HTTP/HTTPS proxy that:

1. **Sits Between Your Agent and the Internet**
   ```
   Your AI Agent → Sidecar Proxy → External APIs
                        ↓
                  COGUMI Platform
                  (analyzes events)
   ```

2. **Captures Network Metadata**
   - HTTP: Full request/response (headers + body)
   - HTTPS: Connection metadata only (NO DECRYPTION!)
   - Destination domains
   - Timing information

3. **Detects Security Issues**
   - Secrets in HTTP bodies (API keys, passwords)
   - Connections to suspicious domains
   - Unauthorized API calls
   - Data exfiltration attempts

4. **Ships Events to Platform**
   - Batches events every second
   - Sends to COGUMI ingest endpoint
   - Platform correlates with test scripts
   - Builds evidence chains

### How to "Deploy" It

**For Demo (local):**
```bash
cd apps/sidecar
./start-demo.sh YOUR_SIDECAR_TOKEN
```

**For Real Agent:**
```bash
# Run sidecar in agent's environment
HTTP_PROXY=http://localhost:8080 \
HTTPS_PROXY=http://localhost:8080 \
./sidecar --token=YOUR_TOKEN --api-url=https://cogumi.com --port=8080

# Configure your agent to use proxy
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
node your-agent.js
```

### What It Doesn't Do

❌ **No TLS Decryption** - Doesn't break HTTPS encryption
❌ **No Blocking** - Only observes, doesn't block traffic
❌ **No Credential Theft** - Only captures metadata, not TLS payloads

### Think of It As...

**A security camera for your AI agent's network calls.**

---

## 4. How to Test It with Agent

**Q: How to test it with agent.**

**A: Two ways - with demo agent (easy) or with your own agent**

### Option A: Test with Demo Agent (Recommended)

**1. Start everything:**
```bash
./setup-demo.sh
```

**2. Get sidecar token from seed output:**
```
🔑 SIDECAR TOKEN (copy this):
   demo_abc123def456...
```

**3. Start sidecar:**
```bash
cd apps/sidecar
./start-demo.sh demo_abc123def456...
```

**4. Login and run:**
- Open http://localhost:3000
- Login: demo@cogumi.ai / demo123
- Click "Demo Agent Security Test" project
- Click "Run Tests"
- ✅ Watch exploits appear!

### Option B: Test with Your Own Agent

**1. Create project in UI:**
- Name: "My Agent Test"
- Agent Test URL: `http://your-agent.com/chat`
- Environment: sandbox

**2. Generate sidecar token:**
- Settings → Tokens → Generate

**3. Deploy sidecar in your agent's env:**
```bash
# Download/build sidecar
go build -o sidecar cmd/sidecar/main.go

# Run it
./sidecar \
  --token=YOUR_TOKEN \
  --api-url=http://localhost:3000 \
  --port=8080
```

**4. Configure your agent to use proxy:**
```javascript
// Node.js
process.env.HTTP_PROXY = 'http://localhost:8080';
process.env.HTTPS_PROXY = 'http://localhost:8080';
```

**5. Run tests in UI**

---

## 5. Port 3000 is Taken

**Q: port 3000 is taken up by another app. So need to use another port**

**A: Use WEB_PORT env var - EASY FIX!**

✅ **What I Fixed:**
- Added `WEB_PORT` environment variable
- docker-compose uses it with default 3000
- Updated .env.example

**To use different port:**

```bash
# In .env:
WEB_PORT=3001  # or 8000, 4000, whatever you want

# Restart:
docker-compose down
docker-compose up -d

# Access at:
http://localhost:3001
```

**Or without .env:**
```bash
WEB_PORT=3001 docker-compose up -d
```

**Also updates:**
- NEXTAUTH_URL automatically
- All internal references
- Seed script output

---

## 6. Agent URL - Real World Scenarios

**Q: we have agent url. In real world scenario will agent always have a url?**

**A: Not always! Here's the breakdown:**

### Agents WITH URLs ✅

| Type | Example | Agent Test URL |
|------|---------|----------------|
| **API Service** | Chatbot API | `https://api.yourapp.com/v1/chat` |
| **Microservice** | Internal agent | `http://agent-service:8000/message` |
| **Wrapper Service** | OpenAI proxy | `http://localhost:3000/api/openai` |
| **Cloud Function** | AWS Lambda | `https://abc123.lambda-url.us-east-1.on.aws/` |
| **Web API** | Public endpoint | `https://bot.example.com/webhook` |

### Agents WITHOUT URLs ❌

| Type | Why No URL | Workaround |
|------|-----------|-----------|
| **Client-side AI** | Runs in browser | Wrap in simple HTTP endpoint |
| **CLI Tool** | Command-line only | Add HTTP server mode |
| **Desktop App** | Local process | Expose REST API |
| **Library/SDK** | Imported code | Create thin wrapper |
| **Embedded Agent** | In mobile app | Create test harness |

### Workaround: Create Simple Wrapper

If your agent doesn't have a URL, wrap it:

```typescript
// wrapper.ts
import express from 'express';
import { myAgent } from './my-agent';

const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  const response = await myAgent.chat(message);
  res.json({ response });
});

app.listen(3001);
```

Then use `http://localhost:3001/chat` as Agent Test URL.

**See `apps/demo-agent` as a complete example!**

### What the URL Needs to Accept

**Minimal required interface:**
```json
POST /chat
Content-Type: application/json

{
  "message": "user message here",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "response": "agent response here"
}
```

That's it! Your wrapper can translate from your agent's actual interface to this standard.

---

## 7. One-Click Demo After Login

**Q: Everything should be setup already in a manner such that a single click after login should run the demo and show everything.**

**A: DONE! ✅ It's now as close to one-click as possible!**

### What's Pre-Configured

✅ **Database Seed Creates:**
1. Demo organization
2. Demo user (email verified)
3. Demo project named "Demo Agent Security Test"
4. Agent URL pre-set to `http://demo-agent:3001/chat`
5. Sidecar token pre-generated
6. Tool domains configured
7. Environment set to sandbox

✅ **After Login You See:**
- Project already exists
- Named "Demo Agent Security Test"
- Ready to run

✅ **Literally One Click:**
1. Login → Automatically in demo org
2. Click "Demo Agent Security Test" → Opens project
3. Click "Run Tests" → Tests start immediately!

### Setup Flow

**Before (What you do ONCE):**
```bash
# 1. Configure (30 seconds)
cp .env.example .env
nano .env  # Add OPENROUTER_API_KEY

# 2. Run setup script (2 minutes)
./setup-demo.sh

# 3. Start sidecar (30 seconds)
cd apps/sidecar
./start-demo.sh YOUR_TOKEN  # Token shown in seed output
```

**During Demo (What user does):**
```
1. Open http://localhost:3000
2. Login: demo@cogumi.ai / demo123
3. Click "Demo Agent Security Test"
4. Click "Run Tests"
5. ✨ Watch live exploits!
```

### What Runs Automatically

When you click "Run Tests":

1. ✅ Worker picks up job from Redis queue
2. ✅ Executes S1-S5 test scripts
3. ✅ Sends adversarial prompts to demo agent
4. ✅ Demo agent responds (via sidecar proxy)
5. ✅ Sidecar captures all network calls
6. ✅ Events ship to platform
7. ✅ Story steps build in real-time
8. ✅ Secrets detected automatically
9. ✅ Findings scored
10. ✅ UI updates live via SSE

**User sees:**
- Exploit feed populating in real-time
- "Secret leaked" → "Data exfiltration" → "Privilege escalation"
- Evidence chains building
- Risk scores calculating
- Network proof appearing

### Can't Get More "One-Click" Because...

**The sidecar MUST run separately** because:
- It's a proxy your agent uses
- Needs to intercept traffic
- Runs in your agent's environment
- Can't be in Docker with web UI

**But we made it as easy as possible:**
- One script: `./start-demo.sh TOKEN`
- Token provided in seed output
- Auto-configures everything

---

## Summary

| Question | Status | Solution |
|----------|--------|----------|
| 1. Email verification | ✅ **Fixed** | SKIP_EMAIL_VERIFICATION=true in demo |
| 2. Docker Dockerfile error | ✅ **Fixed** | Created apps/ui/Dockerfile |
| 3. What is sidecar | ✅ **Explained** | See section 3 above |
| 4. How to test with agent | ✅ **Documented** | See section 4 above |
| 5. Port 3000 taken | ✅ **Fixed** | Use WEB_PORT env var |
| 6. Agent URLs real-world | ✅ **Explained** | See section 6 above |
| 7. One-click demo | ✅ **Implemented** | Seed creates everything |

---

## Quick Test Now

```bash
# 1. Setup (if not done)
./setup-demo.sh

# 2. Start sidecar (new terminal)
cd apps/sidecar
./start-demo.sh YOUR_TOKEN_FROM_SEED

# 3. Open browser
open http://localhost:3000

# 4. Login
# Email: demo@cogumi.ai
# Password: demo123

# 5. Click
# "Demo Agent Security Test" → "Run Tests"

# 6. Watch!
# See live exploits, secrets, network calls, evidence chains
```

**That's it!** 🎉

---

## Full Documentation

- **QUICKSTART.md** - Comprehensive setup guide
- **DEMO.md** - Full demo walkthrough  
- **SHIPPING.md** - Production deployment
- **SHIP_READY.md** - Executive summary

All your questions answered! ✅
