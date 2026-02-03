# 🚀 COGUMI AI Protect - Deployment Guide

Complete guide for deploying COGUMI AI Protect in production.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Self-Hosted Deployment](#self-hosted-deployment)
- [Cloud Deployment (Railway)](#cloud-deployment-railway)
- [Sidecar Deployment](#sidecar-deployment)
- [Database Migrations](#database-migrations)
- [Scheduled Jobs](#scheduled-jobs)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Docker**: 24.0+ with Docker Compose
- **Node.js**: 20+ (for local development)
- **PostgreSQL**: 15+
- **Redis**: 7+ (optional, for background jobs)
- **Go**: 1.21+ (for building sidecar from source)

### Domain & SSL

For production deployments:
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- Or use a reverse proxy (Nginx, Caddy, Traefik)

---

## Environment Setup

### 1. Generate Secrets

```bash
# NextAuth secret
openssl rand -base64 32

# Cron secret  
openssl rand -base64 32

# Postgres password
openssl rand -base64 24
```

### 2. Create Environment File

Copy the example environment file:

```bash
cp .env.customer.example .env
```

Edit `.env` with your values:

```env
# Database
POSTGRES_DB=cogumi
POSTGRES_USER=cogumi
POSTGRES_PASSWORD=your_generated_password_here
POSTGRES_PORT=5432

# Application
WEB_PORT=3000
NEXTAUTH_URL=https://cogumi.yourcompany.com
NEXTAUTH_SECRET=your_generated_secret_here

# Cron
CRON_SECRET=your_cron_secret_here

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

## Self-Hosted Deployment

### Using Docker Compose

1. **Build and start services**:

```bash
docker-compose -f docker-compose.customer.yml up -d
```

2. **Verify services are running**:

```bash
docker-compose -f docker-compose.customer.yml ps
```

Expected output:
```
NAME                STATUS    PORTS
cogumi-postgres     Up        5432->5432
cogumi-redis        Up        6379->6379
cogumi-web          Up        3000->3000
cogumi-sidecar      Up        8888->8888
```

3. **Check application health**:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T10:00:00Z",
  "database": "connected"
}
```

### With Nginx Reverse Proxy

Create `/etc/nginx/sites-available/cogumi`:

```nginx
server {
    listen 80;
    server_name cogumi.yourcompany.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cogumi.yourcompany.com;
    
    ssl_certificate /etc/letsencrypt/live/cogumi.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cogumi.yourcompany.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SSE support (for live run updates)
    location /api/runs {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/cogumi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Cloud Deployment (Railway)

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
```

### 2. Add Services

**PostgreSQL**:
```bash
railway add --database postgres
```

**Redis** (optional):
```bash
railway add --database redis
```

### 3. Configure Environment Variables

In Railway dashboard, add:

```
DATABASE_URL=<automatically set by Railway>
REDIS_URL=<automatically set by Railway>
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=<your secret>
CRON_SECRET=<your secret>
NODE_ENV=production
```

### 4. Deploy

```bash
# From apps/ui directory
railway up
```

Railway will automatically:
- Detect Next.js app
- Install dependencies
- Run Prisma migrations
- Build and deploy

---

## Sidecar Deployment

The sidecar proxy runs alongside your AI agent (typically in the same network).

### Docker Deployment

1. **Generate token in UI**:
   - Navigate to your project
   - Go to **Settings → Tokens**
   - Click **"Generate Token"**
   - Copy the token (shown only once!)

2. **Run sidecar container**:

```bash
docker run -d \
  --name cogumi-sidecar \
  --restart unless-stopped \
  -e COGUMI_API_URL=https://cogumi.yourcompany.com \
  -e SIDECAR_TOKEN=your_token_here \
  -p 8888:8888 \
  cogumi/sidecar:latest
```

3. **Configure AI agent**:

```bash
export HTTP_PROXY=http://localhost:8888
export HTTPS_PROXY=http://localhost:8888
```

Or in Python:
```python
import os
os.environ['HTTP_PROXY'] = 'http://localhost:8888'
os.environ['HTTPS_PROXY'] = 'http://localhost:8888'
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cogumi-sidecar
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cogumi-sidecar
  template:
    metadata:
      labels:
        app: cogumi-sidecar
    spec:
      containers:
      - name: sidecar
        image: cogumi/sidecar:latest
        env:
        - name: COGUMI_API_URL
          value: "https://cogumi.yourcompany.com"
        - name: SIDECAR_TOKEN
          valueFrom:
            secretKeyRef:
              name: cogumi-secrets
              key: sidecar-token
        ports:
        - containerPort: 8888
---
apiVersion: v1
kind: Service
metadata:
  name: cogumi-sidecar
spec:
  selector:
    app: cogumi-sidecar
  ports:
  - port: 8888
    targetPort: 8888
```

---

## Database Migrations

### Automatic (Production)

Migrations run automatically on container startup via `docker-entrypoint.sh`.

To run manually:

```bash
docker exec -it cogumi-web sh -c "cd /app/packages/db && npx prisma migrate deploy"
```

### Manual Migration

1. **Create migration** (development):

```bash
cd packages/db
npx prisma migrate dev --name your_migration_name
```

2. **Apply in production**:

```bash
npx prisma migrate deploy
```

### Rollback Migration

Prisma doesn't support automatic rollbacks. To revert:

1. Restore database from backup
2. Or manually write rollback SQL:

```bash
psql $DATABASE_URL -f rollback.sql
```

---

## Scheduled Jobs

### Retention Cleanup (Daily)

Set up a cron job to clean up old data:

**Using external cron** (recommended):

```bash
# Add to crontab (run daily at 2am)
0 2 * * * curl -X POST \
  -H "X-Cron-Secret: $CRON_SECRET" \
  https://cogumi.yourcompany.com/api/cron/cleanup
```

**Using GitHub Actions** (for Railway/Vercel):

`.github/workflows/cleanup.yml`:
```yaml
name: Daily Cleanup
on:
  schedule:
    - cron: '0 2 * * *'  # 2am daily
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Run cleanup
        run: |
          curl -X POST \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            https://cogumi.yourcompany.com/api/cron/cleanup
```

**Using Kubernetes CronJob**:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cogumi-cleanup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              curl -X POST \
                -H "X-Cron-Secret: $CRON_SECRET" \
                https://cogumi.yourcompany.com/api/cron/cleanup
          restartPolicy: OnFailure
```

---

## Monitoring & Health Checks

### Health Endpoint

```bash
curl https://cogumi.yourcompany.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T10:00:00Z",
  "version": "1.0.0",
  "database": "connected"
}
```

### Monitoring with UptimeRobot

1. Create HTTP(s) monitor
2. URL: `https://cogumi.yourcompany.com/api/health`
3. Interval: 5 minutes
4. Alert contacts: Your email/Slack

### Prometheus Metrics (Future)

```yaml
# docker-compose.customer.yml (add this service)
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"
```

---

## Troubleshooting

### Container won't start

**Check logs**:
```bash
docker-compose -f docker-compose.customer.yml logs web
docker-compose -f docker-compose.customer.yml logs postgres
```

**Common issues**:
- Missing environment variables → Check `.env`
- Database connection failed → Verify `DATABASE_URL`
- Port already in use → Change `WEB_PORT` in `.env`

### Database migration errors

**Reset database** (⚠️ deletes all data):
```bash
docker exec -it cogumi-postgres psql -U cogumi -c "DROP DATABASE cogumi;"
docker exec -it cogumi-postgres psql -U cogumi -c "CREATE DATABASE cogumi;"
docker-compose -f docker-compose.customer.yml restart web
```

### Sidecar not connecting

**Test connectivity**:
```bash
# From sidecar container
docker exec -it cogumi-sidecar wget -O- http://web:3000/api/health
```

**Check token**:
```bash
# Verify token in UI: Project → Settings → Tokens
# Token status should be "active"
```

### Events not appearing

1. Check run status: Must be `running`
2. Check sidecar logs: `docker logs cogumi-sidecar`
3. Verify project ID matches
4. Check event quota hasn't been exceeded

### SSL/HTTPS issues

**Let's Encrypt with Certbot**:
```bash
sudo certbot --nginx -d cogumi.yourcompany.com
```

**Or use Caddy** (auto-HTTPS):
```bash
# Caddyfile
cogumi.yourcompany.com {
    reverse_proxy localhost:3000
}
```

---

## Backup & Restore

### PostgreSQL Backup

```bash
# Backup
docker exec -it cogumi-postgres pg_dump -U cogumi cogumi > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260203.sql | docker exec -i cogumi-postgres psql -U cogumi cogumi
```

### Automated Backups

Add to crontab:
```bash
0 3 * * * docker exec cogumi-postgres pg_dump -U cogumi cogumi | gzip > /backups/cogumi_$(date +\%Y\%m\%d).sql.gz
```

---

## Scaling

### Horizontal Scaling

- **Web tier**: Deploy multiple instances behind load balancer
- **Database**: Use read replicas for queries
- **Redis**: Use Redis Cluster for high availability

### Vertical Scaling

Increase Docker resource limits:

```yaml
# docker-compose.customer.yml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong `NEXTAUTH_SECRET` and `CRON_SECRET`
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Rotate sidecar tokens regularly
- [ ] Set up database backups
- [ ] Monitor `/api/health` endpoint
- [ ] Review quota limits for your org
- [ ] Set appropriate retention policy

---

## Support

For deployment assistance:
- **Email**: support@cogumi.ai
- **Documentation**: [docs.cogumi.ai](https://docs.cogumi.ai)
- **GitHub Issues**: [github.com/cogumi/ai-protect/issues](https://github.com/cogumi/ai-protect/issues)
