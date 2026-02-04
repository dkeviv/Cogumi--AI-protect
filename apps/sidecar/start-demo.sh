#!/bin/bash
# Simple sidecar launcher for demo

set -e

TOKEN="${1:-}"
API_URL="${2:-http://localhost:3000}"
PORT="${3:-8080}"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: Sidecar token required"
  echo ""
  echo "Usage: ./start-demo.sh <SIDECAR_TOKEN>"
  echo ""
  echo "Get your token from the seed output or UI."
  exit 1
fi

echo "🚀 Starting COGUMI Sidecar Proxy..."
echo "   Token: ${TOKEN:0:20}..."
echo "   API:   $API_URL"
echo "   Port:  $PORT"
echo ""

# Check if sidecar binary exists
if [ ! -f "sidecar" ] && [ ! -f "cmd/sidecar/main.go" ]; then
  echo "❌ Error: Run this from apps/sidecar directory"
  exit 1
fi

# Run compiled binary if it exists, otherwise run with go run
if [ -f "sidecar" ]; then
  ./sidecar \
    --token="$TOKEN" \
    --api-url="$API_URL" \
    --port="$PORT"
else
  go run cmd/sidecar/main.go \
    --token="$TOKEN" \
    --api-url="$API_URL" \
    --port="$PORT"
fi
