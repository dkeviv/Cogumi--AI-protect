# 🐳 Docker Setup Migration Guide

## What Changed?

We've consolidated from multiple Docker setups into a **single, unified production-ready setup** with consistent naming.

### Before (Confusing ❌)
```
cogumi-postgres          (from docker-compose.customer.yml)
cogumi-redis             (from docker-compose.customer.yml)
cogumi-ai-protect        (from old setup)
cogumi-web               (inconsistent naming)
cogumi-worker            (inconsistent naming)
cogumi-demo-agent        (removed - not needed)
```

### After (Clean ✅)
```
cogumi-ai-protect-postgres    (port 5434)
cogumi-ai-protect-redis       (port 6379)
cogumi-ai-protect-web         (port 3000)
cogumi-ai-protect-worker      (background jobs)
```

---

## Migration Steps

### Step 1: Stop All Existing Containers

```bash
# Stop everything
docker stop cogumi-postgres cogumi-redis cogumi-ai-protect cogumi-web cogumi-worker cogumi-demo-agent 2>/dev/null

# Remove old containers (data is preserved in volumes)
docker rm cogumi-postgres cogumi-redis cogumi-ai-protect cogumi-web cogumi-worker cogumi-demo-agent 2>/dev/null
```

### Step 2: Backup Your Database (Important!)

```bash
# If using cogumi-ai-protect container (port 5434):
docker exec cogumi-ai-protect pg_dump -U postgres cogumi-ai-protect > backup_$(date +%Y%m%d).sql

# OR if using cogumi-postgres container (port 5432):
docker exec cogumi-postgres pg_dump -U cogumi cogumi > backup_$(date +%Y%m%d).sql
```

### Step 3: Copy Environment Variables

```bash
# Create .env from example
cp .env.example .env

# Edit .env with your settings (especially database credentials)
nano .env  # or use your preferred editor
```

**Important .env values:**
```bash
# Match your existing database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=cogumi-ai-protect
POSTGRES_PORT=5434

# This will be used by apps
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/cogumi-ai-protect?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Generate a secure secret for production
NEXTAUTH_SECRET="your-32-character-secret-here"
CRON_SECRET="your-cron-secret-here"
```

### Step 4: Start New Unified Setup

```bash
# Start all services
docker-compose up -d

# Watch logs
docker-compose logs -f
```

### Step 5: Verify Everything Works

```bash
# Check all containers are running
docker ps --filter "name=cogumi-ai-protect"

# Should see:
# cogumi-ai-protect-postgres
# cogumi-ai-protect-redis
# cogumi-ai-protect-web
# cogumi-ai-protect-worker

# Check database connection
docker exec cogumi-ai-protect-postgres psql -U postgres -d cogumi-ai-protect -c "\dt"

# Check web is responding
curl http://localhost:3000/api/health || echo "Web not ready yet"

# Check redis
docker exec cogumi-ai-protect-redis redis-cli ping
```

---

## Database Preservation

Your database is **automatically preserved** using Docker volumes:

```bash
# List volumes
docker volume ls | grep cogumi

# You should see:
# cogumi-ai-protect-postgres-data
# cogumi-ai-protect-redis-data
# cogumi-ai-protect-uploads
```

**How data is preserved:**

1. Old container `cogumi-ai-protect` had data in a volume
2. New container `cogumi-ai-protect-postgres` will:
   - Create a new named volume `cogumi-ai-protect-postgres-data`
   - Use the same database name: `cogumi-ai-protect`
   - Connect on port `5434` (same as before)

**If you need to migrate data from old volume:**

```bash
# 1. Find old volume
docker volume ls | grep postgres

# 2. Start temporary container to copy data
docker run --rm -v OLD_VOLUME_NAME:/old -v cogumi-ai-protect-postgres-data:/new alpine \
  sh -c "cp -a /old/. /new/"
```

---

## What Was Removed?

### ❌ `docker-compose.customer.yml`
- **Why**: Created confusion with duplicate services
- **Now**: Single `docker-compose.yml` works for both dev and production
- **Action**: File will be deleted

### ❌ `demo-agent` service
- **Why**: Not needed in production (customers use their own AI agents)
- **Now**: Removed from docker-compose.yml
- **If needed**: Can be run separately from `apps/demo-agent/`

---

## Production Deployment

The new setup is **production-ready** with:

### ✅ Proper Resource Management
```yaml
services:
  web:
    restart: unless-stopped     # Auto-restart on failure
    healthchecks: enabled       # Monitor service health
  
  worker:
    restart: unless-stopped
    deploy:
      replicas: 1               # Can scale up in production
```

### ✅ Security Defaults
- Database credentials via environment variables
- Secrets not hardcoded
- Volumes for data persistence

### ✅ Scalability
```bash
# Scale workers in production
docker-compose up -d --scale worker=3

# View worker logs
docker-compose logs -f worker
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs postgres
docker-compose logs web

# Common issue: Port already in use
lsof -i :5434  # Check what's using port 5434
lsof -i :3000  # Check what's using port 3000
```

### Database connection failed
```bash
# Verify database is ready
docker exec cogumi-ai-protect-postgres pg_isready -U postgres

# Check if database exists
docker exec cogumi-ai-protect-postgres psql -U postgres -l

# Recreate database if needed
docker exec cogumi-ai-protect-postgres psql -U postgres -c "CREATE DATABASE \"cogumi-ai-protect\";"
```

### Can't connect from host machine
```bash
# Make sure you're using localhost, not container name
# In .env:
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/cogumi-ai-protect"

# NOT:
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/cogumi-ai-protect"
# (postgres hostname only works inside Docker network)
```

---

## Rollback Plan

If you need to go back to the old setup:

```bash
# 1. Stop new containers
docker-compose down

# 2. Start old containers
docker start cogumi-postgres cogumi-redis

# 3. Verify old containers work
docker ps
```

---

## Next Steps

After migration:

1. ✅ Verify web UI: http://localhost:3000
2. ✅ Check database has your data
3. ✅ Test a sample run
4. ✅ Update your deployment scripts to use new container names
5. ✅ Update monitoring/alerting for new container names

---

## Questions?

**Q: Why are postgres and redis separate containers?**  
A: Industry best practice. Allows independent scaling, updates, and failure isolation.

**Q: Can I use a different database port?**  
A: Yes! Change `POSTGRES_PORT` in `.env` and restart.

**Q: What about the sidecar?**  
A: Sidecar runs in **customer environment**, not in this Docker setup.

**Q: How do I update to new version?**  
A:
```bash
git pull
docker-compose build
docker-compose up -d
```
