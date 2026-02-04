#!/bin/bash
# One-command demo setup for COGUMI AI Protect

set -e

echo "🚀 COGUMI AI Protect - Quick Demo Setup"
echo "========================================"
echo ""

# Check for .env
if [ ! -f ".env" ]; then
  echo "📝 Creating .env from template..."
  cp .env.example .env
  
  echo ""
  echo "⚠️  IMPORTANT: Edit .env and add your OPENROUTER_API_KEY"
  echo "   Get a free key from: https://openrouter.ai/keys"
  echo ""
  echo "   Then run: docker-compose up -d"
  echo ""
  exit 0
fi

echo "✅ .env file exists"
echo ""

# Check if OpenRouter key is set
if ! grep -q "OPENROUTER_API_KEY=sk-" .env 2>/dev/null; then
  echo "⚠️  WARNING: OPENROUTER_API_KEY not set in .env"
  echo "   Get a free key from: https://openrouter.ai/keys"
  echo "   Then edit .env before continuing"
  echo ""
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec -T web npx prisma migrate deploy

# Seed database
echo "🌱 Seeding demo data..."
docker-compose exec -T web npm run db:seed

echo ""
echo "========================================" 
echo "🎉 Setup complete!"
echo "========================================"
echo ""
echo "📖 Next steps:"
echo "   1. Open http://localhost:${WEB_PORT:-3000}"
echo "   2. Login with demo@cogumi.ai / demo123"
echo "   3. Copy the sidecar token from above"
echo "   4. Start sidecar: cd apps/sidecar && ./start-demo.sh YOUR_TOKEN"
echo "   5. Click 'Run Tests' in the UI"
echo ""
echo "📚 See QUICKSTART.md for detailed guide"
echo ""
