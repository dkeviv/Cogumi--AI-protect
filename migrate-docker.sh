#!/bin/bash
set -e

echo "🐳 COGUMI AI Protect - Docker Migration Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env with your settings before continuing!${NC}"
    echo ""
    read -p "Press Enter after editing .env, or Ctrl+C to cancel..."
fi

echo "Step 1: Backing up current database..."
echo "---------------------------------------"

# Try to backup from cogumi-ai-protect container
if docker ps -a --format '{{.Names}}' | grep -q '^cogumi-ai-protect$'; then
    BACKUP_FILE="backup_cogumi_ai_protect_$(date +%Y%m%d_%H%M%S).sql"
    echo "Found cogumi-ai-protect container, creating backup..."
    docker exec cogumi-ai-protect pg_dump -U postgres cogumi-ai-protect > "$BACKUP_FILE" 2>/dev/null || \
        echo -e "${YELLOW}⚠️  Could not backup database (container may not be running)${NC}"
    
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        echo -e "${GREEN}✅ Database backed up to: $BACKUP_FILE${NC}"
    else
        rm -f "$BACKUP_FILE"
        echo -e "${YELLOW}⚠️  No backup created (database may be empty or container not running)${NC}"
    fi
elif docker ps -a --format '{{.Names}}' | grep -q '^cogumi-postgres$'; then
    BACKUP_FILE="backup_cogumi_postgres_$(date +%Y%m%d_%H%M%S).sql"
    echo "Found cogumi-postgres container, creating backup..."
    docker exec cogumi-postgres pg_dump -U cogumi cogumi > "$BACKUP_FILE" 2>/dev/null || \
        echo -e "${YELLOW}⚠️  Could not backup database (container may not be running)${NC}"
    
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        echo -e "${GREEN}✅ Database backed up to: $BACKUP_FILE${NC}"
    else
        rm -f "$BACKUP_FILE"
        echo -e "${YELLOW}⚠️  No backup created (database may be empty or container not running)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No existing database containers found to backup${NC}"
fi

echo ""
echo "Step 2: Stopping old containers..."
echo "-----------------------------------"

OLD_CONTAINERS="cogumi-postgres cogumi-redis cogumi-ai-protect cogumi-web cogumi-worker cogumi-demo-agent"
for container in $OLD_CONTAINERS; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "Stopping $container..."
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
        echo -e "${GREEN}✅ Removed $container${NC}"
    fi
done

echo ""
echo "Step 3: Starting new unified setup..."
echo "--------------------------------------"

# Build and start new containers
docker-compose up -d --build

echo ""
echo "Step 4: Waiting for services to be healthy..."
echo "----------------------------------------------"

# Wait for postgres
echo -n "Waiting for PostgreSQL... "
for i in {1..30}; do
    if docker exec cogumi-ai-protect-postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for redis
echo -n "Waiting for Redis... "
for i in {1..30}; do
    if docker exec cogumi-ai-protect-redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for web
echo -n "Waiting for Web application... "
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "Step 5: Verifying setup..."
echo "--------------------------"

# Check containers are running
EXPECTED_CONTAINERS="cogumi-ai-protect-postgres cogumi-ai-protect-redis cogumi-ai-protect-web cogumi-ai-protect-worker"
ALL_RUNNING=true

for container in $EXPECTED_CONTAINERS; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${GREEN}✅ $container is running${NC}"
    else
        echo -e "${RED}❌ $container is NOT running${NC}"
        ALL_RUNNING=false
    fi
done

echo ""
if [ "$ALL_RUNNING" = true ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "🎉 Your unified setup is now running:"
    echo ""
    echo "  📊 Web UI:        http://localhost:3000"
    echo "  🗄️  PostgreSQL:    localhost:5434"
    echo "  🔴 Redis:         localhost:6379"
    echo ""
    echo "Running containers:"
    docker ps --filter "name=cogumi-ai-protect" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Verify your data: http://localhost:3000"
    echo "  2. Check logs: docker-compose logs -f"
    echo "  3. See DOCKER_MIGRATION.md for more details"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⚠️  Migration completed with errors${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Some containers failed to start. Check logs:"
    echo "  docker-compose logs"
    echo ""
    echo "For troubleshooting, see DOCKER_MIGRATION.md"
fi

echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop:      docker-compose down"
echo "To restart:   docker-compose restart"
