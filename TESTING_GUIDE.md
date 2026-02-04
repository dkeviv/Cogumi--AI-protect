# 🧪 Complete Testing Guide - COGUMI AI Protect

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Gmail app password set in `.env`
- [ ] OpenRouter API key set in `.env`
- [ ] pnpm installed (`npm install -g pnpm`)

---

## Part 1: Environment Setup (5 minutes)

### Step 1.1: Install Dependencies
```bash
# From project root
cd /Users/vivekdurairaj/Cogumi--AI-protect

# Install all dependencies
pnpm install

# Install dependencies for all workspaces
pnpm install -r
```

### Step 1.2: Setup Database
```bash
# Start PostgreSQL (if not running)
# macOS with Homebrew:
brew services start postgresql@14

# Or start manually:
# pg_ctl -D /usr/local/var/postgres start

# Create database
createdb cogumi_ai_protect

# Run Prisma migrations
cd packages/db
pnpm prisma migrate dev
pnpm prisma generate

# Go back to root
cd ../..
```

### Step 1.3: Setup Redis
```bash
# Start Redis (if not running)
# macOS with Homebrew:
brew services start redis

# Or start manually:
redis-server

# Verify Redis is running:
redis-cli ping
# Should return: PONG
```

### Step 1.4: Verify Environment Variables
```bash
# Check your .env file has these set:
cat .env | grep -E "SMTP_PASSWORD|OPENROUTER_API_KEY"

# Should show:
# SMTP_PASSWORD="your-16-char-password"  (not YOUR_16_CHAR_APP_PASSWORD_HERE)
# OPENROUTER_API_KEY="sk-or-v1-..."     (not YOUR_OPENROUTER_API_KEY_HERE)
```

---

## Part 2: Start All Services (3 minutes)

You'll need **4 terminal windows**. Open them all now.

### Terminal 1: Start Web Server (UI + API)
```bash
cd /Users/vivekdurairaj/Cogumi--AI-protect/apps/ui

# Start Next.js development server
pnpm dev

# Wait for: "Ready - started server on 0.0.0.0:3000"
# Keep this terminal running
```

### Terminal 2: Start Worker
```bash
cd /Users/vivekdurairaj/Cogumi--AI-protect/apps/worker

# Start BullMQ worker
pnpm dev

# Wait for: "Worker started successfully"
# Keep this terminal running
```

### Terminal 3: Start Demo Agent
```bash
cd /Users/vivekdurairaj/Cogumi--AI-protect/apps/demo-agent

# Install dependencies if not done
pnpm install

# Start demo agent server
pnpm dev

# Wait for: "Demo Agent listening on port 3001"
# Keep this terminal running
```

### Terminal 4: Testing Commands
```bash
# Use this terminal for running test commands
cd /Users/vivekdurairaj/Cogumi--AI-protect
```

---

## Part 3: Test Email Verification (10 minutes)

### Step 3.1: Register a New Account
```bash
# In Terminal 4, run:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "YOUR_ACTUAL_EMAIL@gmail.com",
    "password": "TestPassword123!",
    "organizationName": "Test Organization"
  }'
```

**Expected Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "some-uuid"
}
```

### Step 3.2: Check Your Email
1. Open your email inbox (the email you registered with)
2. Look for email from "COGUMI AI Protect"
3. Subject should be: "Verify Your Email Address"
4. You should see a nice HTML email with a "Verify Email" button

**✅ SUCCESS CRITERIA:**
- Email arrives within 1 minute
- From address shows as configured in `.env` (SMTP_FROM_EMAIL)
- Email has professional HTML formatting
- Contains verification link

### Step 3.3: Verify Email
1. Click the "Verify Email" button in the email
2. Should redirect to: `http://localhost:3000/auth/verified`
3. Should see success message: "Email Verified!"

**Or manually extract token and verify:**
```bash
# Copy the token from the email URL (after ?token=)
# Then run:
curl "http://localhost:3000/api/auth/verify-email?token=PASTE_TOKEN_HERE"

# Should redirect to success page
```

### Step 3.4: Sign In
**Option A: Browser**
1. Open browser: http://localhost:3000/auth/signin
2. Enter email and password
3. Click "Sign In"
4. Should redirect to dashboard

**Option B: API**
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_ACTUAL_EMAIL@gmail.com",
    "password": "TestPassword123!"
  }'
```

**✅ SUCCESS CRITERIA:**
- Login successful
- Session created
- Redirected to dashboard

---

## Part 4: Test Multi-Tenancy (5 minutes)

### Step 4.1: Create Second Organization
```bash
# Register another user with different org
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Second User",
    "email": "ANOTHER_EMAIL@gmail.com",
    "password": "TestPassword123!",
    "organizationName": "Second Organization"
  }'

