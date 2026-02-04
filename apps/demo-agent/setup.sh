#!/bin/bash
# Quick setup script for demo agent

set -e

echo "🤖 Setting up COGUMI Demo Agent..."
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from apps/demo-agent directory"
  exit 1
fi

# Check for .env
if [ ! -f ".env" ]; then
  echo "📝 Creating .env from template..."
  cp .env.example .env
  echo "✅ Created .env file"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env and add your OPENROUTER_API_KEY"
  echo "   Get your key from: https://openrouter.ai/keys"
  echo ""
else
  echo "✅ .env already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
if command -v pnpm &> /dev/null; then
  pnpm install
else
  npm install
fi

echo ""
echo "✅ Demo agent setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your OPENROUTER_API_KEY"
echo "  2. Run: pnpm dev (or npm run dev)"
echo "  3. Test: curl http://localhost:3001/health"
echo ""
echo "📚 See README.md for full documentation"
echo ""
