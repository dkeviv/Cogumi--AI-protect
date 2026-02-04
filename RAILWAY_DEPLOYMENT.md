# 🚂 Railway Deployment Guide

Complete guide to deploy COGUMI AI Protect on Railway for production demos.

---

## Prerequisites

- Railway account (sign up at https://railway.app)
- Gmail account for email (or any SMTP provider)
- OpenRouter API key (get at https://openrouter.ai/keys)
- GitHub repository with your code

---

## Part 1: Email Setup with Gmail

### Step 1: Enable 2FA on Gmail

1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Complete the setup process

### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter name: "COGUMI AI Protect"
5. Click "Generate"
6. **Copy the 16-character password** (you'll need this!)

### Step 3: Configure Custom "From" Domain

**Option A: Use Gmail Address As-Is**
```
From: yourbusiness@gmail.com
Emails will show: "COGUMI AI Protect <yourbusiness@gmail.com>"
```

**Option B: Use Custom Domain with Gmail**

1. **Set up domain forwarding** (requires domain access):
   - Add MX records pointing to Gmail
   - Or set up email forwarding to your Gmail

2. **Configure Gmail to send from custom domain**:
   - Gmail → Settings → Accounts → "Send mail as"
   - Add your custom email (e.g., noreply@cogumi.ai)
   - Verify ownership
   - Select "Reply from the same address"

3. **Use in COGUMI**:
   ```bash
   SMTP_USER=yourbusiness@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM_EMAIL=noreply@cogumi.ai
   SMTP_FROM_NAME=COGUMI AI Protect
   ```

**Result**: Emails appear from "COGUMI AI Protect <noreply@cogumi.ai>" but send through Gmail!

---

## Part 2: Railway Deployment

### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your repo
5. Select your repository

### Step 2: Add Database Services

**Add Postgres:**
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway auto-generates `DATABASE_URL`
3. Note: This is automatically available to your services

**Add Redis:**
1. Click "New" → "Database" → "Add Redis"
2. Railway auto-generates `REDIS_URL`
3. Note: This is automatically available to your services

### Step 3: Configure Web Service

1. Click on your web service (apps/ui)
2. Go to "Variables" tab
3. Add these environment variables:

```bash
# App Configuration
NODE_ENV=production
WEB_PORT=3000

# Database (auto-set by Railway, but verify)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Auth
NEXTAUTH_URL=https://your-app-name.up.railway.app
NEXTAUTH_SECRET=<generate with: openssl rand -hex 32>

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourbusiness@gmail.com
SMTP_PASSWORD=<your-16-char-app-password>
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=COGUMI AI Protect

# Skip email verification in production (set to false for real use)
SKIP_EMAIL_VERIFICATION=false

# OpenRouter (for demo agent)
OPENROUTER_API_KEY=<your-openrouter-key>

# Quotas
MAX_RUN_DURATION_MINUTES=30
MAX_EVENTS_PER_MINUTE=300
WORKER_CONCURRENCY=5
```

### Step 4: Configure Worker Service

1. Add worker service: "New" → "Empty Service"
2. Name it "worker"
3. Set build command:
   ```bash
   cd apps/worker && pnpm build
   ```
4. Set start command:
   ```bash
   node apps/worker/dist/index.js
   ```
5. Add same environment variables as web (except PORT)

### Step 5: Configure Demo Agent (Optional)

1. Add service: "New" → "Empty Service"
2. Name it "demo-agent"
3. Set build command:
   ```bash
   cd apps/demo-agent && pnpm install
   ```
4. Set start command:
   ```bash
   cd apps/demo-agent && pnpm start
   ```
5. Add environment variables:
   ```bash
   OPENROUTER_API_KEY=<your-key>
   PORT=3001
   ```

### Step 6: Run Database Migrations

**Option A: Via Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npx prisma migrate deploy
```

**Option B: Via One-Off Command in Railway Dashboard**
1. Go to web service
2. Click "Settings" → "Deploy"
3. Add one-off command:
   ```bash
   npx prisma migrate deploy && npm run db:seed
   ```

### Step 7: Seed Demo Data (Optional)

In Railway web service terminal:
```bash
npm run db:seed
```

This creates demo user with credentials shown in output.

---

## Part 3: Multi-Tenancy Verification

### ✅ Already Implemented!

Your codebase has proper multi-tenancy:

**1. Session Management**
- Every request extracts `orgId` from session
- Enforced via `getOrgId()` middleware

**2. Database Queries**
- All Prisma queries filter by `orgId`
- Projects: `where: { orgId }`
- Events: `where: { orgId }`
- Runs: `where: { orgId }`
- Findings: `where: { orgId }`

**3. API Security**
- Every API route calls `requireAuth()` + `getOrgId()`
- Cross-org access denied automatically
- Token auth also validates `orgId`

**4. Data Isolation**
- Users belong to orgs via `Membership` table
- All resources scoped to org
- No way to access other org's data

**Test it:**
1. Create 2 accounts with different emails
2. Each gets their own org automatically
3. Create projects in each
4. Verify you can only see your own projects

---

## Part 4: OpenRouter Configuration

### Environment Variables

Add to **both web and demo-agent services**:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
OPENROUTER_MAX_TOKENS=1000
OPENROUTER_TEMPERATURE=0.7

# Rate Limiting for Demo
OPENROUTER_REQUESTS_PER_MINUTE=20
OPENROUTER_REQUESTS_PER_DAY=1000
```

### Get OpenRouter API Key

1. Go to https://openrouter.ai
2. Sign up / Login
3. Go to https://openrouter.ai/keys
4. Click "Create Key"
5. Name it "COGUMI AI Protect"
6. Copy the key (starts with `sk-or-v1-`)

### Free Tier Limits

OpenRouter free tier:
- ✅ Limited requests per day
- ✅ Access to Llama 70B and other models
- ✅ Perfect for demos

For production:
- Add credits: https://openrouter.ai/credits
- Higher rate limits
- More models available

### Rate Limiting in Demo Agent

The demo agent automatically respects rate limits set in env vars.

---

## Part 5: Custom Domain (Optional)

### Step 1: Add Domain in Railway

1. Go to web service → "Settings" → "Networking"
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `demo.cogumi.ai`)

### Step 2: Configure DNS

Add CNAME record in your DNS provider:
```
demo.cogumi.ai  CNAME  your-app.up.railway.app
```

### Step 3: Update Environment Variables

```bash
NEXTAUTH_URL=https://demo.cogumi.ai
SMTP_FROM_EMAIL=noreply@cogumi.ai  # Now matches domain!
```

### Step 4: Wait for SSL

Railway auto-provisions SSL certificate (takes ~5 minutes).

---

## Part 6: Testing Your Deployment

### Test Email Sending

1. Sign up for new account
2. Check inbox for verification email
3. Click verify link
4. Should redirect to login

**Troubleshooting:**
- Check Railway logs for email errors
- Verify Gmail app password is correct
- Check spam folder
- Try sending test email via Railway terminal:
  ```bash
  node -e "require('./dist/lib/email').testEmailConfig()"
  ```

### Test Demo Agent

1. Create project
2. Set Agent Test URL: `http://demo-agent:3001/chat` (if demo-agent service running)
3. Generate sidecar token
4. Run tests
5. Verify OpenRouter API calls work

### Test Multi-Tenancy

1. Create Account A (user1@test.com)
2. Create Account B (user2@test.com)
3. Login as User A → Create project
4. Login as User B → Should NOT see User A's projects
5. ✅ Multi-tenancy working!

---

## Part 7: Monitoring & Maintenance

### View Logs

Railway Dashboard → Service → "Deployments" → "View Logs"

**Watch for:**
- Email send errors
- OpenRouter API errors
- Database connection issues
- Worker job failures

### Database Backups

Railway automatically backs up Postgres.

**Manual backup:**
```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

### Environment Variable Updates

1. Go to service → "Variables"
2. Edit variable
3. Service auto-redeploys

---

## Complete Environment Variables Reference

### Web Service (.env)

```bash
# App
NODE_ENV=production
WEB_PORT=3000
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=<32+ char secret>

# Database (auto-set by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourbusiness@gmail.com
SMTP_PASSWORD=<gmail-app-password>
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=COGUMI AI Protect
SKIP_EMAIL_VERIFICATION=false

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
OPENROUTER_MAX_TOKENS=1000
OPENROUTER_TEMPERATURE=0.7
OPENROUTER_REQUESTS_PER_MINUTE=20

# Limits
MAX_RUN_DURATION_MINUTES=30
MAX_EVENTS_PER_MINUTE=300
```

### Worker Service (.env)

```bash
# Same as web, except:
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
WORKER_CONCURRENCY=5
MAX_RUN_DURATION_MINUTES=30
```

### Demo Agent Service (.env)

```bash
NODE_ENV=production
PORT=3001
OPENROUTER_API_KEY=sk-or-v1-xxxxx
LLM_MODEL=meta-llama/llama-3.1-70b-instruct
```

---

## Quick Deployment Checklist

- [ ] Gmail app password generated
- [ ] Railway project created
- [ ] Postgres added
- [ ] Redis added
- [ ] Web service configured with all env vars
- [ ] Worker service configured
- [ ] Demo agent service configured (optional)
- [ ] Migrations run (`npx prisma migrate deploy`)
- [ ] Demo data seeded (optional)
- [ ] Email verification tested
- [ ] OpenRouter API tested
- [ ] Multi-tenancy verified
- [ ] Custom domain added (optional)
- [ ] SSL certificate active

---

## Cost Estimate

**Railway:**
- Hobby plan: $5/month (includes $5 credit)
- Databases: Included
- Overages: $0.000463/GB-hour

**OpenRouter:**
- Free tier: Limited requests
- Pay-as-you-go: ~$0.10-0.50 per 1000 requests (depends on model)

**Total for demo:** ~$5-10/month

---

## Support

**Email Issues:**
- Gmail app passwords: https://support.google.com/accounts/answer/185833
- SMTP troubleshooting: Check Railway logs

**Railway Issues:**
- Docs: https://docs.railway.app
- Community: https://discord.gg/railway

**OpenRouter Issues:**
- Docs: https://openrouter.ai/docs
- Discord: https://discord.gg/openrouter

---

**Ready to deploy!** 🚀

1. Generate Gmail app password
2. Get OpenRouter API key
3. Deploy to Railway
4. Configure environment variables
5. Run migrations
6. Test and demo!
