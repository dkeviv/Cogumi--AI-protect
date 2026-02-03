#!/bin/sh
set -e

echo "🚀 Starting COGUMI AI Protect..."

# Run database migrations
echo "📦 Running database migrations..."
cd /app/packages/db
npx prisma migrate deploy

# Seed database if empty (first-time setup)
echo "🌱 Checking if database needs seeding..."
npx prisma db seed || echo "⚠️  Seed skipped (database already initialized)"

echo "✅ Migrations complete!"

# Start the application
echo "🌐 Starting web server..."
cd /app
exec "$@"
