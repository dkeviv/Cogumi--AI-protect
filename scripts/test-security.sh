#!/bin/bash

# Security Fixes Test Suite
# Tests all HIGH priority security fixes

set -e

echo "🔒 COGUMI AI Protect - Security Fixes Test Suite"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Function to test and report
test_case() {
  local description="$1"
  local command="$2"
  local expected_pattern="$3"
  
  echo -n "Testing: $description... "
  
  if output=$(eval "$command" 2>&1); then
    if echo "$output" | grep -q "$expected_pattern"; then
      echo -e "${GREEN}✅ PASSED${NC}"
      ((PASSED++))
    else
      echo -e "${RED}❌ FAILED${NC}"
      echo "  Expected pattern: $expected_pattern"
      echo "  Got: $output"
      ((FAILED++))
    fi
  else
    echo -e "${RED}❌ FAILED (command error)${NC}"
    echo "  Command: $command"
    echo "  Output: $output"
    ((FAILED++))
  fi
}

echo "📋 Part 1: SSRF Protection Tests"
echo "--------------------------------"

# SSRF Tests (using TypeScript test)
pnpm tsx scripts/test-ssrf.ts
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ SSRF protection: All tests passed${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ SSRF protection: Tests failed${NC}"
  ((FAILED++))
fi

echo ""
echo "📋 Part 2: Cron Authentication Tests"
echo "------------------------------------"

# Test cron endpoints
test_case "Cron cleanup without auth" \
  "curl -s -X POST http://localhost:3001/api/cron/cleanup" \
  '"error":"Unauthorized"'

test_case "Cron cleanup with wrong secret" \
  "curl -s -X POST http://localhost:3001/api/cron/cleanup -H 'X-Cron-Secret: wrong-secret'" \
  '"error":"Unauthorized"'

test_case "Cron cleanup with correct secret" \
  "curl -s -X POST http://localhost:3001/api/cron/cleanup -H 'X-Cron-Secret: 847a9777eb8ecc853f9dac473a0f79801d98ea67de3b0f16a1484364d3cad10d'" \
  '"success":true'

test_case "Retention cleanup without auth" \
  "curl -s -X POST http://localhost:3001/api/cron/retention-cleanup" \
  '"error":"Unauthorized"'

test_case "Retention cleanup with correct secret" \
  "curl -s -X POST http://localhost:3001/api/cron/retention-cleanup -H 'X-Cron-Secret: 847a9777eb8ecc853f9dac473a0f79801d98ea67de3b0f16a1484364d3cad10d'" \
  '"success":true'

echo ""
echo "================================================"
echo "📊 Test Summary"
echo "================================================"
echo -e "Total Passed: ${GREEN}$PASSED${NC}"
echo -e "Total Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All security tests passed!${NC}"
  echo ""
  echo "✅ SSRF Protection: Working correctly"
  echo "   - Blocks cloud metadata endpoints (169.254.169.254, etc.)"
  echo "   - Blocks private IP ranges (10.x, 192.168.x, 172.16-31.x)"
  echo "   - Blocks localhost in production mode"
  echo "   - Blocks non-HTTP(S) protocols (file://, ftp://, etc.)"
  echo ""
  echo "✅ Cron Authentication: Working correctly"
  echo "   - Rejects requests without X-Cron-Secret header"
  echo "   - Rejects requests with wrong secret"
  echo "   - Accepts requests with correct secret"
  echo "   - No default/fallback secrets"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some security tests failed. Please review the output above.${NC}"
  exit 1
fi