# Verify email (check inbox)
# Sign in with second user
```

### Step 4.2: Create Projects in Each Org

**In Browser:**
1. Sign in as First User
2. Go to Projects → Create New Project
3. Name: "Org A Project"
4. Note the Project ID

5. Sign out
6. Sign in as Second User
7. Create project: "Org B Project"
8. Note the Project ID

### Step 4.3: Verify Data Isolation
```bash
# Try to access Org A's project while signed in as Org B
# (You'll need to get the session cookie)

# Expected: 403 Forbidden or project not found
# This proves multi-tenancy is working
```

**✅ SUCCESS CRITERIA:**
- Each org can only see their own projects
- Cross-org access returns 403 or not found
- No data leakage between organizations

---

## Part 5: Test Demo Agent (10 minutes)

### Step 5.1: Direct Agent Test
```bash
# In Terminal 4, test the demo agent directly
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, who are you?",
    "conversationHistory": []
  }' | jq
```

**Expected Response:**
```json
{
  "response": "I am an AI assistant...",
  "conversationHistory": [...]
}
```

### Step 5.2: Test Tool Execution (Weather)
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather in San Francisco?",
    "conversationHistory": []
  }' | jq
```

**Expected:**
- Agent should call the `get_weather` tool
- Should return actual weather data
- Response includes temperature and conditions

### Step 5.3: Test Tool Execution (Stock Price)
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the current stock price of AAPL?",
    "conversationHistory": []
  }' | jq
```

**Expected:**
- Agent calls `get_stock_price` tool
- Returns current AAPL stock price
- Includes market cap and other details

### Step 5.4: Test Knowledge Search
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Search for information about machine learning",
    "conversationHistory": []
  }' | jq
```

**Expected:**
- Agent calls `search_knowledge` tool
- Returns search results
- Response includes sources

**✅ SUCCESS CRITERIA:**
- Agent responds to all queries
- Tools execute correctly
- OpenRouter API is being called
- No API errors

---

## Part 6: Test Rate Limiting (5 minutes)

### Step 6.1: Check Rate Limit Headers
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test", "conversationHistory": []}' \
  -i | grep -E "X-RateLimit"
```

**Expected Output:**
```
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 1234567890
```

### Step 6.2: Trigger Rate Limit (Minute Window)
```bash
# Send 21 requests rapidly (limit is 20/min)
for i in {1..21}; do
  echo "Request $i"
  curl -X POST http://localhost:3001/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Test '$i'", "conversationHistory": []}' \
    -i 2>/dev/null | grep -E "HTTP|X-RateLimit|Retry-After"
done
```

**Expected:**
- First 20 requests: HTTP 200 OK
- 21st request: HTTP 429 Too Many Requests
- 429 response includes `Retry-After` header
- `X-RateLimit-Remaining: 0` on 21st request

### Step 6.3: Wait and Retry
```bash
# Wait 60 seconds
echo "Waiting 60 seconds for rate limit to reset..."
sleep 60

# Try again
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "After reset", "conversationHistory": []}' \
  -i | grep -E "HTTP|X-RateLimit"
```

**Expected:**
- HTTP 200 OK
- X-RateLimit-Remaining: 19 (reset)

**✅ SUCCESS CRITERIA:**
- Rate limiting enforces 20 req/min
- 429 status returned when exceeded
- Retry-After header present
- Rate limit resets after 1 minute

---

## Part 7: End-to-End Red Team Test (15 minutes)

### Step 7.1: Setup Project with Demo Agent
**In Browser:**
1. Sign in to http://localhost:3000
2. Go to Projects → Create New Project
3. Fill in:
   - Project Name: "Demo Red Team Test"
   - Environment: "Development"
   - Agent Test URL: `http://localhost:3001/chat`
4. Click Create

### Step 7.2: Configure Project
1. Click on the created project
2. Go to Settings
3. Set Tool Domains: `*.example.com`
4. Set Internal Suffixes: `.internal`
5. Save

### Step 7.3: Create Sidecar Token
1. In Project → Tokens
2. Click "Generate New Token"
3. Copy the token (shown once)
4. Save it for next step

### Step 7.4: Start Sidecar (Optional - if implemented)
```bash
# If sidecar is implemented:
cd apps/sidecar

# Set environment variables
export SIDECAR_TOKEN="paste-token-here"
export PROJECT_ID="paste-project-id-here"
export INGEST_URL="http://localhost:3000/api/ingest/events"

# Start sidecar
./sidecar
```

### Step 7.5: Execute Red Team Run
**In Browser:**
1. Go to Project → Runs
2. Click "Start New Run"
3. Configure:
   - Run Name: "Test Run 1"
   - Attack Intensity: Medium
   - Enable all attack styles
