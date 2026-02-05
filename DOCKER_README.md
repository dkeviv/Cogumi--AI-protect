# 🚀 Quick Start - COGUMI AI Protect Docker Setup

## TL;DR - Get Running in 3 Commands

```bash
# 1. Create environment file
cp .env.example .env

# 2. Run migration script (handles everything)
./migrate-docker.sh

# 3. Access the application
open http://localhost:3000
```

---

## What's Running?

```
┌─────────────────────────────────────────────────────────┐
│ Container                    │ Purpose          │ Port  │
├─────────────────────────────────────────────────────────┤
│ cogumi-ai-protect-postgres   │ Database         │ 5434  │
│ cogumi-ai-protect-redis      │ Queue/Cache      │ 6379  │
│ cogumi-ai-protect-web        │ UI + API         │ 3000  │
│ cogumi-ai-protect-worker     │ Background Jobs  │ -     │
└─────────────────────────────────────────────────────────┘
```

**Why 4 containers?**
- **postgres**: Stores all your data (projects, runs, findings)
- **redis**: Manages job queues and caching
- **web**: The Next.js UI and API you interact with
- **worker**: Runs pentest scripts in background (doesn't block web)

---

## Common Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f web
docker-compose logs -f worker

# Restart a service
docker-compose restart web

# Check status
docker-compose ps

# Rebuild after code changes
docker-compose up -d --build

# Scale workers (production)
docker-compose up -d --scale worker=3
```

---

## Database Management

```bash
# Connect to database
docker exec -it cogumi-ai-protect-postgres psql -U postgres -d cogumi-ai-protect

# Backup database
docker exec cogumi-ai-protect-postgres pg_dump -U postgres cogumi-ai-protect > backup.sql

# Restore database
cat backup.sql | docker exec -i cogumi-ai-protect-postgres psql -U postgres -d cogumi-ai-protect

# View tables
docker exec cogumi-ai-protect-postgres psql -U postgres -d cogumi-ai-protect -c "\dt"
```

---

## Redis Management

```bash
# Connect to Redis CLI
docker exec -it cogumi-ai-protect-redis redis-cli

# Check queue status
docker exec cogumi-ai-protect-redis redis-cli LLEN bullmq:default:wait

# Monitor Redis commands (real-time)
docker exec cogumi-ai-protect-redis redis-cli MONITOR

# Clear all Redis data (⚠️ destructive)
docker exec cogumi-ai-protect-redis redis-cli FLUSHALL
```

---

## Troubleshooting

### Ports Already in Use

```bash
# Check what's using port 5434 (postgres)
lsof -i :5434

# Check what's using port 3000 (web)
lsof -i :3000

# Solution: Change ports in .env
WEB_PORT=3001
POSTGRES_PORT=5435
```

### Web Won't Start

```bash
# Check logs
docker-compose logs web

# Common issues:
# 1. Database not ready → Wait 30s and check logs
# 2. Port in use → Change WEB_PORT in .env
# 3. Missing .env → Copy from .env.example
```

### Database Connection Failed

```bash
# Verify postgres is running
docker exec cogumi-ai-protect-postgres pg_isready -U postgres

# Check if database exists
docker exec cogumi-ai-protect-postgres psql -U postgres -l | grep cogumi

# Recreate database if needed
docker exec cogumi-ai-protect-postgres psql -U postgres -c 'CREATE DATABASE "cogumi-ai-protect";'
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs -f worker

# Verify Redis connection
docker exec cogumi-ai-protect-redis redis-cli ping

# Restart worker
docker-compose restart worker
```

---

## Production Deployment

### Environment Variables to Set

```bash
# Required for production
NEXTAUTH_SECRET="generate-random-32-char-string"
CRON_SECRET="generate-random-hash"
POSTGRES_PASSWORD="strong-password-here"
NODE_ENV="production"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="app-specific-password"
SKIP_EMAIL_VERIFICATION=false

# OAuth (optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### Security Checklist

- [ ] Change `NEXTAUTH_SECRET` from default
- [ ] Change `POSTGRES_PASSWORD` from default
- [ ] Set `SKIP_EMAIL_VERIFICATION=false`
- [ ] Configure real SMTP settings
- [ ] Use HTTPS in production (reverse proxy)
- [ ] Set `NODE_ENV=production`
- [ ] Regular database backups
- [ ] Monitor logs for errors

### Scaling for Production

```bash
# Scale workers to handle more load
docker-compose up -d --scale worker=5

# Use external managed database (recommended)
# Update DATABASE_URL to point to RDS/CloudSQL/etc.

# Use external Redis (optional)
# Update REDIS_URL to point to ElastiCache/Redis Cloud
```

---

## Development Workflow

```bash
# 1. Make code changes in your editor

# 2. Rebuild only changed service
docker-compose build web    # After changing web code
docker-compose build worker # After changing worker code

# 3. Restart service
docker-compose up -d web

# 4. Check logs
docker-compose logs -f web

# Hot reload: For development, you can mount code as volume
# (see docker-compose.override.yml example)
```

---

## Data Persistence

Your data is stored in Docker volumes (survives container restarts):

```bash
# List volumes
docker volume ls | grep cogumi-ai-protect

# Backup volumes
docker run --rm -v cogumi-ai-protect-postgres-data:/data \
  -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Remove volumes (⚠️ deletes all data)
docker-compose down -v
```

---

## Migration from Old Setup

If you're upgrading from the old multi-file setup, see:
- **DOCKER_MIGRATION.md** - Detailed migration guide
- **migrate-docker.sh** - Automated migration script

---

## Need Help?

1. Check logs: `docker-compose logs -f`
2. See troubleshooting section above
3. Read DOCKER_MIGRATION.md for details
4. Check container status: `docker-compose ps`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              User Browser                       │
│          http://localhost:3000                  │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────▼────────┐
         │  cogumi-ai-     │
         │  protect-web    │ ← Next.js UI + API
         │  (port 3000)    │
         └────┬───────┬────┘
              │       │
     ┌────────▼──┐ ┌──▼───────────┐
     │ cogumi-ai-│ │  cogumi-ai-  │
     │ protect-  │ │  protect-    │
     │ postgres  │ │  redis       │
     │(port 5434)│ │  (port 6379) │
     └───────────┘ └──────┬───────┘
                          │
                   ┌──────▼────────┐
                   │  cogumi-ai-   │
                   │  protect-     │
                   │  worker       │ ← BullMQ Jobs
                   └───────────────┘
```
