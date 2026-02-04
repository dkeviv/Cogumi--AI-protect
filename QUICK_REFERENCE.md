# 🎯 Quick Reference - COGUMI AI Protect

## 🚀 One-Command Deploy

```bash
# Railway deployment (after setup)
railway up
```

## 📧 Email Configuration

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Test email sending
npm run test:email  # (Coming soon)
```

**Gmail App Password:**
1. Google Account → Security → 2-Step Verification → App passwords
2. Generate for "Mail" → Copy 16-character password
3. Set as `SMTP_PASSWORD` in Railway

## 🔑 Essential Environment Variables

```bash
# Minimum required for production

# Authentication
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=<generated-with-openssl>

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<16-char-app-password>
SMTP_FROM_EMAIL=noreply@yourdomain.com

# OpenRouter (Demo Agent)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=20
RATE_LIMIT_REQUESTS_PER_HOUR=100
```

## 🧪 Quick Tests

```bash
# Test email sending
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "organizationName": "Test Org"
  }'

# Test rate limiting
for i in {1..25}; do
  curl http://localhost:3001/chat \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello"}' \
    -i | grep -E "HTTP|X-RateLimit"
done

# Test demo agent
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather in San Francisco?",
    "conversationHistory": []
  }'
```

## 📊 Service Ports

| Service      | Port | URL                          |
|--------------|------|------------------------------|
| UI/API       | 3000 | http://localhost:3000        |
| Demo Agent   | 3001 | http://localhost:3001        |
| Worker       | -    | Background jobs (BullMQ)     |
| Postgres     | 5432 | postgresql://localhost:5432  |
| Redis        | 6379 | redis://localhost:6379       |

## 🔍 Common Issues

### Email not working
```bash
# Check SMTP connection
node -e "const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your@gmail.com', pass: 'app-password' }
});
t.verify().then(console.log).catch(console.error);"
```

### Rate limit not resetting
```bash
# Clear Redis rate limit keys
redis-cli KEYS "rate:*" | xargs redis-cli DEL
```

### OpenRouter API errors
```bash
# Test API key
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

## 📁 Important Files

| File | Purpose |
|------|---------|
| `PRODUCTION_READY.md` | Complete production checklist |
| `RAILWAY_DEPLOYMENT.md` | Detailed Railway setup guide |
| `QUICKSTART.md` | Local development setup |
| `.env.example` | All environment variables |
| `apps/ui/src/lib/email.ts` | Email service |
| `apps/demo-agent/src/rate-limit.ts` | Rate limiting |

## 🎯 Critical Paths

### Registration Flow
1. User fills form → `/api/auth/register`
2. Create org + user + membership (transaction)
3. Hash verification token (SHA-256)
4. Send email via Nodemailer
5. User clicks link → `/api/auth/verify-email?token=...`
6. Verify token → mark email as verified
7. Redirect to `/auth/verified`

### Rate Limiting Flow
1. Request arrives → extract IP
2. Check minute window (20 req/min)
3. Check hour window (100 req/hour)
4. If exceeded → 429 with `Retry-After` header
5. If allowed → increment counter + continue
6. Cleanup old entries every 5 minutes

### Multi-Tenancy Flow
1. User authenticates → session created
2. Middleware extracts `orgId` from session
3. All queries filtered by `orgId`
4. Cross-tenant access → 403 Forbidden

## 🚨 Security Checklist

- [ ] `NEXTAUTH_SECRET` is random (32+ chars)
- [ ] `SMTP_PASSWORD` is app password (not account password)
- [ ] `OPENROUTER_API_KEY` not exposed to client
- [ ] Rate limiting enabled on demo agent
- [ ] HTTPS enforced in production (Railway auto)
- [ ] Verification tokens hashed before storage
- [ ] All queries include `orgId` filter

## 📞 Support Resources

- **Railway Docs:** https://docs.railway.app
- **Nodemailer Docs:** https://nodemailer.com
- **OpenRouter Docs:** https://openrouter.ai/docs
- **Gmail SMTP:** https://support.google.com/mail/answer/7126229

---

**Need detailed instructions?** See `PRODUCTION_READY.md` and `RAILWAY_DEPLOYMENT.md`