4. Click "Start Run"

**Or via API:**
```bash
# Get session cookie first by signing in via browser
# Then run:
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "projectId": "your-project-id",
    "config": {
      "intensity": "medium",
      "enabledStyles": ["jailbreak", "prompt_injection", "data_exfiltration"]
    }
  }'
```

### Step 7.6: Monitor Run Progress
**Watch the terminals:**
- **Terminal 2 (Worker)**: Should show job processing logs
- **Terminal 3 (Agent)**: Should show incoming chat requests

**In Browser:**
1. Go to Runs → [Your Run]
2. Watch the Exploit Feed update in real-time
3. See StorySteps appear as attacks are attempted
4. Monitor the scrubber timeline

### Step 7.7: Review Results
**After run completes (~5-10 minutes):**
1. Check Exploit Feed - should show narrative of attacks
2. Click on a StoryStep → opens Proof Drawer
3. Review Evidence Chain:
   - Agent request/response
   - Network events
   - Secret detections
   - Policy violations
4. Go to Findings tab - see all detected issues
5. Check Risk Score - should be calculated

**✅ SUCCESS CRITERIA:**
- Run completes successfully
- Worker processes all scripts (S1-S5)
- StorySteps created from events
- Findings generated with severity
- Risk score calculated
- Evidence chain complete
- No errors in any terminal

---

## Part 8: Test Report Generation (2 minutes)

### Step 8.1: Generate Report
**In Browser:**
1. Go to completed Run
2. Click "Generate Report"
3. Should download markdown file

**Or via API:**
```bash
curl -X POST http://localhost:3000/api/runs/[run-id]/report \
  -H "Cookie: your-session-cookie" \
  --output report.md

# View report
cat report.md
```

**Expected Report Contents:**
- Executive Summary
- Risk Score
- Findings by Severity
- Attack Timeline
- Evidence Details
- Recommendations
- Environment disclaimer

**✅ SUCCESS CRITERIA:**
- Report generates successfully
- Contains all findings
- Markdown formatted correctly
- Downloadable file

---

## Common Issues & Solutions

### Issue: Email not sending
**Solution:**
```bash
# Verify SMTP credentials
cd apps/ui
node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
t.verify().then(() => console.log('✅ SMTP works!')).catch(console.error);
"
```

### Issue: OpenRouter API errors
**Solution:**
```bash
# Test API key
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"

# Should return list of models
```

### Issue: Database connection error
**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep cogumi

# If not, create it
createdb cogumi_ai_protect
cd packages/db && pnpm prisma migrate dev
```

### Issue: Redis connection error
**Solution:**
```bash
# Check Redis is running
redis-cli ping

# Should return PONG

# If not running:
brew services start redis
# or
redis-server
```

### Issue: Port already in use
**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or change port in .env
WEB_PORT=3001
```

---

## Complete Test Checklist

### Email System ✅
- [ ] Registration sends verification email
- [ ] Email arrives within 1 minute
- [ ] Email uses custom domain (if configured)
- [ ] Verification link works
- [ ] User can sign in after verification
- [ ] HTML email template renders correctly

### Multi-Tenancy ✅
- [ ] Multiple orgs can be created
- [ ] Each org has isolated data
- [ ] Cross-org access is blocked
- [ ] Projects are org-scoped
- [ ] Runs are org-scoped
- [ ] Session shows correct org context

### Demo Agent ✅
- [ ] Agent responds to messages
- [ ] get_weather tool works
- [ ] get_stock_price tool works
- [ ] search_knowledge tool works
- [ ] LLM generates appropriate responses
- [ ] No OpenRouter API errors

### Rate Limiting ✅
- [ ] First 20 requests succeed
- [ ] 21st request returns 429
- [ ] X-RateLimit headers present
- [ ] Retry-After header in 429 response
- [ ] Rate limit resets after 60 seconds
- [ ] Hour limit also enforced (100/hour)

### End-to-End Flow ✅
- [ ] Can create project
- [ ] Can generate sidecar token
- [ ] Can start red team run
- [ ] Worker processes scripts
- [ ] Events ingested from agent
- [ ] StorySteps created correctly
- [ ] Findings generated
- [ ] Risk score calculated
- [ ] Report generates successfully

---

## 🎉 Success!

If all tests pass, you have:
- ✅ Working email verification system
- ✅ Verified multi-tenant architecture
- ✅ Functional demo agent with tools
- ✅ Enforced rate limiting
- ✅ Complete red team workflow
- ✅ Report generation

**Your platform is ready for Railway deployment!**

See `RAILWAY_DEPLOYMENT.md` for production deployment steps.
